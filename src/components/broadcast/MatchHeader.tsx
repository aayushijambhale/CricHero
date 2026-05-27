/**
 * MATCH HEADER - Professional Live Match Information Bar
 * Displays tournament info, score, overs, RR, timer, and system status
 */

import React from 'react';
import { MatchState } from '../../types';
import { Radio, Clock, Zap, AlertCircle, Wifi } from 'lucide-react';
import { BroadcastColors, BroadcastTypography } from './BroadcastDesignSystem';

interface MatchHeaderProps {
  state: MatchState;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  latency: number;
}

export default function MatchHeader({ state, connectionStatus, latency }: MatchHeaderProps) {
  const currentRR = state.balls > 0 
    ? (state.runs / (state.balls / 6)).toFixed(2) 
    : '0.00';
    
  const requiredRR = state.target && state.runsNeeded && state.ballsRemaining > 0
    ? ((state.runsNeeded * 6) / state.ballsRemaining).toFixed(2)
    : '0.00';

  const isPowerplay = state.matchPhase === 'powerplay';

  return (
    <div className="w-full bg-gradient-to-r from-[#020617] via-[#071226] to-[#020617] border-b-2 border-purple-600/40 shadow-2xl">
      {/* Main Header Container */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        
        {/* LEFT: LIVE & TOURNAMENT INFO */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* LIVE Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative w-3 h-3">
              <div 
                className="absolute inset-0 bg-red-600 rounded-full animate-pulse"
                style={{
                  animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)',
                }}
              />
              <div className="absolute inset-0 bg-red-500 rounded-full" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-red-500" style={{ fontFamily: BroadcastTypography.families.display }}>
              LIVE
            </span>
          </div>

          {/* Tournament & Match Info */}
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {state.config.format.toUpperCase()}
            </div>
            <div className="text-lg font-black text-white" style={{ fontFamily: BroadcastTypography.families.display }}>
              {state.config.team1ShortName} vs {state.config.team2ShortName}
            </div>
          </div>
        </div>

        {/* CENTER: MAIN SCORES */}
        <div className="flex-1 flex items-center justify-center gap-8 px-6 border-x border-slate-800">
          
          {/* Current Score */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">SCORE</div>
            <div className="text-5xl font-black text-white" style={{fontFamily: BroadcastTypography.families.display}}>
              <span className="text-amber-400">{state.runs}</span>
              <span className="text-red-500">/{state.wickets}</span>
            </div>
          </div>

          {/* Overs */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">OVERS</div>
            <div className="text-4xl font-black text-cyan-400" style={{fontFamily: BroadcastTypography.families.display}}>
              {Math.floor(state.balls / 6)}.{state.balls % 6}
            </div>
          </div>

          {/* Current RR */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">RR</div>
            <div className="text-3xl font-black text-green-400" style={{fontFamily: BroadcastTypography.families.display}}>
              {currentRR}
            </div>
          </div>

          {/* Required RR (if applicable) */}
          {state.currentInnings === 2 && (
            <div className="text-center border-l border-slate-700 pl-8">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">REQ RR</div>
              <div className="text-3xl font-black text-amber-400" style={{fontFamily: BroadcastTypography.families.display}}>
                {requiredRR}
              </div>
            </div>
          )}

          {/* Powerplay Indicator */}
          {isPowerplay && (
            <div className="px-3 py-1.5 bg-yellow-600/30 border border-yellow-500/50 rounded-lg">
              <div className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                ⚡ PP
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: SYSTEM STATUS */}
        <div className="flex items-center gap-4 flex-shrink-0">
          
          {/* Connection Status */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {connectionStatus === 'connected' ? 'CONNECTED' : 
                 connectionStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {latency}ms latency
            </div>
          </div>

          {/* Match Timer */}
          <div className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Operator Profile */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center border border-purple-500/50 cursor-pointer hover:border-purple-400 transition-colors">
            <Radio className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="px-6 py-2 bg-slate-900/30 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-500">
            {state.batsman1.name} {state.batsman1.isStriker ? '(S)' : '(NS)'} • {state.batsman2.name} {state.batsman2.isStriker ? '(S)' : '(NS)'}
          </span>
        </div>
        <div className="text-slate-400">
          Bowler: <span className="font-bold text-white">{state.bowler.name}</span>
        </div>
      </div>
    </div>
  );
}
