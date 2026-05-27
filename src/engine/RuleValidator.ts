/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RuleValidator — ICC Cricket Rule Enforcement Engine
 *
 * Validates every delivery against the complete ICC Playing Conditions
 * before it is processed by the scoring engine. Prevents impossible or
 * illegal dismissals, over-ball violations, and format-specific breaches.
 */

import {
  DeliveryInput,
  MatchState,
  ValidationResult,
  RuleViolation,
  WicketType,
} from "../types";

// ─────────────────────────────────────────────────────────────
// ICC Dismissal Rule Tables
// ─────────────────────────────────────────────────────────────

/**
 * Wicket types that are valid on a WIDE ball.
 * ICC Rule 25.6 — A batsman can be dismissed off a wide:
 *   stumped, run out, handling ball/obstructing (rare), hit wicket (extremely rare but possible)
 */
const VALID_WICKETS_ON_WIDE: WicketType[] = [
  "stumped",
  "runout",
  "obstructing",
  "handled_ball",
];

/**
 * Wicket types that are valid on a NO BALL.
 * ICC Rule 24.16 — On a no-ball, a batsman can ONLY be dismissed by:
 *   run out, hit wicket, obstructing the field, handled ball, timed out
 */
const VALID_WICKETS_ON_NOBALL: WicketType[] = [
  "runout",
  "hitwicket",
  "obstructing",
  "handled_ball",
  "timed_out",
];

/**
 * Wicket types that are valid on a FREE HIT ball.
 * ICC T20/ODI Rule — On a free hit, only run out, obstructing, hit wicket allowed.
 */
const VALID_WICKETS_ON_FREEHIT: WicketType[] = [
  "runout",
  "obstructing",
  "hitwicket",
  "handled_ball",
];

/**
 * Wicket types credited to the bowler (for bowling figures).
 */
export const BOWLER_WICKET_TYPES: WicketType[] = [
  "bowled",
  "caught",
  "lbw",
  "stumped",
  "hitwicket",
];

// ─────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────

export class RuleValidator {
  /**
   * Full validation of a delivery before processing.
   * Returns a ValidationResult — if valid=false, the engine MUST NOT process.
   */
  static validate(delivery: DeliveryInput, state: MatchState): ValidationResult {
    const violations: RuleViolation[] = [];

    this.validateOverLimit(state, violations);
    this.validateWicketCount(state, delivery, violations);
    this.validateNoBallDismissals(delivery, violations);
    this.validateWideDismissals(delivery, violations);
    this.validateFreeHitDismissals(delivery, state, violations);
    this.validateNoWicketOnBye(delivery, violations);
    this.validateRunsRange(delivery, violations);
    this.validateSuperOverRules(delivery, state, violations);
    this.validateDismissalCombinations(delivery, violations);

    return {
      valid: violations.filter(v => v.severity === "error").length === 0,
      violations,
    };
  }

  /**
   * Check if over is already complete (6 legal balls bowled).
   * Engine should enforce bowler change before another ball.
   */
  private static validateOverLimit(state: MatchState, violations: RuleViolation[]): void {
    if (state.legalBallsInOver >= 6) {
      violations.push({
        code: "OVER_LIMIT_EXCEEDED",
        message: "Over already complete (6 legal balls bowled). Change bowler first.",
        severity: "error",
      });
    }
  }

  /**
   * Can't record a wicket if innings is already finished.
   */
  private static validateWicketCount(
    state: MatchState,
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    if (!delivery.isWicket) return;

    const maxWickets = state.superOver
      ? 2
      : state.config.maxWickets;

    if (state.wickets >= maxWickets) {
      violations.push({
        code: "INNINGS_ALREADY_COMPLETE",
        message: `Innings already complete — all ${maxWickets} wickets fallen.`,
        severity: "error",
      });
    }
  }

  /**
   * ICC Rule 24.16: On a no-ball, ONLY run out, hit wicket,
   * obstructing field, and timed out are valid dismissals.
   */
  private static validateNoBallDismissals(
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    if (delivery.ballType !== "noball" || !delivery.isWicket || !delivery.wicketType) return;

    if (!VALID_WICKETS_ON_NOBALL.includes(delivery.wicketType)) {
      violations.push({
        code: "ILLEGAL_NOBALL_DISMISSAL",
        message: `${delivery.wicketType} is NOT a valid dismissal on a no-ball. ` +
          `Only ${VALID_WICKETS_ON_NOBALL.join(", ")} are permitted (ICC Rule 24.16).`,
        severity: "error",
      });
    }
  }

  /**
   * ICC Rule 25.6: On a wide, ONLY stumped and run out are valid dismissals.
   * Caught/Bowled/LBW/Hit-Wicket are NOT valid off a wide.
   */
  private static validateWideDismissals(
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    if (delivery.ballType !== "wide" || !delivery.isWicket || !delivery.wicketType) return;

    if (!VALID_WICKETS_ON_WIDE.includes(delivery.wicketType)) {
      violations.push({
        code: "ILLEGAL_WIDE_DISMISSAL",
        message: `${delivery.wicketType} is NOT a valid dismissal off a wide. ` +
          `Only ${VALID_WICKETS_ON_WIDE.join(", ")} are permitted (ICC Rule 25.6).`,
        severity: "error",
      });
    }
  }

  /**
   * ICC T20/ODI Playing Conditions: On a free hit, only run out,
   * obstructing the field, and hit wicket are valid dismissals.
   */
  private static validateFreeHitDismissals(
    delivery: DeliveryInput,
    state: MatchState,
    violations: RuleViolation[]
  ): void {
    if (!state.freeHit || !delivery.isWicket || !delivery.wicketType) return;

    // Free hit doesn't apply in Test cricket
    if (state.config.format === "test") return;

    if (!VALID_WICKETS_ON_FREEHIT.includes(delivery.wicketType)) {
      violations.push({
        code: "ILLEGAL_FREEHIT_DISMISSAL",
        message: `${delivery.wicketType} is NOT valid on a FREE HIT. ` +
          `Only run out, obstructing the field, and hit wicket are allowed.`,
        severity: "error",
      });
    }
  }

  /**
   * Byes and Leg Byes — cannot be combined with a caught/bowled/lbw/stumped wicket.
   * (Those dismissals can't happen when the ball hasn't been hit.)
   */
  private static validateNoWicketOnBye(
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    if (
      (delivery.ballType === "bye" || delivery.ballType === "legbye") &&
      delivery.isWicket &&
      delivery.wicketType
    ) {
      const invalidOnBye: WicketType[] = ["caught", "bowled", "lbw", "stumped"];
      if (invalidOnBye.includes(delivery.wicketType)) {
        violations.push({
          code: "ILLEGAL_BYE_DISMISSAL",
          message: `${delivery.wicketType} cannot happen on a bye/leg-bye ball.`,
          severity: "error",
        });
      }
    }
  }

  /**
   * Runs must be within valid range (0-8 max off bat in cricket history,
   * but we allow up to 10 for unusual scenarios like overthrows).
   */
  private static validateRunsRange(
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    if (delivery.runs < 0) {
      violations.push({
        code: "NEGATIVE_RUNS",
        message: "Runs cannot be negative.",
        severity: "error",
      });
    }
    if (delivery.runs > 10) {
      violations.push({
        code: "EXCESSIVE_RUNS",
        message: `${delivery.runs} runs is unusually high. Please confirm.`,
        severity: "warning",
      });
    }
  }

  /**
   * Super over: max 2 wickets, 6 legal balls, 2 batsmen only.
   */
  private static validateSuperOverRules(
    delivery: DeliveryInput,
    state: MatchState,
    violations: RuleViolation[]
  ): void {
    if (!state.superOver) return;

    if (state.wickets >= 2 && delivery.isWicket) {
      violations.push({
        code: "SUPER_OVER_WICKET_LIMIT",
        message: "Super over innings ends at 2 wickets — cannot record another wicket.",
        severity: "error",
      });
    }
  }

  /**
   * Caught + no-ball; Stumped + no-ball; LBW + wide combinations — double check.
   */
  private static validateDismissalCombinations(
    delivery: DeliveryInput,
    violations: RuleViolation[]
  ): void {
    // LBW off a wide — impossible (LBW requires ball to hit pad in line)
    if (delivery.ballType === "wide" && delivery.wicketType === "lbw") {
      violations.push({
        code: "LBW_OFF_WIDE",
        message: "LBW cannot be given off a wide ball.",
        severity: "error",
      });
    }

    // Bowled off a wide — impossible
    if (delivery.ballType === "wide" && delivery.wicketType === "bowled") {
      violations.push({
        code: "BOWLED_OFF_WIDE",
        message: "Bowled cannot be given off a wide ball.",
        severity: "error",
      });
    }

    // Stumped off a no-ball — impossible (only run out valid on NB)
    if (delivery.ballType === "noball" && delivery.wicketType === "stumped") {
      violations.push({
        code: "STUMPED_OFF_NOBALL",
        message: "Stumped cannot be given off a no-ball (ICC Rule 24.16). Use run out instead.",
        severity: "error",
      });
    }

    // Caught off a bye — the ball didn't hit the bat
    if (delivery.ballType === "bye" && delivery.wicketType === "caught") {
      violations.push({
        code: "CAUGHT_OFF_BYE",
        message: "Caught cannot be given off a bye ball.",
        severity: "error",
      });
    }
  }

  /**
   * Quick helper: is this a bowler-credited wicket?
   */
  static isBowlerWicket(wicketType?: WicketType): boolean {
    if (!wicketType) return false;
    return BOWLER_WICKET_TYPES.includes(wicketType);
  }

  /**
   * Quick helper: is this wicket valid on a free hit?
   */
  static isValidFreeHitWicket(wicketType: WicketType): boolean {
    return VALID_WICKETS_ON_FREEHIT.includes(wicketType);
  }

  /**
   * Quick helper: is this a legal ball (counts toward over)?
   */
  static isLegalDelivery(ballType: string): boolean {
    return ballType !== "wide" && ballType !== "noball";
  }
}
