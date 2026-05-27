import React, { useState, useEffect } from "react";
import { MatchState } from "../../types";
import { Tv, AlertCircle } from "lucide-react";

interface ScoreMatrixProps {
  state: MatchState;
  loading: boolean;
  pushDelivery: (payload: any) => void;
  setActiveModal: (modal: "wicket" | "batsman" | "bowler" | null) => void;
  errorMsg: string | null;
}

export function ScoreMatrix({ state, loading, pushDelivery, setActiveModal, errorMsg }: ScoreMatrixProps) {
  const [matrixExtra, setMatrixExtra] = useState<"none" | "wide" | "noball" | "bye" | "legbye">("none");
  const [matrixRuns, setMatrixRuns] = useState<number | null>(null);

  const submitMatrixDelivery = () => {
    let runs = matrixRuns || 0;
    let payload = {
      ballType: matrixExtra === "none" ? "normal" : matrixExtra,
      runs: runs,
      isWicket: false
    };
    pushDelivery(payload);
    setMatrixExtra("none");
    setMatrixRuns(null);
  };

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input or modal is active
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (document.querySelector('.fixed.inset-0.z-50')) return;

      const key = e.key.toUpperCase();
      
      // Runs
      if (["0","1","2","3","4","5","6","7"].includes(key)) {
        setMatrixRuns(parseInt(key));
      }
      
      // Extras
      if (key === "N") setMatrixExtra("noball");
      if (key === "D") setMatrixExtra("wide"); // D for WiDe
      if (key === "B") setMatrixExtra("bye");
      if (key === "L") setMatrixExtra("legbye");
      if (key === "R") setMatrixExtra("none"); // Reset extra
      
      // Enter to submit
      if (key === "ENTER" && (matrixRuns !== null || matrixExtra !== "none")) {
        submitMatrixDelivery();
      }

      // Wicket
      if (key === "W") {
        setActiveModal("wicket");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matrixRuns, matrixExtra]);

  return (
    <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl p-5 shadow-2xl flex-1 flex flex-col relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
         <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
           <Tv className="w-4 h-4 text-cyan-500" />
           SCORING MATRIX
         </h2>
         {state.freeHit && (
           <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded text-[10px] font-bold animate-pulse">
             FREE HIT ACTIVE
           </span>
         )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-2 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-xs flex items-center gap-2 relative z-10">
          <AlertCircle className="w-3 h-3" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Extras Row - Broadcast Metallic Keys */}
      <div className="grid grid-cols-5 gap-2 mb-4 relative z-10">
         {[
           { id: "none", label: "NORM", hk: "R" },
           { id: "wide", label: "WD", hk: "D" },
           { id: "noball", label: "NB", hk: "N" },
           { id: "bye", label: "B", hk: "B" },
           { id: "legbye", label: "LB", hk: "L" },
         ].map(ext => {
           const isActive = matrixExtra === ext.id;
           return (
             <button
               key={ext.id}
               onClick={() => setMatrixExtra(ext.id as any)}
               className={`relative py-3 rounded text-xs font-black transition-all overflow-hidden ${
                 isActive 
                   ? "bg-gradient-to-b from-indigo-500 to-indigo-700 border-t border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5),inset_0_-2px_10px_rgba(0,0,0,0.5)] transform translate-y-0.5" 
                   : "bg-gradient-to-b from-slate-800 to-slate-900 border-t border-slate-700 text-slate-400 hover:text-slate-200 shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:brightness-110 active:translate-y-0.5 active:shadow-none"
               }`}
             >
               {ext.label}
               <span className="absolute bottom-0.5 right-1 text-[8px] opacity-40 font-mono">{ext.hk}</span>
             </button>
           );
         })}
      </div>

      {/* Runs Grid - Broadcast Metallic Keys */}
      <div className="grid grid-cols-4 gap-2 mb-4 relative z-10">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(run => {
           const isActive = matrixRuns === run;
           const isBoundary = run === 4 || run === 6;
           
           let bgClass = "from-slate-800 to-slate-900 border-slate-700 text-slate-300";
           if (isActive) {
             bgClass = "from-green-500 to-green-700 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.5),inset_0_-2px_10px_rgba(0,0,0,0.5)] transform translate-y-0.5";
           } else if (isBoundary) {
             bgClass = "from-slate-800 to-slate-900 border-slate-700 text-cyan-400";
           }

           return (
             <button
               key={run}
               onClick={() => setMatrixRuns(run)}
               className={`relative py-4 rounded text-lg font-black font-mono transition-all overflow-hidden bg-gradient-to-b border-t ${bgClass} ${!isActive && "shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:brightness-110 active:translate-y-0.5 active:shadow-none"}`}
             >
               {run === 0 ? "DOT" : run}
               <span className="absolute bottom-0.5 right-1 text-[8px] opacity-40 font-mono">{run}</span>
             </button>
           );
        })}
      </div>

      {/* Submit Area */}
      <div className="mt-auto grid grid-cols-3 gap-2 relative z-10">
        <button
          onClick={() => { setMatrixExtra("none"); setMatrixRuns(null); }}
          className="col-span-1 py-3 bg-gradient-to-b from-slate-700 to-slate-800 border-t border-slate-600 rounded shadow-[0_4px_6px_rgba(0,0,0,0.3)] text-slate-300 font-bold text-xs transition-all active:translate-y-0.5"
        >
          CLEAR
        </button>
        
        <button
          onClick={submitMatrixDelivery}
          disabled={loading || (matrixRuns === null && matrixExtra === "none")}
          className="col-span-2 py-3 bg-gradient-to-b from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 border-t border-cyan-400 rounded shadow-[0_4px_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:grayscale text-white font-black tracking-widest text-xs transition-all active:translate-y-0.5"
        >
          SUBMIT BALL (ENTER)
        </button>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-4 relative z-10" />
      
      <button 
        onClick={() => setActiveModal("wicket")}
        disabled={loading}
        className="w-full relative z-10 py-3 rounded bg-gradient-to-b from-red-800 to-red-950 border-t border-red-500 hover:from-red-700 hover:to-red-900 text-red-100 font-black tracking-widest text-xs shadow-[0_4px_15px_rgba(220,38,38,0.4)] transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
      >
        <AlertCircle className="w-4 h-4" />
        REGISTER WICKET (W)
      </button>
      
    </div>
  );
}
