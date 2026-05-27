/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MomentumEngine — Tracks batting/bowling momentum and streaks
 */

import { MatchState, MomentumState } from "../types";

export class MomentumEngine {
  /**
   * Calculate momentum state based on recent ball history
   */
  static calculate(state: MatchState): MomentumState {
    const history = state.ballHistory;
    if (history.length === 0) {
      return {
        direction: "neutral",
        intensity: 0,
        consecutiveBoundaries: 0,
        consecutiveDots: 0,
        recentWickets: 0,
        scoringAcceleration: 0,
      };
    }

    // Analyze last 12 balls (2 overs) for trends
    const recentBalls = history.slice(-12);
    
    let boundaryCount = 0;
    let dotCount = 0;
    let wicketCount = 0;
    let runsScored = 0;

    recentBalls.forEach(ball => {
      if (ball.isBoundary || ball.isSix) boundaryCount++;
      if (ball.runs === 0 && ball.extras === 0 && !ball.isWicket) dotCount++;
      if (ball.isWicket) wicketCount++;
      runsScored += ball.totalRuns;
    });

    // Consecutive streaks from the very end of history
    let consecutiveBoundaries = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const ball = history[i];
      if (ball.isBoundary || ball.isSix) {
        consecutiveBoundaries++;
      } else if (ball.runs > 0 || ball.extras > 0) {
        break; // streak broken
      }
    }

    let consecutiveDots = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const ball = history[i];
      if (ball.runs === 0 && ball.extras === 0 && !ball.isWicket) {
        consecutiveDots++;
      } else if (ball.runs > 0 || ball.extras > 0 || ball.isWicket) {
        break;
      }
    }

    // Calculate scoring acceleration: comparing last 6 balls to the 6 before that
    let scoringAcceleration = 0;
    if (history.length >= 12) {
      const lastSix = history.slice(-6).reduce((sum, b) => sum + b.totalRuns, 0);
      const prevSix = history.slice(-12, -6).reduce((sum, b) => sum + b.totalRuns, 0);
      scoringAcceleration = lastSix - prevSix;
    }

    // Determine direction and intensity
    let direction: "batting" | "bowling" | "neutral" = "neutral";
    let intensity = 0;

    // Scoring runs rapidly or hitting boundaries gives batting momentum
    const battingScore = (runsScored / 12) * 0.4 + boundaryCount * 0.15 + consecutiveBoundaries * 0.2 + (scoringAcceleration > 0 ? 0.1 : 0);
    // Dot balls and wickets give bowling momentum
    const bowlingScore = wicketCount * 0.35 + dotCount * 0.05 + consecutiveDots * 0.1;

    if (battingScore > bowlingScore + 0.15) {
      direction = "batting";
      intensity = Math.min(1.0, battingScore);
    } else if (bowlingScore > battingScore + 0.15) {
      direction = "bowling";
      intensity = Math.min(1.0, bowlingScore);
    } else {
      direction = "neutral";
      intensity = 0;
    }

    return {
      direction,
      intensity,
      consecutiveBoundaries,
      consecutiveDots,
      recentWickets: wicketCount,
      scoringAcceleration,
    };
  }
}
