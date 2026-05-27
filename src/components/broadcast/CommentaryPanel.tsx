/**
 * COMMENTARY PANEL
 * Live scrolling feed of commentary events, milestones, and match updates
 */

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, AlertCircle, Trophy, Zap } from 'lucide-react';
import { BroadcastTypography } from './BroadcastDesignSystem';

export type CommentaryEventType = 
  | 'ball' | 'wicket' | 'milestone' | 'boundary' | 'six' | 'dot' | 'alert' | 'phase_change';

export interface CommentaryEvent {
  id: string;
  timestamp: number;
  over: number;
  ball: number;
  text: string;
  type: CommentaryEventType;
  playerName?: string;
  runs?: number;
}

interface CommentaryPanelProps {
  events: CommentaryEvent[];
  isLive?: boolean;
}

const getEventColor = (type: CommentaryEventType) => {
  switch (type) {
    case 'wicket':
      return 'bg-red-950 border-red-700 text-red-200 before:bg-red-600';
    case 'boundary':
      return 'bg-green-950 border-green-700 text-green-200 before:bg-green-600';
    case 'six':
      return 'bg-amber-950 border-amber-700 text-amber-200 before:bg-amber-600';
    case 'milestone':
      return 'bg-purple-950 border-purple-700 text-purple-200 before:bg-purple-600';
    case 'phase_change':
      return 'bg-cyan-950 border-cyan-700 text-cyan-200 before:bg-cyan-600';
    case 'alert':
      return 'bg-orange-950 border-orange-700 text-orange-200 before:bg-orange-600';
    case 'dot':
      return 'bg-slate-900 border-slate-700 text-slate-200 before:bg-slate-600';
    default:
      return 'bg-blue-950 border-blue-700 text-blue-200 before:bg-blue-600';
  }
};

const getEventIcon = (type: CommentaryEventType) => {
  switch (type) {
    case 'wicket':
      return '⚡';
    case 'boundary':
    case 'six':
      return '⭐';
    case 'milestone':
      return '🏆';
    case 'phase_change':
      return '📊';
    case 'alert':
      return '⚠️';
    default:
      return '🎙️';
  }
};

export const CommentaryEvent: React.FC<{ event: CommentaryEvent }> = ({ event }) => {
  return (
    <div
      className={`
        relative border-l-4 border-r border-t border-b rounded-r-lg p-3 pl-4 mb-2
        transition-all duration-300 hover:shadow-md
        ${getEventColor(event.type)}
      `}
      style={{
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* Time & Over info */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wider opacity-75">
          {event.over}.{event.ball} {new Date(event.timestamp).toLocaleTimeString()}
        </span>
        <span className="text-lg">{getEventIcon(event.type)}</span>
      </div>

      {/* Commentary text */}
      <div className="text-sm font-bold leading-snug">
        {event.text}
      </div>

      {/* Player name if available */}
      {event.playerName && (
        <div className="text-xs opacity-75 mt-1">
          <span className="font-mono bg-black/30 px-2 py-0.5 rounded">
            {event.playerName}
          </span>
        </div>
      )}

      {/* Run indicator if available */}
      {event.runs !== undefined && (
        <div className="absolute top-2 right-3 text-lg font-black" style={{ fontFamily: BroadcastTypography.families.display }}>
          {event.runs === 0 ? '•' : event.runs}
        </div>
      )}
    </div>
  );
};

export const CommentaryPanel: React.FC<CommentaryPanelProps> = ({ events, isLive = true }) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Auto-scroll to latest
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-blue-700/40 rounded-2xl p-6 shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">LIVE COMMENTARY</div>
            <div className="text-xl font-black text-blue-400" style={{ fontFamily: BroadcastTypography.families.display }}>
              MATCH FEED
            </div>
          </div>
        </div>
        
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/50 border border-red-700 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-400">LIVE</span>
          </div>
        )}
      </div>

      {/* Commentary Feed */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-2">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-slate-500 text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Waiting for match to start...
            </div>
          </div>
        ) : (
          <>
            {events.map((event) => (
              <CommentaryEvent key={event.id} event={event} />
            ))}
            <div ref={scrollEndRef} />
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-4 gap-2 text-xs">
        <div className="text-center">
          <div className="text-slate-500 font-bold">TOTAL</div>
          <div className="text-white font-black text-lg">{events.length}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 font-bold">WICKETS</div>
          <div className="text-red-400 font-black text-lg">
            {events.filter(e => e.type === 'wicket').length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 font-bold">BOUNDARIES</div>
          <div className="text-green-400 font-black text-lg">
            {events.filter(e => e.type === 'boundary' || e.type === 'six').length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 font-bold">MILESTONES</div>
          <div className="text-purple-400 font-black text-lg">
            {events.filter(e => e.type === 'milestone').length}
          </div>
        </div>
      </div>
    </div>
  );
};
