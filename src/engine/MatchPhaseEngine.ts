/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MatchPhaseEngine — Auto-detect current match phase and trigger visuals
 */

import { MatchState, MatchPhase, PowerplayPhase } from "../types";

export interface PhaseConfig {
  phase: MatchPhase;
  label: string;
  themeOverride: string | null;   // theme preset name
  animationSpeed: number;          // multiplier (1.0 = normal)
  showBadge: boolean;
  badgeText: string;
  badgeColor: string;
}

export class MatchPhaseEngine {

  private static readonly PHASE_CONFIGS: Record<MatchPhase, PhaseConfig> = {
    powerplay: {
      phase: "powerplay",
      label: "POWERPLAY",
      themeOverride: "powerplay",
      animationSpeed: 1.0,
      showBadge: true,
      badgeText: "PP",
      badgeColor: "#06b6d4",
    },
    middle: {
      phase: "middle",
      label: "MIDDLE OVERS",
      themeOverride: null,
      animationSpeed: 1.0,
      showBadge: false,
      badgeText: "",
      badgeColor: "",
    },
    death: {
      phase: "death",
      label: "DEATH OVERS",
      themeOverride: null,
      animationSpeed: 1.3,  // faster animations during death
      showBadge: true,
      badgeText: "DEATH",
      badgeColor: "#ef4444",
    },
    chase: {
      phase: "chase",
      label: "CHASE",
      themeOverride: null,
      animationSpeed: 1.1,
      showBadge: true,
      badgeText: "CHASE",
      badgeColor: "#8b5cf6",
    },
    superover: {
      phase: "superover",
      label: "SUPER OVER",
      themeOverride: "superOver",
      animationSpeed: 1.5,  // fastest animations
      showBadge: true,
      badgeText: "SUPER OVER",
      badgeColor: "#be123c",
    },
  };

  /**
   * Detect the current match phase
   */
  static detectPhase(state: MatchState): MatchPhase {
    if (state.superOver) return "superover";
    if (state.currentInnings === 2 && state.target !== null) return "chase";

    const currentOver = Math.floor(state.balls / 6);
    const totalOvers = state.config.totalOvers;

    if (state.config.format === "t20") {
      if (currentOver < 6) return "powerplay";
      if (currentOver < 16) return "middle";
      return "death";
    }

    if (state.config.format === "odi") {
      if (currentOver < 10) return "powerplay";
      if (currentOver < 40) return "middle";
      return "death";
    }

    // Custom format
    const ppEnd = state.config.powerplayOvers;
    if (ppEnd > 0 && currentOver < ppEnd) return "powerplay";

    const deathStart = Math.max(ppEnd, totalOvers - 4);
    if (currentOver >= deathStart) return "death";

    return "middle";
  }

  /**
   * Get the phase configuration for current state
   */
  static getPhaseConfig(state: MatchState): PhaseConfig {
    const phase = this.detectPhase(state);
    return this.PHASE_CONFIGS[phase];
  }

  /**
   * Get powerplay number (P1, P2, P3 for ODIs)
   */
  static getPowerplayNumber(state: MatchState): number {
    if (state.config.format !== "odi") return 1;

    const currentOver = Math.floor(state.balls / 6);
    if (currentOver < 10) return 1;
    if (currentOver < 40) return 2;
    return 3;
  }

  /**
   * Get powerplay phase (PP1, PP2, PP3, none)
   */
  static getPowerplayPhase(state: MatchState): PowerplayPhase {
    const phase = this.detectPhase(state);
    if (phase !== "powerplay") return "none";
    if (state.config.format !== "odi") return "PP1";
    
    const currentOver = Math.floor(state.balls / 6);
    if (currentOver < 10) return "PP1";
    if (currentOver < 40) return "PP2";
    return "PP3";
  }

  /**
   * Get remaining overs in current phase
   */
  static getPhaseOversRemaining(state: MatchState): number {
    const currentOver = Math.floor(state.balls / 6);
    const phase = this.detectPhase(state);

    if (state.config.format === "t20") {
      if (phase === "powerplay") return 6 - currentOver;
      if (phase === "middle") return 16 - currentOver;
      if (phase === "death") return 20 - currentOver;
    }

    if (state.config.format === "odi") {
      if (phase === "powerplay") return 10 - currentOver;
      if (phase === "middle") return 40 - currentOver;
      if (phase === "death") return 50 - currentOver;
    }

    return state.config.totalOvers - currentOver;
  }

  /**
   * Check if phase just changed (compare with previous phase)
   */
  static hasPhaseChanged(prevState: MatchState | null, currentState: MatchState): boolean {
    if (!prevState) return true;
    return prevState.matchPhase !== currentState.matchPhase;
  }
}
