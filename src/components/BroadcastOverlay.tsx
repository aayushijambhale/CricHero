/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { MatchState, ProductionPanel } from "../types";
import PixiRenderer from "./PixiRenderer";
import { Tv, Copy, Check, X, Award, Flame, Star, ShieldAlert } from "lucide-react";
import { io } from "socket.io-client";

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

    // 2. Setup Socket.IO Realtime Subscription
    const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const targetMatchId = urlParams.get("matchId");
    
    socket.on('dispatch', (eventData: any) => {
      try {
        if (eventData.type === "update" || eventData.type === "initial") {
          const newState = eventData.payload;
          if (targetMatchId && newState.config?.matchId !== targetMatchId) {
            return; // Ignore updates meant for other matches
          }
          setMatchState(newState);
        }
      } catch (err) {
        console.error("Failed to parse Socket event", err);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn("Socket connection interrupted. Re-connecting automatically...", err);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cleanMode = new URLSearchParams(window.location.search).get("clean") === "true";
  const finalShowGuide = showGuide && !cleanMode;
  const hideStripForOverlay = Boolean(
    matchState.activeProductionPanel?.visible &&
    (matchState.activeProductionPanel?.data as any)?.hideMainStrip
  );

  return (
    <div className="w-full h-screen relative overflow-hidden bg-transparent flex flex-col justify-between p-0 select-none font-sans">
      
      {/* ────────────────────────────────────────────────────────
          DEVELOPMENT & STREAM GUIDE TIPPER
          ──────────────────────────────────────────────────────── */}
      {finalShowGuide && (
        <div className="w-full max-w-2xl mx-auto bg-slate-950/95 border border-blue-900/60 rounded-xl p-4 shadow-2xl z-40 animate-fade-in self-start backdrop-blur-md mt-6">
          <div className="flex justify-between items-start">
            <div className="flex gap-2.5">
              <Tv className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">OBS STUDIO GRAPHICS CHANNEL</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  This page renders the transparent overlay strip designed directly to be captured as a <strong className="text-slate-200">Browser Source</strong> inside streaming applications.
                </p>
                
                <div className="mt-3 flex flex-col gap-1.5 text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800 font-mono">
                  <div>1. Add Source: Browser Source</div>
                  <div>2. URL: <span className="text-amber-400">{window.location.href.includes("?") ? window.location.href + "&clean=true" : window.location.href + "?clean=true"}</span></div>
                  <div>3. Dimension: <span className="text-amber-400">1920 x 1080</span></div>
                  <div>4. Custom CSS: Set background to transparent.</div>
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
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Overlay URL (OBS):</span>
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

      {/* ────────────────────────────────────────────────────────
          TELEVISION BROADCAST PRODUCTION GRAPHIC LAYERS
          ──────────────────────────────────────────────────────── */}
      <div className="flex-grow flex items-center justify-center relative">
        {matchState.activeProductionPanel?.visible && (
          <ProductionPanelOverlay panel={matchState.activeProductionPanel} state={matchState} />
        )}
      </div>

      {/* ────────────────────────────────────────────────────────
          GPU ACCELERATED METALLIC BROADCAST GRAPHICS STRIP
          ──────────────────────────────────────────────────────── */}
      {!hideStripForOverlay && (
        <div className="w-full max-w-[1920px] mx-auto flex justify-center items-end select-none pb-4">
          <PixiRenderer state={matchState} />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   PRODUCTION OVERLAYS RENDERER
   ──────────────────────────────────────────────────────── */
interface ProductionPanelOverlayProps {
  panel: ProductionPanel;
  state: MatchState;
}

function ProductionPanelOverlay({ panel, state }: ProductionPanelOverlayProps) {
  const p1Color = state.primaryColor || "#1d4ed8";
  const p2Color = state.secondaryColor || "#dc2626";

  switch (panel.type) {
    case "batsmanStatsCard":
      return <PlayerCardOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "wicketOverlay":
      return <WicketOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "fallOfWicketCard":
      return <FallOfWicketCardOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "bowlerSpell":
      return <BowlerSpellOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "playerMilestone":
      return <PlayerMilestoneOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "matchInfo":
      return <MatchInfoOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "playerCard":
      return <PlayerCardOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "partnership":
      return <PartnershipOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "requiredEquation":
      return <EquationOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "fallOfWickets":
      return <FallOfWicketsOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "powerplayStats":
      return <PowerplayStatsOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "winProbability":
      return <WinProbabilityOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "teamComparison":
      return <TeamComparisonOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "wormGraph":
      return <WormGraphOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "bowlerAnalysis":
      return <BowlerAnalysisOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "strategicTimeout":
      return <StrategicTimeoutOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    case "matchSummary":
      return <MatchSummaryOverlay data={panel.data} primaryColor={p1Color} secondaryColor={p2Color} />;
    default:
      return null;
  }
}

function WicketOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-scale-in w-[840px] bg-slate-950/95 border-2 border-red-600 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
      <div className="text-5xl font-black tracking-widest text-red-500 mb-4">OUT!</div>
      <div className="grid grid-cols-2 gap-4 text-white">
        <div>
          <div className="text-xs text-slate-400 uppercase">Batsman</div>
          <div className="text-2xl font-black" style={{ color: secondaryColor }}>{data?.batsmanName || "BATSMAN"}</div>
          <div className="text-lg font-bold mt-1">{data?.score || "0 (0)"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 uppercase">Dismissal</div>
          <div className="text-xl font-black" style={{ color: primaryColor }}>{String(data?.dismissal || "OUT").toUpperCase()}</div>
          <div className="text-sm text-slate-300 mt-1">b {data?.bowler || "BOWLER"}</div>
          <div className="text-sm text-slate-500 mt-1">{data?.scoreAtWicket || "-"}</div>
        </div>
      </div>
    </div>
  );
}

function FallOfWicketCardOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-slide-up w-[760px] bg-slate-950/95 border border-slate-700 rounded-xl p-6 shadow-2xl backdrop-blur-md">
      <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Fall Of Wicket</div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-slate-900/70 border border-slate-700 rounded p-3">
          <div className="text-[10px] text-slate-500 uppercase">Score</div>
          <div className="text-xl font-black" style={{ color: primaryColor }}>{data?.scoreAtWicket || "-"}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded p-3">
          <div className="text-[10px] text-slate-500 uppercase">Over</div>
          <div className="text-xl font-black text-white">{data?.over || "-"}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded p-3">
          <div className="text-[10px] text-slate-500 uppercase">Partnership</div>
          <div className="text-xl font-black" style={{ color: secondaryColor }}>{data?.partnershipBroken || "-"}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded p-3">
          <div className="text-[10px] text-slate-500 uppercase">Impact</div>
          <div className="text-xl font-black text-amber-400">{data?.impact || "-"}</div>
        </div>
      </div>
    </div>
  );
}

function BowlerSpellOverlay({ data, primaryColor }: any) {
  return (
    <div className="animate-scale-in w-[680px] bg-slate-950/95 border-l-8 rounded-xl p-5 shadow-2xl backdrop-blur-md" style={{ borderColor: primaryColor }}>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Bowler Spell</div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black text-white uppercase">{data?.name || "BOWLER"}</div>
        <div className="grid grid-cols-5 gap-2 text-center">
          <StatCell label="O" value={data?.overs ?? "0.0"} />
          <StatCell label="M" value={data?.maidens ?? 0} />
          <StatCell label="R" value={data?.runs ?? 0} />
          <StatCell label="W" value={data?.wickets ?? 0} />
          <StatCell label="Econ" value={Number(data?.economy ?? 0).toFixed(2)} />
        </div>
      </div>
    </div>
  );
}

function PlayerMilestoneOverlay({ data, secondaryColor }: any) {
  return (
    <div className="animate-scale-in w-[760px] bg-slate-950/95 border-2 border-amber-500 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
      <div className="text-xs uppercase tracking-widest text-amber-300">Player Milestone</div>
      <div className="text-4xl font-black text-amber-400 mt-2">{data?.milestone || "MILESTONE"}</div>
      <div className="text-2xl font-black mt-2" style={{ color: secondaryColor }}>{data?.player || "BATSMAN"}</div>
      <div className="text-lg text-slate-200 mt-1">{data?.runs ?? 0} ({data?.balls ?? 0})</div>
    </div>
  );
}

function MatchInfoOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-slide-up w-[760px] bg-slate-950/95 border border-slate-700 rounded-xl p-6 shadow-2xl backdrop-blur-md">
      <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Match Information</div>
      <div className="grid grid-cols-4 gap-3">
        <StatCell label="CRR" value={Number(data?.currentRunRate ?? 0).toFixed(2)} color={primaryColor} />
        <StatCell label="RRR" value={data?.requiredRunRate ? Number(data.requiredRunRate).toFixed(2) : "-"} color={secondaryColor} />
        <StatCell label="Win %" value={`${Math.round(data?.winProbability?.battingTeam ?? 50)}%`} color="#fbbf24" />
        <StatCell label="Projected" value={Math.round(data?.projectedScore ?? 0)} color="#22d3ee" />
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded p-3 text-center">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className="text-lg font-black" style={{ color: color || "#fff" }}>{value}</div>
    </div>
  );
}

/* 1. Player Card */
function PlayerCardOverlay({ data, primaryColor }: any) {
  return (
    <div className="animate-scale-in w-[600px] bg-slate-950/95 border-l-8 border-r-2 border-t-2 border-b-2 rounded-xl p-6 shadow-2xl flex items-center justify-between backdrop-blur-md"
         style={{ borderColor: primaryColor }}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase">BATSMAN PERFORMANCE</span>
        <h3 className="text-2xl font-black tracking-tight text-white font-mono uppercase">{data.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">STRIKE RATE</span>
          <span className="text-xs font-black font-mono text-white">{Number(data.strikeRate).toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[34px] font-black font-mono text-amber-400 leading-none">{data.runs}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">RUNS ({data.balls})</span>
        </div>
        <div className="w-px h-12 bg-slate-800" />
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-lg font-black font-mono text-white leading-none">{data.fours}</span>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1">4s</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-black font-mono text-white leading-none">{data.sixes}</span>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1">6s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 2. Partnership */
function PartnershipOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-slide-up w-[700px] bg-slate-950/95 border-b-4 border-slate-900 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase">PARTNERSHIP SUMMARY</span>
        <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">{data.totalBalls} BALLS</span>
      </div>
      <div className="p-6 flex items-center justify-between gap-4">
        {/* Batsman 1 */}
        <div className="flex-1 flex flex-col items-start">
          <span className="text-sm font-black text-white uppercase truncate max-w-[200px]" style={{ color: primaryColor }}>{data.batsman1}</span>
          <span className="text-3xl font-black font-mono text-slate-100 mt-1">{data.batsman1Runs} <span className="text-sm font-semibold text-slate-400">({data.batsman1Balls})</span></span>
        </div>
        
        {/* Combined runs */}
        <div className="flex flex-col items-center justify-center px-6 py-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-2xl font-black font-mono text-amber-400">{data.totalRuns}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PARTNERSHIP RUNS</span>
        </div>

        {/* Batsman 2 */}
        <div className="flex-1 flex flex-col items-end text-right">
          <span className="text-sm font-black text-white uppercase truncate max-w-[200px]" style={{ color: secondaryColor }}>{data.batsman2}</span>
          <span className="text-3xl font-black font-mono text-slate-100 mt-1">{data.batsman2Runs} <span className="text-sm font-semibold text-slate-400">({data.batsman2Balls})</span></span>
        </div>
      </div>
    </div>
  );
}

/* 3. Equation */
function EquationOverlay({ data, primaryColor }: any) {
  return (
    <div className="animate-scale-in w-[650px] bg-slate-950/95 border border-l-8 border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-3"
         style={{ borderLeftColor: primaryColor }}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-amber-400 tracking-widest uppercase">MATCH EQUATION</span>
        <div className="flex gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 uppercase">REQ RRR: {Number(data.requiredRunRate).toFixed(2)}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 uppercase">CUR CRR: {Number(data.currentRunRate).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex justify-between items-baseline mt-1">
        <h2 className="text-3xl font-black text-white tracking-tight uppercase">
          NEED <span className="text-amber-400 text-4xl font-mono">{data.runsNeeded}</span> RUNS
        </h2>
        <span className="text-slate-400 text-sm font-semibold">
          FROM <strong className="text-white text-lg font-mono">{data.ballsRemaining}</strong> BALLS REMAINING
        </span>
      </div>
      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
        <div className="h-full bg-amber-400 rounded-full" 
             style={{ width: `${Math.min(100, (data.ballsRemaining / 120) * 100)}%` }} />
      </div>
    </div>
  );
}

/* 4. Fall Of Wickets */
function FallOfWicketsOverlay({ data, primaryColor }: any) {
  const fows = data.fow || [];
  return (
    <div className="animate-slide-up w-[800px] bg-slate-950/95 border-b-4 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md"
         style={{ borderBottomColor: primaryColor }}>
      <div className="bg-slate-900/60 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center">
        <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase">FALL OF WICKETS</span>
        <span className="text-[10px] text-slate-500 font-semibold uppercase">TOTAL WICKETS: {fows.length}</span>
      </div>
      <div className="p-4 grid grid-cols-5 gap-3">
        {fows.length === 0 ? (
          <div className="col-span-5 text-center text-xs text-slate-500 py-4 font-semibold uppercase tracking-wider">No wickets fallen in this innings</div>
        ) : (
          fows.map((f: any, idx: number) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-900/80 rounded-lg p-2.5 flex flex-col gap-1 items-center justify-center text-center shadow-md">
              <span className="text-xs font-extrabold text-red-500 font-mono">WKT {f.wicketNumber}</span>
              <span className="text-[15px] font-black text-white font-mono leading-none mt-0.5">{f.runs}</span>
              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[120px] uppercase mt-1 leading-none">{f.batsmanName}</span>
              <span className="text-[8px] text-slate-600 font-bold tracking-widest uppercase mt-0.5 leading-none">{f.overs} OV</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* 5. Powerplay Stats */
function PowerplayStatsOverlay({ data, primaryColor }: any) {
  return (
    <div className="animate-scale-in w-[500px] bg-slate-950/95 border-r-8 border-slate-850 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4"
         style={{ borderRightColor: primaryColor }}>
      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
        <span className="text-xs font-black text-amber-400 tracking-widest uppercase">POWERPLAY STATS</span>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-950/40 border border-blue-900 text-blue-300 rounded uppercase">OVERS 1-{data.overs}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 py-1 text-center">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-white font-mono leading-none">{data.runs} / {data.wickets}</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1.5">SCORE</span>
        </div>
        <div className="flex flex-col border-x border-slate-900">
          <span className="text-2xl font-black text-amber-400 font-mono leading-none">{data.boundaries}</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1.5">FOURS</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black text-amber-400 font-mono leading-none">{data.sixes}</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1.5">SIXES</span>
        </div>
      </div>
    </div>
  );
}

/* 6. Win Probability */
function WinProbabilityOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-slide-up w-[680px] bg-slate-950/95 border border-slate-900 rounded-xl p-6 shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-extrabold text-amber-400 tracking-widest uppercase">WIN PROBABILITY HIERARCHY</span>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LIVE BROADCAST MODEL</span>
      </div>
      
      {/* High precision probability bar */}
      <div className="w-full flex rounded-lg overflow-hidden border border-slate-900 h-9 font-mono shadow-inner">
        <div className="h-full flex items-center pl-4 transition-all duration-500 text-white font-black"
             style={{ width: `${data.battingProb}%`, backgroundColor: primaryColor }}>
          {data.battingProb}%
        </div>
        <div className="h-full flex items-center justify-end pr-4 transition-all duration-500 text-white font-black"
             style={{ width: `${data.bowlingProb}%`, backgroundColor: secondaryColor }}>
          {data.bowlingProb}%
        </div>
      </div>

      <div className="flex justify-between items-center text-xs font-extrabold px-1">
        <span className="text-white uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }} />
          {data.battingTeam}
        </span>
        <span className="text-white uppercase tracking-wide flex items-center gap-1.5">
          {data.bowlingTeam}
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: secondaryColor }} />
        </span>
      </div>
    </div>
  );
}

/* 7. Team Comparison */
function TeamComparisonOverlay({ data, primaryColor, secondaryColor }: any) {
  return (
    <div className="animate-scale-in w-[750px] bg-slate-950/95 border border-slate-900 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="bg-slate-900/60 px-5 py-3 border-b border-slate-800">
        <span className="text-xs font-black text-amber-400 tracking-widest uppercase">TEAM COMPARISON</span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        {/* Table Head */}
        <div className="grid grid-cols-3 text-xs font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">
          <span>STATISTIC</span>
          <span className="text-center" style={{ color: primaryColor }}>{data.team1}</span>
          <span className="text-right" style={{ color: secondaryColor }}>{data.team2}</span>
        </div>

        {/* Rows */}
        <div className="grid grid-cols-3 text-sm font-semibold py-1">
          <span className="text-slate-400">INNINGS RUNS</span>
          <span className="text-center font-mono font-black text-white">{data.innings1 ? `${data.innings1.runs}/${data.innings1.wickets}` : "-"}</span>
          <span className="text-right font-mono font-black text-white">{data.innings2.runs}/{data.innings2.wickets}</span>
        </div>
        <div className="grid grid-cols-3 text-sm font-semibold py-1 border-t border-slate-900/65">
          <span className="text-slate-400">OVERS COMPLETED</span>
          <span className="text-center font-mono text-white">{data.innings1 ? data.innings1.overs : "-"}</span>
          <span className="text-right font-mono text-white">{data.innings2.overs}</span>
        </div>
        <div className="grid grid-cols-3 text-sm font-semibold py-1 border-t border-slate-900/65">
          <span className="text-slate-400">RUN RATE</span>
          <span className="text-center font-mono text-white">{data.innings1 ? Number(data.innings1.runRate).toFixed(2) : "-"}</span>
          <span className="text-right font-mono text-white">{Number(data.innings2.runRate).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/* 8. Worm Graph (Dynamic SVG Line Chart) */
function WormGraphOverlay({ data, primaryColor, secondaryColor }: any) {
  const i1 = data.innings1 || [];
  const i2 = data.innings2 || [];

  const maxRuns = Math.max(
    10,
    data.target || 0,
    ...i1,
    ...i2
  );

  const totalOvers = 6; // base overs
  const totalBalls = totalOvers * 6;

  // Chart coordinates calculation
  const width = 650;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getPointsStr = (arr: number[]) => {
    return arr.map((runs, idx) => {
      const x = paddingLeft + (idx / totalBalls) * chartW;
      const y = paddingTop + chartH - (runs / maxRuns) * chartH;
      return `${x},${y}`;
    }).join(" ");
  };

  const i1Points = getPointsStr(i1);
  const i2Points = getPointsStr(i2);

  return (
    <div className="animate-scale-in w-[750px] bg-slate-950/95 border border-slate-900 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="bg-slate-900/60 px-5 py-2.5 border-b border-slate-800 flex justify-between items-center">
        <span className="text-xs font-black text-amber-400 tracking-widest uppercase">WORM CHART</span>
        <div className="flex gap-4 text-[10px] font-bold">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-1 inline-block" style={{ backgroundColor: primaryColor }} />
            {data.team1}
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-1 inline-block" style={{ backgroundColor: secondaryColor }} />
            {data.team2}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col items-center">
        <svg width={width} height={height} className="overflow-visible font-mono text-[9px] font-bold text-slate-500">
          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#1e293b" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartH / 2} x2={width - paddingRight} y2={paddingTop + chartH / 2} stroke="#1e293b" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartH} x2={width - paddingRight} y2={paddingTop + chartH} stroke="#334155" />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end">{maxRuns}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartH / 2 + 3} textAnchor="end">{Math.round(maxRuns / 2)}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartH + 3} textAnchor="end">0</text>

          {/* X Axis Labels (Overs) */}
          {[0, 1, 2, 3, 4, 5, 6].map((over) => {
            const x = paddingLeft + (over / totalOvers) * chartW;
            return (
              <g key={over}>
                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartH} stroke="#1e293b" strokeDasharray="3" />
                <text x={x} y={paddingTop + chartH + 15} textAnchor="middle">{over}</text>
              </g>
            );
          })}

          {/* Innings 1 Worm Line */}
          {i1.length > 0 && (
            <polyline fill="none" stroke={primaryColor} strokeWidth="3" points={i1Points} strokeLinecap="round" />
          )}

          {/* Innings 2 Worm Line */}
          {i2.length > 0 && (
            <polyline fill="none" stroke={secondaryColor} strokeWidth="3" points={i2Points} strokeLinecap="round" />
          )}
        </svg>
      </div>
    </div>
  );
}

/* 9. Bowler Analysis */
function BowlerAnalysisOverlay({ data, primaryColor }: any) {
  const current = data.currentBowler || {};
  return (
    <div className="animate-scale-in w-[650px] bg-slate-950/95 border-l-8 border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4"
         style={{ borderLeftColor: primaryColor }}>
      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
        <span className="text-xs font-black text-amber-400 tracking-widest uppercase">BOWLER SPELL PROFILE</span>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded uppercase">CURRENT SPELL</span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white tracking-tight font-mono uppercase">{current.name}</h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">OVERS COMPLETED: {current.overs}</span>
        </div>

        <div className="flex gap-6 items-center">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black font-mono text-amber-400 leading-none">{current.wickets} / {current.runs}</span>
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-2">WKT / RUNS</span>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-base font-black font-mono text-white leading-none">{current.dots}</span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1">DOTS</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-black font-mono text-white leading-none">{Number(current.economy).toFixed(2)}</span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1">ECON</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 10. Strategic Timeout */
function StrategicTimeoutOverlay({ data, primaryColor }: any) {
  return (
    <div className="animate-scale-in w-[750px] bg-slate-950/95 border-2 border-amber-600 rounded-xl p-8 shadow-2xl flex flex-col justify-center items-center text-center gap-6 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-amber-600 text-slate-950 font-black text-[9px] tracking-widest uppercase px-3 py-1 rounded-bl">
        COMMERCIAL OVERLAY
      </div>
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <Flame className="w-10 h-10 text-amber-500 animate-pulse" />
        <h2 className="text-3xl font-black tracking-widest text-white uppercase italic mt-1 font-mono">STRATEGIC TIMEOUT</h2>
        <span className="text-xs text-amber-400 font-bold tracking-widest uppercase">2 MINUTES CEASEFIRE</span>
      </div>
      <div className="flex items-center gap-12 bg-slate-900/60 p-4 rounded-xl border border-slate-900 w-full justify-center">
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">BATTING SQUAD</span>
          <span className="text-lg font-black text-white uppercase truncate max-w-[200px]" style={{ color: primaryColor }}>{data.battingTeam}</span>
        </div>
        <div className="w-px h-10 bg-slate-800" />
        <div className="flex flex-col items-center">
          <span className="text-4xl font-mono font-black text-amber-400 leading-none">{data.runs} - {data.wickets}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">OVERS COMPLETED: {data.overs}</span>
        </div>
      </div>
    </div>
  );
}

/* 11. Match Summary */
function MatchSummaryOverlay({ data, primaryColor, secondaryColor }: any) {
  const i1 = data.firstInnings;
  const i2 = data.secondInnings;

  return (
    <div className="animate-scale-in w-[800px] bg-slate-950/95 border-t-8 border-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md"
         style={{ borderTopColor: primaryColor }}>
      <div className="bg-slate-900/60 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <span className="text-sm font-black text-amber-400 tracking-widest uppercase">MATCH HIGHLIGHTS & SUMMARY</span>
        <span className="text-[10px] font-bold px-3 py-1 bg-red-950/40 border border-red-900 text-red-400 rounded uppercase">FINAL SUMMARY</span>
      </div>
      
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Innings 1 Summary */}
          <div className="flex flex-col gap-2.5 p-4 bg-slate-900/40 border border-slate-900 rounded-xl shadow-md">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">1ST INNINGS TOTAL</span>
            <span className="text-base font-black text-white uppercase truncate" style={{ color: primaryColor }}>{i1 ? i1.team : "TEAM A"}</span>
            <span className="text-4xl font-black font-mono text-white mt-1 leading-none">
              {i1 ? i1.runs : "0"} <span className="text-xl font-bold text-slate-400">/ {i1 ? i1.wickets : "0"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">({i1 ? i1.overs : "0.0"} OVERS COMPLETE)</span>
          </div>

          {/* Innings 2 Summary */}
          <div className="flex flex-col gap-2.5 p-4 bg-slate-900/40 border border-slate-900 rounded-xl shadow-md">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">2ND INNINGS TOTAL</span>
            <span className="text-base font-black text-white uppercase truncate" style={{ color: secondaryColor }}>{i2 ? i2.team : "TEAM B"}</span>
            <span className="text-4xl font-black font-mono text-white mt-1 leading-none">
              {i2.runs} <span className="text-xl font-bold text-slate-400">/ {i2.wickets}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">({i2.overs} OVERS COMPLETED)</span>
          </div>
        </div>

        {/* Grand Result Banner */}
        <div className="w-full bg-slate-900/80 border border-amber-600/45 p-4 rounded-xl flex items-center justify-center gap-3 text-center shadow-lg">
          <Star className="w-5 h-5 text-amber-400 animate-spin-slow" />
          <h3 className="text-lg font-black text-amber-400 uppercase font-mono tracking-wide">
            {data.result}
          </h3>
          <Star className="w-5 h-5 text-amber-400 animate-spin-slow" />
        </div>
      </div>
    </div>
  );
}
