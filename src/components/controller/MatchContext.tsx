import React, { useState, useEffect, useRef } from "react";
import { MatchState } from "../../types";
import { motion, AnimatePresence } from "motion/react";

interface MatchContextProps {
  state: MatchState;
}

export function MatchContext({ state }: MatchContextProps) {
  const [activeTab, setActiveTab] = useState<"over" | "momentum" | "comm" | "partnership">("over");
  const commRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "comm" && commRef.current) {
      commRef.current.scrollTop = commRef.current.scrollHeight;
    }
  }, [state.ballHistory, activeTab]);

  return (
    <div className="flex-1 bg-[#071226] border border-slate-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 bg-[#020617]">
        {[
          { id: "over", label: "CURRENT OVER" },
          { id: "momentum", label: "MOMENTUM" },
          { id: "comm", label: "COMMENTARY" },
          { id: "partnership", label: "PARTNERSHIP" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[10px] font-bold tracking-widest transition-colors relative ${
              activeTab === tab.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 relative p-4 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          
          {activeTab === "over" && (
            <motion.div 
              key="over"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col justify-center items-center gap-4"
            >
              <span className="text-xs font-bold text-slate-500 tracking-widest">BALLS THIS OVER</span>
              <div className="flex flex-wrap justify-center gap-2">
                {state.thisOver.map((b, i) => {
                  let color = "bg-slate-800 border-slate-700 text-slate-300";
                  if (b.includes("4")) color = "bg-indigo-900 border-indigo-500 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]";
                  if (b.includes("6")) color = "bg-purple-900 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]";
                  if (b.includes("W")) color = "bg-red-900 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                  
                  return (
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                      key={i} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black border ${color}`}
                    >
                      {b}
                    </motion.div>
                  );
                })}
                {state.thisOver.length === 0 && (
                  <span className="text-slate-600 font-mono text-sm">Over just started...</span>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "momentum" && (
            <motion.div 
              key="momentum"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-slate-500 tracking-widest">PRESSURE METER</span>
                <span className={`text-sm font-black ${state.pressureState.score > 50 ? "text-red-400" : "text-green-400"}`}>
                  {state.pressureState.level.toUpperCase()}
                </span>
              </div>
              
              <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                 <motion.div 
                   className={`absolute top-0 bottom-0 left-0 ${state.pressureState.score > 50 ? "bg-red-500" : "bg-green-500"}`} 
                   animate={{ width: `${Math.max(10, state.pressureState.score)}%` }} 
                 />
              </div>

              <div className="flex justify-between mt-auto">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 font-bold uppercase">WIN PROBABILITY</span>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-sm font-black font-mono text-cyan-400">{state.winProbability.battingTeam.toFixed(0)}%</span>
                     <span className="text-[10px] text-slate-600">vs</span>
                     <span className="text-sm font-black font-mono text-pink-400">{state.winProbability.bowlingTeam.toFixed(0)}%</span>
                   </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === "comm" && (
            <motion.div 
              key="comm"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 scroll-smooth"
              ref={commRef}
            >
              {state.ballHistory.slice(-15).map((ball, idx) => (
                <div key={idx} className="flex gap-3 text-xs font-mono border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-500 shrink-0 w-8">{ball.overNumber}.{ball.overBall}</span>
                  <div className="flex-1">
                    <span className="text-slate-300">{ball.rawInput || ball.ballType}</span>
                    {ball.isWicket && <span className="ml-2 px-1.5 py-0.5 bg-red-900/50 text-red-400 border border-red-500/50 rounded uppercase text-[8px] font-sans font-bold">Wicket</span>}
                    {ball.isBoundary && <span className="ml-2 px-1.5 py-0.5 bg-indigo-900/50 text-indigo-400 border border-indigo-500/50 rounded uppercase text-[8px] font-sans font-bold">Boundary</span>}
                  </div>
                </div>
              ))}
              {state.ballHistory.length === 0 && (
                <span className="text-slate-600 font-mono text-sm text-center mt-4">No events yet</span>
              )}
            </motion.div>
          )}

          {activeTab === "partnership" && (
            <motion.div 
              key="partnership"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col justify-center gap-6"
            >
              <div className="text-center">
                <span className="text-3xl font-black font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {state.partnershipRuns} <span className="text-lg text-slate-400">({state.partnershipBalls})</span>
                </span>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">CURRENT PARTNERSHIP</p>
              </div>
              
              <div className="flex justify-between items-end px-4">
                 <div className="flex flex-col gap-1 w-1/3">
                    <span className="text-xs font-bold text-slate-300 truncate">{state.batsman1.name}</span>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (state.batsman1.runs / (state.partnershipRuns || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-400">{state.batsman1.runs} ({state.batsman1.balls})</span>
                 </div>
                 <div className="text-[10px] font-bold text-slate-600">CONTRIBUTION</div>
                 <div className="flex flex-col gap-1 w-1/3 items-end">
                    <span className="text-xs font-bold text-slate-300 truncate">{state.batsman2.name}</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex justify-end">
                       <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (state.batsman2.runs / (state.partnershipRuns || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-400">{state.batsman2.runs} ({state.batsman2.balls})</span>
                 </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
