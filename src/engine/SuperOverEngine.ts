/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SuperOverEngine — ICC Super Over Rules Engine
 *
 * Implements the complete ICC Super Over rules:
 *   - Each team bats for 1 over (6 legal balls)
 *   - Innings ends at 2 wickets OR 6 legal balls
 *   - The team with more runs wins
 *   - If tied again: another super over (nested)
 *   - Each team nominates 2 batsmen + 1 bowler
 *   - The bowling team from the regular match bats first in the super over
 *
 * ICC T20I Playing Conditions — Clause 16
 */

import {
  MatchState,
  SuperOverState,
  SuperOverInnings,
  DeliveryInput,
  Batsman,
  Bowler,
  BallEvent,
  InningsSummary,
  FallOfWicket,
  Extras,
} from "../types";
import { RuleValidator } from "./RuleValidator";
import { DeliveryParser } from "./DeliveryParser";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SUPER_OVER_MAX_WICKETS = 2;
const SUPER_OVER_OVERS = 1;

// ─────────────────────────────────────────────────────────────
// SuperOverEngine
// ─────────────────────────────────────────────────────────────

export class SuperOverEngine {
  /**
   * Set up the super over structure on the MatchState.
   * Called when the regular match ends in a tie.
   * The team that BOWLED last in the match bats first in the super over.
   */
  static setup(state: MatchState, superOverNumber: number = 1): MatchState {
    const newState = JSON.parse(JSON.stringify(state)) as MatchState;

    // Team that was bowling in innings 2 bats first in super over
    const battingFirst = state.config.team2; // innings 2 batting team
    const bowlingFirst = state.config.team1;

    const innings1: SuperOverInnings = {
      team: battingFirst,
      runs: 0,
      wickets: 0,
      balls: 0,
      maxWickets: SUPER_OVER_MAX_WICKETS,
      batsmen: [
        this.createBatsman("SO BAT 1", true, 1),
        this.createBatsman("SO BAT 2", false, 2),
      ],
      bowler: this.createBowler("SO BOWL 1"),
      complete: false,
    };

    newState.superOverState = {
      active: true,
      superOverNumber,
      innings1,
      innings2: null,
      result: null,
      winner: null,
    };

    // Modify main state to reflect super over mode
    newState.superOver = true;
    newState.config.totalOvers = SUPER_OVER_OVERS;
    newState.config.maxWickets = SUPER_OVER_MAX_WICKETS;
    newState.config.powerplayOvers = 0;
    newState.runs = 0;
    newState.wickets = 0;
    newState.balls = 0;
    newState.currentInnings = 1;
    newState.target = null;
    newState.thisOver = [];
    newState.legalBallsInOver = 0;
    newState.partnershipRuns = 0;
    newState.partnershipBalls = 0;
    newState.lastWicket = null;
    newState.ballHistory = [];
    newState.fallOfWickets = [];
    newState.partnerships = [];
    newState.bowlerHistory = [];
    newState.batsmanHistory = [];
    newState.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    newState.powerplay = false;
    newState.freeHit = false;
    newState.batsman1 = innings1.batsmen[0];
    newState.batsman2 = innings1.batsmen[1];
    newState.bowler = innings1.bowler;

    newState.eventTrigger = {
      type: "reset",
      timestamp: Date.now(),
      data: { superOverNumber, team: battingFirst },
    };

    return newState;
  }

  /**
   * Start Super Over Innings 2 (second team bats).
   * Called after Innings 1 is complete.
   */
  static startInnings2(state: MatchState): MatchState {
    if (!state.superOverState) return state;

    const newState = JSON.parse(JSON.stringify(state)) as MatchState;
    const so = newState.superOverState!;

    // Save innings 1 results to superOverState
    so.innings1!.runs = state.runs;
    so.innings1!.wickets = state.wickets;
    so.innings1!.balls = state.balls;
    so.innings1!.complete = true;

    const target = state.runs + 1;

    const innings2: SuperOverInnings = {
      team: state.config.team1, // the other team bats now
      runs: 0,
      wickets: 0,
      balls: 0,
      maxWickets: SUPER_OVER_MAX_WICKETS,
      batsmen: [
        this.createBatsman("SO BAT 3", true, 3),
        this.createBatsman("SO BAT 4", false, 4),
      ],
      bowler: this.createBowler("SO BOWL 2"),
      complete: false,
    };

    so.innings2 = innings2;

    // Reset live state for innings 2
    newState.runs = 0;
    newState.wickets = 0;
    newState.balls = 0;
    newState.currentInnings = 2;
    newState.target = target;
    newState.thisOver = [];
    newState.legalBallsInOver = 0;
    newState.partnershipRuns = 0;
    newState.partnershipBalls = 0;
    newState.lastWicket = null;
    newState.ballHistory = [];
    newState.fallOfWickets = [];
    newState.partnerships = [];
    newState.bowlerHistory = [];
    newState.batsmanHistory = [];
    newState.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    newState.freeHit = false;
    newState.batsman1 = innings2.batsmen[0];
    newState.batsman2 = innings2.batsmen[1];
    newState.bowler = innings2.bowler;

    // Build first innings summary for display
    newState.firstInningsSummary = {
      team: so.innings1!.team,
      runs: so.innings1!.runs,
      wickets: so.innings1!.wickets,
      overs: `0.${Math.min(6, so.innings1!.balls)}`,
      runRate: so.innings1!.balls > 0
        ? (so.innings1!.runs / so.innings1!.balls) * 6
        : 0,
      batsmanList: [],
      bowlerList: [],
      fallOfWickets: [],
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      partnerships: [],
    };

    newState.eventTrigger = {
      type: "reset",
      timestamp: Date.now(),
      data: { superOverInnings: 2, target, team: innings2.team },
    };

    return newState;
  }

  /**
   * Check if the current super over innings is complete.
   * Complete when: 2 wickets OR 6 legal balls OR target reached in innings 2.
   */
  static checkInningsComplete(state: MatchState): boolean {
    if (!state.superOver) return false;

    // 2 wickets
    if (state.wickets >= SUPER_OVER_MAX_WICKETS) return true;

    // 6 legal balls
    if (state.balls >= 6) return true;

    // Innings 2: target reached
    if (state.currentInnings === 2 && state.target !== null && state.runs >= state.target) {
      return true;
    }

    return false;
  }

  /**
   * Determine the result of the super over after both innings are complete.
   */
  static determineResult(state: MatchState): {
    complete: boolean;
    winner: string | null;
    tied: boolean;
    result: string;
  } {
    if (!state.superOverState?.innings2) {
      return { complete: false, winner: null, tied: false, result: "" };
    }

    const so = state.superOverState;
    const inn1Runs = so.innings1!.runs;
    const inn2Runs = state.currentInnings === 2 ? state.runs : so.innings2!.runs;

    if (inn2Runs > inn1Runs) {
      const margin = state.config.maxWickets - state.wickets;
      return {
        complete: true,
        winner: so.innings2!.team,
        tied: false,
        result: `${so.innings2!.team} won the Super Over by ${margin} wicket${margin !== 1 ? "s" : ""}`,
      };
    } else if (inn1Runs > inn2Runs) {
      const margin = inn1Runs - inn2Runs;
      return {
        complete: true,
        winner: so.innings1!.team,
        tied: false,
        result: `${so.innings1!.team} won the Super Over by ${margin} run${margin !== 1 ? "s" : ""}`,
      };
    } else {
      return {
        complete: true,
        winner: null,
        tied: true,
        result: `Super Over ${so.superOverNumber} tied — another Super Over required!`,
      };
    }
  }

  /**
   * Set up an additional nested super over if the previous one tied.
   */
  static setupNextSuperOver(state: MatchState): MatchState {
    const nextNumber = (state.superOverState?.superOverNumber ?? 1) + 1;
    // Swap who bats first (ICC rule: teams alternate batting first)
    const swappedState = JSON.parse(JSON.stringify(state)) as MatchState;
    const tmp = swappedState.config.team1;
    swappedState.config.team1 = swappedState.config.team2;
    swappedState.config.team2 = tmp;
    return this.setup(swappedState, nextNumber);
  }

  /**
   * Set batsmen names for super over (operator enters them).
   */
  static setBatsmen(
    state: MatchState,
    bat1Name: string,
    bat2Name: string
  ): MatchState {
    const newState = JSON.parse(JSON.stringify(state)) as MatchState;
    newState.batsman1 = { ...newState.batsman1, name: bat1Name.toUpperCase() };
    newState.batsman2 = { ...newState.batsman2, name: bat2Name.toUpperCase() };
    newState.eventTrigger = { type: "config", timestamp: Date.now() };
    return newState;
  }

  /**
   * Set bowler name for super over.
   */
  static setBowler(state: MatchState, bowlerName: string): MatchState {
    const newState = JSON.parse(JSON.stringify(state)) as MatchState;
    newState.bowler = { ...newState.bowler, name: bowlerName.toUpperCase() };
    newState.eventTrigger = { type: "config", timestamp: Date.now() };
    return newState;
  }

  // ─── Helpers ─────────────────────────────────────────────

  private static createBatsman(
    name: string,
    isStriker: boolean,
    order: number
  ): Batsman {
    return {
      name,
      runs: 0,
      balls: 0,
      isStriker,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
      battingOrder: order,
    };
  }

  private static createBowler(name: string): Bowler {
    return {
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
  }
}
