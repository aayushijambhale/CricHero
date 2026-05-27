/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BowlerCapEngine — ICC Bowling Restriction Enforcer
 *
 * Enforces format-dependent maximum overs per bowler and consecutive
 * over restrictions, as per ICC Playing Conditions.
 *
 * Format rules:
 *   T20 / T10     : max totalOvers/5 overs per bowler
 *   ODI           : max 10 overs per bowler (50-over format)
 *   Test          : unlimited (no cap)
 *   The Hundred   : max 20 balls (≈3.33 overs) per bowler
 *   Custom        : max totalOvers/5, minimum 1
 *
 * ICC Rule — No bowler may bowl two consecutive overs.
 */

import { MatchFormat, MatchState } from "../../types";

export interface BowlerCapInfo {
  name: string;
  oversBowled: number;
  ballsBowled: number;
  maxOvers: number;
  maxBalls: number;
  canBowl: boolean;
  canBowlNextOver: boolean;
  oversBowledList: number[];
}

export class BowlerCapEngine {
  // ─── Format max overs ────────────────────────────────────

  static getMaxOvers(format: MatchFormat, totalOvers: number): number {
    switch (format) {
      case "t20":      return 4;            // 20 / 5
      case "t10":      return 2;            // 10 / 5
      case "odi":      return 10;           // 50-over: max 10
      case "test":     return Infinity;     // no cap
      case "hundred":  return Infinity;     // tracked in balls (20 balls), see getMaxBalls
      case "superover": return 1;
      case "custom":
      default:
        return Math.max(1, Math.floor(totalOvers / 5));
    }
  }

  static getMaxBalls(format: MatchFormat, totalOvers: number): number {
    if (format === "hundred") return 20; // The Hundred rule
    return this.getMaxOvers(format, totalOvers) * 6;
  }

  // ─── Per-bowler eligibility ───────────────────────────────

  /**
   * Returns whether a specific bowler can bowl in the current over.
   */
  static canBowl(bowlerName: string, state: MatchState): boolean {
    const format = state.config.format;
    const totalOvers = state.config.totalOvers;
    const maxBalls = this.getMaxBalls(format, totalOvers);

    // Find bowler in history
    const bowlerRecord = this.findBowlerRecord(bowlerName, state);
    if (!bowlerRecord) return true; // hasn't bowled yet

    // Check ball cap
    if (bowlerRecord.balls >= maxBalls) return false;

    // Check: same bowler can't bowl consecutive overs
    if (!this.canBowlNextOver(bowlerName, state)) return false;

    return true;
  }

  /**
   * Returns whether a specific bowler is permitted to bowl the NEXT over
   * (i.e., they didn't bowl the previous over).
   */
  static canBowlNextOver(bowlerName: string, state: MatchState): boolean {
    const currentOverIndex = Math.floor(state.balls / 6);
    if (currentOverIndex === 0) return true; // first over, anyone can bowl

    // The previous over (currentOverIndex - 1) was bowled by whom?
    // We track oversBowled[] as the list of over indices each bowler bowled.
    const allBowlerRecords = [
      state.bowler,
      ...state.bowlerHistory,
    ];

    for (const record of allBowlerRecords) {
      if (record.name.toUpperCase() === bowlerName.toUpperCase()) continue;
      // Does this OTHER bowler have the previous over in their list?
      // We don't need to check — we check if the QUERIED bowler had previousOver
    }

    // Check current bowler's oversBowled
    const myRecord = this.findBowlerRecord(bowlerName, state);
    if (!myRecord || !myRecord.oversBowled) return true;

    const previousOver = currentOverIndex - 1;
    return !myRecord.oversBowled.includes(previousOver);
  }

  /**
   * Get comprehensive cap info for a bowler.
   */
  static getBowlerCapInfo(bowlerName: string, state: MatchState): BowlerCapInfo {
    const format = state.config.format;
    const totalOvers = state.config.totalOvers;
    const maxOvers = this.getMaxOvers(format, totalOvers);
    const maxBalls = this.getMaxBalls(format, totalOvers);

    const record = this.findBowlerRecord(bowlerName, state);
    const ballsBowled = record?.balls ?? 0;
    const oversBowled = Math.floor(ballsBowled / 6);
    const oversBowledList = record?.oversBowled ?? [];

    return {
      name: bowlerName,
      oversBowled,
      ballsBowled,
      maxOvers,
      maxBalls,
      canBowl: this.canBowl(bowlerName, state),
      canBowlNextOver: this.canBowlNextOver(bowlerName, state),
      oversBowledList,
    };
  }

  /**
   * Returns list of eligible bowlers from a provided squad.
   */
  static getEligibleBowlers(squad: string[], state: MatchState): string[] {
    return squad.filter(name => this.canBowl(name, state));
  }

  /**
   * Returns list of bowlers who CANNOT bowl next (cap or consecutive restriction).
   */
  static getIneligibleBowlers(squad: string[], state: MatchState): string[] {
    return squad.filter(name => !this.canBowl(name, state));
  }

  // ─── Helpers ─────────────────────────────────────────────

  private static findBowlerRecord(name: string, state: MatchState) {
    const upperName = name.toUpperCase();
    if (state.bowler.name.toUpperCase() === upperName) return state.bowler;
    return state.bowlerHistory.find(b => b.name.toUpperCase() === upperName);
  }

  /**
   * Update a bowler's oversBowled list when they complete an over.
   * Called by MatchEngine after over completion.
   */
  static recordOverBowled(bowlerName: string, overIndex: number, state: MatchState): void {
    const allBowlers = [state.bowler, ...state.bowlerHistory];
    for (const b of allBowlers) {
      if (b.name.toUpperCase() === bowlerName.toUpperCase()) {
        if (!b.oversBowled) b.oversBowled = [];
        if (!b.oversBowled.includes(overIndex)) {
          b.oversBowled.push(overIndex);
        }
        return;
      }
    }
  }

  /**
   * Human-readable cap status label for display.
   */
  static getCapLabel(bowlerName: string, state: MatchState): string {
    const info = this.getBowlerCapInfo(bowlerName, state);
    if (state.config.format === "hundred") {
      const ballsLeft = info.maxBalls - info.ballsBowled;
      return `${ballsLeft} balls left`;
    }
    const oversLeft = info.maxOvers - info.oversBowled;
    if (!isFinite(info.maxOvers)) return "∞ overs";
    return `${oversLeft}/${info.maxOvers} ov`;
  }
}
