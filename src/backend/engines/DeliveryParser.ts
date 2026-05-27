/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeliveryParser — ICC Delivery String Parser
 *
 * Parses professional scoring shorthand into DeliveryInput structs.
 *
 * Format grammar:
 *   <delivery>  ::= <type>[+<runs>][+W-<wicket>]
 *   <type>      ::= "" | "NB" | "WD" | "B" | "LB"
 *   <wicket>    ::= "bo" | "ct" | "lbw" | "ro" | "st" | "hw" | "ob" | "to"
 *
 * Examples:
 *   "."         → dot ball
 *   "4"         → four
 *   "6"         → six
 *   "1"         → single
 *   "W"         → wicket (bowled default)
 *   "W-bo"      → bowled
 *   "W-ct"      → caught
 *   "W-lbw"     → lbw
 *   "W-ro"      → run out (striker)
 *   "W-ro-ns"   → run out (non-striker)
 *   "W-st"      → stumped
 *   "W-hw"      → hit wicket
 *   "W-ob"      → obstructing
 *   "W-to"      → timed out
 *   "NB"        → no ball, 0 extra runs
 *   "NB+4"      → no ball + 4 off bat
 *   "NB+6"      → no ball + six off bat
 *   "NB+W-ro"   → no ball, run out
 *   "WD"        → wide
 *   "WD+1"      → wide + 1 run
 *   "WD+W-st"   → wide, stumped
 *   "WD+W-ro"   → wide, run out
 *   "B+1"       → bye, 1 run
 *   "B+4"       → bye, 4 runs (boundary)
 *   "LB+2"      → leg bye, 2 runs
 */

import { BallType, DeliveryInput, WicketType } from "../../types";

const WICKET_CODE_MAP: Record<string, WicketType> = {
  bo: "bowled",
  ct: "caught",
  lbw: "lbw",
  ro: "runout",
  st: "stumped",
  hw: "hitwicket",
  ob: "obstructing",
  to: "timed_out",
  ret: "retired",
  hb: "handled_ball",
};

export class DeliveryParser {
  /**
   * Parse a delivery string into a structured DeliveryInput.
   *
   * @throws Error if the input cannot be parsed
   */
  static parse(input: string): DeliveryInput {
    const raw = input.trim().toUpperCase();

    // Dot ball
    if (raw === "." || raw === "0") {
      return { ballType: "normal", runs: 0, rawInput: input };
    }

    // Simple numbers: 1,2,3,4,5,6
    if (/^\d+$/.test(raw)) {
      return { ballType: "normal", runs: parseInt(raw, 10), rawInput: input };
    }

    // Determine ball type prefix
    let ballType: BallType = "normal";
    let remainder = raw;

    if (raw.startsWith("NB")) {
      ballType = "noball";
      remainder = raw.slice(2); // strip "NB"
    } else if (raw.startsWith("WD")) {
      ballType = "wide";
      remainder = raw.slice(2); // strip "WD"
    } else if (raw.startsWith("LB")) {
      ballType = "legbye";
      remainder = raw.slice(2); // strip "LB"
    } else if (raw.startsWith("B+") || raw === "B") {
      ballType = "bye";
      remainder = raw.slice(1); // strip "B"
    }

    // Strip leading "+"
    if (remainder.startsWith("+")) {
      remainder = remainder.slice(1);
    }

    let runs = 0;
    let isWicket = false;
    let wicketType: WicketType = "bowled";
    let dismissedBatsman: "striker" | "non-striker" = "striker";

    // Check for wicket component: W or W-code or W-code-ns
    if (remainder === "W" || remainder.startsWith("W-") || remainder.startsWith("W+")) {
      isWicket = true;
      // Check for runs before the wicket: e.g., "1+W-ro" on a normal ball
      const wIndex = remainder.indexOf("W");
      const preW = remainder.slice(0, wIndex).replace(/\+$/, "");
      if (preW && /^\d+$/.test(preW)) {
        runs = parseInt(preW, 10);
      }
      // Parse wicket type
      const wPart = remainder.slice(wIndex + 1); // everything after "W"
      const parts = wPart.replace(/^[-+]/, "").split("-");
      const code = (parts[0] || "bo").toLowerCase();
      wicketType = WICKET_CODE_MAP[code] ?? "bowled";
      // Non-striker run out
      if (parts[1] === "NS" || parts[1] === "ns") {
        dismissedBatsman = "non-striker";
      }
    } else if (/^\d+$/.test(remainder) && remainder.length > 0) {
      runs = parseInt(remainder, 10);
    } else if (remainder === "") {
      runs = 0;
    } else {
      // Could be something like "1+W-ro"
      const combined = remainder;
      const wicketMatch = combined.match(/^(\d*)\+?W[-+]?([a-z]*)([-+]ns)?$/i);
      if (wicketMatch) {
        runs = wicketMatch[1] ? parseInt(wicketMatch[1], 10) : 0;
        isWicket = true;
        const code = (wicketMatch[2] || "bo").toLowerCase();
        wicketType = WICKET_CODE_MAP[code] ?? "bowled";
        if (wicketMatch[3]) dismissedBatsman = "non-striker";
      } else {
        // Fallback: treat unrecognized as a dot
        runs = 0;
      }
    }

    return {
      ballType,
      runs,
      isWicket,
      wicketType: isWicket ? wicketType : undefined,
      dismissedBatsman: isWicket ? dismissedBatsman : undefined,
      rawInput: input,
    };
  }

  /**
   * Serialize a DeliveryInput back to a short display string (for over ticker).
   */
  static toDisplayString(d: DeliveryInput): string {
    const { ballType, runs, isWicket, wicketType } = d;

    if (isWicket) {
      if (ballType === "wide") return "WD+W";
      if (ballType === "noball") return `${runs > 0 ? runs : ""}NB+W`;
      return "W";
    }

    if (ballType === "wide") return runs > 0 ? `${runs + 1}WD` : "WD";
    if (ballType === "noball") return runs > 0 ? `${runs}NB` : "NB";
    if (ballType === "bye") return runs > 0 ? `${runs}B` : "B";
    if (ballType === "legbye") return runs > 0 ? `${runs}LB` : "LB";

    // Normal
    if (runs === 0) return "•";
    if (runs === 4) return "4";
    if (runs === 6) return "6";
    return String(runs);
  }

  /**
   * Build a delivery from individual parts (programmatic use by ControllerPanel).
   */
  static build(
    ballType: BallType,
    runs: number,
    isWicket?: boolean,
    wicketType?: WicketType,
    dismissedBatsman?: "striker" | "non-striker"
  ): DeliveryInput {
    return { ballType, runs, isWicket, wicketType, dismissedBatsman };
  }
}
