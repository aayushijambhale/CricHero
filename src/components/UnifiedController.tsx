import React, { useState, useEffect, useMemo, useRef } from "react";
import { MatchEventLog, MatchState, PlayerProfile, WicketType } from "../types";
import { Settings, X, AlertCircle } from "lucide-react";
import { io } from "socket.io-client";

import { MatchHeader } from "./controller/MatchHeader";
import { PlayerManager } from "./controller/PlayerManager";
import { MatchContext } from "./controller/MatchContext";
import { ScoreMatrix } from "./controller/ScoreMatrix";
import { ProductionMonitor } from "./controller/ProductionMonitor";

function slugFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createPlayer(name: string, role: PlayerProfile["role"]): PlayerProfile {
  const clean = name.trim().toUpperCase();
  const shortName = clean.split(/\s+/).map(w => w[0]).slice(0, 3).join("");
  return {
    id: `${slugFromName(clean)}-${Math.random().toString(36).slice(2, 6)}`,
    name: clean,
    shortName,
    role,
    battingStyle: "RHB",
    bowlingStyle: role === "bowler" || role === "allrounder" ? "Right-arm pace" : "",
    jerseyNumber: Math.floor(Math.random() * 99) + 1,
    stats: {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      overs: 0,
      maidens: 0,
      wickets: 0,
      economy: 0,
    },
  };
}

function mergeRecentPlayerIds(existing: string[] = [], incoming: string[]): string[] {
  const merged = [...incoming, ...existing.filter(id => !incoming.includes(id))];
  return merged.slice(0, 24);
}

function pushEvent(existing: MatchEventLog[] = [], event: MatchEventLog): MatchEventLog[] {
  const out = [...existing, event];
  return out.slice(-200);
}

interface Props {
  initialState: MatchState;
  onNavigate?: (screen: string) => void;
}

export default function UnifiedController({ initialState, onNavigate }: Props) {
  const [state, setState] = useState<MatchState>(initialState);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const prevStateRef = useRef<MatchState | null>(null);

  const [activeModal, setActiveModal] = useState<"matchSelector" | "settings" | "batsman" | "bowler" | "wicket" | null>(null);

  const [wicketType, setWicketType] = useState<WicketType>("bowled");
  const [wicketDismissed, setWicketDismissed] = useState<"striker" | "non-striker">("striker");
  const [newBatsman, setNewBatsman] = useState("");
  const [wicketBowlerName, setWicketBowlerName] = useState("");
  const [wicketFielderName, setWicketFielderName] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [changeTarget, setChangeTarget] = useState<"batsman1" | "batsman2" | "bowler">("batsman1");
  const [overrideBowlerRule, setOverrideBowlerRule] = useState(false);

  const [settingsForm, setSettingsForm] = useState(state.config);

  const teamAPlayers = state.teamAPlayers || [];
  const teamBPlayers = state.teamBPlayers || [];
  const battingPlayers = state.currentInnings === 1 ? teamAPlayers : teamBPlayers;
  const bowlingPlayers = state.currentInnings === 1 ? teamBPlayers : teamAPlayers;

  const activeBatsmanNames = useMemo(() => {
    return [state.batsman1.name.toUpperCase(), state.batsman2.name.toUpperCase()];
  }, [state.batsman1.name, state.batsman2.name]);

  const dismissedSet = useMemo(() => new Set((state.dismissedPlayerIds || []).map(id => id.toLowerCase())), [state.dismissedPlayerIds]);

  const availableNextBatters = useMemo(() => {
    return battingPlayers.filter(p => !activeBatsmanNames.includes(p.name.toUpperCase()) && !dismissedSet.has(p.id.toLowerCase()));
  }, [battingPlayers, activeBatsmanNames, dismissedSet]);

  const eligibleBowlers = useMemo(() => {
    return bowlingPlayers.filter(p => (overrideBowlerRule || p.name.toUpperCase() !== state.bowler.name.toUpperCase()) && (p.role === "bowler" || p.role === "allrounder"));
  }, [bowlingPlayers, state.bowler.name, overrideBowlerRule]);

  useEffect(() => {
    function ensurePlayerDatabase(s: MatchState): MatchState {
      const hasA = (s.teamAPlayers || []).length > 0;
      const hasB = (s.teamBPlayers || []).length > 0;
      if (hasA && hasB) return s;

      const seedA: PlayerProfile[] = [];
      const seedB: PlayerProfile[] = [];

      const inA = [s.config.team1, s.batsman1.name, s.batsman2.name].join(" ").toUpperCase();
      const bowlerInA = inA.includes(s.bowler.name.toUpperCase());

      if (s.currentInnings === 1) {
        seedA.push(createPlayer(s.batsman1.name, "batsman"));
        seedA.push(createPlayer(s.batsman2.name, "batsman"));
        seedB.push(createPlayer(s.bowler.name, "bowler"));
      } else {
        seedB.push(createPlayer(s.batsman1.name, "batsman"));
        seedB.push(createPlayer(s.batsman2.name, "batsman"));
        seedA.push(createPlayer(s.bowler.name, "bowler"));
      }

      if (bowlerInA && !seedA.find(p => p.name === s.bowler.name.toUpperCase())) {
        seedA.push(createPlayer(s.bowler.name, "bowler"));
      }
      if (!bowlerInA && !seedB.find(p => p.name === s.bowler.name.toUpperCase())) {
        seedB.push(createPlayer(s.bowler.name, "bowler"));
      }

      const allSeed = [...seedA, ...seedB];
      const strikerName = s.batsman1.isStriker ? s.batsman1.name.toUpperCase() : s.batsman2.name.toUpperCase();
      const nonStrikerName = s.batsman1.isStriker ? s.batsman2.name.toUpperCase() : s.batsman1.name.toUpperCase();
      const striker = allSeed.find(p => p.name === strikerName);
      const nonStriker = allSeed.find(p => p.name === nonStrikerName);
      const bowler = allSeed.find(p => p.name === s.bowler.name.toUpperCase());

      return {
        ...s,
        teamAPlayers: hasA ? s.teamAPlayers : seedA,
        teamBPlayers: hasB ? s.teamBPlayers : seedB,
        teamABattingOrder: s.teamABattingOrder?.length ? s.teamABattingOrder : seedA.map(p => p.id),
        teamBBattingOrder: s.teamBBattingOrder?.length ? s.teamBBattingOrder : seedB.map(p => p.id),
        recentPlayerIds: s.recentPlayerIds?.length ? s.recentPlayerIds : allSeed.map(p => p.id).slice(0, 5),
        lastUsedPlayerIds: s.lastUsedPlayerIds?.length ? s.lastUsedPlayerIds : allSeed.map(p => p.id).slice(0, 5),
        dismissedPlayerIds: s.dismissedPlayerIds || [],
        activePlayerIds: {
          strikerId: striker?.id,
          nonStrikerId: nonStriker?.id,
          bowlerId: bowler?.id,
        },
      };
    }

    async function fetchState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          const normalized = ensurePlayerDatabase(data);
          setState(normalized);
          if ((data.teamAPlayers || []).length === 0 || (data.teamBPlayers || []).length === 0) {
            pushConfigUpdate({
              teamAPlayers: normalized.teamAPlayers,
              teamBPlayers: normalized.teamBPlayers,
              teamABattingOrder: normalized.teamABattingOrder,
              teamBBattingOrder: normalized.teamBBattingOrder,
              recentPlayerIds: normalized.recentPlayerIds,
              lastUsedPlayerIds: normalized.lastUsedPlayerIds,
              activePlayerIds: normalized.activePlayerIds,
              dismissedPlayerIds: normalized.dismissedPlayerIds,
            });
          }
          if (!(data.config as any).matchId) {
            setActiveModal("matchSelector");
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial controller state", err);
      }
    }
    fetchState();

    const socket = io();
    socket.on('dispatch', (eventData: any) => {
      try {
        if (eventData.type === "update" || eventData.type === "initial") {
          const normalized = ensurePlayerDatabase(eventData.payload);
          setState(normalized);
          setSettingsForm(normalized.config);
        }
      } catch (err) {
        console.error("Failed to parse Socket event", err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const prev = prevStateRef.current;
    if (!prev) {
      prevStateRef.current = state;
      return;
    }

    const teamA = [...(state.teamAPlayers || [])];
    const teamB = [...(state.teamBPlayers || [])];
    if (teamA.length === 0 && teamB.length === 0) {
      prevStateRef.current = state;
      return;
    }

    let changed = false;
    let nextEvents = [...(state.matchEventLog || [])];
    let dismissedIds = new Set<string>((state.dismissedPlayerIds || []).map((id: string) => id.toLowerCase()));

    function findAndPatch(name: string, patch: Partial<PlayerProfile["stats"]>) {
      const upper = name.toUpperCase();
      let idx = teamA.findIndex(p => p.name.toUpperCase() === upper);
      if (idx >= 0) {
        const nextStats = { ...teamA[idx].stats, ...patch };
        const hasDiff = Object.keys(patch).some(key => (teamA[idx].stats as any)[key] !== (nextStats as any)[key]);
        if (hasDiff) {
          teamA[idx] = { ...teamA[idx], stats: nextStats };
          changed = true;
        }
        return teamA[idx];
      }
      idx = teamB.findIndex(p => p.name.toUpperCase() === upper);
      if (idx >= 0) {
        const nextStats = { ...teamB[idx].stats, ...patch };
        const hasDiff = Object.keys(patch).some(key => (teamB[idx].stats as any)[key] !== (nextStats as any)[key]);
        if (hasDiff) {
          teamB[idx] = { ...teamB[idx], stats: nextStats };
          changed = true;
        }
        return teamB[idx];
      }
      return null;
    }

    const s1 = findAndPatch(state.batsman1.name, {
      runs: state.batsman1.runs,
      balls: state.batsman1.balls,
      fours: state.batsman1.fours,
      sixes: state.batsman1.sixes,
      strikeRate: state.batsman1.strikeRate,
    });
    const s2 = findAndPatch(state.batsman2.name, {
      runs: state.batsman2.runs,
      balls: state.batsman2.balls,
      fours: state.batsman2.fours,
      sixes: state.batsman2.sixes,
      strikeRate: state.batsman2.strikeRate,
    });
    const sb = findAndPatch(state.bowler.name, {
      overs: Number((state.bowler.balls / 6).toFixed(1)),
      maidens: state.bowler.maidens,
      wickets: state.bowler.wickets,
      economy: state.bowler.economy,
      runs: state.bowler.runs,
    });

    const strikerName = state.batsman1.isStriker ? state.batsman1.name.toUpperCase() : state.batsman2.name.toUpperCase();
    const nonStrikerName = state.batsman1.isStriker ? state.batsman2.name.toUpperCase() : state.batsman1.name.toUpperCase();
    const bowlerName = state.bowler.name.toUpperCase();
    const all = [...teamA, ...teamB];
    const striker = all.find(p => p.name.toUpperCase() === strikerName);
    const nonStriker = all.find(p => p.name.toUpperCase() === nonStrikerName);
    const bowler = all.find(p => p.name.toUpperCase() === bowlerName);

    const activePlayerIds = {
      strikerId: striker?.id,
      nonStrikerId: nonStriker?.id,
      bowlerId: bowler?.id,
    };

    if (state.wickets > prev.wickets && state.lastWicket?.name) {
      const outPlayer = all.find(p => p.name.toUpperCase() === state.lastWicket!.name.toUpperCase());
      if (outPlayer) {
        dismissedIds.add(outPlayer.id.toLowerCase());
        changed = true;
      }
      nextEvents = pushEvent(nextEvents, {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "wicket",
        text: `OUT! ${state.lastWicket.name} departs for ${state.lastWicket.runs}.`,
        timestamp: Date.now(),
      });
      changed = true;
    } else if (state.runs > prev.runs) {
      const delta = state.runs - prev.runs;
      const strikerNow = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
      let commentary = `${delta} run${delta > 1 ? "s" : ""} added.`;
      if (delta === 4) commentary = `FOUR! ${strikerNow.name} drives through covers.`;
      if (delta === 6) commentary = `SIX! ${strikerNow.name} clears the boundary.`;
      nextEvents = pushEvent(nextEvents, {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: delta >= 4 ? "boundary" : "run",
        text: commentary,
        timestamp: Date.now(),
      });
      changed = true;
    }

    if (state.eventTrigger?.type === "milestone" && state.eventTrigger.timestamp !== prev.eventTrigger?.timestamp) {
      nextEvents = pushEvent(nextEvents, {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "milestone",
        text: "Milestone reached!",
        timestamp: Date.now(),
      });
      changed = true;
    }

    if (changed) {
      const recentIds = mergeRecentPlayerIds(state.recentPlayerIds || [], [activePlayerIds.strikerId, activePlayerIds.nonStrikerId, activePlayerIds.bowlerId].filter(Boolean) as string[]);
      pushConfigUpdate({
        teamAPlayers: teamA,
        teamBPlayers: teamB,
        dismissedPlayerIds: Array.from(dismissedIds),
        activePlayerIds,
        recentPlayerIds: recentIds,
        lastUsedPlayerIds: recentIds,
        matchEventLog: nextEvents,
      });
    }

    prevStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (activeModal === "wicket") {
      setWicketBowlerName(state.bowler.name);
      if (!newBatsman && availableNextBatters[0]) {
        setNewBatsman(availableNextBatters[0].name);
      }
    }

    if (activeModal === "bowler" && !newPlayerName) {
      const defaultBowler = (overrideBowlerRule ? bowlingPlayers : eligibleBowlers)[0]?.name || "";
      setNewPlayerName(defaultBowler);
    }

    if (activeModal === "batsman" && !newPlayerName && availableNextBatters[0]) {
      setNewPlayerName(availableNextBatters[0].name);
    }
  }, [activeModal, state.bowler.name, availableNextBatters, eligibleBowlers, bowlingPlayers, overrideBowlerRule, newPlayerName, newBatsman]);

  useEffect(() => {
    const teamKey = `crichero-squad-${(state.config.team1 || "TEAMA").toUpperCase()}-vs-${(state.config.team2 || "TEAMB").toUpperCase()}`;

    const hasCurrentSquads = (state.teamAPlayers || []).length > 0 || (state.teamBPlayers || []).length > 0;
    if (!hasCurrentSquads) {
      const raw = localStorage.getItem(teamKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.teamAPlayers && parsed?.teamBPlayers) {
            pushConfigUpdate({
              teamAPlayers: parsed.teamAPlayers,
              teamBPlayers: parsed.teamBPlayers,
              teamABattingOrder: parsed.teamABattingOrder || parsed.teamAPlayers.map((p: any) => p.id),
              teamBBattingOrder: parsed.teamBBattingOrder || parsed.teamBPlayers.map((p: any) => p.id),
            });
          }
        } catch {
          // ignore malformed saved memory
        }
      }
      return;
    }

    localStorage.setItem(teamKey, JSON.stringify({
      teamAPlayers: state.teamAPlayers || [],
      teamBPlayers: state.teamBPlayers || [],
      teamABattingOrder: state.teamABattingOrder || [],
      teamBBattingOrder: state.teamBBattingOrder || [],
    }));
  }, [state.config.team1, state.config.team2, state.teamAPlayers, state.teamBPlayers, state.teamABattingOrder, state.teamBBattingOrder]);

  async function pushDelivery(delivery: any) {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/match-state/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error);
      } else {
        setState(data.state);
        
        if (data.result) {
          if (data.result.inningsComplete) {
            setTimeout(() => {
              if (window.confirm("INNINGS COMPLETE! Do you want to switch innings now?")) {
                fetch("/api/match-state/action/switch-innings", { method: "POST" });
              }
            }, 500);
          } else if (data.result.overComplete) {
            setChangeTarget("bowler");
            setOverrideBowlerRule(false);
            const defaultEligible = eligibleBowlers[0]?.name || "";
            setNewPlayerName(defaultEligible);
            setActiveModal("bowler");
          }
        }
      }
    } catch (err) {
      setErrorMsg("Network error processing delivery.");
    } finally {
      setLoading(false);
    }
  }

  async function pushConfigUpdate(updatedFields: Partial<MatchState>) {
    setLoading(true);
    try {
      await fetch("/api/match-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function undo() {
    try {
      await fetch("/api/match-state/undo", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
  }

  const submitWicket = async () => {
    if (!newBatsman.trim()) {
      setErrorMsg("Please provide the new batsman name.");
      return;
    }

    const outName = wicketDismissed === "striker"
      ? (state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name)
      : (!state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name);

    const dismissalText =
      wicketType === "caught"
        ? `c ${wicketFielderName || "FIELDER"} b ${wicketBowlerName || state.bowler.name}`
        : wicketType === "runout"
          ? `Run Out (${wicketFielderName || "FIELDER"})`
          : wicketType === "lbw"
            ? `lbw b ${wicketBowlerName || state.bowler.name}`
            : wicketType === "stumped"
              ? `st ${wicketFielderName || "WK"} b ${wicketBowlerName || state.bowler.name}`
              : wicketType === "bowled"
                ? `b ${wicketBowlerName || state.bowler.name}`
                : wicketType;

    await pushDelivery({
      ballType: "normal",
      runs: 0,
      isWicket: true,
      wicketType,
      dismissedBatsman: wicketDismissed,
      newBatsmanName: newBatsman,
    });

    const allPlayers = [...teamAPlayers, ...teamBPlayers];
    const outPlayer = allPlayers.find(p => p.name.toUpperCase() === outName.toUpperCase());
    const inPlayer = allPlayers.find(p => p.name.toUpperCase() === newBatsman.toUpperCase());
    const recentIds = mergeRecentPlayerIds(state.recentPlayerIds || [], [outPlayer?.id, inPlayer?.id].filter(Boolean) as string[]);
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "wicket" as const,
      text: `OUT! ${outName} ${dismissalText}.`,
      timestamp: Date.now(),
    };

    await pushConfigUpdate({
      dismissedPlayerIds: outPlayer ? Array.from(new Set([...(state.dismissedPlayerIds || []), outPlayer.id])) : state.dismissedPlayerIds,
      recentPlayerIds: recentIds,
      lastUsedPlayerIds: recentIds,
      matchEventLog: pushEvent(state.matchEventLog || [], event),
    });

    setActiveModal(null);
    setNewBatsman("");
    setWicketFielderName("");
    setWicketBowlerName(state.bowler.name);
    setErrorMsg("");
  };

  const submitPlayerChange = async () => {
    if (!newPlayerName.trim()) return;
    setLoading(true);
    try {
      if (changeTarget === "bowler") {
        await fetch("/api/match-state/action/change-bowler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPlayerName })
        });
      } else {
        await fetch("/api/match-state/action/retire-batsman", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ which: changeTarget, name: newPlayerName, isHurt: false })
        });
      }
    } catch(err) {
      console.error(err);
    } finally {
      const selected = [...teamAPlayers, ...teamBPlayers].find(p => p.name.toUpperCase() === newPlayerName.toUpperCase());
      const recentIds = mergeRecentPlayerIds(state.recentPlayerIds || [], selected?.id ? [selected.id] : []);
      if (selected?.id) {
        pushConfigUpdate({ recentPlayerIds: recentIds, lastUsedPlayerIds: recentIds });
      }
      setLoading(false);
      setActiveModal(null);
      setNewPlayerName("");
      setOverrideBowlerRule(false);
    }
  };

  const submitSettings = () => {
    pushConfigUpdate({ config: settingsForm });
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col overflow-hidden">
      <MatchHeader state={state} />

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <PlayerManager
            state={state}
            pushConfigUpdate={pushConfigUpdate}
            onRequestBatsmanChange={(which, name) => {
              setChangeTarget(which);
              setNewPlayerName(name);
              setActiveModal("batsman");
            }}
            onRequestBowlerChange={(name) => {
              setChangeTarget("bowler");
              setNewPlayerName(name);
              setActiveModal("bowler");
            }}
          />
        </div>
        
        <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
          <ScoreMatrix 
            state={state}
            loading={loading}
            pushDelivery={pushDelivery}
            setActiveModal={setActiveModal}
            errorMsg={errorMsg}
          />
          <MatchContext state={state} />
        </div>
        
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <ProductionMonitor 
            state={state}
            pushConfigUpdate={pushConfigUpdate}
            undo={undo}
            loading={loading}
          />
        </div>
      </div>

      {/* MODALS */}
      {activeModal === "wicket" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-red-600 p-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <AlertCircle /> WICKET FALLEN
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-white/70 hover:text-white"><X /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">DISMISSAL TYPE</label>
                <select 
                  value={wicketType} 
                  onChange={e => setWicketType(e.target.value as WicketType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="runout">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hitwicket">Hit Wicket</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">WHO IS OUT?</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                    <input type="radio" checked={wicketDismissed === "striker"} onChange={() => setWicketDismissed("striker")} className="accent-red-500" />
                    <span className="text-white">{state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name} (Striker)</span>
                  </label>
                  <label className="flex-1 flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                    <input type="radio" checked={wicketDismissed === "non-striker"} onChange={() => setWicketDismissed("non-striker")} className="accent-red-500" />
                    <span className="text-white">{!state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name} (Non-Striker)</span>
                  </label>
                </div>
              </div>

              {(wicketType === "caught" || wicketType === "lbw" || wicketType === "stumped") && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">BOWLER</label>
                  <select
                    value={wicketBowlerName}
                    onChange={e => setWicketBowlerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  >
                    {[state.bowler.name, ...eligibleBowlers.map(p => p.name)].filter((v, i, arr) => arr.indexOf(v) === i).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(wicketType === "caught" || wicketType === "runout" || wicketType === "stumped") && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">FIELDER</label>
                  <input
                    type="text"
                    value={wicketFielderName}
                    onChange={e => setWicketFielderName(e.target.value.toUpperCase())}
                    placeholder="Type fielder name"
                    list="fielder-options"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none uppercase"
                  />
                  <datalist id="fielder-options">
                    {bowlingPlayers.map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">SELECT NEW BATSMAN</label>
                <input
                  type="text"
                  value={newBatsman}
                  onChange={e => setNewBatsman(e.target.value.toUpperCase())}
                  list="new-batsman-options"
                  placeholder="Search next batsman"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none uppercase font-bold"
                />
                <datalist id="new-batsman-options">
                  {availableNextBatters.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-500 mt-1">Only players not yet batting are shown.</p>
              </div>
              <button 
                onClick={submitWicket}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-colors"
              >
                CONFIRM DISMISSAL
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeModal === "batsman" || activeModal === "bowler") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-indigo-600 p-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">CHANGE {activeModal.toUpperCase()}</h3>
              <button onClick={() => setActiveModal(null)} className="text-white/70 hover:text-white"><X /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">SELECT PLAYER</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value.toUpperCase())}
                  list={activeModal === "bowler" ? "eligible-bowler-options" : "eligible-batsman-options"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none uppercase font-bold"
                  autoFocus
                />
                <datalist id="eligible-batsman-options">
                  {availableNextBatters.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <datalist id="eligible-bowler-options">
                  {(overrideBowlerRule ? bowlingPlayers : eligibleBowlers).map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {activeModal === "bowler" && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-amber-300">
                    <input type="checkbox" checked={overrideBowlerRule} onChange={e => setOverrideBowlerRule(e.target.checked)} />
                    Override Rule (allow consecutive over bowler)
                  </label>
                )}
              </div>
              <button 
                onClick={submitPlayerChange}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-colors"
              >
                SAVE PLAYER
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "settings" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-slate-800 p-5 flex items-center justify-between border-b border-slate-700">
              <h3 className="font-bold text-white text-xl flex items-center gap-2"><Settings className="w-5 h-5"/> MATCH CONFIGURATION</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">TEAM 1 (BATTING)</label>
                  <input type="text" value={settingsForm.team1} onChange={e => setSettingsForm({...settingsForm, team1: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">TEAM 2 (BOWLING)</label>
                  <input type="text" value={settingsForm.team2} onChange={e => setSettingsForm({...settingsForm, team2: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">TEAM 1 SHORT</label>
                  <input type="text" value={settingsForm.team1ShortName} onChange={e => setSettingsForm({...settingsForm, team1ShortName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">TEAM 2 SHORT</label>
                  <input type="text" value={settingsForm.team2ShortName} onChange={e => setSettingsForm({...settingsForm, team2ShortName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">TOTAL OVERS</label>
                  <input type="number" value={settingsForm.totalOvers} onChange={e => setSettingsForm({...settingsForm, totalOvers: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">MATCH FORMAT</label>
                  <select value={settingsForm.format} onChange={e => setSettingsForm({...settingsForm, format: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="t20">T20</option>
                    <option value="odi">ODI</option>
                    <option value="test">Test</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

            </div>
            <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-6 py-3 rounded-xl font-bold text-slate-300 hover:bg-slate-800">CANCEL</button>
              <button onClick={submitSettings} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">APPLY SETTINGS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
