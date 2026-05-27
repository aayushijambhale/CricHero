/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CricHero — Professional ICC Cricket Types
 * Complete type system for an ICC/IPL-grade broadcast scoring engine
 */

// ─────────────────────────────────────────────────────────────
// MATCH FORMAT & CORE ENUMS
// ─────────────────────────────────────────────────────────────

export type MatchFormat = "t20" | "odi" | "test" | "custom" | "superover" | "t10" | "hundred";

export type BallType = "normal" | "wide" | "noball" | "bye" | "legbye";

/** All ICC-recognized modes of dismissal */
export type WicketType =
  | "bowled"
  | "caught"
  | "lbw"
  | "runout"
  | "stumped"
  | "hitwicket"
  | "retired"          // retired hurt (not out) or retired out
  | "obstructing"      // obstructing the field
  | "timed_out"        // new batsman did not arrive in time
  | "handled_ball";    // (historic — merged into obstructing in 2017)

export type MatchPhase = "powerplay" | "middle" | "death" | "chase" | "superover";

/** ODI has 3 powerplay phases */
export type PowerplayPhase = "PP1" | "PP2" | "PP3" | "none";

// ─────────────────────────────────────────────────────────────
// DELIVERY INPUT — structured ball descriptor
// ─────────────────────────────────────────────────────────────

/**
 * Fully parsed delivery descriptor.
 * Can be constructed manually or via DeliveryParser.parse(string).
 *
 * Examples:
 *   "4"           → { ballType:"normal", runs:4 }
 *   "WD+W-st"     → { ballType:"wide", runs:0, isWicket:true, wicketType:"stumped" }
 *   "NB+W-ro"     → { ballType:"noball", runs:0, isWicket:true, wicketType:"runout" }
 *   "B+4"         → { ballType:"bye", runs:4 }
 */
export interface DeliveryInput {
  ballType: BallType;
  runs: number;                         // runs off bat (or runs for extras)
  isWicket?: boolean;
  wicketType?: WicketType;
  dismissedBatsman?: "striker" | "non-striker";
  newBatsmanName?: string;              // incoming batsman after wicket
  overrideStriker?: string;             // force a specific striker name (used in run-outs)
  /** Raw string that was parsed (for display/logging) */
  rawInput?: string;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  violations: RuleViolation[];
}

export interface RuleViolation {
  code: string;
  message: string;
  severity: "error" | "warning";
}

// ─────────────────────────────────────────────────────────────
// BROADCAST EVENTS
// ─────────────────────────────────────────────────────────────

export type BroadcastEventType =
  | "FOUR"
  | "SIX"
  | "WICKET"
  | "FREE_HIT"
  | "FREE_HIT_CONSUMED"
  | "POWERPLAY_START"
  | "POWERPLAY_END"
  | "OVER_COMPLETE"
  | "MAIDEN_OVER"
  | "INNINGS_COMPLETE"
  | "MATCH_RESULT"
  | "SUPER_OVER_START"
  | "SUPER_OVER_RESULT"
  | "DLS_UPDATE"
  | "BATSMAN_FIFTY"
  | "BATSMAN_CENTURY"
  | "BATSMAN_DUCK"
  | "PARTNERSHIP_FIFTY"
  | "PARTNERSHIP_CENTURY"
  | "HAT_TRICK_BALL"
  | "HAT_TRICK"
  | "FIVE_WICKETS"
  | "LAST_OVER"
  | "LAST_5_OVERS"
  | "LAST_WICKET"
  | "PHASE_CHANGE"
  | "DOT_BALL"
  | "MILESTONE";

export interface BroadcastEvent {
  type: BroadcastEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// DLS (Duckworth-Lewis-Stern)
// ─────────────────────────────────────────────────────────────

export interface DLSData {
  isActive: boolean;
  interruptedInnings: 1 | 2 | null;
  interruptedAt: {
    over: number;
    ball: number;
    wickets: number;
    runs: number;
  } | null;
  team1Resources: number;      // % resources used (0-100)
  team2Resources: number;      // % resources used (0-100)
  revisedOvers: number | null; // overs available after interruption
  revisedTarget: number | null;
  dlsMethod: "standard" | "professional";
  parScore: number | null;     // par score at time of interruption
}

// ─────────────────────────────────────────────────────────────
// SUPER OVER
// ─────────────────────────────────────────────────────────────

export interface SuperOverInnings {
  team: string;
  runs: number;
  wickets: number;
  balls: number;
  /** Max wickets before innings ends (ICC: 2) */
  maxWickets: number;
  batsmen: Batsman[];
  bowler: Bowler;
  complete: boolean;
}

export interface SuperOverState {
  active: boolean;
  superOverNumber: number;  // 1, 2, ... (nested super overs if tied again)
  innings1: SuperOverInnings | null;
  innings2: SuperOverInnings | null;
  result: string | null;
  winner: string | null;
}

// ─────────────────────────────────────────────────────────────
// MATCH CONFIG
// ─────────────────────────────────────────────────────────────

export interface MatchConfig {
  team1: string;
  team2: string;
  totalOvers: number;
  tossWinner: string;
  tossDecision: "bat" | "bowl";
  format: MatchFormat;
  team1Color: string;
  team2Color: string;
  team1ShortName: string;
  team2ShortName: string;
  powerplayOvers: number;
  maxWickets: number;
  /** Venue for DLS/metadata */
  venue?: string;
  /** Match referee / umpires */
  umpire1?: string;
  umpire2?: string;
  thirdUmpire?: string;
}

// ─────────────────────────────────────────────────────────────
// PLAYERS
// ─────────────────────────────────────────────────────────────

export interface Batsman {
  name: string;
  runs: number;
  balls: number;
  isStriker: boolean;
  fours: number;
  sixes: number;
  strikeRate: number;
  dotBalls: number;
  /** Dismissal info (set when out) */
  dismissalType?: WicketType;
  dismissedBy?: string;  // bowler name
  fielder?: string;      // fielder who caught/ran out
  /** Position in batting order (1-11) */
  battingOrder?: number;
}

export interface Bowler {
  name: string;
  runs: number;
  wickets: number;
  balls: number;
  maidens: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
  /** Which over numbers this bowler has bowled (0-indexed) */
  oversBowled?: number[];
  /** Current over runs (reset after maiden check) */
  currentOverRuns?: number;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────
// BALL EVENT (ball-by-ball log)
// ─────────────────────────────────────────────────────────────

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  overs: string;
  batsmanName: string;
  dismissalType: string;
  bowlerName?: string;
  fielderName?: string;
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

export interface BallEvent {
  /** Over number (0-indexed) */
  overNumber: number;
  /** Ball number within over (1-6 for legal, can be >6 for illegals) */
  overBall: number;
  /** Absolute legal ball count in innings */
  ballNumber: number;
  runs: number;
  extras: number;
  totalRuns: number;
  ballType: BallType;
  isLegal: boolean;
  isBoundary: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  batsmanOnStrike: string;
  nonStriker: string;
  bowler: string;
  timestamp: number;
  cumulativeScore: number;
  wicketDescription?: string;
  /** Was this ball delivered on a free hit? */
  wasFreeHit: boolean;
  /** Did this delivery trigger a free hit for next ball? */
  triggersFreeHit: boolean;
  /** Was this a maiden over completion? */
  isMaidenCompletion?: boolean;
  /** Raw input string */
  rawInput?: string;
}

// ─────────────────────────────────────────────────────────────
// INNINGS SUMMARY
// ─────────────────────────────────────────────────────────────

export interface InningsSummary {
  team: string;
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  batsmanList: {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isNotOut: boolean;
    dismissalType?: WicketType;
    dismissedBy?: string;
    fielder?: string;
    battingOrder?: number;
  }[];
  bowlerList: Bowler[];
  fallOfWickets: FallOfWicket[];
  extras: Extras;
  partnerships: PartnershipData[];
}

// ─────────────────────────────────────────────────────────────
// PRESSURE / MOMENTUM
// ─────────────────────────────────────────────────────────────

export interface PressureState {
  level: "normal" | "building" | "high" | "extreme";
  score: number;
  description: string;
}

export interface MomentumState {
  direction: "batting" | "bowling" | "neutral";
  intensity: number;
  consecutiveBoundaries: number;
  consecutiveDots: number;
  recentWickets: number;
  scoringAcceleration: number;
}

// ─────────────────────────────────────────────────────────────
// PRODUCTION PANELS
// ─────────────────────────────────────────────────────────────

export type ProductionPanelType =
  | "playerCard"
  | "partnership"
  | "requiredEquation"
  | "fallOfWickets"
  | "powerplayStats"
  | "winProbability"
  | "teamComparison"
  | "wormGraph"
  | "bowlerAnalysis"
  | "strategicTimeout"
  | "matchSummary"
  | "dlsUpdate"
  | "superOverSetup"
  | "hattrickBall"
  | "milestoneCard";

export interface ProductionPanel {
  type: ProductionPanelType;
  visible: boolean;
  data: unknown;
  displayDuration: number;
  priority: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// MATCH STATE — single source of truth
// ─────────────────────────────────────────────────────────────

export interface MatchState {
  // ── Config ──
  config: MatchConfig;

  // ── Live Score ──
  runs: number;
  wickets: number;
  /** Total LEGAL balls bowled in this innings */
  balls: number;
  currentInnings: 1 | 2;
  target: number | null;

  // ── At the crease ──
  batsman1: Batsman;
  batsman2: Batsman;
  bowler: Bowler;

  // ── Over display ──
  thisOver: string[];
  /** Legal balls bowled in current over (0-5 before next over) */
  legalBallsInOver: number;

  // ── Partnership ──
  partnershipRuns: number;
  partnershipBalls: number;

  // ── Wickets ──
  lastWicket: {
    name: string;
    runs: number;
    balls: number;
    scoreAtWicket: string;
    dismissalType?: WicketType;
  } | null;

  // ── Flags ──
  powerplay: boolean;
  superOver: boolean;
  /** True = next legal delivery is a free hit */
  freeHit: boolean;

  // ── Phase ──
  matchPhase: MatchPhase;
  powerplayPhase: PowerplayPhase;

  // ── Event trigger for overlay ──
  eventTrigger: {
    type: "four" | "six" | "wicket" | "single" | "config" | "reset" | "freehit" | "maiden" | "milestone";
    timestamp: number;
    data?: Record<string, unknown>;
  } | null;

  // ── History ──
  ballHistory: BallEvent[];
  fallOfWickets: FallOfWicket[];
  partnerships: PartnershipData[];
  bowlerHistory: Bowler[];
  batsmanHistory: {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isNotOut: boolean;
    dismissalType?: WicketType;
    dismissedBy?: string;
    fielder?: string;
    battingOrder?: number;
  }[];

  // ── Innings summary ──
  firstInningsSummary: InningsSummary | null;

  // ── Extras ──
  extras: Extras;

  // ── Run rates ──
  currentRunRate: number;
  requiredRunRate: number | null;
  projectedScore: number;
  runsNeeded: number | null;
  ballsRemaining: number;
  winProbability: { battingTeam: number; bowlingTeam: number };

  // ── Intelligence engines ──
  pressureState: PressureState;
  momentumState: MomentumState;

  // ── Active panel ──
  activeProductionPanel: ProductionPanel | null;

  // ── DLS ──
  dlsData: DLSData;

  // ── Super Over ──
  superOverState: SuperOverState | null;

  // ── Aesthetics ──
  primaryColor?: string;
  secondaryColor?: string;
  glowColor?: string;
  accentTextColor?: string;
  infoPanelTheme?: "projected" | "crr" | "toss" | "partnership";
  recentBalls?: string[];
  secondInningsLayout?: "normal" | "combined";
  panelBgColor?: string;
  celebrationTheme?: "neon" | "metallic" | "cyber" | "epic";
  maxSixText?: string;
  fourBoundaryText?: string;
  overlayVisible?: boolean;
  scoreStripVisible?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SCREEN ROUTING
// ─────────────────────────────────────────────────────────────

export type ScreenType = "launcher" | "controller" | "overlay" | "tournaments";

// ─────────────────────────────────────────────────────────────
// DEFAULT STATE FACTORY
// ─────────────────────────────────────────────────────────────

export function createDefaultMatchState(): MatchState {
  return {
    config: {
      team1: "TEAM A",
      team2: "TEAM B",
      totalOvers: 20,
      tossWinner: "TEAM A",
      tossDecision: "bat",
      format: "t20",
      team1Color: "#1d4ed8",
      team2Color: "#dc2626",
      team1ShortName: "TMA",
      team2ShortName: "TMB",
      powerplayOvers: 6,
      maxWickets: 10,
    },
    runs: 0,
    wickets: 0,
    balls: 0,
    currentInnings: 1,
    target: null,
    batsman1: {
      name: "BATSMAN 1",
      runs: 0,
      balls: 0,
      isStriker: true,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
      battingOrder: 1,
    },
    batsman2: {
      name: "BATSMAN 2",
      runs: 0,
      balls: 0,
      isStriker: false,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
      battingOrder: 2,
    },
    bowler: {
      name: "BOWLER 1",
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
    },
    thisOver: [],
    legalBallsInOver: 0,
    partnershipRuns: 0,
    partnershipBalls: 0,
    lastWicket: null,
    powerplay: true,
    superOver: false,
    freeHit: false,
    eventTrigger: null,
    matchPhase: "powerplay",
    powerplayPhase: "PP1",
    pressureState: { level: "normal", score: 0, description: "Match starting" },
    momentumState: {
      direction: "neutral",
      intensity: 0,
      consecutiveBoundaries: 0,
      consecutiveDots: 0,
      recentWickets: 0,
      scoringAcceleration: 0,
    },
    ballHistory: [],
    fallOfWickets: [],
    partnerships: [],
    bowlerHistory: [],
    batsmanHistory: [],
    firstInningsSummary: null,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    currentRunRate: 0,
    requiredRunRate: null,
    projectedScore: 0,
    runsNeeded: null,
    ballsRemaining: 120,
    winProbability: { battingTeam: 50, bowlingTeam: 50 },
    activeProductionPanel: null,
    dlsData: {
      isActive: false,
      interruptedInnings: null,
      interruptedAt: null,
      team1Resources: 100,
      team2Resources: 100,
      revisedOvers: null,
      revisedTarget: null,
      dlsMethod: "standard",
      parScore: null,
    },
    superOverState: null,
    primaryColor: "#1d4ed8",
    secondaryColor: "#dc2626",
    glowColor: "#c084fc",
    accentTextColor: "#fbbf24",
    panelBgColor: "#0a0a0c",
    infoPanelTheme: "projected",
    recentBalls: [],
    secondInningsLayout: "combined",
    celebrationTheme: "neon",
    maxSixText: "★★ MAX SIX ★★",
    fourBoundaryText: "★ BOUNDARY FOUR ★",
    overlayVisible: true,
    scoreStripVisible: true,
  };
}
