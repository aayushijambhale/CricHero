import React, { useMemo, useState } from "react";
import { MatchEventLog, MatchState, PlayerProfile } from "../../types";
import { Search, Plus, Users, Activity, Trophy, Shield } from "lucide-react";

type PlayerTab = "teamA" | "teamB" | "active" | "events";

interface PlayerManagerProps {
  state: MatchState;
  pushConfigUpdate: (config: any) => void;
  onRequestBatsmanChange: (which: "batsman1" | "batsman2", name: string) => void;
  onRequestBowlerChange: (name: string) => void;
}

function idFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeStats(player?: Partial<PlayerProfile>): PlayerProfile["stats"] {
  return {
    runs: player?.stats?.runs ?? 0,
    balls: player?.stats?.balls ?? 0,
    fours: player?.stats?.fours ?? 0,
    sixes: player?.stats?.sixes ?? 0,
    strikeRate: player?.stats?.strikeRate ?? 0,
    overs: player?.stats?.overs ?? 0,
    maidens: player?.stats?.maidens ?? 0,
    wickets: player?.stats?.wickets ?? 0,
    economy: player?.stats?.economy ?? 0,
  };
}

export function PlayerManager({ state, pushConfigUpdate, onRequestBatsmanChange, onRequestBowlerChange }: PlayerManagerProps) {
  const [tab, setTab] = useState<PlayerTab>("active");
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickShort, setQuickShort] = useState("");
  const [quickRole, setQuickRole] = useState<PlayerProfile["role"]>("batsman");
  const [quickTeam, setQuickTeam] = useState<"A" | "B">("A");
  const [dragId, setDragId] = useState<string | null>(null);

  const teamA = state.teamAPlayers || [];
  const teamB = state.teamBPlayers || [];
  const allPlayers = [...teamA, ...teamB];

  const events = state.matchEventLog || [];

  const filteredA = useMemo(() => filterPlayers(teamA, search), [teamA, search]);
  const filteredB = useMemo(() => filterPlayers(teamB, search), [teamB, search]);

  const active = useMemo(() => {
    const strikerName = state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name;
    const nonStrikerName = state.batsman1.isStriker ? state.batsman2.name : state.batsman1.name;
    const bowlerName = state.bowler.name;
    return {
      striker: findByName(allPlayers, strikerName),
      nonStriker: findByName(allPlayers, nonStrikerName),
      bowler: findByName(allPlayers, bowlerName),
    };
  }, [allPlayers, state.batsman1, state.batsman2, state.bowler]);

  const recent = useMemo(() => {
    const ids = state.recentPlayerIds || [];
    return ids.map(id => allPlayers.find(p => p.id === id)).filter(Boolean) as PlayerProfile[];
  }, [state.recentPlayerIds, allPlayers]);

  const lastUsed = useMemo(() => {
    const ids = state.lastUsedPlayerIds || [];
    return ids.map(id => allPlayers.find(p => p.id === id)).filter(Boolean) as PlayerProfile[];
  }, [state.lastUsedPlayerIds, allPlayers]);

  const availableNextBatters = useMemo(() => {
    const activeNames = new Set([state.batsman1.name, state.batsman2.name].map(n => n.toUpperCase()));
    const dismissed = new Set((state.dismissedPlayerIds || []).map(x => x.toLowerCase()));
    const battingTeamPlayers = state.currentInnings === 1 ? teamA : teamB;
    return battingTeamPlayers.filter(p => !activeNames.has(p.name.toUpperCase()) && !dismissed.has(p.id.toLowerCase()));
  }, [state.currentInnings, state.batsman1.name, state.batsman2.name, state.dismissedPlayerIds, teamA, teamB]);

  const eligibleBowlers = useMemo(() => {
    const bowlingTeamPlayers = state.currentInnings === 1 ? teamB : teamA;
    const currentBowlerName = state.bowler.name.toUpperCase();
    return bowlingTeamPlayers.filter(p => p.name.toUpperCase() !== currentBowlerName && (p.role === "bowler" || p.role === "allrounder"));
  }, [state.currentInnings, state.bowler.name, teamA, teamB]);

  function persist(nextA: PlayerProfile[], nextB: PlayerProfile[]) {
    pushConfigUpdate({
      teamAPlayers: nextA,
      teamBPlayers: nextB,
      teamABattingOrder: state.teamABattingOrder?.length ? state.teamABattingOrder : nextA.map(p => p.id),
      teamBBattingOrder: state.teamBBattingOrder?.length ? state.teamBBattingOrder : nextB.map(p => p.id),
    });
  }

  function addPlayerQuick() {
    const name = quickName.trim().toUpperCase();
    const shortName = quickShort.trim().toUpperCase() || name.split(" ").map(x => x[0]).slice(0, 3).join("");
    if (!name) return;

    const player: PlayerProfile = {
      id: `${idFromName(name)}-${Date.now()}`,
      name,
      shortName,
      role: quickRole,
      battingStyle: "RHB",
      bowlingStyle: quickRole === "bowler" ? "Right-arm pace" : "",
      jerseyNumber: Math.floor(Math.random() * 99) + 1,
      stats: normalizeStats(),
    };

    if (quickTeam === "A") {
      persist([...teamA, player], teamB);
    } else {
      persist(teamA, [...teamB, player]);
    }

    setQuickName("");
    setQuickShort("");
  }

  function updateCaptainOrKeeper(team: "A" | "B", playerId: string, field: "isCaptain" | "isWicketkeeper", checked: boolean) {
    const base = team === "A" ? teamA : teamB;
    const next = base.map(p => ({
      ...p,
      [field]: field === "isCaptain" ? (p.id === playerId ? checked : false) : (p.id === playerId ? checked : p.isWicketkeeper),
    }));

    if (team === "A") persist(next, teamB);
    else persist(teamA, next);
  }

  function onDrop(team: "A" | "B", overId: string) {
    if (!dragId || dragId === overId) return;
    const base = team === "A" ? [...teamA] : [...teamB];
    const from = base.findIndex(p => p.id === dragId);
    const to = base.findIndex(p => p.id === overId);
    if (from < 0 || to < 0) return;
    const [moved] = base.splice(from, 1);
    base.splice(to, 0, moved);

    if (team === "A") {
      pushConfigUpdate({ teamAPlayers: base, teamABattingOrder: base.map(p => p.id) });
    } else {
      pushConfigUpdate({ teamBPlayers: base, teamBBattingOrder: base.map(p => p.id) });
    }
    setDragId(null);
  }

  function renderPlayerList(team: "A" | "B", items: PlayerProfile[]) {
    return (
      <div className="space-y-2">
        {items.map((p, idx) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => setDragId(p.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(team, p.id)}
            className="p-3 rounded-xl border border-slate-700 bg-slate-900/70 backdrop-blur-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-black text-cyan-300">
                {p.shortName.slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-black text-white">{idx + 1}. {p.name}</div>
                <div className="text-[10px] text-slate-500 uppercase">{p.role} • #{p.jerseyNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 flex items-center gap-1">
                <input type="checkbox" checked={Boolean(p.isCaptain)} onChange={e => updateCaptainOrKeeper(team, p.id, "isCaptain", e.target.checked)} /> C
              </label>
              <label className="text-[10px] text-slate-400 flex items-center gap-1">
                <input type="checkbox" checked={Boolean(p.isWicketkeeper)} onChange={e => updateCaptainOrKeeper(team, p.id, "isWicketkeeper", e.target.checked)} /> WK
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3 h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-cyan-300 tracking-widest flex items-center gap-2"><Users className="w-4 h-4"/>PLAYER MANAGER</h3>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <TabButton label="TEAM A" active={tab === "teamA"} onClick={() => setTab("teamA")} />
        <TabButton label="TEAM B" active={tab === "teamB"} onClick={() => setTab("teamB")} />
        <TabButton label="ACTIVE" active={tab === "active"} onClick={() => setTab("active")} />
        <TabButton label="EVENTS" active={tab === "events"} onClick={() => setTab("events")} />
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70">
        <Search className="w-3.5 h-3.5 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players (e.g. vir)..."
          className="bg-transparent outline-none text-xs text-slate-200 w-full"
        />
      </div>

      {tab === "teamA" && <div className="flex-1 overflow-y-auto pr-1">{renderPlayerList("A", filteredA)}</div>}
      {tab === "teamB" && <div className="flex-1 overflow-y-auto pr-1">{renderPlayerList("B", filteredB)}</div>}

      {tab === "active" && (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <ActiveBar title="Current Striker" player={active.striker} neon="cyan" onPick={() => active.striker && onRequestBatsmanChange(state.batsman1.isStriker ? "batsman1" : "batsman2", active.striker.name)} />
          <ActiveBar title="Current Non-Striker" player={active.nonStriker} neon="indigo" onPick={() => active.nonStriker && onRequestBatsmanChange(state.batsman1.isStriker ? "batsman2" : "batsman1", active.nonStriker.name)} />
          <ActiveBar title="Current Bowler" player={active.bowler} neon="amber" onPick={() => active.bowler && onRequestBowlerChange(active.bowler.name)} />

          <div className="grid grid-cols-2 gap-2">
            <SelectorCard
              title="Select New Batsman"
              options={availableNextBatters}
              onSelect={name => onRequestBatsmanChange(state.batsman1.isStriker ? "batsman2" : "batsman1", name)}
            />
            <SelectorCard
              title="Eligible Bowlers"
              options={eligibleBowlers}
              onSelect={name => onRequestBowlerChange(name)}
              allowOverride
              allOptions={state.currentInnings === 1 ? teamB : teamA}
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
            <div className="text-[10px] text-slate-500 uppercase mb-2">Live Active Player Bar</div>
            <div className="text-xs text-slate-300">Last wicket: <span className="text-red-400 font-bold">{state.lastWicket ? `${state.lastWicket.name} ${state.lastWicket.runs}(${state.lastWicket.balls})` : "None"}</span></div>
            <div className="text-xs text-slate-300">Partnership: <span className="text-emerald-400 font-bold">{state.partnershipRuns} ({state.partnershipBalls})</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniList title="Recent Players" items={recent} icon={<Activity className="w-3 h-3" />} />
            <MiniList title="Last Used" items={lastUsed} icon={<Trophy className="w-3 h-3" />} />
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {events.length === 0 && <div className="text-xs text-slate-500">No match events yet.</div>}
          {[...events].reverse().slice(0, 80).map((e: MatchEventLog) => (
            <div key={e.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
              <div className="text-[10px] uppercase text-slate-500">{e.type}</div>
              <div className="text-xs text-slate-200 font-medium">{e.text}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Quick Player Entry</div>
        <div className="grid grid-cols-12 gap-2">
          <input
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlayerQuick()}
            placeholder="Name"
            className="col-span-5 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
          />
          <input
            value={quickShort}
            onChange={e => setQuickShort(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlayerQuick()}
            placeholder="Short"
            className="col-span-2 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
          />
          <select
            value={quickRole}
            onChange={e => setQuickRole(e.target.value as PlayerProfile["role"])}
            className="col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="allrounder">Allrounder</option>
            <option value="wicketkeeper">Wicketkeeper</option>
          </select>
          <select
            value={quickTeam}
            onChange={e => setQuickTeam(e.target.value as "A" | "B")}
            className="col-span-1 bg-slate-950 border border-slate-700 rounded px-1 py-1.5 text-xs text-slate-200"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
          <button
            onClick={addPlayerQuick}
            className="col-span-1 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded flex items-center justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 rounded-lg text-[10px] font-black tracking-wider border ${active ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300" : "bg-slate-900/70 border-slate-800 text-slate-500 hover:text-slate-300"}`}
    >
      {label}
    </button>
  );
}

function ActiveBar({ title, player, neon, onPick }: { title: string; player?: PlayerProfile; neon: "cyan" | "indigo" | "amber"; onPick: () => void }) {
  const neonCls = neon === "cyan" ? "from-cyan-500/10 border-cyan-500/40 text-cyan-300" : neon === "indigo" ? "from-indigo-500/10 border-indigo-500/40 text-indigo-300" : "from-amber-500/10 border-amber-500/40 text-amber-300";
  return (
    <button onClick={onPick} className={`w-full text-left rounded-xl border bg-gradient-to-r to-slate-900/70 p-3 ${neonCls}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{title}</div>
      <div className="text-sm font-black text-white mt-1">{player?.name || "Select Player"}</div>
      <div className="text-[10px] text-slate-500 mt-1">{player ? `${player.role} • ${player.stats.runs}(${player.stats.balls})` : "No player selected"}</div>
    </button>
  );
}

function SelectorCard({
  title,
  options,
  onSelect,
  allowOverride,
  allOptions,
}: {
  title: string;
  options: PlayerProfile[];
  onSelect: (name: string) => void;
  allowOverride?: boolean;
  allOptions?: PlayerProfile[];
}) {
  const [value, setValue] = useState("");
  const [overrideRule, setOverrideRule] = useState(false);
  const pool = overrideRule && allOptions ? allOptions : options;
  const filtered = filterPlayers(pool, value).slice(0, 8);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
      <div className="text-[10px] uppercase text-slate-500 mb-1">{title}</div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type to search"
        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
      />
      {allowOverride && (
        <label className="mt-1 flex items-center gap-2 text-[10px] text-amber-300">
          <input type="checkbox" checked={overrideRule} onChange={e => setOverrideRule(e.target.checked)} />
          Override Rule (allow consecutive bowler)
        </label>
      )}
      <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => {
              onSelect(p.name);
              setValue("");
            }}
            className="w-full text-left text-xs px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            {p.name} <span className="text-slate-500">({p.shortName})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniList({ title, items, icon }: { title: string; items: PlayerProfile[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
      <div className="text-[10px] uppercase text-slate-500 mb-1 flex items-center gap-1">{icon}{title}</div>
      <div className="space-y-1">
        {items.length === 0 && <div className="text-[10px] text-slate-600">No players</div>}
        {items.slice(0, 5).map(p => (
          <div key={p.id} className="text-xs text-slate-200">{p.name}</div>
        ))}
      </div>
    </div>
  );
}

function filterPlayers(players: PlayerProfile[], term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return players;
  return players.filter(p => p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q));
}

function findByName(players: PlayerProfile[], name: string) {
  const n = name.trim().toUpperCase();
  return players.find(p => p.name.toUpperCase() === n || p.shortName.toUpperCase() === n);
}
