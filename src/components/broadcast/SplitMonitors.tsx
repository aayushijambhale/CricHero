/**
 * SPLIT MONITORS - Production Monitor Display
 * Shows preview and program outputs like OBS Studio / vMix
 */

import React, { useEffect, useState } from 'react';
import { Eye, MoreVertical, Settings } from 'lucide-react';
import { MatchState } from '../../types';
import { BroadcastTypography } from './BroadcastDesignSystem';

interface SplitMonitorsProps {
  previewState: MatchState;
  programState: MatchState;
  onTransition: () => void;
  transitionDuration?: number;
}

export const MonitorPreview: React.FC<{
  state: MatchState;
  label: string;
  isProgram?: boolean;
}> = ({ state, label, isProgram }) => {
  return (
    <div className={`
      relative rounded-xl overflow-hidden border-4 shadow-2xl
      ${isProgram ? 'border-red-600' : 'border-green-600'}
      bg-black
    `}>
      {/* Monitor Label */}
      <div className={`
        absolute top-0 left-0 right-0 px-3 py-2 text-xs font-bold uppercase tracking-widest
        flex items-center justify-between z-10
        ${isProgram ? 'bg-red-950/80' : 'bg-green-950/80'}
      `}>
        <span className={isProgram ? 'text-red-300' : 'text-green-300'}>
          {label}
        </span>
        <div className={`w-2 h-2 rounded-full ${isProgram ? 'bg-red-600' : 'bg-green-600'} animate-pulse`} />
      </div>

      {/* Scoring Display Area */}
      <div className="aspect-video bg-gradient-to-b from-[#0a0a0c] to-[#071226] flex flex-col items-center justify-center p-4">
        {/* Main Score Board */}
        <div className="text-center space-y-4 w-full">
          {/* Team Names */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {state.config.team1ShortName}
            </div>
            <div className="text-xs text-slate-600">vs</div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {state.config.team2ShortName}
            </div>
          </div>

          {/* Main Score */}
          <div className="space-y-2">
            <div className="text-6xl font-black text-white" style={{ fontFamily: BroadcastTypography.families.display }}>
              <span className="text-amber-400">{state.runs}</span>
              <span className="text-slate-600">/</span>
              <span className="text-red-400">{state.wickets}</span>
            </div>
            <div className="text-3xl font-black text-cyan-400" style={{ fontFamily: BroadcastTypography.families.display }}>
              {Math.floor(state.balls / 6)}.{state.balls % 6}
            </div>
          </div>

          {/* Batsmen */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold mt-4">
            <div className="bg-blue-950/30 border border-blue-700 rounded p-2">
              <div className="text-blue-300 truncate">{state.batsman1.name}</div>
              <div className="text-blue-400">{state.batsman1.runs}({state.batsman1.balls})</div>
            </div>
            <div className="bg-blue-950/30 border border-blue-700 rounded p-2">
              <div className="text-blue-300 truncate">{state.batsman2.name}</div>
              <div className="text-blue-400">{state.batsman2.runs}({state.batsman2.balls})</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitor Controls */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/60 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex gap-2">
          <button className="p-1 hover:bg-slate-800 rounded transition-colors">
            <Settings className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
          <button className="p-1 hover:bg-slate-800 rounded transition-colors">
            <MoreVertical className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>
        <span className="text-slate-500">Res: 1920x1080</span>
      </div>
    </div>
  );
};

export const SplitMonitors: React.FC<SplitMonitorsProps> = ({
  previewState,
  programState,
  onTransition,
  transitionDuration = 300,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onTransition();
      setIsTransitioning(false);
    }, transitionDuration);
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-slate-800 rounded-2xl p-4 shadow-2xl">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">PRODUCTION MONITORS</div>
            <div className="text-lg font-black text-purple-400" style={{ fontFamily: BroadcastTypography.families.display }}>
              PREVIEW / PROGRAM
            </div>
          </div>
        </div>
      </div>

      {/* Monitors Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <MonitorPreview state={previewState} label="PREVIEW" isProgram={false} />
        </div>
        <div>
          <MonitorPreview state={programState} label="PROGRAM" isProgram={true} />
        </div>
      </div>

      {/* Transition Controls */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">TRANSITION</div>
        
        <div className="flex items-center gap-4">
          {/* Transition Effect Selector */}
          <div className="flex-1">
            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white">
              <option>CUT</option>
              <option>FADE</option>
              <option>WIPE LEFT</option>
              <option>WIPE RIGHT</option>
              <option>DISSOLVE</option>
              <option>SLIDE</option>
            </select>
          </div>

          {/* Duration */}
          <div className="w-24">
            <input
              type="number"
              min="100"
              max="2000"
              step="100"
              defaultValue={transitionDuration}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white"
              placeholder="Duration"
            />
          </div>

          {/* Transition Button */}
          <button
            onClick={handleTransition}
            disabled={isTransitioning}
            className={`
              px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-white
              transition-all duration-300
              ${isTransitioning
                ? 'bg-purple-900 border-purple-600 cursor-wait'
                : 'bg-gradient-to-b from-purple-600 to-purple-700 border-2 border-purple-500 hover:from-purple-500 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/50'
              }
            `}
          >
            {isTransitioning ? 'TRANSITIONING...' : 'TRANSITION'}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-500 mb-2">PRESETS</div>
          <div className="grid grid-cols-4 gap-2">
            {['CUT', 'FADE', 'PUSH', 'FLIP'].map((preset) => (
              <button
                key={preset}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-300 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-500 font-bold">FPS</div>
          <div className="text-green-400 font-black text-lg">60</div>
        </div>
        <div>
          <div className="text-slate-500 font-bold">BITRATE</div>
          <div className="text-green-400 font-black text-lg">5000k</div>
        </div>
        <div>
          <div className="text-slate-500 font-bold">LATENCY</div>
          <div className="text-green-400 font-black text-lg">&lt;50ms</div>
        </div>
      </div>
    </div>
  );
};
