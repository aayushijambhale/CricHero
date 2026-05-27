import React from "react";
import { MatchState } from "../../types";
import { Activity, Clock } from "lucide-react";
import { motion } from "motion/react";

interface MatchHeaderProps {
  state: MatchState;
}

export function MatchHeader({ state }: MatchHeaderProps) {
  const overStr = `${Math.floor(state.balls / 6)}.${state.balls % 6}`;

  return (
    <div className="flex bg-slate-950 border-b border-slate-800 h-16 items-center shadow-xl shadow-black/50 z-10 relative">
      {/* LEFT: LIVE + Match Meta */}
      <div className="flex items-center h-full w-1/3">
        <div className="flex items-center justify-center h-full px-6 bg-red-600 border-r border-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <Activity className="w-5 h-5 text-white" />
            <span className="text-white font-black tracking-widest text-lg font-mono">LIVE</span>
          </motion.div>
        </div>
        <div className="px-6 flex flex-col justify-center">
          <span className="text-slate-300 font-bold text-sm uppercase tracking-wider">{state.config.format.toUpperCase()} MATCH</span>
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
             {state.config.team1ShortName} vs {state.config.team2ShortName}
          </span>
        </div>
      </div>

      {/* CENTER: Massive Score */}
      <div className="flex-1 flex justify-center items-center gap-8 h-full bg-slate-900/50">
         <div className="flex flex-col items-end justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CRR</span>
            <span className="font-mono font-bold text-slate-300">{state.currentRunRate.toFixed(2)}</span>
         </div>
         
         <div className="flex items-baseline gap-3">
           <span className="text-4xl font-black font-mono text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
             {state.runs}-{state.wickets}
           </span>
           <span className="text-xl font-bold font-mono text-slate-400">({overStr})</span>
         </div>

         {state.currentInnings === 2 && state.target && (
            <div className="flex flex-col items-start justify-center">
               <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">RRR</span>
               <span className="font-mono font-bold text-indigo-300">{state.requiredRunRate?.toFixed(2)}</span>
            </div>
         )}
         {state.currentInnings === 1 && (
            <div className="flex flex-col items-start justify-center">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PROJ</span>
               <span className="font-mono font-bold text-slate-400">{state.projectedScore}</span>
            </div>
         )}
      </div>

      {/* RIGHT: Production Status */}
      <div className="w-1/3 h-full flex justify-end items-center pr-6 gap-6 bg-gradient-to-l from-slate-950 to-transparent">
         <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold text-slate-500 uppercase">SYS_TIME</span>
           <span className="font-mono text-sm text-slate-300 flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {new Date().toLocaleTimeString()}
           </span>
         </div>
         <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold text-slate-500 uppercase">OPERATOR</span>
           <span className="text-sm font-bold text-cyan-400">GUEST</span>
         </div>
         <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
           <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
           <span className="font-mono text-xs font-bold text-green-500">CONNECTED</span>
         </div>
      </div>
    </div>
  );
}
