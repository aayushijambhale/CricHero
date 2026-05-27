/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tournament Mongoose Model
 * Stores tournament metadata, scores, and match outcome.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITournament extends Document {
  name: string;
  date: Date;
  format: "t20" | "odi" | "test" | "custom" | "superover";
  team1: string;
  team2: string;
  team1ShortName: string;
  team2ShortName: string;
  team1Color: string;
  team2Color: string;
  totalOvers: number;
  tossWinner: string;
  tossDecision: "bat" | "bowl";
  powerplayOvers: number;
  maxWickets: number;

  // First Innings
  firstInningsScore: number;
  firstInningsWickets: number;
  firstInningsOvers: string;
  firstInningsExtras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };

  // Second Innings
  secondInningsScore: number;
  secondInningsWickets: number;
  secondInningsOvers: string;
  secondInningsExtras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };

  // Match result
  winner: string | null;
  winMargin: number | null;
  winMarginType: "runs" | "wickets" | null;
  resultSummary: string;

  // Status
  status: "live" | "completed" | "abandoned";

  // Snapshot of full match state for replay/load
  matchStateSnapshot?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const ExtrasSchema = new Schema(
  {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const TournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    format: {
      type: String,
      enum: ["t20", "odi", "test", "custom", "superover"],
      default: "custom",
    },

    team1: { type: String, required: true },
    team2: { type: String, required: true },
    team1ShortName: { type: String, default: "TM1" },
    team2ShortName: { type: String, default: "TM2" },
    team1Color: { type: String, default: "#1d4ed8" },
    team2Color: { type: String, default: "#dc2626" },

    totalOvers: { type: Number, required: true, default: 20 },
    tossWinner: { type: String, default: "" },
    tossDecision: { type: String, enum: ["bat", "bowl"], default: "bat" },
    powerplayOvers: { type: Number, default: 6 },
    maxWickets: { type: Number, default: 10 },

    // First Innings
    firstInningsScore: { type: Number, default: 0 },
    firstInningsWickets: { type: Number, default: 0 },
    firstInningsOvers: { type: String, default: "0.0" },
    firstInningsExtras: { type: ExtrasSchema, default: () => ({}) },

    // Second Innings
    secondInningsScore: { type: Number, default: 0 },
    secondInningsWickets: { type: Number, default: 0 },
    secondInningsOvers: { type: String, default: "0.0" },
    secondInningsExtras: { type: ExtrasSchema, default: () => ({}) },

    // Result
    winner: { type: String, default: null },
    winMargin: { type: Number, default: null },
    winMarginType: { type: String, enum: ["runs", "wickets", null], default: null },
    resultSummary: { type: String, default: "" },

    status: {
      type: String,
      enum: ["live", "completed", "abandoned"],
      default: "live",
    },

    matchStateSnapshot: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: "tournaments",
  }
);

// Indexes for efficient queries
TournamentSchema.index({ status: 1, date: -1 });
TournamentSchema.index({ team1: 1, team2: 1 });
TournamentSchema.index({ createdAt: -1 });

export const Tournament = mongoose.model<ITournament>("Tournament", TournamentSchema);
