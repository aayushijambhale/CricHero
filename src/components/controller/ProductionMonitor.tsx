import React from "react";
import { MatchState } from "../../types";
import { Monitor, Radio, Layers, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";

interface ProductionMonitorProps {
  state: MatchState;
  pushConfigUpdate: (config: any) => void;
  undo: () => void;
  loading: boolean;
}

export function ProductionMonitor({ state, pushConfigUpdate, undo, loading }: ProductionMonitorProps) {
  return (
    <div className="flex-1 flex flex-col gap-4">
      
      {/* PROGRAM MONITOR (Red) */}
      <div className="flex-1 bg-[#020617] rounded-xl border-2 border-red-600/50 overflow-hidden flex flex-col shadow-[0_0_20px_rgba(220,38,38,0.1)] relative group">
        <div className="bg-red-950/50 px-3 py-1 flex justify-between items-center border-b border-red-900/50">
          <div className="flex items-center gap-2">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-400 tracking-widest">PROGRAM OUT</span>
          </div>
          <span className="text-[10px] font-mono text-red-500/50">1080p60</span>
        </div>
        
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <span className="text-slate-700 font-bold text-xs uppercase tracking-widest">Live Output</span>
          
          {/* Mock Graphics */}
          {state.scoreStripVisible && (
            <div className="absolute bottom-4 left-4 right-4 h-10 bg-gradient-to-r from-slate-900 to-[#0f172a] border border-slate-700 rounded shadow-2xl flex items-center overflow-hidden">
               <div className="w-12 bg-indigo-600 flex items-center justify-center font-black text-white text-[10px]">{state.config.team1ShortName}</div>
               <div className="px-3 font-bold font-mono text-white text-sm">{state.runs}-{state.wickets}</div>
               <div className="px-2 font-mono text-slate-400 text-xs">({Math.floor(state.balls / 6)}.{state.balls % 6})</div>
            </div>
          )}
        </div>
      </div>

      {/* TRANSITION BAR */}
      <div className="bg-[#0f172a] rounded-lg p-2 border border-slate-700 flex justify-between items-center">
         <div className="flex gap-2">
            <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 border border-slate-600 transition-colors">CUT</button>
            <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 border border-slate-600 transition-colors">AUTO</button>
         </div>
         <div className="flex-1 px-4">
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-slate-500" />
            </div>
         </div>
         <div className="flex gap-2">
           <button 
             onClick={undo}
             disabled={loading}
             className="px-3 py-1 bg-red-950 hover:bg-red-900 rounded text-[10px] font-bold text-red-400 border border-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
           >
             <RefreshCcw className="w-3 h-3" /> UNDO
           </button>
         </div>
      </div>

      {/* OVERLAY STATUS & QUEUE */}
      <div className="bg-[#071226] border border-slate-700/50 rounded-xl p-3 flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-slate-500 tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
          <Layers className="w-3 h-3" /> GRAPHICS CONTROL
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
             <span className="text-xs text-slate-400 font-medium">Main Score Strip</span>
             <button 
                onClick={() => pushConfigUpdate({ scoreStripVisible: !state.scoreStripVisible })}
                className={`w-10 h-5 rounded-full transition-colors relative ${state.scoreStripVisible ? "bg-red-600" : "bg-slate-700"}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${state.scoreStripVisible ? "left-6" : "left-1"}`} />
              </button>
          </div>
          <div className="flex items-center justify-between">
             <span className="text-xs text-slate-400 font-medium">Full Screen Overlay</span>
             <button 
                onClick={() => pushConfigUpdate({ overlayVisible: !state.overlayVisible })}
                className={`w-10 h-5 rounded-full transition-colors relative ${state.overlayVisible ? "bg-red-600" : "bg-slate-700"}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${state.overlayVisible ? "left-6" : "left-1"}`} />
              </button>
          </div>
        </div>

        {/* Mock Graphics Queue */}
        <div className="mt-2 border-t border-slate-800 pt-2">
           <span className="text-[10px] text-slate-500 font-bold tracking-widest mb-2 block">GRAPHICS QUEUE (AUTO)</span>
           <div className="flex flex-col gap-1">
             <motion.div 
               initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
               className="bg-indigo-950/50 border border-indigo-900 p-2 rounded text-xs text-indigo-300 font-bold flex justify-between"
             >
               <span>FOUR_ANIMATION</span>
               <span className="text-indigo-500 text-[10px]">READY</span>
             </motion.div>
           </div>
        </div>
      </div>

    </div>
  );
}
