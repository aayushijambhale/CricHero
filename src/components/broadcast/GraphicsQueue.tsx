/**
 * GRAPHICS QUEUE SYSTEM
 * Manages and displays queued graphics for broadcast overlay with animations
 */

import React, { useEffect, useState } from 'react';
import { Trash2, Clock, AlertCircle } from 'lucide-react';
import { BroadcastTypography } from './BroadcastDesignSystem';

export type GraphicsQueueItem = {
  id: string;
  type: 'FOUR' | 'SIX' | 'WICKET' | 'POWERPLAY' | 'MILESTONE' | 'REVIEW' | 'TIMEOUT' | 'COMMENTARY';
  label: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: number;
  duration: number; // ms to display
  meta?: Record<string, any>;
};

interface GraphicsQueueProps {
  queue: GraphicsQueueItem[];
  onRemove: (id: string) => void;
  onDisplay: (id: string) => void;
  displayingId?: string;
}

const getQueueItemColor = (type: GraphicsQueueItem['type'], priority: string) => {
  if (priority === 'urgent') return 'bg-red-950 border-red-700 text-red-300';
  if (priority === 'high') return 'bg-orange-950 border-orange-700 text-orange-300';
  
  switch (type) {
    case 'FOUR':
      return 'bg-green-950 border-green-700 text-green-300';
    case 'SIX':
      return 'bg-amber-950 border-amber-700 text-amber-300';
    case 'WICKET':
      return 'bg-red-950 border-red-700 text-red-300';
    case 'POWERPLAY':
      return 'bg-yellow-950 border-yellow-700 text-yellow-300';
    case 'MILESTONE':
      return 'bg-purple-950 border-purple-700 text-purple-300';
    case 'REVIEW':
      return 'bg-cyan-950 border-cyan-700 text-cyan-300';
    case 'COMMENTARY':
      return 'bg-blue-950 border-blue-700 text-blue-300';
    default:
      return 'bg-slate-950 border-slate-700 text-slate-300';
  }
};

export const GraphicsQueueItem: React.FC<{
  item: GraphicsQueueItem;
  isDisplaying: boolean;
  onRemove: () => void;
  onDisplay: () => void;
}> = ({ item, isDisplaying, onRemove, onDisplay }) => {
  const [age, setAge] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAge(Date.now() - item.timestamp);
    }, 100);
    return () => clearInterval(interval);
  }, [item.timestamp]);

  return (
    <div
      className={`
        group relative border-2 rounded-xl p-3 transition-all duration-300
        ${getQueueItemColor(item.type, item.priority)}
        ${isDisplaying ? 'ring-2 ring-purple-500 scale-105 shadow-lg' : ''}
        hover:scale-102 hover:shadow-md cursor-pointer
      `}
      onClick={onDisplay}
    >
      {/* Priority indicator */}
      {(item.priority === 'high' || item.priority === 'urgent') && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          !
        </div>
      )}

      {/* Item content */}
      <div className="text-sm font-black" style={{ fontFamily: BroadcastTypography.families.display }}>
        {item.label}
      </div>

      {/* Type label */}
      <div className="text-xs font-bold opacity-70 mt-1">
        {item.type}
      </div>

      {/* Timer */}
      <div className="absolute bottom-2 right-2 text-xs font-mono opacity-60">
        {(age / 1000).toFixed(1)}s
      </div>

      {/* Hover actions */}
      <div className="absolute -top-10 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDisplay();
          }}
          className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold text-white"
        >
          DISPLAY
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold text-white"
        >
          REMOVE
        </button>
      </div>
    </div>
  );
};

export const GraphicsQueue: React.FC<GraphicsQueueProps> = ({
  queue,
  onRemove,
  onDisplay,
  displayingId,
}) => {
  // Separate active and queued items
  const displaying = queue.find(q => q.id === displayingId);
  const queued = queue.filter(q => q.id !== displayingId);
  
  // Sort by priority
  const sortedQueue = queued.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-[#071226] border border-cyan-700/40 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">GRAPHICS QUEUE</div>
          <div className="text-2xl font-black text-cyan-400" style={{ fontFamily: BroadcastTypography.families.display }}>
            {queue.length} ITEMS
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300">QUEUE ACTIVE</span>
        </div>
      </div>

      {/* Displaying Item */}
      {displaying && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">CURRENTLY DISPLAYING</div>
          <GraphicsQueueItem
            item={displaying}
            isDisplaying={true}
            onRemove={() => onRemove(displaying.id)}
            onDisplay={() => {}}
          />
        </div>
      )}

      {/* Queued Items */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">QUEUE</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No items in queue
            </div>
          ) : (
            sortedQueue.map((item, index) => (
              <div key={item.id} className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
                  {index + 1}
                </div>
                <div className="ml-6">
                  <GraphicsQueueItem
                    item={item}
                    isDisplaying={false}
                    onRemove={() => onRemove(item.id)}
                    onDisplay={() => onDisplay(item.id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-500 font-bold">URGENT</div>
          <div className="text-red-400 font-black text-lg">
            {queue.filter(q => q.priority === 'urgent').length}
          </div>
        </div>
        <div>
          <div className="text-slate-500 font-bold">HIGH</div>
          <div className="text-orange-400 font-black text-lg">
            {queue.filter(q => q.priority === 'high').length}
          </div>
        </div>
        <div>
          <div className="text-slate-500 font-bold">NORMAL/LOW</div>
          <div className="text-slate-400 font-black text-lg">
            {queue.filter(q => q.priority === 'normal' || q.priority === 'low').length}
          </div>
        </div>
      </div>
    </div>
  );
};
