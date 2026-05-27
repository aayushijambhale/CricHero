/**
 * GraphicsQueueEngine
 * Professionally orchestrates animations so they don't overlap (e.g. Wicket animation waits for Four animation to finish).
 */

export interface GraphicsEvent {
  id: string;
  type: 'WICKET' | 'BOUNDARY' | 'MILESTONE' | 'POWERPLAY' | 'REVIEW';
  payload: any;
  priority: number; // Higher number = play sooner
}

export class GraphicsQueueEngine {
  private queue: GraphicsEvent[] = [];
  private isPlaying: boolean = false;
  private currentAnimation: GraphicsEvent | null = null;
  private onPlayCallback: ((event: GraphicsEvent, onComplete: () => void) => void) | null = null;

  // Register the PIXI renderer callback that actually executes the GSAP animation
  registerRenderer(callback: (event: GraphicsEvent, onComplete: () => void) => void) {
    this.onPlayCallback = callback;
  }

  enqueue(event: Omit<GraphicsEvent, 'id'>) {
    const newEvent: GraphicsEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.queue.push(newEvent);
    // Sort queue by priority
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.processNext();
  }

  private processNext() {
    if (this.isPlaying || this.queue.length === 0 || !this.onPlayCallback) return;

    this.isPlaying = true;
    this.currentAnimation = this.queue.shift()!;

    console.log(`[GraphicsQueue] Playing animation: ${this.currentAnimation.type}`);

    // Fire the PIXI renderer, and pass a callback for when GSAP is done
    this.onPlayCallback(this.currentAnimation, () => {
      console.log(`[GraphicsQueue] Completed: ${this.currentAnimation!.type}`);
      this.isPlaying = false;
      this.currentAnimation = null;
      this.processNext();
    });
  }

  clearQueue() {
    this.queue = [];
  }
}

export const graphicsQueue = new GraphicsQueueEngine();
