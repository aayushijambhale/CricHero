/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { MatchState } from "../types";
import PixiRenderer from "./PixiRenderer";
import { 
  Tv, Radio, Settings, Gamepad2, Award, ArrowUpRight, 
  HelpCircle, MonitorPlay, Zap, RefreshCcw, Sparkles 
} from "lucide-react";

interface LauncherScreenProps {
  initialState: MatchState;
  onNavigate: (screen: "controller" | "overlay" | "tournaments") => void;
}

export default function LauncherScreen({ initialState, onNavigate }: LauncherScreenProps) {
  const [demoState, setDemoState] = useState<MatchState>(initialState);

  // Poll state to keep launcher preview synchronous in real-time
  useEffect(() => {
    async function syncPreview() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          setDemoState(data);
        }
      } catch (err) {
        // fail silently
      }
    }
    syncPreview();
    
    const interval = setInterval(syncPreview, 2500);
    return () => clearInterval(interval);
  }, []);

  // Simulates a score event specifically in the launcher preview panel
  function triggerLocalSimulatedEvent(type: "four" | "six" | "wicket" | "single") {
    let updatedRuns = demoState.runs;
    let updatedWickets = demoState.wickets;
    let updatedBalls = demoState.balls + 1;
    let updatedUnderlyingOver = [...demoState.thisOver];

    if (type === "four") {
      updatedRuns += 4;
      updatedUnderlyingOver.push("4");
    } else if (type === "six") {
      updatedRuns += 6;
      updatedUnderlyingOver.push("6");
    } else if (type === "wicket") {
      updatedWickets = Math.min(10, updatedWickets + 1);
      updatedUnderlyingOver.push("W");
    } else {
      updatedRuns += 1;
      updatedUnderlyingOver.push("1");
    }

    setDemoState({
      ...demoState,
      runs: updatedRuns,
      wickets: updatedWickets,
      balls: updatedBalls,
      thisOver: updatedUnderlyingOver,
      eventTrigger: {
        type: type,
        timestamp: Date.now(),
      },
    });
  }

  async function handleGlobalSyncReset() {
    try {
      const res = await fetch("/api/match-state/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDemoState(data.state);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0c] text-slate-200 font-sans flex flex-col justify-between py-10 px-4 md:px-8">
      
      {/* ────────────────────────────────────────────────────────
          BRAND DISPLAY AREA
          ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full text-center flex flex-col items-center gap-4 mt-4">
        <div className="flex items-center gap-2 bg-blue-900/15 border border-blue-800/45 px-4 py-1.5 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest shadow-inner">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>BROADCAST QUALITY OVERLAYS ENGINE</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent uppercase font-sans">
          CRICKET BROADCAST SCORE ENGINE
        </h1>
        
        <p className="max-w-2xl text-slate-400 text-sm md:text-base leading-relaxed">
          Initialize district-level, IPL, or tournament-style scoreboard graphics. Build a synchronized system comprising an operator control panel and low-latency digital overlay outputs.
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────
          DUAL MODULE LAUNCHER CARDS
          ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-10">
        
        {/* CARD A: OPERATOR CONTROLLER */}
        <div className="bg-[#161b22] border border-slate-800 hover:border-blue-905/40 rounded-2xl p-6 transition-all shadow-xl group flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors" />
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-105 transition-transform">
                <Radio className="w-7 h-7" />
              </div>
              <span className="text-[10px] tracking-widest font-bold text-slate-500 bg-[#0a0a0c] px-2.5 py-1 rounded border border-slate-850 uppercase">
                OPERATOR PANEL
              </span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-wide uppercase">1. CONTROLLER WORKSPACE</h3>
            <p className="text-sm text-slate-400 mt-2.5 leading-relaxed mb-6">
              The control interface for scoring operators. Update runs, legal balls, boundaries, wickets, and batsman details. Triggers live, frame-perfect scoreboard updates on the broadcast output instantly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={() => onNavigate("controller")}
              className="flex-1 bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-lg text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
            >
              <Gamepad2 className="w-4 h-4" />
              OPEN OPERATOR DASH
            </button>
            
            <a 
              href="/controller" 
              target="_blank" 
              rel="noreferrer"
              className="sm:px-4 py-3 bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5"
            >
              <span>NEW TAB</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* CARD B: BROADCAST OVERLAY GRAPHICS */}
        <div className="bg-[#161b22] border border-slate-800 hover:border-emerald-950/40 rounded-2xl p-6 transition-all shadow-xl group flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl group-hover:bg-emerald-600/10 transition-colors" />
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform">
                <Tv className="w-7 h-7" />
              </div>
              <span className="text-[10px] tracking-widest font-bold text-slate-500 bg-[#0a0a0c] px-2.5 py-1 rounded border border-slate-850 uppercase">
                GRAPHICS OVERLAY
              </span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-wide uppercase">2. STREAM GRAPHICS STRIP</h3>
            <p className="text-sm text-slate-400 mt-2.5 leading-relaxed mb-6">
              Low-latency full screen view optimized for embedding inside OBS Studio, vMix, or standard streaming wrappers. Supports native browser source transparent alpha profiles for seamless chroma overlays.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={() => onNavigate("overlay")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 px-5 py-3 rounded-lg text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              <MonitorPlay className="w-4 h-4" />
              VIEW BROADCAST FEED
            </button>
            
            <a 
              href="/overlay" 
              target="_blank" 
              rel="noreferrer"
              className="sm:px-4 py-3 bg-[#0a0a0c] border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5"
            >
              <span>NEW TAB</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>

      {/* ────────────────────────────────────────────────────────
          TOURNAMENT HISTORY CARD
          ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full mb-4">
        <div className="bg-[#161b22] border border-slate-800 hover:border-indigo-700/50 rounded-2xl p-5 transition-all shadow-xl group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide uppercase">📋 Tournament History</h3>
              <p className="text-xs text-slate-400 mt-0.5">Browse saved matches, scorecards, and career player stats stored in MongoDB Atlas.</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              id="open-tournaments-btn"
              type="button"
              onClick={() => onNavigate("tournaments")}
              className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-500/10"
            >
              <Award className="w-4 h-4" />
              OPEN HISTORY
            </button>
            <a
              href="/tournaments"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5"
            >
              <span>NEW TAB</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          INTERACTIVE LIVE DEMO PREVIEW PANEL
          ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full bg-[#161b22] border border-slate-800 rounded-2xl p-6 shadow-2xl my-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1 px-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-xs font-bold uppercase tracking-wider">
              REAL-TIME OUTPUT PREVIEW
            </div>
            <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase">LIVE PREVIEW TRACK & SIMULATION</h3>
          </div>

          {/* SIMULATOR QUICK ACTIONS */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button" 
              onClick={() => triggerLocalSimulatedEvent("single")}
              className="px-2.5 py-1.5 bg-[#0a0a0c] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-bold tracking-wide rounded cursor-pointer active:scale-95 transition-transform"
            >
              +1 RUN
            </button>
            <button 
              type="button" 
              onChange={() => triggerLocalSimulatedEvent("four")}
              onClick={() => triggerLocalSimulatedEvent("four")}
              className="px-2.5 py-1.5 bg-blue-955/40 hover:bg-blue-950 border border-blue-900/60 text-xs text-blue-400 font-bold tracking-wide rounded cursor-pointer active:scale-95 transition-transform flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              SIMULATE FOUR
            </button>
            <button 
              type="button" 
              onClick={() => triggerLocalSimulatedEvent("six")}
              className="px-2.5 py-1.5 bg-amber-955/40 hover:bg-amber-950 border border-amber-950/60 text-xs text-amber-400 font-bold tracking-wide rounded cursor-pointer active:scale-95 transition-transform flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 animate-bounce" />
              SIMULATE SIX
            </button>
            <button 
              type="button" 
              onClick={() => triggerLocalSimulatedEvent("wicket")}
              className="px-2.5 py-1.5 bg-red-955/40 hover:bg-red-900 border border-red-900/60 text-xs text-red-400 font-bold tracking-wide rounded cursor-pointer active:scale-95 transition-transform"
            >
              SIMULATE WICKET 🚨
            </button>
            
            <button 
              type="button" 
              onClick={handleGlobalSyncReset}
              title="Reset Server State"
              className="p-1.5 bg-[#0a0a0c] hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-white rounded cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live rendering container of PixiRenderer */}
        <div className="w-full bg-[#0a0a0c]/20 rounded-xl p-4 border border-slate-800 flex justify-center items-center overflow-hidden">
          <PixiRenderer state={demoState} />
        </div>
      </div>

      {/* FOOTER */}
      <div className="max-w-6xl mx-auto w-full text-center mt-6 text-xs text-slate-600 font-medium">
        CRI-HD TRANSMISSION BROADCASTS ENGINE • DEVELOPED FOR PROFESSIONAL STREAMING GRAPHICS OVERLAYS
      </div>

    </div>
  );
}
