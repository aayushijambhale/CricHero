/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UndoEngine — Snapshot-based state history with unlimited undo
 */

import { MatchState } from "../../types";

export interface UndoSnapshot {
  state: MatchState;
  description: string;
  timestamp: number;
}

export class UndoEngine {
  private snapshots: UndoSnapshot[] = [];
  private maxDepth = 200;

  /**
   * Save a copy of the state before an action is taken
   */
  saveSnapshot(state: MatchState, description: string): void {
    if (this.snapshots.length >= this.maxDepth) {
      this.snapshots.shift();
    }
    this.snapshots.push({
      state: JSON.parse(JSON.stringify(state)),
      description,
      timestamp: Date.now(),
    });
  }

  /**
   * Undo and return the previous snapshot
   */
  undo(): UndoSnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots.pop()!;
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.snapshots.length > 0;
  }

  /**
   * Clear all undo history
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Get size of undo stack
   */
  getDepth(): number {
    return this.snapshots.length;
  }

  /**
   * Get list of recent changes
   */
  getRecentSummary(count: number = 20): string[] {
    return this.snapshots
      .slice(-count)
      .reverse()
      .map(s => `${new Date(s.timestamp).toLocaleTimeString()} - ${s.description}`);
  }
}
