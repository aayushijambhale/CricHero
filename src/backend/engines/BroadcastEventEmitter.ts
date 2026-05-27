/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BroadcastEventEmitter — ICC Cricket Broadcast Event Bus
 *
 * Decoupled event system that auto-detects and fires named broadcast events
 * for milestone graphics, celebration overlays, and production triggers.
 *
 * Used by professional IPL/ICC broadcast systems to drive:
 *   - FOUR / SIX animations
 *   - WICKET flash card
 *   - Batsman milestones (50, 100, 150, 200)
 *   - Partnership milestones (50, 100)
 *   - Bowling milestones (5-for, hat-trick ball)
 *   - Over events (maiden, last over, phase change)
 *   - Match events (powerplay start/end, innings complete, result)
 */

import { BroadcastEvent, BroadcastEventType, MatchState, BallEvent } from "../../types";

type EventHandler = (event: BroadcastEvent) => void;

export class BroadcastEventEmitter {
  private handlers: Map<BroadcastEventType | "*", EventHandler[]> = new Map();

  // ──────────────────────────────────────────────────────────
  // Subscription API
  // ──────────────────────────────────────────────────────────

  /** Subscribe to a specific event type */
  on(type: BroadcastEventType | "*", handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  /** Unsubscribe */
  off(type: BroadcastEventType | "*", handler: EventHandler): void {
    const list = this.handlers.get(type);
    if (list) {
      this.handlers.set(type, list.filter(h => h !== handler));
    }
  }

  /** Emit a named event */
  emit(type: BroadcastEventType, data?: Record<string, unknown>): void {
    const event: BroadcastEvent = { type, timestamp: Date.now(), data };
    const specific = this.handlers.get(type) ?? [];
    const wildcard = this.handlers.get("*") ?? [];
    [...specific, ...wildcard].forEach(h => {
      try { h(event); } catch {}
    });
  }

  // ──────────────────────────────────────────────────────────
  // Auto-Detection: compare prev vs new state after each ball
  // ──────────────────────────────────────────────────────────

  /**
   * Call this after every ball to auto-fire all relevant broadcast events.
   * Pass both states to detect deltas.
   */
  detectAndEmit(
    prevState: MatchState,
    newState: MatchState,
    ballEvent: BallEvent
  ): void {
    // ── Scoring events ──
    if (ballEvent.isSix) {
      this.emit("SIX", { batsman: ballEvent.batsmanOnStrike, bowler: ballEvent.bowler });
    } else if (ballEvent.isBoundary) {
      this.emit("FOUR", { batsman: ballEvent.batsmanOnStrike, bowler: ballEvent.bowler });
    }

    // ── Wicket event ──
    if (ballEvent.isWicket) {
      this.emit("WICKET", {
        batsman: ballEvent.batsmanOnStrike,
        wicketType: ballEvent.wicketType,
        bowler: ballEvent.bowler,
        score: `${newState.runs}/${newState.wickets}`,
        wicketDescription: ballEvent.wicketDescription,
      });
      this.emit("LAST_WICKET", {
        name: newState.lastWicket?.name,
        runs: newState.lastWicket?.runs,
        balls: newState.lastWicket?.balls,
      });
    }

    // ── Free Hit ──
    if (ballEvent.triggersFreeHit) {
      this.emit("FREE_HIT", { bowler: ballEvent.bowler });
    }
    if (prevState.freeHit && !newState.freeHit) {
      this.emit("FREE_HIT_CONSUMED", {});
    }

    // ── Batsman milestones ──
    this.detectBatsmanMilestones(prevState, newState);

    // ── Partnership milestones ──
    this.detectPartnershipMilestones(prevState, newState);

    // ── Bowling milestones ──
    this.detectBowlerMilestones(prevState, newState);

    // ── Maiden ──
    if (ballEvent.isMaidenCompletion) {
      this.emit("MAIDEN_OVER", { bowler: ballEvent.bowler });
    }

    // ── Over complete ──
    if (newState.legalBallsInOver === 0 && prevState.legalBallsInOver === 5) {
      this.emit("OVER_COMPLETE", {
        overNumber: Math.floor(newState.balls / 6),
        bowler: prevState.bowler.name,
      });
    }

    // ── Powerplay transitions ──
    this.detectPhaseTransitions(prevState, newState);

    // ── Last overs ──
    const oversLeft = newState.config.totalOvers - Math.floor(newState.balls / 6);
    if (oversLeft === 5 && Math.floor(prevState.balls / 6) !== Math.floor(newState.balls / 6)) {
      this.emit("LAST_5_OVERS", { overs: 5 });
    }
    if (oversLeft === 1 && Math.floor(prevState.balls / 6) !== Math.floor(newState.balls / 6)) {
      this.emit("LAST_OVER", { overs: 1 });
    }

    // ── Match result ──
    if (newState.currentInnings === 2 && newState.target !== null) {
      if (newState.runs >= newState.target) {
        this.emit("MATCH_RESULT", {
          winner: newState.config.team2,
          margin: newState.config.maxWickets - newState.wickets,
          marginType: "wickets",
        });
      } else if (
        (newState.balls >= newState.config.totalOvers * 6 ||
          newState.wickets >= newState.config.maxWickets) &&
        newState.runs < newState.target
      ) {
        this.emit("MATCH_RESULT", {
          winner: newState.config.team1,
          margin: newState.target - newState.runs - 1,
          marginType: "runs",
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Milestone Detection Helpers
  // ──────────────────────────────────────────────────────────

  private detectBatsmanMilestones(prev: MatchState, curr: MatchState): void {
    const MILESTONES = [50, 100, 150, 200];

    // Check batsman 1
    for (const m of MILESTONES) {
      if (prev.batsman1.runs < m && curr.batsman1.runs >= m) {
        if (m === 50) this.emit("BATSMAN_FIFTY", { name: curr.batsman1.name, runs: m });
        else this.emit("BATSMAN_CENTURY", { name: curr.batsman1.name, runs: m });
        this.emit("MILESTONE", { name: curr.batsman1.name, milestone: m, type: "batting" });
      }
      if (prev.batsman2.runs < m && curr.batsman2.runs >= m) {
        if (m === 50) this.emit("BATSMAN_FIFTY", { name: curr.batsman2.name, runs: m });
        else this.emit("BATSMAN_CENTURY", { name: curr.batsman2.name, runs: m });
        this.emit("MILESTONE", { name: curr.batsman2.name, milestone: m, type: "batting" });
      }
    }

    // Duck — scored 0 and got out (only meaningful for batsmen who faced balls)
    if (
      curr.batsmanHistory.length > prev.batsmanHistory.length
    ) {
      const dismissed = curr.batsmanHistory[curr.batsmanHistory.length - 1];
      if (dismissed && dismissed.runs === 0 && dismissed.balls > 0) {
        this.emit("BATSMAN_DUCK", { name: dismissed.name });
      }
    }
  }

  private detectPartnershipMilestones(prev: MatchState, curr: MatchState): void {
    const MILESTONES = [50, 100, 150, 200];
    for (const m of MILESTONES) {
      if (prev.partnershipRuns < m && curr.partnershipRuns >= m) {
        if (m === 50) this.emit("PARTNERSHIP_FIFTY", { runs: m });
        else this.emit("PARTNERSHIP_CENTURY", { runs: m });
      }
    }
  }

  private detectBowlerMilestones(prev: MatchState, curr: MatchState): void {
    // 5-wicket haul
    if (prev.bowler.wickets < 5 && curr.bowler.wickets >= 5) {
      this.emit("FIVE_WICKETS", { bowler: curr.bowler.name, wickets: curr.bowler.wickets });
      this.emit("MILESTONE", { name: curr.bowler.name, milestone: 5, type: "bowling" });
    }

    // Hat-trick detection: last 3 balls all wickets
    const history = curr.ballHistory;
    if (history.length >= 3) {
      const last3 = history.slice(-3);
      if (last3.every(b => b.isWicket)) {
        this.emit("HAT_TRICK", { bowler: curr.bowler.name });
      } else if (history.length >= 2) {
        const last2 = history.slice(-2);
        if (last2.every(b => b.isWicket)) {
          this.emit("HAT_TRICK_BALL", { bowler: curr.bowler.name, message: "Hat-trick ball!" });
        }
      }
    }
  }

  private detectPhaseTransitions(prev: MatchState, curr: MatchState): void {
    if (prev.matchPhase !== curr.matchPhase) {
      this.emit("PHASE_CHANGE", {
        from: prev.matchPhase,
        to: curr.matchPhase,
      });

      if (curr.matchPhase === "powerplay") {
        this.emit("POWERPLAY_START", { phase: curr.powerplayPhase });
      }
      if (prev.matchPhase === "powerplay" && curr.matchPhase !== "powerplay") {
        this.emit("POWERPLAY_END", { overs: Math.floor(curr.balls / 6) });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Singleton
  // ──────────────────────────────────────────────────────────

  private static _instance: BroadcastEventEmitter;
  static get instance(): BroadcastEventEmitter {
    if (!this._instance) this._instance = new BroadcastEventEmitter();
    return this._instance;
  }
}
