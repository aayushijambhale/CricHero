/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlayerStat Mongoose Model
 * Stores per-match batting and bowling statistics for each player.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IPlayerStat extends Document {
  tournamentId: mongoose.Types.ObjectId;
  tournamentName: string;
  matchDate: Date;
  playerName: string;
  team: string;
  role: "batsman" | "bowler" | "allrounder";

  // Batting stats
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    dotBalls: number;
    isNotOut: boolean;
    innings: number; // which innings (1 or 2)
  };

  // Bowling stats
  bowling: {
    balls: number;
    overs: string;
    runsConceded: number;
    wickets: number;
    maidens: number;
    economy: number;
    dots: number;
    wides: number;
    noBalls: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const BattingSchema = new Schema(
  {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    dotBalls: { type: Number, default: 0 },
    isNotOut: { type: Boolean, default: false },
    innings: { type: Number, enum: [1, 2], default: 1 },
  },
  { _id: false }
);

const BowlingSchema = new Schema(
  {
    balls: { type: Number, default: 0 },
    overs: { type: String, default: "0.0" },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    dots: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
  },
  { _id: false }
);

const PlayerStatSchema = new Schema<IPlayerStat>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    tournamentName: { type: String, default: "" },
    matchDate: { type: Date, default: Date.now },
    playerName: { type: String, required: true, trim: true, index: true },
    team: { type: String, required: true },
    role: {
      type: String,
      enum: ["batsman", "bowler", "allrounder"],
      default: "allrounder",
    },
    batting: { type: BattingSchema, default: () => ({}) },
    bowling: { type: BowlingSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: "player_stats",
  }
);

// Compound indexes
PlayerStatSchema.index({ tournamentId: 1, playerName: 1 });
PlayerStatSchema.index({ playerName: 1, matchDate: -1 });
PlayerStatSchema.index({ team: 1, matchDate: -1 });

export const PlayerStat = mongoose.models.PlayerStat || mongoose.model<IPlayerStat>("PlayerStat", PlayerStatSchema);
