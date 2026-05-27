/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StateManager — Professional ICC Cricket State Coordinator
 *
 * Central hub that orchestrates all engine modules:
 *   - MatchEngine (ICC scoring logic)
 *   - DeliveryParser (string input)
 *   - RuleValidator (pre-validation)
 *   - BowlerCapEngine (bowling restrictions)
 *   - BroadcastEventEmitter (overlay events)
 *   - DLSEngine (rain interruptions)
 *   - SuperOverEngine (super over)
 *   - PressureEngine / MomentumEngine / MatchPhaseEngine
 *   - UndoEngine (snapshot history)
 *
 * API surface mirrors professional ICC scoring software.
 */

import {
  MatchState,
  BallType,
  WicketType,
  BallEvent,
  DeliveryInput,
  ValidationResult,
} from "../../types";
import { MatchEngine, DeliveryResult, formatOvers } from "./MatchEngine";
import { DeliveryParser } from "./DeliveryParser";
import { RuleValidator } from "./RuleValidator";
import { BowlerCapEngine, BowlerCapInfo } from "./BowlerCapEngine";
import { BroadcastEventEmitter } from "./BroadcastEventEmitter";
import { DLSEngine } from "./DLSEngine";
import { SuperOverEngine } from "./SuperOverEngine";
import { UndoEngine } from "./UndoEngine";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProcessResult {
  event: BallEvent;
  triggerType: string;
  warnings: string[];
  overComplete: boolean;
  inningsComplete: boolean;
}

// ─────────────────────────────────────────────────────────────
// StateManager
// ─────────────────────────────────────────────────────────────

export class StateManager {
  private state: MatchState;
  private undoEngine: UndoEngine;
  private emitter: BroadcastEventEmitter;
  private listeners: ((state: MatchState) => void)[] = [];

  constructor(initialState: MatchState) {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.undoEngine = new UndoEngine();
    this.emitter = BroadcastEventEmitter.instance;
  }

  // ─── State Access ─────────────────────────────────────────

  /** Get an immutable copy of the current state */
  getState(): MatchState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: MatchState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ─── Primary API: Process Delivery ───────────────────────

  /**
   * Process a delivery from a string input (professional scoring notation).
   *
   * @example
   *   manager.processDelivery("4")        → four
   *   manager.processDelivery("WD")       → wide
   *   manager.processDelivery("NB+6")     → no-ball six
   *   manager.processDelivery("W-bo")     → bowled
   *   manager.processDelivery("WD+W-st") → wide stumped
   *   manager.processDelivery("NB+W-ro") → no-ball run out
   */
  processDelivery(input: string | DeliveryInput): ProcessResult {
    const delivery: DeliveryInput = typeof input === "string"
      ? DeliveryParser.parse(input)
      : input;

    // Pre-validate for user feedback (errors will also throw in MatchEngine)
    const validation = RuleValidator.validate(delivery, this.state);
    if (!validation.valid) {
      const errors = validation.violations
        .filter(v => v.severity === "error")
        .map(v => v.message)
        .join("; ");
      throw new Error(errors);
    }

    // Save undo snapshot
    const desc = this.buildDescription(delivery);
    this.undoEngine.saveSnapshot(this.state, desc);

    // Capture pre-ball state for event detection
    const prevState = JSON.parse(JSON.stringify(this.state));

    // Process through ICC engine
    const result = MatchEngine.processDelivery(this.state, delivery);

    // Update state
    this.state = result.state;

    // Fire broadcast events
    this.emitter.detectAndEmit(prevState, this.state, result.event);

    // Notify subscribers
    this.notifyListeners();

    return {
      event: result.event,
      triggerType: result.trigger,
      warnings: result.warnings,
      overComplete: result.overComplete,
      inningsComplete: result.inningsComplete,
    };
  }

  /**
   * Process a delivery using individual components (used by legacy ControllerPanel).
   */
  processBall(
    runs: number,
    ballType: BallType,
    isWicket: boolean = false,
    wicketType?: WicketType,
    dismissedBatsman?: "striker" | "non-striker",
    newBatsmanName?: string
  ): { event: BallEvent; triggerType: string } {
    const delivery: DeliveryInput = {
      ballType, runs, isWicket, wicketType, dismissedBatsman, newBatsmanName
    };
    const result = this.processDelivery(delivery);
    return { event: result.event, triggerType: result.triggerType };
  }

  // ─── Validate Before Processing ──────────────────────────

  /**
   * Validate a delivery without processing it.
   * Useful for UI feedback before the operator confirms.
   */
  validate(input: string | DeliveryInput): ValidationResult {
    const delivery = typeof input === "string" ? DeliveryParser.parse(input) : input;
    return RuleValidator.validate(delivery, this.state);
  }

  /**
   * Check if a specific wicket type is valid for the current ball situation.
   */
  isValidWicket(
    wicketType: WicketType,
    ballType: BallType = "normal"
  ): boolean {
    const result = this.validate({ ballType, runs: 0, isWicket: true, wicketType });
    return result.valid;
  }

  // ─── Undo ─────────────────────────────────────────────────

  undo(): boolean {
    const snapshot = this.undoEngine.undo();
    if (!snapshot) return false;
    this.state = snapshot.state;
    this.state.eventTrigger = { type: "config", timestamp: Date.now() };
    this.notifyListeners();
    return true;
  }

  canUndo(): boolean { return this.undoEngine.canUndo(); }
  getUndoDepth(): number { return this.undoEngine.getDepth(); }
  getUndoHistory(count = 20): string[] { return this.undoEngine.getRecentSummary(count); }

  // ─── Match Controls ───────────────────────────────────────

  changeBowler(newBowlerName: string): void {
    this.undoEngine.saveSnapshot(this.state, `Bowler changed to ${newBowlerName}`);
    this.state = MatchEngine.changeBowler(this.state, newBowlerName);
    this.notifyListeners();
  }

  rotateStrike(): void {
    this.undoEngine.saveSnapshot(this.state, "Strike rotated manually");
    this.state = MatchEngine.rotateStrike(this.state);
    this.notifyListeners();
  }

  switchInnings(): void {
    this.undoEngine.saveSnapshot(this.state, "Innings switched");
    this.state = MatchEngine.switchInnings(this.state);
    this.emitter.emit("INNINGS_COMPLETE", {
      team: this.state.firstInningsSummary?.team,
      runs: this.state.firstInningsSummary?.runs,
      wickets: this.state.firstInningsSummary?.wickets,
    });
    this.notifyListeners();
  }

  setupSuperOver(): void {
    this.undoEngine.saveSnapshot(this.state, "Super over set up");
    this.state = SuperOverEngine.setup(this.state);
    this.emitter.emit("SUPER_OVER_START", { superOverNumber: 1 });
    this.notifyListeners();
  }

  startSuperOverInnings2(): void {
    this.undoEngine.saveSnapshot(this.state, "Super over innings 2 started");
    this.state = SuperOverEngine.startInnings2(this.state);
    this.notifyListeners();
  }

  checkSuperOverComplete(): { complete: boolean; winner: string | null; tied: boolean; result: string } {
    return SuperOverEngine.determineResult(this.state);
  }

  retireBatsman(which: "batsman1" | "batsman2", newName: string, isHurt: boolean): void {
    this.undoEngine.saveSnapshot(this.state, `${this.state[which].name} retired`);
    this.state = MatchEngine.retireBatsman(this.state, which, newName, isHurt);
    this.notifyListeners();
  }

  // ─── DLS ──────────────────────────────────────────────────

  /**
   * Apply a rain interruption and recalculate DLS revised target.
   */
  applyDLSInterruption(oversAvailable: number, inningsAffected: 1 | 2): void {
    this.undoEngine.saveSnapshot(this.state, `DLS: interruption in innings ${inningsAffected}`);
    this.state = DLSEngine.applyInterruption(this.state, oversAvailable, inningsAffected);
    this.emitter.emit("DLS_UPDATE", {
      revisedTarget: this.state.dlsData.revisedTarget,
      revisedOvers: this.state.dlsData.revisedOvers,
      parScore: this.state.dlsData.parScore,
    });
    this.notifyListeners();
  }

  /** Get current DLS summary string */
  getDLSSummary(): string {
    return DLSEngine.getSummaryString(this.state);
  }

  // ─── Bowler Cap ───────────────────────────────────────────

  /** Check if a bowler can bowl in the current situation */
  canBowl(bowlerName: string): boolean {
    return BowlerCapEngine.canBowl(bowlerName, this.state);
  }

  /** Get full cap information for a bowler */
  getBowlerCapInfo(bowlerName: string): BowlerCapInfo {
    return BowlerCapEngine.getBowlerCapInfo(bowlerName, this.state);
  }

  /** Get list of eligible bowlers from a squad */
  getEligibleBowlers(squad: string[]): string[] {
    return BowlerCapEngine.getEligibleBowlers(squad, this.state);
  }

  /** Get cap label for display (e.g., "2/4 ov") */
  getBowlerCapLabel(bowlerName: string): string {
    return BowlerCapEngine.getCapLabel(bowlerName, this.state);
  }

  // ─── Config / Display ─────────────────────────────────────

  updateConfig(partial: Partial<MatchState>): void {
    this.state = { ...this.state, ...partial };
    this.state.eventTrigger = { type: "config", timestamp: Date.now() };
    this.notifyListeners();
  }

  replaceState(newState: MatchState): void {
    this.state = JSON.parse(JSON.stringify(newState));
    this.notifyListeners();
  }

  reset(newState: MatchState): void {
    this.state = JSON.parse(JSON.stringify(newState));
    this.undoEngine.clear();
    this.notifyListeners();
  }

  // ─── Event Bus Access ─────────────────────────────────────

  get events(): BroadcastEventEmitter {
    return this.emitter;
  }

  // ─── Private Helpers ──────────────────────────────────────

  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach(l => l(stateCopy));
  }

  private buildDescription(delivery: DeliveryInput): string {
    if (delivery.isWicket) return `Wicket (${delivery.wicketType || "bowled"})`;
    if (delivery.ballType === "wide") return `Wide${delivery.runs > 0 ? ` + ${delivery.runs}` : ""}`;
    if (delivery.ballType === "noball") return `No Ball${delivery.runs > 0 ? ` + ${delivery.runs}` : ""}`;
    if (delivery.ballType === "bye") return `Bye ${delivery.runs}`;
    if (delivery.ballType === "legbye") return `Leg Bye ${delivery.runs}`;
    if (delivery.runs === 0) return "Dot ball";
    if (delivery.runs === 4) return "FOUR!";
    if (delivery.runs === 6) return "SIX!";
    return `${delivery.runs} run${delivery.runs !== 1 ? "s" : ""}`;
  }
}
