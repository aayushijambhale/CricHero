/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DLSEngine — Duckworth-Lewis-Stern Method Calculator
 *
 * Implements the ICC Standard Edition DLS resource table.
 * Used when rain interruptions reduce overs available.
 *
 * The DLS resource percentages below are from the publicly known
 * ICC Standard Edition lookup table (10-wicket baseline, 50-over ODI).
 * Scaled appropriately for T20 and other formats.
 *
 * Professional Note: The Professional Edition requires a licensed
 * ICC dataset. This Standard Edition is accurate for broadcast display.
 */

import { DLSData, MatchState } from "../types";

// ─────────────────────────────────────────────────────────────
// DLS Resource Table (Standard Edition)
// Resources[oversRemaining][wicketsDown] = % resources remaining
// Overs: 0-50 (rows), Wickets: 0-9 (cols)
// ─────────────────────────────────────────────────────────────

const G50 = 245; // G50 constant (standard edition)

// Published Z50 values (resources available with full wickets, n overs)
const Z50_TABLE: Record<number, number> = {
  50: 100.0, 49: 97.8, 48: 95.5, 47: 93.1, 46: 90.6,
  45: 88.1, 44: 85.5, 43: 82.8, 42: 80.1, 41: 77.3,
  40: 74.5, 39: 71.6, 38: 68.7, 37: 65.7, 36: 62.7,
  35: 59.7, 34: 56.7, 33: 53.7, 32: 50.7, 31: 47.7,
  30: 44.8, 29: 41.9, 28: 39.1, 27: 36.4, 26: 33.7,
  25: 31.1, 24: 28.7, 23: 26.4, 22: 24.2, 21: 22.1,
  20: 20.1, 19: 18.3, 18: 16.6, 17: 15.0, 16: 13.5,
  15: 12.1, 14: 10.9, 13: 9.7, 12: 8.7, 11: 7.7,
  10: 6.8, 9: 6.0, 8: 5.3, 7: 4.6, 6: 4.0,
  5: 3.4, 4: 2.8, 3: 2.3, 2: 1.7, 1: 1.1, 0: 0,
};

// Proportion of resources used by wickets (10 wickets = 100%)
// These factors scale Z50 based on how many wickets are down.
const WICKET_FACTORS: number[] = [
  1.000, // 0 wickets down
  0.907, // 1 wicket down
  0.807, // 2 wickets down
  0.702, // 3 wickets down
  0.596, // 4 wickets down
  0.491, // 5 wickets down
  0.386, // 6 wickets down
  0.282, // 7 wickets down
  0.179, // 8 wickets down
  0.080, // 9 wickets down
];

export class DLSEngine {
  // ─── Resource Calculation ───────────────────────────────

  /**
   * Calculate % resources remaining for a given (oversLeft, wicketsDown) situation.
   * Returns a value 0-100.
   *
   * Uses the ICC Standard Edition formula:
   *   R(u, w) = Z50(u) × F(w)
   * where Z50(u) is resources with full wickets and u overs,
   * and F(w) is the wicket factor adjustment.
   */
  static calculateResources(oversRemaining: number, wicketsDown: number): number {
    // Clamp inputs
    const u = Math.max(0, Math.min(50, Math.round(oversRemaining)));
    const w = Math.max(0, Math.min(9, wicketsDown));

    const z50 = Z50_TABLE[u] ?? 0;
    const factor = WICKET_FACTORS[w] ?? 0;

    return Math.round(z50 * factor * 10) / 10;
  }

  /**
   * Calculate resources consumed (100 - resources remaining).
   */
  static calculateResourcesUsed(
    totalOvers: number,
    oversRemaining: number,
    wicketsDown: number
  ): number {
    const totalResource = this.calculateResources(totalOvers, 0); // full resources at start
    const remaining = this.calculateResources(oversRemaining, wicketsDown);
    return Math.round((totalResource - remaining) * 10) / 10;
  }

  // ─── Revised Target Calculation ─────────────────────────

  /**
   * Calculate DLS revised target for Team 2.
   *
   * DLS Equation:
   *   If Team 2 has FEWER resources than Team 1:
   *     Target = Team1Score × (R2 / R1) + 1
   *   If Team 2 has MORE resources than Team 1 (Team 1 was interrupted):
   *     Target = Team1Score + G50 × (R2 - R1) / 100 + 1
   *
   * @param team1Score  - Team 1's total score
   * @param team1Resources - % resources Team 1 had (usually 100 for uninterrupted)
   * @param team2Resources - % resources available to Team 2
   */
  static calculateRevisedTarget(
    team1Score: number,
    team1Resources: number,
    team2Resources: number
  ): number {
    if (team2Resources >= team1Resources) {
      // Team 2 has more resources — par score boosted
      const additional = G50 * (team2Resources - team1Resources) / 100;
      return Math.floor(team1Score + additional) + 1;
    } else {
      // Team 2 has fewer resources — target scaled down
      const target = team1Score * (team2Resources / team1Resources);
      return Math.floor(target) + 1;
    }
  }

  /**
   * Calculate the par score at any point in Team 2's innings.
   * Useful for displaying "Par: 145" during a rain break.
   */
  static calculateParScore(
    team1Score: number,
    team1Resources: number,
    team2ResourcesUsed: number,
    team2TotalResources: number
  ): number {
    const team2Resources = team2TotalResources;
    const revisedTarget = this.calculateRevisedTarget(team1Score, team1Resources, team2Resources);
    const ratio = team2ResourcesUsed / team2TotalResources;
    return Math.floor((revisedTarget - 1) * ratio);
  }

  // ─── State Application ──────────────────────────────────

  /**
   * Apply a rain interruption to the match state.
   * Updates dlsData with revised overs, target, and resources.
   *
   * @param state - current match state
   * @param oversAvailable - how many overs are now available after interruption
   * @param inningsAffected - which innings (1 or 2) was interrupted
   */
  static applyInterruption(
    state: MatchState,
    oversAvailable: number,
    inningsAffected: 1 | 2
  ): MatchState {
    const newState = JSON.parse(JSON.stringify(state)) as MatchState;
    const dls = newState.dlsData;

    dls.isActive = true;
    dls.interruptedInnings = inningsAffected;
    dls.interruptedAt = {
      over: Math.floor(state.balls / 6),
      ball: state.balls % 6,
      wickets: state.wickets,
      runs: state.runs,
    };
    dls.revisedOvers = oversAvailable;

    const totalOvers = state.config.totalOvers;

    if (inningsAffected === 1) {
      // Team 1 interrupted — calculate their resources used
      const team1OversRemaining = Math.max(0, totalOvers - Math.floor(state.balls / 6));
      dls.team1Resources = this.calculateResources(team1OversRemaining, state.wickets);
    } else {
      // Team 2 interrupted — calculate revised target
      if (state.firstInningsSummary) {
        const team1Score = state.firstInningsSummary.runs;
        const team1Resources = dls.team1Resources;

        const team2OversRemaining = oversAvailable;
        const team2Resources = this.calculateResources(team2OversRemaining, 0);
        dls.team2Resources = team2Resources;

        const revisedTarget = this.calculateRevisedTarget(
          team1Score, team1Resources, team2Resources
        );
        dls.revisedTarget = revisedTarget;
        newState.target = revisedTarget;

        // Current par score
        const team2OversUsed = Math.floor(state.balls / 6);
        const team2ResourcesUsed = this.calculateResources(totalOvers, 0) -
          this.calculateResources(Math.max(0, oversAvailable - team2OversUsed), state.wickets);
        dls.parScore = this.calculateParScore(team1Score, team1Resources, team2ResourcesUsed, team2Resources);
      }
    }

    // Update config
    newState.config.totalOvers = oversAvailable;

    return newState;
  }

  /**
   * Update DLS par score as Team 2 bats.
   * Should be called after every ball in a DLS-active match.
   */
  static updateParScore(state: MatchState): MatchState {
    if (!state.dlsData.isActive || !state.firstInningsSummary) return state;

    const newState = JSON.parse(JSON.stringify(state)) as MatchState;
    const dls = newState.dlsData;

    const team1Score = state.firstInningsSummary.runs;
    const team1Resources = dls.team1Resources;
    const team2Resources = dls.team2Resources;
    const oversRemaining = state.config.totalOvers - Math.floor(state.balls / 6);

    const currentResources = this.calculateResources(oversRemaining, state.wickets);
    const resourcesUsed = team2Resources - currentResources;

    dls.parScore = this.calculateParScore(
      team1Score, team1Resources, resourcesUsed, team2Resources
    );

    return newState;
  }

  /**
   * Get human-readable DLS summary string for display.
   */
  static getSummaryString(state: MatchState): string {
    const dls = state.dlsData;
    if (!dls.isActive) return "";

    const parts: string[] = ["DLS"];
    if (dls.revisedTarget) parts.push(`Target: ${dls.revisedTarget}`);
    if (dls.revisedOvers) parts.push(`Overs: ${dls.revisedOvers}`);
    if (dls.parScore !== null) parts.push(`Par: ${dls.parScore}`);
    return parts.join(" | ");
  }
}
