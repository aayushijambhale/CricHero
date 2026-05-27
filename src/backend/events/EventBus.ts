import { EventEmitter } from 'events';

class BroadcastEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow large number of internal listeners (overlay, analytics, commentary engines)
    this.setMaxListeners(50);
  }

  // Strictly typed emit for broadcast events
  emitEvent(eventName: 'WICKET' | 'FOUR' | 'SIX' | 'MILESTONE' | 'OVER_COMPLETE' | 'INNINGS_BREAK' | 'MATCH_START' | 'MATCH_END', payload: any) {
    this.emit(eventName, {
      ...payload,
      timestamp: Date.now()
    });
    
    // Also emit a catch-all for the Socket server
    this.emit('ANY_EVENT', {
      type: eventName,
      payload,
      timestamp: Date.now()
    });
  }
}

export const eventBus = new BroadcastEventBus();
