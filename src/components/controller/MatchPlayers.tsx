import React from "react";
import { MatchState } from "../../types";
import { motion } from "motion/react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface MatchPlayersProps {
  state: MatchState;
  setChangeTarget: (target: "batsman1" | "batsman2" | "bowler") => void;
  setNewPlayerName: (name: string) => void;
  setActiveModal: (modal: "batsman" | "bowler") => void;
}

export function MatchPlayers({ state, setChangeTarget, setNewPlayerName, setActiveModal }: MatchPlayersProps) {
  
  const renderBatsman = (bat: any, idx: number) => {
    const isStriker = bat.isStriker;
    const strikeRateTrend = bat.strikeRate > 120 ? "up" : bat.strikeRate < 100 ? "down" : "flat";
    
    return (
      <div 
        key={idx}
        onClick={() => {
          setChangeTarget(idx === 0 ? "batsman1" : "batsman2");
          setNewPlayerName(bat.name);
          setActiveModal("batsman");
        }}
        className={`relative p-3 rounded-lg border cursor-pointer transition-all overflow-hidden ${
          isStriker 
            ? "bg-gradient-to-r from-indigo-950 to-[#0f172a] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
            : "bg-[#071226] border-slate-800 hover:border-slate-700 hover:bg-slate-900"
        }`}
      >
        {isStriker && (
           <motion.div 
             animate={{ opacity: [0.3, 0.6, 0.3] }}
             transition={{ duration: 2, repeat: Infinity }}
             className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
           />
        )}
        
        <div className="flex justify-between items-start pl-2">
           <div className="flex flex-col">
             <span className={`text-sm font-black tracking-wide ${isStriker ? "text-white" : "text-slate-400"}`}>{bat.name}</span>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] text-slate-500 font-bold uppercase">SR:</span>
               <span className="font-mono text-xs text-slate-300">{bat.strikeRate.toFixed(1)}</span>
               {strikeRateTrend === "up" && <ChevronUp className="w-3 h-3 text-green-400" />}
               {strikeRateTrend === "down" && <ChevronDown className="w-3 h-3 text-red-400" />}
             </div>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1 rounded border border-slate-700">{bat.fours}x4</span>
               <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1 rounded border border-slate-700">{bat.sixes}x6</span>
             </div>
           </div>
           
           <div className="flex items-baseline gap-1">
             <motion.span 
                key={bat.runs}
                initial={{ scale: 1.5, color: "#22d3ee" }}
                animate={{ scale: 1, color: isStriker ? "#ffffff" : "#cbd5e1" }}
                className="text-3xl font-black font-mono drop-shadow-md"
             >
               {bat.runs}
             </motion.span>
             <span className="text-xs font-bold font-mono text-slate-500">({bat.balls})</span>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      {/* Batting Team Banner */}
      <div className="bg-[#020617] border border-slate-800 rounded-lg p-2 flex justify-between items-center shadow-lg">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">BATTING</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ backgroundColor: state.config.team1Color }} />
            <span className="font-black text-slate-300 text-xs tracking-widest">{state.currentInnings === 1 ? state.config.team1ShortName : state.config.team2ShortName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {renderBatsman(state.batsman1, 0)}
        {renderBatsman(state.batsman2, 1)}
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-2" />

      {/* Bowling Team Banner */}
      <div className="bg-[#020617] border border-slate-800 rounded-lg p-2 flex justify-between items-center shadow-lg">
        <div className="flex flex-col text-right w-full">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">BOWLING</span>
          <div className="flex items-center justify-end gap-2">
            <span className="font-black text-slate-300 text-xs tracking-widest">{state.currentInnings === 1 ? state.config.team2ShortName : state.config.team1ShortName}</span>
            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ backgroundColor: state.config.team2Color }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative p-3 rounded-lg border bg-[#071226] border-slate-800 overflow-hidden shadow-lg">
           <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />
           <div className="flex justify-between items-start pr-2">
              <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wide text-white">{state.bowler.name}</span>
                    <button 
                      onClick={() => {
                        setChangeTarget("bowler");
                        setNewPlayerName(state.bowler.name);
                        setActiveModal("bowler");
                      }}
                      className="text-[8px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 hover:text-white transition-colors"
                    >
                      CHG
                    </button>
                 </div>
                 <div className="flex items-center gap-3 mt-2">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-slate-500 font-bold uppercase">OVERS</span>
                     <span className="font-mono text-sm font-bold text-slate-300">{Math.floor(state.bowler.balls / 6)}.{state.bowler.balls % 6}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] text-slate-500 font-bold uppercase">ECON</span>
                     <span className="font-mono text-sm font-bold text-slate-300">{state.bowler.economy.toFixed(1)}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] text-slate-500 font-bold uppercase">SPELL</span>
                     <div className="flex gap-0.5">
                       {state.thisOver.map((_, i) => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
              <div className="flex items-baseline gap-1">
                 <motion.span 
                    key={`${state.bowler.wickets}-${state.bowler.runs}`}
                    initial={{ scale: 1.5, color: "#f59e0b" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                    className="text-2xl font-black font-mono drop-shadow-md"
                 >
                   {state.bowler.wickets}-{state.bowler.runs}
                 </motion.span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
