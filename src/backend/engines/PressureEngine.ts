/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PressureEngine — Intelligent match-state pressure detection
 */

import { MatchState, PressureState } from "../../types";

export class PressureEngine {
  /**
   * Calculate match pressure state from current MatchState
   */
  static calculate(state: MatchState): PressureState {
    if (state.currentInnings === 1) {
      return this.calculateFirstInnings(state);
    } else {
      return this.calculateSecondInnings(state);
    }
  }

  private static calculateFirstInnings(state: MatchState): PressureState {
    const totalBalls = state.config.totalOvers * 6;
    const ballsBowled = state.balls;
    const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
    const wickets = state.wickets;
    const maxWickets = state.config.maxWickets;
    const wicketsLeft = maxWickets - wickets;

    let score = 0;
    let level: "normal" | "building" | "high" | "extreme" = "normal";
    let description = "First Innings in progress";

    // Build pressure if wickets are falling fast
    if (wicketsLeft <= 3 && ballsRemaining > 18) {
      score = 0.6;
      level = "high";
      description = `Critical situation: Only ${wicketsLeft} wickets left`;
    } else if (wicketsLeft <= 1) {
      score = 0.85;
      level = "extreme";
      description = "Last wicket partnership! Absolute caution required";
    } else if (ballsRemaining <= 12) {
      // Death overs pressure (trying to accelerate)
      score = 0.5;
      level = "building";
      description = "Death overs acceleration phase";
    }

    return { level, score, description };
  }

  private static calculateSecondInnings(state: MatchState): PressureState {
    if (state.target === null) {
      return { level: "normal", score: 0, description: "Chase starting" };
    }

    const runsNeeded = Math.max(0, state.target - state.runs);
    const ballsRemaining = state.ballsRemaining;
    const wicketsLeft = state.config.maxWickets - state.wickets;

    if (runsNeeded === 0) {
      return { level: "normal", score: 0, description: "Match won!" };
    }

    if (ballsRemaining <= 0) {
      return { level: "normal", score: 0, description: "Innings over" };
    }

    // Required Run Rate
    const rrr = (runsNeeded / ballsRemaining) * 6;
    const crr = state.currentRunRate;

    let score = 0;
    let level: "normal" | "building" | "high" | "extreme" = "normal";

    // Base score on required run rate
    if (rrr <= 6) {
      score = 0.1;
    } else if (rrr <= 9) {
      score = 0.35;
    } else if (rrr <= 12) {
      score = 0.65;
    } else {
      score = 0.85;
    }

    // Adjust for wickets remaining
    if (wicketsLeft <= 2) {
      score += 0.15;
    }
    if (wicketsLeft <= 1) {
      score += 0.1;
    }

    // Adjust for balls remaining (late game pressure)
    if (ballsRemaining <= 12 && rrr > 8) {
      score += 0.15;
    }
    if (ballsRemaining <= 6) {
      score += 0.1;
    }

    // Clamp score
    score = Math.min(1.0, Math.max(0, score));

    // Determine level
    if (score >= 0.85) {
      level = "extreme";
    } else if (score >= 0.6) {
      level = "high";
    } else if (score >= 0.35) {
      level = "building";
    } else {
      level = "normal";
    }

    // Generate descriptive sentence
    let description = `Need ${runsNeeded} runs off ${ballsRemaining} balls (Req: ${rrr.toFixed(2)})`;
    if (level === "extreme") {
      description = `CRITICAL: ${runsNeeded} runs needed from ${ballsRemaining} balls!`;
    } else if (level === "high") {
      description = `TENSION BUILDING: ${runsNeeded} runs off ${ballsRemaining} balls needed.`;
    }

    return { level, score, description };
  }
}
