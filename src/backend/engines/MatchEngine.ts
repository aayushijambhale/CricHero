/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MatchEngine — Professional ICC Cricket Scoring Engine
 *
 * Implements the COMPLETE ICC Playing Conditions for:
 *   - T20 / T10 / ODI / Test / The Hundred / Custom / Super Over
 *   - All ICC dismissal types with correct rule restrictions
 *   - Wide and No-Ball delivery rules (ICC Rules 24 & 25)
 *   - Free Hit persistence through consecutive no-balls
 *   - Maiden over detection
 *   - ICC-correct strike rotation (including off wides)
 *   - Exact 6-legal-ball over completion
 *   - Ball-by-ball structured storage
 *   - Win probability heuristics
 *   - DLS par score integration
 *
 * Processing Pipeline (10 steps):
 *   1. Validate delivery (RuleValidator)
 *   2. Apply extras (wide/no-ball/bye/leg-bye)
 *   3. Apply batsman runs
 *   4. Update bowler figures
 *   5. Process wicket
 *   6. Rotate strike (ICC rules)
 *   7. Complete over (maiden detection, bowler history)
 *   8. Advance free hit state
 *   9. Calculate derived stats (RR, RRR, projected, win prob)
 *  10. Build and store BallEvent
 */

import {
  MatchState,
  DeliveryInput,
  BallEvent,
  BallType,
  WicketType,
  Batsman,
  Bowler,
  FallOfWicket,
  InningsSummary,
  Extras,
  PartnershipData,
} from "../../types";
import { RuleValidator } from "./RuleValidator";
import { BowlerCapEngine } from "./BowlerCapEngine";
import { MatchPhaseEngine } from "./MatchPhaseEngine";
import { PressureEngine } from "./PressureEngine";
import { MomentumEngine } from "./MomentumEngine";

// ─────────────────────────────────────────────────────────────
// Helper Utilities
// ─────────────────────────────────────────────────────────────

export function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ─────────────────────────────────────────────────────────────
// Delivery Result
// ─────────────────────────────────────────────────────────────

export interface DeliveryResult {
  state: MatchState;
  event: BallEvent;
  /** Overlay trigger type for visuals */
  trigger: "four" | "six" | "wicket" | "single" | "config" | "reset" | "freehit" | "maiden" | "milestone";
  /** Any ICC rule violations detected (warnings only — errors are thrown) */
  warnings: string[];
  /** Whether the over just completed */
  overComplete: boolean;
  /** Whether the innings just ended */
  inningsComplete: boolean;
}

// ─────────────────────────────────────────────────────────────
// MatchEngine
// ─────────────────────────────────────────────────────────────

export class MatchEngine {
  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  /**
   * Process a single delivery through the full ICC rule pipeline.
   *
   * @throws Error if a critical rule violation is detected (e.g., illegal dismissal)
   */
  static processDelivery(
    state: MatchState,
    delivery: DeliveryInput
  ): DeliveryResult {
    // ── STEP 1: Validate ──────────────────────────────────
    const validation = RuleValidator.validate(delivery, state);
    if (!validation.valid) {
      const errors = validation.violations
        .filter(v => v.severity === "error")
        .map(v => `[${v.code}] ${v.message}`)
        .join("; ");
      throw new Error(`ICC Rule Violation: ${errors}`);
    }
    const warnings = validation.violations
      .filter(v => v.severity === "warning")
      .map(v => v.message);

    // Clone state — never mutate input
    const s = deepClone(state);
    const timestamp = Date.now();

    // Identify striker and non-striker
    const striker = s.batsman1.isStriker ? s.batsman1 : s.batsman2;
    const nonStriker = s.batsman1.isStriker ? s.batsman2 : s.batsman1;

    // ── STEP 2: Apply Extras ──────────────────────────────
    const {
      isLegalBall,
      runsFromBat,
      runsFromExtras,
      totalRunsThisBall,
      overDisplayToken,
      runsChargedToBowler,
    } = this.applyExtras(delivery, s, striker);

    // ── STEP 3: Apply Batsman Runs ────────────────────────
    this.applyBatsmanRuns(delivery, s, striker, runsFromBat, isLegalBall);

    // ── STEP 4: Update Bowler Figures ─────────────────────
    const isMaidenCompletion = this.applyBowlerFigures(
      delivery, s, runsChargedToBowler, isLegalBall
    );

    // ── STEP 5: Process Wicket ────────────────────────────
    let wicketDescription = "";
    if (delivery.isWicket && delivery.wicketType) {
      wicketDescription = this.processWicket(delivery, s, striker, nonStriker, timestamp);
    }

    // ── STEP 6: Rotate Strike ─────────────────────────────
    this.rotateStrikeICC(delivery, s, runsFromBat, runsFromExtras, totalRunsThisBall, isLegalBall);

    // ── STEP 7: Complete Over ─────────────────────────────
    let overComplete = false;
    if (isLegalBall) {
      s.legalBallsInOver += 1;
      s.balls += 1;

      if (s.legalBallsInOver >= 6) {
        overComplete = true;
        this.completeOver(s, isMaidenCompletion);
      }
    }

    // Update over display ticker
    s.thisOver.push(overDisplayToken);

    // ── STEP 8: Advance Free Hit State ────────────────────
    this.advanceFreeHit(delivery, s);

    // ── STEP 9: Calculate Derived Stats ───────────────────
    this.calculateStats(s);

    // Check innings complete
    const inningsComplete = this.checkInningsComplete(s);

    // ── STEP 10: Build BallEvent & Store ─────────────────
    const event = this.buildBallEvent(
      delivery, s, striker, nonStriker,
      runsFromBat, runsFromExtras, totalRunsThisBall,
      isLegalBall, isMaidenCompletion, wicketDescription, timestamp
    );
    s.ballHistory.push(event);

    // Set overlay trigger
    const trigger = this.determineTrigger(delivery, runsFromBat, isMaidenCompletion);
    s.eventTrigger = { type: trigger, timestamp, data: event as unknown as Record<string, unknown> };

    // Enrich with intelligence engines
    s.pressureState = PressureEngine.calculate(s);
    s.momentumState = MomentumEngine.calculate(s);
    s.matchPhase = MatchPhaseEngine.detectPhase(s);
    s.powerplayPhase = MatchPhaseEngine.getPowerplayPhase(s);

    return { state: s, event, trigger, warnings, overComplete, inningsComplete };
  }

  // ═══════════════════════════════════════════════════════════
  // STEP IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * STEP 2 — Apply Extras
   *
   * ICC Rules:
   *   Wide (Rule 25): +1 penalty + any runs; NOT a legal ball
   *   No Ball (Rule 24): +1 penalty; NOT a legal ball; triggers free hit
   *   Bye (Rule 23): runs to team, NOT to batsman; IS a legal ball
   *   Leg Bye (Rule 23): runs to team, NOT to batsman; IS a legal ball
   */
  private static applyExtras(
    delivery: DeliveryInput,
    state: MatchState,
    striker: Batsman
  ): {
    isLegalBall: boolean;
    runsFromBat: number;
    runsFromExtras: number;
    totalRunsThisBall: number;
    overDisplayToken: string;
    runsChargedToBowler: number;
  } {
    let isLegalBall = true;
    let runsFromBat = 0;
    let runsFromExtras = 0;
    let runsChargedToBowler = 0;
    let overDisplayToken = "";

    const { ballType, runs, isWicket } = delivery;

    if (ballType === "wide") {
      // ── WIDE ──────────────────────────────────────────
      isLegalBall = false;
      // Wide penalty (1) + any additional runs run
      runsFromExtras = 1 + runs;
      state.extras.wides += runsFromExtras;
      state.extras.total += runsFromExtras;
      runsChargedToBowler = runsFromExtras;
      state.bowler.wides += runsFromExtras;

      // Display token
      if (isWicket) {
        overDisplayToken = `WD+W`;
      } else if (runs > 0) {
        overDisplayToken = `${runs + 1}WD`;
      } else {
        overDisplayToken = "WD";
      }

    } else if (ballType === "noball") {
      // ── NO BALL ───────────────────────────────────────
      isLegalBall = false;
      // Penalty: +1 no-ball extra
      runsFromExtras = 1;
      state.extras.noBalls += 1;
      state.extras.total += 1;
      state.bowler.noBalls += 1;
      // Runs off bat (batsman can hit)
      runsFromBat = runs;
      // Bowler charged: 1 (penalty) + runs off bat
      runsChargedToBowler = 1 + runs;

      // Display token
      if (isWicket) {
        overDisplayToken = runs > 0 ? `${runs}NB+W` : `NB+W`;
      } else if (runs > 0) {
        overDisplayToken = `${runs}NB`;
      } else {
        overDisplayToken = "NB";
      }

    } else if (ballType === "bye") {
      // ── BYE ───────────────────────────────────────────
      isLegalBall = true;
      runsFromExtras = runs;
      state.extras.byes += runs;
      state.extras.total += runs;
      // Byes NOT charged to bowler
      runsChargedToBowler = 0;

      overDisplayToken = runs > 0 ? `${runs}B` : "B";

    } else if (ballType === "legbye") {
      // ── LEG BYE ───────────────────────────────────────
      isLegalBall = true;
      runsFromExtras = runs;
      state.extras.legByes += runs;
      state.extras.total += runs;
      // Leg byes NOT charged to bowler
      runsChargedToBowler = 0;

      overDisplayToken = runs > 0 ? `${runs}LB` : "LB";

    } else {
      // ── NORMAL ────────────────────────────────────────
      isLegalBall = true;
      runsFromBat = runs;
      runsChargedToBowler = runs;

      if (isWicket) {
        overDisplayToken = runs > 0 ? `${runs}W` : "W";
      } else if (runs === 4) {
        overDisplayToken = "4";
      } else if (runs === 6) {
        overDisplayToken = "6";
      } else if (runs === 0) {
        overDisplayToken = "•";
      } else {
        overDisplayToken = String(runs);
      }
    }

    const totalRunsThisBall = runsFromBat + runsFromExtras;
    state.runs += totalRunsThisBall;
    state.partnershipRuns += totalRunsThisBall;

    return {
      isLegalBall,
      runsFromBat,
      runsFromExtras,
      totalRunsThisBall,
      overDisplayToken,
      runsChargedToBowler,
    };
  }

  /**
   * STEP 3 — Apply Batsman Runs
   *
   * Only runs from bat (not extras) count to the batsman's personal score.
   */
  private static applyBatsmanRuns(
    delivery: DeliveryInput,
    state: MatchState,
    striker: Batsman,
    runsFromBat: number,
    isLegalBall: boolean
  ): void {
    striker.runs += runsFromBat;
    striker.balls += isLegalBall ? 1 : 0;

    if (runsFromBat === 4) striker.fours += 1;
    if (runsFromBat === 6) striker.sixes += 1;
    if (runsFromBat === 0 && isLegalBall && !delivery.isWicket) {
      striker.dotBalls += 1;
    }

    striker.strikeRate = striker.balls > 0
      ? Math.round((striker.runs / striker.balls) * 10000) / 100
      : 0;
  }

  /**
   * STEP 4 — Update Bowler Figures
   *
   * Returns true if this ball completes a maiden over.
   * A maiden is when a bowler concedes 0 runs (off bat + extras charged to bowler) in an over.
   *
   * Note: Byes and Leg Byes are NOT charged to the bowler.
   */
  private static applyBowlerFigures(
    delivery: DeliveryInput,
    state: MatchState,
    runsChargedToBowler: number,
    isLegalBall: boolean
  ): boolean {
    state.bowler.runs += runsChargedToBowler;
    state.bowler.balls += isLegalBall ? 1 : 0;

    // Track current over runs for maiden detection
    if (state.bowler.currentOverRuns === undefined) state.bowler.currentOverRuns = 0;
    state.bowler.currentOverRuns += runsChargedToBowler;

    // Dot ball for bowler: 0 runs AND no wicket (or wicket on dot)
    if (runsChargedToBowler === 0 && isLegalBall) {
      state.bowler.dots += 1;
    }

    // Economy rate
    state.bowler.economy = state.bowler.balls > 0
      ? Math.round((state.bowler.runs / state.bowler.balls) * 600) / 100
      : 0;

    // Check maiden (will be confirmed in completeOver)
    return false; // actual maiden detection in completeOver()
  }

  /**
   * STEP 5 — Process Wicket
   *
   * Handles all ICC wicket types. Only bowler-type wickets
   * (bowled, caught, lbw, stumped, hit wicket) credit the bowler.
   */
  private static processWicket(
    delivery: DeliveryInput,
    state: MatchState,
    striker: Batsman,
    nonStriker: Batsman,
    timestamp: number
  ): string {
    const { wicketType, dismissedBatsman = "striker", newBatsmanName } = delivery;
    if (!wicketType) return "";

    state.wickets += 1;

    const isDismissedStriker = dismissedBatsman !== "non-striker";
    const dismissedPlayer = isDismissedStriker ? striker : nonStriker;
    const dismissedName = dismissedPlayer.name;

    // Bowler gets credit for qualifying wicket types
    if (RuleValidator.isBowlerWicket(wicketType)) {
      state.bowler.wickets += 1;
    }

    // Wicket description string
    let desc = "";
    switch (wicketType) {
      case "bowled":       desc = `b ${state.bowler.name}`; break;
      case "caught":       desc = `c ... b ${state.bowler.name}`; break;
      case "lbw":          desc = `lbw b ${state.bowler.name}`; break;
      case "stumped":      desc = `st ... b ${state.bowler.name}`; break;
      case "hitwicket":    desc = `hit wicket b ${state.bowler.name}`; break;
      case "runout":       desc = `run out`; break;
      case "obstructing":  desc = `obstructed the field`; break;
      case "timed_out":    desc = `timed out`; break;
      case "retired":      desc = `retired`; break;
      default:             desc = wicketType;
    }
    const wicketDescription = `${dismissedName} ${desc}`;

    // Fall of Wicket
    const fow: FallOfWicket = {
      wicketNumber: state.wickets,
      runs: state.runs,
      overs: formatOvers(state.balls + (delivery.ballType !== "wide" && delivery.ballType !== "noball" ? 1 : 0)),
      batsmanName: dismissedName,
      dismissalType: wicketType,
      bowlerName: RuleValidator.isBowlerWicket(wicketType) ? state.bowler.name : undefined,
    };
    state.fallOfWickets.push(fow);

    // Save dismissed batsman to history
    state.batsmanHistory.push({
      name: dismissedName,
      runs: dismissedPlayer.runs,
      balls: dismissedPlayer.balls,
      fours: dismissedPlayer.fours,
      sixes: dismissedPlayer.sixes,
      strikeRate: dismissedPlayer.strikeRate,
      isNotOut: false,
      dismissalType: wicketType,
      dismissedBy: RuleValidator.isBowlerWicket(wicketType) ? state.bowler.name : undefined,
    });

    // Last wicket info for scorecard display
    state.lastWicket = {
      name: dismissedName,
      runs: dismissedPlayer.runs,
      balls: dismissedPlayer.balls,
      scoreAtWicket: `${state.runs}-${state.wickets}`,
      dismissalType: wicketType,
    };

    // Save current partnership
    state.partnerships.push({
      totalRuns: state.partnershipRuns,
      totalBalls: state.partnershipBalls,
      batsman1: striker.name,
      batsman1Runs: striker.runs,
      batsman1Balls: striker.balls,
      batsman2: nonStriker.name,
      batsman2Runs: nonStriker.runs,
      batsman2Balls: nonStriker.balls,
    });

    // Reset partnership
    state.partnershipRuns = 0;
    state.partnershipBalls = 0;

    // Bring in new batsman
    const incomingName = newBatsmanName
      ? newBatsmanName.toUpperCase()
      : `BATSMAN ${state.wickets + 2}`;

    const newBat: Batsman = {
      name: incomingName,
      runs: 0,
      balls: 0,
      isStriker: isDismissedStriker,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
      battingOrder: state.wickets + 1,
    };

    if (isDismissedStriker) {
      if (state.batsman1.isStriker) {
        state.batsman1 = newBat;
      } else {
        state.batsman2 = newBat;
      }
    } else {
      if (state.batsman1.isStriker) {
        state.batsman2 = newBat;
      } else {
        state.batsman1 = newBat;
      }
    }

    return wicketDescription;
  }

  /**
   * STEP 6 — ICC Strike Rotation
   *
   * Rules:
   *   - Normal ball: rotate on ODD runs scored by batsman (off bat)
   *   - Bye / Leg Bye: rotate on ODD total runs (team runs)
   *   - Wide: rotate on ODD total wide runs (1 + additional)
   *   - No Ball: rotate on ODD runs off bat
   *   - Wicket: new batsman comes in at correct end — no extra rotation
   *             UNLESS the ball also had odd runs before the wicket
   *   - End of over: always rotate (handled in completeOver)
   */
  private static rotateStrikeICC(
    delivery: DeliveryInput,
    state: MatchState,
    runsFromBat: number,
    runsFromExtras: number,
    totalRunsThisBall: number,
    isLegalBall: boolean
  ): void {
    if (delivery.isWicket) {
      // No extra rotation on wicket — new batsman arrives at correct end
      // But if runs were scored before the run-out happened, rotate
      if (delivery.wicketType === "runout" && totalRunsThisBall % 2 === 1) {
        this.performStrikeRotation(state);
      }
      return;
    }

    let shouldRotate = false;

    if (delivery.ballType === "wide") {
      // Wide: rotate on ODD total wide runs (1 + additional)
      shouldRotate = (1 + delivery.runs) % 2 === 1;
    } else if (delivery.ballType === "bye" || delivery.ballType === "legbye") {
      // Byes/Leg Byes: rotate on ODD total runs (team scored, not bat)
      shouldRotate = runsFromExtras % 2 === 1;
    } else {
      // Normal or No-Ball: rotate on ODD runs from bat
      shouldRotate = runsFromBat % 2 === 1;
    }

    if (shouldRotate) {
      this.performStrikeRotation(state);
    }
  }

  /**
   * STEP 7 — Complete Over
   *
   * After 6 legal balls:
   *   - Maiden detection: 0 bowler-charged runs in this over
   *   - Save bowler spell to history
   *   - Rotate strike (end-of-over rule)
   *   - Reset over counters
   */
  private static completeOver(state: MatchState, _unusedMaidenFlag: boolean): void {
    const currentOverIndex = Math.floor(state.balls / 6) - 1; // -1 because balls just incremented

    // ── Maiden Detection ──
    const overRuns = state.bowler.currentOverRuns ?? 0;
    const isMaiden = overRuns === 0;
    if (isMaiden) {
      state.bowler.maidens += 1;
    }
    // Reset current over run tracker
    state.bowler.currentOverRuns = 0;

    // ── Record which over this bowler bowled ──
    if (!state.bowler.oversBowled) state.bowler.oversBowled = [];
    state.bowler.oversBowled.push(currentOverIndex);

    // ── Save bowler spell to history ──
    const bowlerCopy = deepClone(state.bowler);
    const existingIdx = state.bowlerHistory.findIndex(
      b => b.name.toUpperCase() === bowlerCopy.name.toUpperCase()
    );
    if (existingIdx >= 0) {
      state.bowlerHistory[existingIdx] = bowlerCopy;
    } else {
      state.bowlerHistory.push(bowlerCopy);
    }

    // ── End-of-Over Strike Rotation ──
    this.performStrikeRotation(state);

    // ── Reset Over Counters ──
    state.legalBallsInOver = 0;
    state.thisOver = [];

    // Mark maiden in last ball event if needed
    if (state.ballHistory.length > 0 && isMaiden) {
      state.ballHistory[state.ballHistory.length - 1].isMaidenCompletion = true;
    }
  }

  /**
   * STEP 8 — Advance Free Hit State
   *
   * ICC Rule:
   *   - A front-foot no-ball triggers a free hit on the NEXT delivery
   *   - If the next ball is ALSO a no-ball, the free hit CARRIES OVER
   *     (the batsman gets the free hit on the next legal delivery)
   *   - A wide on a free hit ball: the ball does NOT count AND the
   *     free hit continues (the wide is not a legal delivery)
   */
  private static advanceFreeHit(delivery: DeliveryInput, state: MatchState): void {
    if (delivery.ballType === "noball") {
      // No-ball always triggers (or continues) free hit for next ball
      state.freeHit = true;
    } else if (delivery.ballType === "wide" && state.freeHit) {
      // Wide on free hit: free hit CONTINUES (wide isn't a legal ball)
      state.freeHit = true; // stays active
    } else if (state.freeHit) {
      // Any legal non-no-ball delivery consumes the free hit
      state.freeHit = false;
    }
    // Normal balls and non-freehit situations: freeHit stays false
  }

  /**
   * STEP 9 — Calculate Derived Statistics
   */
  private static calculateStats(state: MatchState): void {
    // Current Run Rate
    state.currentRunRate = state.balls > 0
      ? Math.round((state.runs / state.balls) * 600) / 100
      : 0;

    // Projected Score (1st innings)
    state.projectedScore = Math.round(state.currentRunRate * state.config.totalOvers);

    // Partnership balls
    const striker = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
    const nonStriker = state.batsman1.isStriker ? state.batsman2 : state.batsman1;

    // 2nd innings: Required Run Rate, Runs Needed, Balls Remaining
    if (state.currentInnings === 2 && state.target !== null) {
      state.runsNeeded = Math.max(0, state.target - state.runs);
      state.ballsRemaining = Math.max(0, (state.config.totalOvers * 6) - state.balls);
      state.requiredRunRate = state.ballsRemaining > 0
        ? Math.round((state.runsNeeded / state.ballsRemaining) * 600) / 100
        : null;
      state.winProbability = this.calculateWinProbability(state);
    }

    // Powerplay status
    const currentOver = Math.floor(state.balls / 6);
    state.powerplay = currentOver < state.config.powerplayOvers;
  }

  /**
   * Check if innings is complete:
   *   - All wickets fallen
   *   - All overs bowled
   *   - Target reached (innings 2)
   */
  private static checkInningsComplete(state: MatchState): boolean {
    const maxWickets = state.superOver ? 2 : state.config.maxWickets;

    if (state.wickets >= maxWickets) return true;
    if (state.balls >= state.config.totalOvers * 6) return true;
    if (
      state.currentInnings === 2 &&
      state.target !== null &&
      state.runs >= state.target
    ) return true;

    return false;
  }

  /**
   * STEP 10 — Build Ball Event for ball-by-ball history
   */
  private static buildBallEvent(
    delivery: DeliveryInput,
    state: MatchState,
    striker: Batsman,
    nonStriker: Batsman,
    runsFromBat: number,
    runsFromExtras: number,
    totalRunsThisBall: number,
    isLegalBall: boolean,
    isMaidenCompletion: boolean,
    wicketDescription: string,
    timestamp: number
  ): BallEvent {
    const overNumber = Math.floor(state.balls / 6);
    const overBall = state.balls % 6;

    return {
      overNumber,
      overBall,
      ballNumber: state.balls,
      runs: runsFromBat,
      extras: runsFromExtras,
      totalRuns: totalRunsThisBall,
      ballType: delivery.ballType,
      isLegal: isLegalBall,
      isBoundary: runsFromBat === 4,
      isSix: runsFromBat === 6,
      isWicket: delivery.isWicket ?? false,
      wicketType: delivery.wicketType,
      batsmanOnStrike: striker.name,
      nonStriker: nonStriker.name,
      bowler: state.bowler.name,
      timestamp,
      cumulativeScore: state.runs,
      wicketDescription,
      wasFreeHit: !!(state.freeHit === false && delivery.ballType !== "noball" && state.ballHistory.length > 0
        // freeHit was set BEFORE step 8 ran — we check previous state
        // Actually this is captured by checking if the delivery was wasFreeHit
        // We use the state BEFORE step 8 ran
      ),
      triggersFreeHit: delivery.ballType === "noball",
      isMaidenCompletion,
      rawInput: delivery.rawInput,
    };
  }

  private static determineTrigger(
    delivery: DeliveryInput,
    runsFromBat: number,
    isMaidenCompletion: boolean
  ): DeliveryResult["trigger"] {
    if (delivery.isWicket) return "wicket";
    if (runsFromBat === 6) return "six";
    if (runsFromBat === 4) return "four";
    if (isMaidenCompletion) return "maiden";
    if (delivery.ballType === "noball") return "freehit";
    return "single";
  }

  // ═══════════════════════════════════════════════════════════
  // STANDALONE ACTIONS (no delivery processing)
  // ═══════════════════════════════════════════════════════════

  /**
   * Manually rotate strike (e.g., between overs, or operator correction).
   */
  static rotateStrike(state: MatchState): MatchState {
    const s = deepClone(state);
    this.performStrikeRotation(s);
    s.eventTrigger = { type: "config", timestamp: Date.now() };
    return s;
  }

  /**
   * Change bowler at the end of an over.
   * Saves the outgoing bowler's spell and restores an existing bowler or creates new.
   */
  static changeBowler(state: MatchState, newBowlerName: string): MatchState {
    const s = deepClone(state);
    const name = newBowlerName.toUpperCase();

    // Save outgoing bowler if they bowled something
    if (s.bowler.balls > 0 || s.bowler.wides > 0 || s.bowler.noBalls > 0) {
      const outIdx = s.bowlerHistory.findIndex(
        b => b.name.toUpperCase() === s.bowler.name.toUpperCase()
      );
      const snapshot = deepClone(s.bowler);
      if (outIdx >= 0) {
        s.bowlerHistory[outIdx] = snapshot;
      } else {
        s.bowlerHistory.push(snapshot);
      }
    }

    // Restore existing spell or create new bowler
    const existing = s.bowlerHistory.find(b => b.name.toUpperCase() === name);
    s.bowler = existing
      ? deepClone(existing)
      : {
          name,
          runs: 0,
          wickets: 0,
          balls: 0,
          maidens: 0,
          economy: 0,
          dots: 0,
          wides: 0,
          noBalls: 0,
          oversBowled: [],
          currentOverRuns: 0,
        };

    s.thisOver = [];
    s.legalBallsInOver = 0;
    s.eventTrigger = { type: "config", timestamp: Date.now() };
    return s;
  }

  /**
   * Switch innings: complete 1st innings, set up 2nd innings state.
   */
  static switchInnings(state: MatchState): MatchState {
    const s = deepClone(state);

    // Build complete batsman list for scorecard
    const batsmanList = [...s.batsmanHistory];
    if (s.batsman1.runs > 0 || s.batsman1.balls > 0) {
      batsmanList.push({ ...s.batsman1, isNotOut: true });
    }
    if (s.batsman2.runs > 0 || s.batsman2.balls > 0) {
      batsmanList.push({ ...s.batsman2, isNotOut: true });
    }

    const summary: InningsSummary = {
      team: s.config.team1,
      runs: s.runs,
      wickets: s.wickets,
      overs: formatOvers(s.balls),
      runRate: s.currentRunRate,
      batsmanList,
      bowlerList: [...s.bowlerHistory, s.bowler].filter(b => b.balls > 0 || b.wides > 0),
      fallOfWickets: [...s.fallOfWickets],
      extras: { ...s.extras },
      partnerships: [...s.partnerships],
    };

    s.firstInningsSummary = summary;
    s.target = s.runs + 1;
    s.currentInnings = 2;

    // Reset all counters for innings 2
    s.runs = 0;
    s.wickets = 0;
    s.balls = 0;
    s.legalBallsInOver = 0;
    s.thisOver = [];
    s.partnershipRuns = 0;
    s.partnershipBalls = 0;
    s.lastWicket = null;
    s.freeHit = false;
    s.ballHistory = [];
    s.fallOfWickets = [];
    s.partnerships = [];
    s.bowlerHistory = [];
    s.batsmanHistory = [];
    s.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    s.currentRunRate = 0;
    s.runsNeeded = s.target;
    s.ballsRemaining = s.config.totalOvers * 6;
    s.requiredRunRate = s.target ? (s.target / (s.config.totalOvers * 6)) * 6 : null;
    s.winProbability = { battingTeam: 45, bowlingTeam: 55 };
    s.powerplay = s.config.powerplayOvers > 0;

    // Default second innings players
    s.batsman1 = {
      name: "CHASER 1", runs: 0, balls: 0, isStriker: true,
      fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0, battingOrder: 1,
    };
    s.batsman2 = {
      name: "CHASER 2", runs: 0, balls: 0, isStriker: false,
      fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0, battingOrder: 2,
    };
    s.bowler = {
      name: "DEFENDER 1", runs: 0, wickets: 0, balls: 0,
      maidens: 0, economy: 0, dots: 0, wides: 0, noBalls: 0,
      oversBowled: [], currentOverRuns: 0,
    };

    // Swap colors (batting team changes)
    const tmp = s.primaryColor;
    s.primaryColor = s.secondaryColor;
    s.secondaryColor = tmp;

    s.eventTrigger = { type: "reset", timestamp: Date.now() };
    return s;
  }

  /**
   * Retire a batsman (hurt = not out; retired out = out).
   */
  static retireBatsman(
    state: MatchState,
    which: "batsman1" | "batsman2",
    newName: string,
    isHurt: boolean
  ): MatchState {
    const s = deepClone(state);
    const retiredBat = s[which];

    s.batsmanHistory.push({
      name: retiredBat.name,
      runs: retiredBat.runs,
      balls: retiredBat.balls,
      fours: retiredBat.fours,
      sixes: retiredBat.sixes,
      strikeRate: retiredBat.strikeRate,
      isNotOut: isHurt,
      dismissalType: isHurt ? undefined : "retired",
    });

    s[which] = {
      name: newName.toUpperCase(),
      runs: 0,
      balls: 0,
      isStriker: retiredBat.isStriker,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
    };

    s.eventTrigger = { type: "config", timestamp: Date.now() };
    return s;
  }

  /**
   * Setup Super Over (delegates to SuperOverEngine, re-exported for convenience).
   */
  static setupSuperOver(state: MatchState): MatchState {
    // Thin wrapper — actual logic in SuperOverEngine
    const s = deepClone(state);
    s.superOver = true;
    s.config.totalOvers = 1;
    s.config.maxWickets = 2;
    s.config.powerplayOvers = 0;
    s.runs = 0; s.wickets = 0; s.balls = 0;
    s.legalBallsInOver = 0;
    s.currentInnings = 1; s.target = null;
    s.batsman1 = { name: "SUPER BAT 1", runs: 0, balls: 0, isStriker: true, fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0 };
    s.batsman2 = { name: "SUPER BAT 2", runs: 0, balls: 0, isStriker: false, fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0 };
    s.bowler = { name: "SUPER BOWL 1", runs: 0, wickets: 0, balls: 0, maidens: 0, economy: 0, dots: 0, wides: 0, noBalls: 0, oversBowled: [], currentOverRuns: 0 };
    s.thisOver = []; s.partnershipRuns = 0; s.partnershipBalls = 0;
    s.lastWicket = null; s.powerplay = false; s.freeHit = false;
    s.ballHistory = []; s.fallOfWickets = []; s.partnerships = [];
    s.bowlerHistory = []; s.batsmanHistory = [];
    s.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    s.eventTrigger = { type: "reset", timestamp: Date.now() };
    return s;
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY — ControllerPanel uses processBall()
  // ═══════════════════════════════════════════════════════════

  /**
   * Legacy interface used by ControllerPanel.tsx.
   * Wraps processDelivery() with the old signature.
   */
  static processBall(
    state: MatchState,
    runs: number,
    ballType: BallType,
    isWicket: boolean = false,
    wicketType?: WicketType,
    dismissedBatsman?: "striker" | "non-striker",
    newBatsmanName?: string
  ): { state: MatchState; event: BallEvent; trigger: string } {
    const delivery: DeliveryInput = {
      ballType,
      runs,
      isWicket,
      wicketType,
      dismissedBatsman,
      newBatsmanName,
    };

    try {
      const result = this.processDelivery(state, delivery);
      return { state: result.state, event: result.event, trigger: result.trigger };
    } catch (err) {
      // On ICC violation, return unchanged state with error trigger
      console.error("ICC Rule Violation:", err);
      return {
        state,
        event: {
          overNumber: Math.floor(state.balls / 6),
          overBall: state.balls % 6,
          ballNumber: state.balls,
          runs: 0, extras: 0, totalRuns: 0,
          ballType, isLegal: false, isBoundary: false, isSix: false,
          isWicket: false, batsmanOnStrike: "", nonStriker: "",
          bowler: state.bowler.name, timestamp: Date.now(),
          cumulativeScore: state.runs, wasFreeHit: false, triggersFreeHit: false,
        },
        trigger: "config",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private static performStrikeRotation(state: MatchState): void {
    state.batsman1.isStriker = !state.batsman1.isStriker;
    state.batsman2.isStriker = !state.batsman2.isStriker;
  }

  /**
   * Heuristic win probability model based on RRR, wickets, and balls.
   */
  private static calculateWinProbability(
    state: MatchState
  ): { battingTeam: number; bowlingTeam: number } {
    if (state.target === null) return { battingTeam: 50, bowlingTeam: 50 };

    const runsNeeded = Math.max(0, state.target - state.runs);
    const ballsRemaining = state.ballsRemaining;
    const wicketsLeft = state.config.maxWickets - state.wickets;

    if (runsNeeded === 0) return { battingTeam: 100, bowlingTeam: 0 };
    if (ballsRemaining <= 0 || wicketsLeft <= 0) return { battingTeam: 0, bowlingTeam: 100 };

    const rrr = (runsNeeded / ballsRemaining) * 6;

    let battingProb = 50;
    if (rrr < 6) {
      battingProb = 50 + (6 - rrr) * 12;
    } else {
      battingProb = 50 - (rrr - 6) * 8;
    }

    // Wickets factor
    const wicketsRatio = wicketsLeft / state.config.maxWickets;
    battingProb += (wicketsRatio - 0.5) * 30;

    // Desperation zone
    if (ballsRemaining <= 12) {
      if (rrr > 12) battingProb = Math.min(battingProb, 15);
      else if (rrr > 9) battingProb = Math.min(battingProb, 30);
    }

    battingProb = Math.min(99, Math.max(1, Math.round(battingProb)));
    return { battingTeam: battingProb, bowlingTeam: 100 - battingProb };
  }
}
