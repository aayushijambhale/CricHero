import React, { useState, useEffect } from "react";
import { MatchState, WicketType } from "../types";
import { Settings, X, AlertCircle } from "lucide-react";
import { io } from "socket.io-client";

import { MatchHeader } from "./controller/MatchHeader";
import { MatchPlayers } from "./controller/MatchPlayers";
import { MatchContext } from "./controller/MatchContext";
import { ScoreMatrix } from "./controller/ScoreMatrix";
import { ProductionMonitor } from "./controller/ProductionMonitor";

interface Props {
  initialState: MatchState;
  onNavigate?: (screen: string) => void;
}

export default function UnifiedController({ initialState, onNavigate }: Props) {
  const [state, setState] = useState<MatchState>(initialState);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeModal, setActiveModal] = useState<"matchSelector" | "settings" | "batsman" | "bowler" | "wicket" | null>(null);

  const [wicketType, setWicketType] = useState<WicketType>("bowled");
  const [wicketDismissed, setWicketDismissed] = useState<"striker" | "non-striker">("striker");
  const [newBatsman, setNewBatsman] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [changeTarget, setChangeTarget] = useState<"batsman1" | "batsman2" | "bowler">("batsman1");

  const [settingsForm, setSettingsForm] = useState(state.config);

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          setState(data);
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
          setState(eventData.payload);
          setSettingsForm(eventData.payload.config);
        }
      } catch (err) {
        console.error("Failed to parse Socket event", err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
            setNewPlayerName("");
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
      setLoading(false);
      setActiveModal(null);
      setNewPlayerName("");
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
          <MatchPlayers 
            state={state} 
            setChangeTarget={setChangeTarget} 
            setNewPlayerName={setNewPlayerName}
            setActiveModal={setActiveModal} 
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

      {(activeModal === "batsman" || activeModal === "bowler") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
