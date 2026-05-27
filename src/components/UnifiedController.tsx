/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, KeyboardEvent } from "react";
import { MatchState, WicketType } from "../types";
import { 
  Users, Settings, RefreshCw, Play, Tv, Sparkles, AlertCircle, History, Radio, X
} from "lucide-react";

interface Props {
  initialState: MatchState;
  onNavigate?: (screen: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UnifiedController({ initialState, onNavigate }: Props) {
  const [state, setState] = useState<MatchState>(initialState);
  const [loading, setLoading] = useState(false);

  // ─── Modals (Popups) ───
  const [activeModal, setActiveModal] = useState<"settings" | "batsman" | "bowler" | "wicket" | "dls" | null>(null);

  // Delivery Input
  const [deliveryInput, setDeliveryInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Wicket Modal State
  const [wicketType, setWicketType] = useState<WicketType>("bowled");
  const [wicketDismissed, setWicketDismissed] = useState<"striker" | "non-striker">("striker");
  const [newBatsman, setNewBatsman] = useState("");

  // Change Player Modal State
  const [newPlayerName, setNewPlayerName] = useState("");
  const [changeTarget, setChangeTarget] = useState<"batsman1" | "batsman2" | "bowler">("batsman1");

  // Settings State
  const [settingsForm, setSettingsForm] = useState(state.config);

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) setState(data);
      } catch (err) {
        console.error("Failed to fetch initial controller state", err);
      }
    }
    fetchState();

    const sse = new EventSource("/api/events");
    sse.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.event === "update" || parsed.event === "initial") {
          setState(parsed.data);
          setSettingsForm(parsed.data.config);
        }
      } catch (err) {
        console.error("Failed to parse SSE", err);
      }
    };
    return () => sse.close();
  }, []);

  // ─── API Actions ───

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
        setDeliveryInput("");
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

  // ─── Handlers ───

  const handleDeliverySubmit = () => {
    if (!deliveryInput.trim()) return;
    pushDelivery(deliveryInput);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleDeliverySubmit();
    }
  };

  const handleQuickRun = (runs: number) => {
    pushDelivery({ ballType: "normal", runs, isWicket: false });
  };

  const handleQuickExtra = (type: "wide" | "noball" | "bye" | "legbye") => {
    pushDelivery({ ballType: type, runs: 0, isWicket: false });
  };

  const submitWicket = () => {
    if (!newBatsman.trim()) {
      setErrorMsg("Please provide the new batsman name.");
      return;
    }
    pushDelivery({
      ballType: "normal",
      runs: 0,
      isWicket: true,
      wicketType,
      dismissedBatsman: wicketDismissed,
      newBatsmanName: newBatsman,
    });
    setActiveModal(null);
    setNewBatsman("");
    setErrorMsg("");
  };

  const submitPlayerChange = () => {
    if (!newPlayerName.trim()) return;
    
    // Fetch current state and update
    const stateCopy = JSON.parse(JSON.stringify(state));
    if (changeTarget === "batsman1") {
      stateCopy.batsman1.name = newPlayerName;
    } else if (changeTarget === "batsman2") {
      stateCopy.batsman2.name = newPlayerName;
    } else if (changeTarget === "bowler") {
      stateCopy.bowler.name = newPlayerName;
      stateCopy.bowler.runs = 0;
      stateCopy.bowler.wickets = 0;
      stateCopy.bowler.balls = 0;
      stateCopy.bowler.dots = 0;
      stateCopy.bowler.wides = 0;
      stateCopy.bowler.noBalls = 0;
    }
    
    pushConfigUpdate(stateCopy);
    setActiveModal(null);
    setNewPlayerName("");
  };

  const submitSettings = () => {
    pushConfigUpdate({ config: settingsForm });
    setActiveModal(null);
  };

  const overStr = `${Math.floor(state.balls / 6)}.${state.balls % 6}`;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 overflow-hidden flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">ICC MATCH CONTROLLER</h1>
            <p className="text-sm text-indigo-400 font-semibold">{state.config.team1} vs {state.config.team2}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-4xl font-black text-white tracking-tighter">
              {state.runs}-{state.wickets}
            </div>
            <div className="text-slate-400 font-medium tracking-wide text-sm">
              OVERS: <span className="text-indigo-400 font-bold">{overStr}</span>
            </div>
          </div>
          <div className="w-px h-12 bg-slate-800" />
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveModal("settings")}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
            >
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
            {onNavigate && (
              <button 
                onClick={() => onNavigate("launcher")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-bold shadow-lg shadow-indigo-600/20"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Match Details & Players */}
        <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-400 mb-4 tracking-wider">CURRENT BATSMEN</h2>
            
            <div className="space-y-3">
              {[state.batsman1, state.batsman2].map((bat, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${bat.isStriker ? "bg-indigo-900/30 border-indigo-500/50" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"}`}
                  onClick={() => {
                    setChangeTarget(idx === 0 ? "batsman1" : "batsman2");
                    setNewPlayerName(bat.name);
                    setActiveModal("batsman");
                  }}
                >
                  <div className="flex items-center gap-3">
                    {bat.isStriker && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    <span className="font-bold text-slate-200">{bat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white text-lg">{bat.runs}</span>
                    <span className="text-slate-400 text-xs ml-1">({bat.balls})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-400 mb-4 tracking-wider flex items-center justify-between">
              CURRENT BOWLER
              <button 
                onClick={() => {
                  setChangeTarget("bowler");
                  setNewPlayerName(state.bowler.name);
                  setActiveModal("bowler");
                }}
                className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 hover:text-white"
              >
                Change
              </button>
            </h2>
            
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-200">{state.bowler.name}</span>
              <div className="text-right">
                <span className="font-bold text-white text-lg">{state.bowler.wickets}-{state.bowler.runs}</span>
                <span className="text-slate-400 text-xs ml-1">({Math.floor(state.bowler.balls / 6)}.{state.bowler.balls % 6})</span>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {state.thisOver.map((b, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-slate-700">
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1">
            <h2 className="text-sm font-bold text-slate-400 mb-4 tracking-wider">MATCH METRICS</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Run Rate</span>
                <span className="font-bold text-white">{state.currentRunRate.toFixed(2)}</span>
              </div>
              {state.currentInnings === 2 && state.target && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Run Rate</span>
                    <span className="font-bold text-indigo-400">{state.requiredRunRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target</span>
                    <span className="font-bold text-white">{state.target}</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Center Column: Controller Input */}
        <div className="col-span-6 flex flex-col gap-6">
          
          <div className="bg-slate-900 border-2 border-indigo-500/20 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <Tv className="text-indigo-500" />
                DELIVERY INPUT
              </h2>
              {state.freeHit && (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-full text-sm font-bold animate-pulse">
                  FREE HIT ACTIVE
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Shorthand Professional Input */}
            <div className="mb-8 relative">
              <input 
                type="text" 
                value={deliveryInput}
                onChange={(e) => setDeliveryInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Type delivery (e.g. 1, 4, WD, NB+6, W-st) & press Enter"
                className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-6 py-5 text-2xl font-mono text-white focus:border-indigo-500 focus:outline-none transition-colors shadow-inner"
              />
              <button 
                onClick={handleDeliverySubmit}
                disabled={loading || !deliveryInput}
                className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold tracking-wider transition-colors shadow-lg"
              >
                ENTER
              </button>
            </div>

            <div className="w-full h-px bg-slate-800 mb-8" />

            {/* Quick Action Pads */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <button 
                  key={runs}
                  onClick={() => handleQuickRun(runs)}
                  disabled={loading}
                  className={`py-6 rounded-2xl font-black text-2xl shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0
                    ${runs === 4 || runs === 6 
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-800 text-white" 
                      : "bg-slate-800 border-slate-900 text-slate-200 hover:bg-slate-700"}`}
                >
                  {runs === 0 ? "DOT" : runs}
                </button>
              ))}
              
              <button 
                onClick={() => setActiveModal("wicket")}
                disabled={loading}
                className="col-span-2 py-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 border-b-4 border-red-900 text-white font-black text-2xl shadow-lg shadow-red-500/20 active:translate-y-1 active:border-b-0"
              >
                WICKET
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "WIDE", type: "wide", color: "bg-amber-600", border: "border-amber-800" },
                { label: "NO BALL", type: "noball", color: "bg-orange-600", border: "border-orange-800" },
                { label: "BYE", type: "bye", color: "bg-slate-700", border: "border-slate-900" },
                { label: "LEG BYE", type: "legbye", color: "bg-slate-700", border: "border-slate-900" }
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={() => handleQuickExtra(btn.type as any)}
                  disabled={loading}
                  className={`py-4 rounded-xl ${btn.color} border-b-4 ${btn.border} text-white font-bold tracking-wider shadow-md active:translate-y-1 active:border-b-0 transition-all`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: Settings & Utilities */}
        <div className="col-span-3 flex flex-col gap-6">
          
          <button 
            onClick={undo}
            disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-300 transition-colors shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            UNDO LAST DELIVERY
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col">
            <h2 className="text-sm font-bold text-slate-400 mb-4 tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              BROADCAST PREVIEW
            </h2>
            
            {/* Fake Preview Box */}
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative group">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-slate-600 font-medium">Mini Preview Active</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 h-12 bg-slate-900 border border-slate-700 rounded-lg flex shadow-2xl overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-16 bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">{state.config.team1ShortName}</div>
                <div className="flex-1 flex items-center px-4 font-bold text-white">{state.runs}-{state.wickets} <span className="text-slate-400 ml-2 font-normal text-xs">{overStr}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Overlay Visible</span>
                <button 
                  onClick={() => pushConfigUpdate({ overlayVisible: !state.overlayVisible })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${state.overlayVisible ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${state.overlayVisible ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Score Strip</span>
                <button 
                  onClick={() => pushConfigUpdate({ scoreStripVisible: !state.scoreStripVisible })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${state.scoreStripVisible ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${state.scoreStripVisible ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Modals Rendering ─── */}

      {/* Wicket Modal */}
      {activeModal === "wicket" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
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
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">NEW BATSMAN NAME</label>
                <input 
                  type="text" 
                  value={newBatsman} 
                  onChange={e => setNewBatsman(e.target.value.toUpperCase())}
                  placeholder="E.g. VIRAT K."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none uppercase font-bold"
                />
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

      {/* Player Change Modal (Batsman/Bowler) */}
      {(activeModal === "batsman" || activeModal === "bowler") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-indigo-600 p-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">CHANGE {activeModal.toUpperCase()}</h3>
              <button onClick={() => setActiveModal(null)} className="text-white/70 hover:text-white"><X /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">NEW PLAYER NAME</label>
                <input 
                  type="text" 
                  value={newPlayerName} 
                  onChange={e => setNewPlayerName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none uppercase font-bold"
                  autoFocus
                />
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

      {/* Match Settings Modal */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
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
