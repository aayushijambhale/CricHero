/**
 * SCORE MATRIX - Professional Current Over Display
 * Shows balls from current over with broadcast-style animations and effects
 */

import React from 'react';
import { BroadcastColors, BroadcastTypography } from './BroadcastDesignSystem';

interface ScoreMatrixProps {
  thisOver: string[];
  currentOver: number;
  currentBall: number;
}

const getBallColor = (ball: string) => {
  switch (ball) {
    case '0':
    case '•':
      return 'bg-slate-800 border-slate-700 text-slate-300';
    case '1':
    case '2':
    case '3':
      return 'bg-blue-950 border-blue-700 text-blue-300';
    case '4':
      return 'bg-green-950 border-green-700 text-green-400 shadow-lg shadow-green-500/40';
    case '6':
      return 'bg-amber-950 border-amber-700 text-amber-300 shadow-lg shadow-amber-500/50';
    case 'W':
      return 'bg-red-950 border-red-700 text-red-400 shadow-lg shadow-red-500/50';
    case 'WD':
    case 'NB':
      return 'bg-purple-950 border-purple-700 text-purple-300';
    default:
      return 'bg-slate-800 border-slate-700 text-slate-300';
  }
};

const getBallLabel = (ball: string) => {
  switch (ball) {
    case '•':
      return '•';
    case 'W':
      return 'W';
    case 'WD':
      return 'WD';
    case 'NB':
      return 'NB';
    default:
      return ball;
  }
};

export default function ScoreMatrix({ thisOver, currentOver, currentBall }: ScoreMatrixProps) {
  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-purple-700/40 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">CURRENT OVER</div>
          <div className="text-4xl font-black text-cyan-400" style={{ fontFamily: BroadcastTypography.families.display }}>
            OVER {currentOver}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">RUNS THIS OVER</div>
          <div className="text-3xl font-black text-amber-400" style={{ fontFamily: BroadcastTypography.families.display }}>
            {thisOver.reduce((sum, ball) => {
              const runs = parseInt(ball);
              return sum + (isNaN(runs) ? 0 : runs);
            }, 0)}
          </div>
        </div>
      </div>

      {/* Balls Grid */}
      <div className="grid grid-cols-6 gap-3">
        {thisOver.map((ball, index) => {
          const isCurrentBall = index === thisOver.length - 1;
          
          return (
            <div
              key={index}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                border-2 rounded-xl font-mono font-bold text-lg
                transition-all duration-300 cursor-default
                ${getBallColor(ball)}
                ${isCurrentBall ? 'ring-2 ring-purple-500 scale-105' : ''}
              `}
              style={{
                animation: isCurrentBall ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
              }}
            >
              <div className="text-2xl font-black">
                {getBallLabel(ball)}
              </div>
              
              {/* Ball number indicator */}
              <div className="absolute bottom-1 right-1.5 text-xs font-bold opacity-60">
                {index + 1}
              </div>

              {/* Special effects for sixes and fours */}
              {ball === '6' && (
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                />
              )}
              {ball === '4' && (
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                />
              )}
              {ball === 'W' && (
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                    animation: 'pulse 0.8s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        })}
        
        {/* Placeholder balls for remaining in over */}
        {thisOver.length < 6 && Array(6 - thisOver.length)
          .fill(null)
          .map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="aspect-square flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-700 text-2xl font-black opacity-40"
            >
              -
            </div>
          ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-4 gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">DOTS</div>
          <div className="text-2xl font-black text-slate-300">
            {thisOver.filter(b => b === '0' || b === '•').length}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">BOUNDARIES</div>
          <div className="text-2xl font-black text-green-400">
            {thisOver.filter(b => b === '4').length}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">SIXES</div>
          <div className="text-2xl font-black text-amber-400">
            {thisOver.filter(b => b === '6').length}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">WICKETS</div>
          <div className="text-2xl font-black text-red-400">
            {thisOver.filter(b => b === 'W').length}
          </div>
        </div>
      </div>
    </div>
  );
}
