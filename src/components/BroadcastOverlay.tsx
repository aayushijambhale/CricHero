/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { MatchState } from "../types";
import PixiRenderer from "./PixiRenderer";
import { Tv, Info, Copy, Check } from "lucide-react";

interface BroadcastOverlayProps {
  initialState: MatchState;
}

export default function BroadcastOverlay({ initialState }: BroadcastOverlayProps) {
  const [matchState, setMatchState] = useState<MatchState>(initialState);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    // 1. Initial State Load
    async function loadCurrentState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          setMatchState(data);
        }
      } catch (err) {
        console.error("Failed to load match state for stream graphics overlay", err);
      }
    }
    loadCurrentState();

    // 2. Setup Server-Sent Events Realtime Subscription
    const sse = new EventSource("/api/events");
    
    sse.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.event === "update" || parsed.event === "initial") {
          setMatchState(parsed.data);
        }
      } catch (err) {
        console.error("Failed to parse realtime broadcast event", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("SSE connection interrupted. Re-connecting automatically...", err);
    };

    return () => {
      sse.close();
    };
  }, []);

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-transparent flex flex-col justify-between p-6">
      
      {/* ────────────────────────────────────────────────────────
          DEVELOPMENT & STREAM GUIDE TIPPER
          (Hidden if viewed in an actual iframe or OBS source context easily)
          ──────────────────────────────────────────────────────── */}
      {showGuide && (
        <div className="w-full max-w-2xl mx-auto bg-slate-950/95 border border-blue-900/60 rounded-xl p-4 shadow-2xl z-40 animate-fade-in self-start backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div className="flex gap-2.5">
              <Tv className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">OBS STUDIO GRAPHICS CHANNEL</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  This page renders the transparent overlay strip designed directly to be captured as a <strong className="text-slate-200">Browser Source</strong> inside streaming applications.
                </p>
                
                {/* How to configure guide */}
                <div className="mt-3 flex flex-col gap-1.5 text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800 font-mono">
                  <div>1. Add Source: Browser Source</div>
                  <div>2. Dimension: <span className="text-amber-400">1920 x 1080</span> (or 1600x200 custom canvas)</div>
                  <div>3. Custom CSS: Clear default body background, let canvas transparent.</div>
                </div>
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowGuide(false)}
              className="text-slate-500 hover:text-white font-bold text-xs uppercase ml-4 cursor-pointer"
            >
              [Hide Guide]
            </button>
          </div>
          
          <div className="mt-3.5 pt-3 border-t border-slate-900 flex items-center justify-between gap-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Overlay Browser URL:</span>
            <button 
              type="button" 
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20 active:scale-95 cursor-pointer ml-auto transition-transform"
            >
              {copied ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
              <span>{copied ? "COPIED GRAPHICS URI!" : "COPY GRAPHICS URI"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Spacer to push strip to absolute bottom as configured */}
      <div className="flex-grow" />

      {/* ────────────────────────────────────────────────────────
          GPU ACCELERATED METALLIC BROADCAST GRAPHICS STRIP
          ──────────────────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto flex justify-center items-end select-none animate-slide-up pb-8">
        <PixiRenderer state={matchState} />
      </div>

    </div>
  );
}
