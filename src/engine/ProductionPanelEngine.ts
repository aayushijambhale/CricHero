/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProductionPanelEngine — Manages broadcast production graphic overlays
 */

import { MatchState, ProductionPanel, ProductionPanelType } from "../types";

export interface PlayerCardData {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isNotOut: boolean;
}

export interface PartnershipData {
  totalRuns: number;
  totalBalls: number;
  batsman1: string;
  batsman1Runs: number;
  batsman1Balls: number;
  batsman2: string;
  batsman2Runs: number;
  batsman2Balls: number;
}

export interface EquationData {
  runsNeeded: number;
  ballsRemaining: number;
  requiredRunRate: number;
  currentRunRate: number;
}

export interface WormData {
  innings1: number[];  // cumulative runs at each ball
  innings2: number[];
}

export class ProductionPanelEngine {

  /**
   * Generate player card data for the current striker
   */
  static generatePlayerCard(state: MatchState, whichBatsman: "striker" | "nonstriker" | "batsman1" | "batsman2"): ProductionPanel {
    let bat;
    if (whichBatsman === "striker") {
      bat = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
    } else if (whichBatsman === "nonstriker") {
      bat = state.batsman1.isStriker ? state.batsman2 : state.batsman1;
    } else {
      bat = state[whichBatsman];
    }

    const data: PlayerCardData = {
      name: bat.name,
      runs: bat.runs,
      balls: bat.balls,
      fours: bat.fours,
      sixes: bat.sixes,
      strikeRate: bat.strikeRate,
      isNotOut: true,
    };

    return {
      type: "playerCard",
      visible: true,
      data,
      displayDuration: 8000,
      priority: 80,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate current partnership panel
   */
  static generatePartnership(state: MatchState): ProductionPanel {
    const data: PartnershipData = {
      totalRuns: state.partnershipRuns,
      totalBalls: state.partnershipBalls,
      batsman1: state.batsman1.name,
      batsman1Runs: state.batsman1.runs,
      batsman1Balls: state.batsman1.balls,
      batsman2: state.batsman2.name,
      batsman2Runs: state.batsman2.runs,
      batsman2Balls: state.batsman2.balls,
    };

    return {
      type: "partnership",
      visible: true,
      data,
      displayDuration: 8000,
      priority: 70,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate required equation display
   */
  static generateEquation(state: MatchState): ProductionPanel {
    const data: EquationData = {
      runsNeeded: state.runsNeeded || 0,
      ballsRemaining: state.ballsRemaining,
      requiredRunRate: state.requiredRunRate || 0,
      currentRunRate: state.currentRunRate,
    };

    return {
      type: "requiredEquation",
      visible: true,
      data,
      displayDuration: 6000,
      priority: 90,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate fall of wickets panel
   */
  static generateFallOfWickets(state: MatchState): ProductionPanel {
    return {
      type: "fallOfWickets",
      visible: true,
      data: { fow: state.fallOfWickets },
      displayDuration: 10000,
      priority: 75,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate powerplay stats panel
   */
  static generatePowerplayStats(state: MatchState): ProductionPanel {
    const ppBalls = state.ballHistory.filter(b => {
      const over = Math.floor((b.ballNumber - 1) / 6);
      return over < state.config.powerplayOvers;
    });

    const ppRuns = ppBalls.reduce((sum, b) => sum + b.totalRuns, 0);
    const ppWickets = ppBalls.filter(b => b.isWicket).length;
    const ppBoundaries = ppBalls.filter(b => b.isBoundary).length;
    const ppSixes = ppBalls.filter(b => b.isSix).length;

    return {
      type: "powerplayStats",
      visible: true,
      data: {
        runs: ppRuns,
        wickets: ppWickets,
        overs: state.config.powerplayOvers,
        boundaries: ppBoundaries,
        sixes: ppSixes,
      },
      displayDuration: 8000,
      priority: 65,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate win probability panel
   */
  static generateWinProbability(state: MatchState): ProductionPanel {
    return {
      type: "winProbability",
      visible: true,
      data: {
        battingTeam: state.currentInnings === 1 ? state.config.team1 : state.config.team2,
        bowlingTeam: state.currentInnings === 1 ? state.config.team2 : state.config.team1,
        battingProb: state.winProbability.battingTeam,
        bowlingProb: state.winProbability.bowlingTeam,
      },
      displayDuration: 8000,
      priority: 72,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate team comparison panel
   */
  static generateTeamComparison(state: MatchState): ProductionPanel {
    const firstInnings = state.firstInningsSummary;
    return {
      type: "teamComparison",
      visible: true,
      data: {
        team1: state.config.team1,
        team2: state.config.team2,
        innings1: firstInnings ? {
          runs: firstInnings.runs,
          wickets: firstInnings.wickets,
          overs: firstInnings.overs,
          runRate: firstInnings.runRate,
        } : null,
        innings2: {
          runs: state.runs,
          wickets: state.wickets,
          overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
          runRate: state.currentRunRate,
        },
      },
      displayDuration: 10000,
      priority: 68,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate worm graph data
   */
  static generateWormGraph(state: MatchState): ProductionPanel {
    // Build cumulative runs arrays
    const innings1Worm = state.firstInningsSummary
      ? this.buildWormFromHistory(state.firstInningsSummary.batsmanList, state.firstInningsSummary.runs)
      : [];

    const innings2Worm = state.ballHistory.map(b => b.cumulativeScore);

    return {
      type: "wormGraph",
      visible: true,
      data: {
        innings1: innings1Worm,
        innings2: innings2Worm,
        team1: state.config.team1,
        team2: state.config.team2,
        target: state.target,
      },
      displayDuration: 12000,
      priority: 60,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate bowler analysis panel
   */
  static generateBowlerAnalysis(state: MatchState): ProductionPanel {
    return {
      type: "bowlerAnalysis",
      visible: true,
      data: {
        currentBowler: {
          name: state.bowler.name,
          overs: `${Math.floor(state.bowler.balls / 6)}.${state.bowler.balls % 6}`,
          runs: state.bowler.runs,
          wickets: state.bowler.wickets,
          economy: state.bowler.economy,
          dots: state.bowler.dots,
          maidens: state.bowler.maidens,
        },
        allBowlers: state.bowlerHistory,
      },
      displayDuration: 8000,
      priority: 66,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate strategic timeout panel
   */
  static generateStrategicTimeout(state: MatchState): ProductionPanel {
    return {
      type: "strategicTimeout",
      visible: true,
      data: {
        battingTeam: state.currentInnings === 1 ? state.config.team1 : state.config.team2,
        runs: state.runs,
        wickets: state.wickets,
        overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
      },
      displayDuration: 0, // manual dismiss
      priority: 100,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate match summary panel
   */
  static generateMatchSummary(state: MatchState): ProductionPanel {
    return {
      type: "matchSummary",
      visible: true,
      data: {
        firstInnings: state.firstInningsSummary,
        secondInnings: {
          team: state.currentInnings === 2 ? (state.config.team2) : state.config.team1,
          runs: state.runs,
          wickets: state.wickets,
          overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
        },
        result: this.getMatchResult(state),
      },
      displayDuration: 0,
      priority: 100,
      timestamp: Date.now(),
    };
  }

  private static buildWormFromHistory(_batsmanList: any[], totalRuns: number): number[] {
    // Simplified — just a linear ramp for the summary
    const points: number[] = [];
    for (let i = 0; i <= 20; i++) {
      points.push(Math.round((totalRuns / 20) * i));
    }
    return points;
  }

  static getMatchResult(state: MatchState): string {
    if (state.currentInnings === 1) return "In progress (1st innings)";
    if (!state.target) return "In progress";

    const battingTeam = state.config.team2;
    const bowlingTeam = state.config.team1;

    if (state.runs >= state.target) {
      const wicketsLeft = state.config.maxWickets - state.wickets;
      return `${battingTeam} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? "s" : ""}`;
    }

    if (state.ballsRemaining <= 0 || state.wickets >= state.config.maxWickets) {
      const margin = state.target - state.runs - 1;
      if (margin === 0) return "Match tied";
      return `${bowlingTeam} won by ${margin} run${margin > 1 ? "s" : ""}`;
    }

    return "In progress";
  }
}
