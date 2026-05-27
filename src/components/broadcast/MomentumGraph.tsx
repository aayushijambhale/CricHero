/**
 * MOMENTUM & ANALYTICS ENGINE
 * Real-time momentum graphs, pressure meter, and match analytics
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp, Zap, Target } from 'lucide-react';
import { BroadcastTypography } from './BroadcastDesignSystem';

interface MomentumDataPoint {
  over: number;
  runs: number;
  wickets: number;
  pressure: number;
}

interface MomentumGraphProps {
  data: MomentumDataPoint[];
  currentOver: number;
  projectedScore?: number;
  winProbability?: number;
}

export const MomentumGraph: React.FC<MomentumGraphProps> = ({
  data,
  currentOver,
  projectedScore = 0,
  winProbability = 0,
}) => {
  const maxRuns = Math.max(...data.map(d => d.runs), 20);
  const maxPressure = 100;

  // Calculate sparkline points for visualization
  const scaledData = data.map(d => ({
    x: (d.over / (currentOver || 1)) * 100,
    y: (d.runs / maxRuns) * 100,
    pressure: d.pressure,
  }));

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-emerald-700/40 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">MATCH ANALYTICS</div>
            <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: BroadcastTypography.families.display }}>
              MOMENTUM & PRESSURE
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Projected Score */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Projected Score</div>
          <div className="text-3xl font-black text-amber-400" style={{ fontFamily: BroadcastTypography.families.display }}>
            {projectedScore}
          </div>
          <div className="text-xs text-slate-500 mt-1">Based on current RR</div>
        </div>

        {/* Win Probability */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Win Probability</div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-black text-green-400" style={{ fontFamily: BroadcastTypography.families.display }}>
              {winProbability}%
            </div>
            <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
                style={{ width: `${winProbability}%` }}
              />
            </div>
          </div>
        </div>

        {/* Momentum */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Current Momentum</div>
          <div className="text-3xl font-black text-cyan-400" style={{ fontFamily: BroadcastTypography.families.display }}>
            {(data.length > 0 ? (data[data.length - 1].pressure || 50) : 50).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pressure Index</div>
        </div>
      </div>

      {/* Momentum Graph */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-4">
        <div className="h-32 flex items-end gap-1 pb-2">
          {scaledData.map((point, index) => {
            const isCurrentOver = index === scaledData.length - 1;
            const pressure = point.pressure;
            const color = pressure > 75 ? 'from-red-600' : pressure > 50 ? 'from-amber-600' : 'from-green-600';

            return (
              <div key={index} className="flex-1 relative group">
                {/* Bar */}
                <div
                  className={`
                    w-full rounded-t-lg transition-all duration-300
                    bg-gradient-to-t ${color} to-transparent
                    ${isCurrentOver ? 'ring-1 ring-purple-400' : ''}
                    hover:opacity-80
                  `}
                  style={{
                    height: `${point.y}%`,
                    minHeight: '4px',
                  }}
                />

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Over {Math.floor(point.x / 10) + 1}: {Math.round(point.y * maxRuns / 100)} runs
                </div>
              </div>
            );
          })}
        </div>

        {/* Graph Legend */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded" />
              <span className="text-slate-500">Low Pressure</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-600 rounded" />
              <span className="text-slate-500">Medium Pressure</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded" />
              <span className="text-slate-500">High Pressure</span>
            </div>
          </div>
          <span className="text-slate-500">Total Overs: {data.length}</span>
        </div>
      </div>

      {/* Pressure Description */}
      <div className="bg-purple-950/30 border border-purple-700/30 rounded-xl p-3 text-sm">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-slate-300">
            <span className="font-bold text-purple-300">Current Status:</span> Match momentum is trending{' '}
            <span className="font-bold text-emerald-400">
              {(data.length > 1 && data[data.length - 1].pressure > data[data.length - 2].pressure) ? 'UPWARD' : 'STABLE'}
            </span>
            . Batting team {data.length > 1 && data[data.length - 1].pressure < 50 ? 'is controlling' : 'needs to accelerate'} the match.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Partnership & Batting Statistics Card
 */
interface PartnershipStatsProps {
  batsman1Name: string;
  batsman1Runs: number;
  batsman1Balls: number;
  batsman1Fours: number;
  batsman1Sixes: number;
  batsman2Name: string;
  batsman2Runs: number;
  batsman2Balls: number;
  batsman2Fours: number;
  batsman2Sixes: number;
  partnershipRuns: number;
  partnershipBalls: number;
}

export const PartnershipStats: React.FC<PartnershipStatsProps> = ({
  batsman1Name,
  batsman1Runs,
  batsman1Balls,
  batsman1Fours,
  batsman1Sixes,
  batsman2Name,
  batsman2Runs,
  batsman2Balls,
  batsman2Fours,
  batsman2Sixes,
  partnershipRuns,
  partnershipBalls,
}) => {
  const sr1 = batsman1Balls > 0 ? ((batsman1Runs / batsman1Balls) * 100).toFixed(2) : '0.00';
  const sr2 = batsman2Balls > 0 ? ((batsman2Runs / batsman2Balls) * 100).toFixed(2) : '0.00';
  const partnershipSR = partnershipBalls > 0 ? ((partnershipRuns / partnershipBalls) * 100).toFixed(2) : '0.00';

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-purple-700/40 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-slate-800">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">PARTNERSHIP & BATTING STATS</div>
        <div className="text-2xl font-black text-purple-400" style={{ fontFamily: BroadcastTypography.families.display }}>
          {partnershipRuns} RUNS • {Math.floor(partnershipBalls / 6)}.{partnershipBalls % 6} OVERS
        </div>
      </div>

      {/* Batsmen Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Batsman 1 */}
        <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl p-4">
          <div className="text-sm font-bold text-blue-300 mb-2 truncate">{batsman1Name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <div className="text-slate-500 font-bold">RUNS</div>
              <div className="text-2xl font-black text-amber-400">{batsman1Runs}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">BALLS</div>
              <div className="text-2xl font-black text-blue-400">{batsman1Balls}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">4s</div>
              <div className="text-lg font-black text-green-400">{batsman1Fours}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">6s</div>
              <div className="text-lg font-black text-amber-400">{batsman1Sixes}</div>
            </div>
          </div>
          <div className="bg-black/30 rounded px-2 py-1 text-center">
            <div className="text-xs text-slate-500 font-bold">STRIKE RATE</div>
            <div className="text-lg font-black text-green-400">{sr1}%</div>
          </div>
        </div>

        {/* Batsman 2 */}
        <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl p-4">
          <div className="text-sm font-bold text-blue-300 mb-2 truncate">{batsman2Name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <div className="text-slate-500 font-bold">RUNS</div>
              <div className="text-2xl font-black text-amber-400">{batsman2Runs}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">BALLS</div>
              <div className="text-2xl font-black text-blue-400">{batsman2Balls}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">4s</div>
              <div className="text-lg font-black text-green-400">{batsman2Fours}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold">6s</div>
              <div className="text-lg font-black text-amber-400">{batsman2Sixes}</div>
            </div>
          </div>
          <div className="bg-black/30 rounded px-2 py-1 text-center">
            <div className="text-xs text-slate-500 font-bold">STRIKE RATE</div>
            <div className="text-lg font-black text-green-400">{sr2}%</div>
          </div>
        </div>
      </div>

      {/* Partnership Summary */}
      <div className="mt-4 pt-4 border-t border-slate-800 bg-purple-950/30 border-purple-700/30 rounded-xl p-3">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-bold">PARTNERSHIP SR</div>
            <div className="text-2xl font-black text-purple-400">{partnershipSR}%</div>
          </div>
          <div>
            <div className="text-slate-500 font-bold">OVERS TOGETHER</div>
            <div className="text-2xl font-black text-cyan-400">
              {Math.floor(partnershipBalls / 6)}.{partnershipBalls % 6}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-bold">RUNS/OVER</div>
            <div className="text-2xl font-black text-amber-400">
              {(partnershipBalls > 0 ? (partnershipRuns / (partnershipBalls / 6)).toFixed(2) : '0.00')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
