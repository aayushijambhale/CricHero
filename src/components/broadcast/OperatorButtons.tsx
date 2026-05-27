/**
 * BROADCAST OPERATOR BUTTONS
 * Professional scoring keys with metallic gradients, glass effects, and broadcast animations
 */

import React from 'react';
import { BroadcastColors, BroadcastTypography } from './BroadcastDesignSystem';

interface OperatorButtonProps {
  label: string;
  hotkey?: string;
  onClick: () => void;
  variant: 'run' | 'boundary' | 'six' | 'wicket' | 'extra' | 'control';
  isActive?: boolean;
  className?: string;
}

const getButtonStyle = (variant: string) => {
  const base = `
    relative group
    flex flex-col items-center justify-center
    rounded-xl border-2 transition-all duration-150
    cursor-pointer active:scale-95 active:translate-y-1
    font-bold uppercase tracking-wider
    focus:outline-none focus:ring-2 focus:ring-purple-500
  `;

  switch (variant) {
    case 'run':
      return base + `
        bg-gradient-to-b from-blue-600 to-blue-700 border-blue-500
        hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/40
        shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
        text-blue-50
      `;
    case 'boundary':
      return base + `
        bg-gradient-to-b from-green-600 to-green-700 border-green-500
        hover:from-green-500 hover:to-green-600 hover:shadow-lg hover:shadow-green-500/50
        shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
        text-green-50
      `;
    case 'six':
      return base + `
        bg-gradient-to-b from-amber-600 to-amber-700 border-amber-500
        hover:from-amber-500 hover:to-amber-600 hover:shadow-lg hover:shadow-amber-500/60
        shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
        text-amber-50
      `;
    case 'wicket':
      return base + `
        bg-gradient-to-b from-red-600 to-red-700 border-red-500
        hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-500/60
        shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
        text-red-50
      `;
    case 'extra':
      return base + `
        bg-gradient-to-b from-purple-600 to-purple-700 border-purple-500
        hover:from-purple-500 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/50
        shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
        text-purple-50
      `;
    case 'control':
      return base + `
        bg-gradient-to-b from-slate-700 to-slate-800 border-slate-600
        hover:from-slate-600 hover:to-slate-700 hover:shadow-lg hover:shadow-slate-500/30
        shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.3)]
        text-slate-100
      `;
    default:
      return base;
  }
};

export const OperatorButton: React.FC<OperatorButtonProps> = ({
  label,
  hotkey,
  onClick,
  variant,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        ${getButtonStyle(variant)}
        ${isActive ? 'ring-2 ring-offset-1 ring-purple-400' : ''}
        ${className}
      `}
      title={hotkey ? `${label} (${hotkey})` : label}
    >
      {/* Glow effect overlay */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: variant === 'six' ? 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)' :
                      variant === 'wicket' ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)' :
                      'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Main label */}
      <div className="text-lg font-black" style={{ fontFamily: BroadcastTypography.families.display }}>
        {label}
      </div>

      {/* Hotkey indicator */}
      {hotkey && (
        <div className="text-xs font-bold opacity-75 mt-0.5">
          [{hotkey}]
        </div>
      )}

      {/* Active indicator pulse */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
      )}
    </button>
  );
};

interface OperatorMatrixProps {
  onRun: (runs: number) => void;
  onWicket: () => void;
  onExtra: (type: 'wide' | 'noball' | 'bye' | 'legbye') => void;
  onUndo: () => void;
}

export const OperatorMatrix: React.FC<OperatorMatrixProps> = ({
  onRun,
  onWicket,
  onExtra,
  onUndo,
}) => {
  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-purple-700/40 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          OPERATOR SCORING CONSOLE
        </div>
      </div>

      {/* Scoring Buttons Grid */}
      <div className="space-y-4">
        {/* Runs Row */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">RUNS</div>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((run) => (
              <OperatorButton
                key={`run-${run}`}
                label={`${run}`}
                hotkey={`${run}`}
                onClick={() => onRun(run)}
                variant="run"
              />
            ))}
          </div>
        </div>

        {/* Boundaries & Wicket Row */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">BOUNDARIES & DISMISSALS</div>
          <div className="grid grid-cols-4 gap-3">
            <OperatorButton
              label="4"
              hotkey="4"
              onClick={() => onRun(4)}
              variant="boundary"
            />
            <OperatorButton
              label="6"
              hotkey="6"
              onClick={() => onRun(6)}
              variant="six"
            />
            <OperatorButton
              label="WICKET"
              hotkey="W"
              onClick={onWicket}
              variant="wicket"
              className="col-span-2"
            />
          </div>
        </div>

        {/* Extras Row */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">EXTRAS</div>
          <div className="grid grid-cols-4 gap-3">
            <OperatorButton
              label="WIDE"
              hotkey="D"
              onClick={() => onExtra('wide')}
              variant="extra"
            />
            <OperatorButton
              label="NO-BALL"
              hotkey="N"
              onClick={() => onExtra('noball')}
              variant="extra"
            />
            <OperatorButton
              label="BYE"
              hotkey="B"
              onClick={() => onExtra('bye')}
              variant="extra"
            />
            <OperatorButton
              label="LEG-BYE"
              hotkey="L"
              onClick={() => onExtra('legbye')}
              variant="extra"
            />
          </div>
        </div>

        {/* Control Row */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">CONTROL</div>
          <div className="grid grid-cols-4 gap-3">
            <OperatorButton
              label="UNDO"
              hotkey="U"
              onClick={onUndo}
              variant="control"
              className="col-span-2"
            />
            <OperatorButton
              label="END OVER"
              hotkey="E"
              onClick={() => {}}
              variant="control"
              className="col-span-2"
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcut Legend */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">KEYBOARD SHORTCUTS</div>
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">0-6</span> = Runs</div>
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">W</span> = Wicket</div>
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">D</span> = Wide</div>
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">N</span> = No-ball</div>
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">B</span> = Bye</div>
          <div><span className="font-mono bg-slate-900 px-2 py-1 rounded">L</span> = Leg-bye</div>
        </div>
      </div>
    </div>
  );
};
