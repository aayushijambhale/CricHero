/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatchConfig {
  team1: string;
  team2: string;
  totalOvers: number;
  tossWinner: string;
  tossDecision: "bat" | "bowl";
}

export interface Batsman {
  name: string;
  runs: number;
  balls: number;
  isStriker: boolean;
}

export interface Bowler {
  name: string;
  runs: number;
  wickets: number;
  balls: number; // to calculate bowler overs
}

export interface MatchState {
  config: MatchConfig;
  runs: number;
  wickets: number;
  balls: number; // total balls bowled in the current innings
  currentInnings: 1 | 2;
  target: number | null; // target score for 2nd innings
  batsman1: Batsman;
  batsman2: Batsman;
  bowler: Bowler;
  thisOver: string[]; // e.g. ["2", "6", "•", "1"]
  partnershipRuns: number;
  partnershipBalls: number;
  lastWicket: {
    name: string;
    runs: number;
    balls: number;
    scoreAtWicket: string;
  } | null;
  powerplay: boolean;
  superOver: boolean;
  freeHit?: boolean;
  eventTrigger: {
    type: "four" | "six" | "wicket" | "single" | "config" | "reset";
    timestamp: number;
  } | null;
  primaryColor?: string;
  secondaryColor?: string;
  glowColor?: string;
  accentTextColor?: string;
  firstInningsDisplay?: "projected" | "crr" | "partnership";
  secondInningsLayout?: "normal" | "combined";
  panelBgColor?: string;
  celebrationTheme?: "neon" | "metallic" | "cyber" | "epic";
  maxSixText?: string;
  fourBoundaryText?: string;
}

export type ScreenType = "launcher" | "controller" | "overlay";
