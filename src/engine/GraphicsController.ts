/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GraphicsController — Orchestrates production panel visibility and queue
 */

import { ProductionPanel, ProductionPanelType } from "../types";

export class GraphicsController {
  private queue: ProductionPanel[] = [];
  private activePanel: ProductionPanel | null = null;
  private dismissTimer: NodeJS.Timeout | null = null;
  private onPanelChange: ((panel: ProductionPanel | null) => void) | null = null;

  constructor() {}

  /**
   * Register a callback for when the active panel changes
   */
  setOnPanelChange(callback: (panel: ProductionPanel | null) => void): void {
    this.onPanelChange = callback;
  }

  /**
   * Show a production panel
   */
  show(panel: ProductionPanel): void {
    // If current panel has higher priority, queue the new one
    if (this.activePanel && this.activePanel.priority > panel.priority) {
      this.queue.push(panel);
      this.queue.sort((a, b) => b.priority - a.priority);
      return;
    }

    // Dismiss current panel
    this.clearDismissTimer();

    this.activePanel = panel;
    this.notifyChange();

    // Auto-dismiss after duration (if set)
    if (panel.displayDuration > 0) {
      this.dismissTimer = setTimeout(() => {
        this.dismiss();
      }, panel.displayDuration);
    }
  }

  /**
   * Dismiss the current panel
   */
  dismiss(): void {
    this.clearDismissTimer();
    this.activePanel = null;

    // Check queue for next panel
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.show(next);
    } else {
      this.notifyChange();
    }
  }

  /**
   * Toggle a specific panel type — show if not active, dismiss if active
   */
  toggle(panel: ProductionPanel): void {
    if (this.activePanel && this.activePanel.type === panel.type) {
      this.dismiss();
    } else {
      this.show(panel);
    }
  }

  /**
   * Get the currently active panel
   */
  getActivePanel(): ProductionPanel | null {
    return this.activePanel;
  }

  /**
   * Check if a specific panel type is active
   */
  isActive(type: ProductionPanelType): boolean {
    return this.activePanel?.type === type;
  }

  /**
   * Clear all panels and queue
   */
  clearAll(): void {
    this.clearDismissTimer();
    this.activePanel = null;
    this.queue = [];
    this.notifyChange();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  private notifyChange(): void {
    if (this.onPanelChange) {
      this.onPanelChange(this.activePanel);
    }
  }
}
