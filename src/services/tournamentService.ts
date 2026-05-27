// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tournament Service
 * Full CRUD operations for Tournaments and PlayerStats using Mongoose.
 */

import mongoose from "mongoose";
import { Tournament, ITournament } from "../models/Tournament";
import { PlayerStat } from "../models/PlayerStat";
import { MatchState } from "../types";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function ballsToOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

function computeWinner(state: MatchState): {
  winner: string | null;
  winMargin: number | null;
  winMarginType: "runs" | "wickets" | null;
  resultSummary: string;
} {
  const t1 = state.config.team1;
  const t2 = state.config.team2;

  // First innings complete, second in progress or done
  const innings1Runs = state.firstInningsSummary?.runs ?? state.runs;
  const innings2Runs =
    state.currentInnings === 2 ? state.runs : 0;
  const innings2Wickets = state.currentInnings === 2 ? state.wickets : 0;
  const target = state.target;

  if (!target) {
    // Match not yet at result stage
    return { winner: null, winMargin: null, winMarginType: null, resultSummary: "" };
  }

  if (innings2Runs >= target) {
    // Batting team won
    const margin = 10 - innings2Wickets;
    const battingTeam =
      state.currentInnings === 2
        ? state.config.tossDecision === "bowl"
          ? state.config.tossWinner
          : t1 === state.config.tossWinner
          ? t2
          : t1
        : t1;
    return {
      winner: battingTeam,
      winMargin: margin,
      winMarginType: "wickets",
      resultSummary: `${battingTeam} won by ${margin} wicket${margin !== 1 ? "s" : ""}`,
    };
  } else {
    // Bowling team won
    const bowlingTeam =
      state.currentInnings === 2
        ? state.config.tossDecision === "bat"
          ? state.config.tossWinner
          : t1 === state.config.tossWinner
          ? t2
          : t1
        : t2;
    const margin = target - innings2Runs - 1;
    return {
      winner: bowlingTeam,
      winMargin: margin,
      winMarginType: "runs",
      resultSummary: `${bowlingTeam} won by ${margin} run${margin !== 1 ? "s" : ""}`,
    };
  }
}

// ─────────────────────────────────────────────
// Tournament CRUD
// ─────────────────────────────────────────────

export interface CreateTournamentInput {
  name?: string;
  team1: string;
  team2: string;
  team1ShortName?: string;
  team2ShortName?: string;
  team1Color?: string;
  team2Color?: string;
  totalOvers: number;
  format?: ITournament["format"];
  tossWinner?: string;
  tossDecision?: "bat" | "bowl";
  powerplayOvers?: number;
  maxWickets?: number;
}

/** Create a brand-new tournament record (status: live) */
export async function createTournament(input: CreateTournamentInput) {
  const doc = new Tournament({
    name:
      input.name ||
      `${input.team1} vs ${input.team2} — ${new Date().toLocaleDateString("en-IN")}`,
    team1: input.team1,
    team2: input.team2,
    team1ShortName: input.team1ShortName ?? input.team1.slice(0, 3).toUpperCase(),
    team2ShortName: input.team2ShortName ?? input.team2.slice(0, 3).toUpperCase(),
    team1Color: input.team1Color ?? "#1d4ed8",
    team2Color: input.team2Color ?? "#dc2626",
    totalOvers: input.totalOvers,
    format: input.format ?? "custom",
    tossWinner: input.tossWinner ?? "",
    tossDecision: input.tossDecision ?? "bat",
    powerplayOvers: input.powerplayOvers ?? 6,
    maxWickets: input.maxWickets ?? 10,
    status: "live",
  });
  await doc.save();
  return doc;
}

/** List all tournaments, newest first */
export async function listTournaments(
  page = 1,
  limit = 20,
  status?: string
) {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    (Tournament as any).find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tournament.countDocuments(filter as any),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/** Get a single tournament by ID */
export async function getTournamentById(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return (Tournament as any).findById(id).lean();
}

/** Update arbitrary fields on a tournament */
export async function updateTournament(
  id: string,
  updates: Partial<ITournament>
) {
  if (!mongoose.isValidObjectId(id)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (updates as any)._id;
  return (Tournament as any).findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
}

/** Delete tournament and its player stats */
export async function deleteTournament(id: string) {
  if (!mongoose.isValidObjectId(id)) return false;
  const oid = new mongoose.Types.ObjectId(id);
  await Promise.all([
    (Tournament as any).findByIdAndDelete(id),
    PlayerStat.deleteMany({ tournamentId: oid as any }),
  ]);
  return true;
}

// ─────────────────────────────────────────────
// Complete a match — save scores + player stats
// ─────────────────────────────────────────────

/**
 * Mark a tournament as completed and persist all player stats
 * extracted from the current MatchState.
 */
export async function completeTournament(
  tournamentId: string,
  state: MatchState
) {
  if (!mongoose.isValidObjectId(tournamentId)) return null;

  const innings1 = state.firstInningsSummary;
  const { winner, winMargin, winMarginType, resultSummary } = computeWinner(state);

  const firstExtras = innings1?.extras ?? { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  const secondExtras = state.currentInnings === 2 ? state.extras : { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };

  const updated = await Tournament.findByIdAndUpdate(
    tournamentId,
    {
      $set: {
        firstInningsScore: innings1?.runs ?? 0,
        firstInningsWickets: innings1?.wickets ?? 0,
        firstInningsOvers: innings1?.overs ?? "0.0",
        firstInningsExtras: firstExtras,
        secondInningsScore: state.currentInnings === 2 ? state.runs : 0,
        secondInningsWickets: state.currentInnings === 2 ? state.wickets : 0,
        secondInningsOvers:
          state.currentInnings === 2 ? ballsToOvers(state.balls) : "0.0",
        secondInningsExtras: secondExtras,
        winner,
        winMargin,
        winMarginType,
        resultSummary,
        status: "completed",
        matchStateSnapshot: state as unknown as Record<string, unknown>,
      },
    },
    { new: true }
  ).lean();

  if (!updated) return null;

  // ── Save player stats ──
  const oid = new mongoose.Types.ObjectId(tournamentId);
  const tournamentName = updated.name;

  // Delete any existing stats for this tournament (idempotent save)
  await PlayerStat.deleteMany({ tournamentId: oid });

  const statDocs: any[] = [];

  // Innings 1 batsmen
  const inn1Batsmen = innings1?.batsmanList ?? [];
  const inn1Team = innings1?.team ?? state.config.team1;

  for (const b of inn1Batsmen) {
    statDocs.push({
      tournamentId: oid,
      tournamentName,
      matchDate: updated.date ?? new Date(),
      playerName: b.name,
      team: inn1Team,
      role: "batsman",
      batting: {
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.strikeRate,
        dotBalls: 0,
        isNotOut: b.isNotOut,
        innings: 1,
      },
      bowling: { balls: 0, overs: "0.0", runsConceded: 0, wickets: 0, maidens: 0, economy: 0, dots: 0, wides: 0, noBalls: 0 },
    });
  }

  // Innings 1 bowlers
  const inn1Bowlers = innings1?.bowlerList ?? [];
  const inn1FieldingTeam = inn1Team === state.config.team1 ? state.config.team2 : state.config.team1;

  for (const bw of inn1Bowlers) {
    statDocs.push({
      tournamentId: oid,
      tournamentName,
      matchDate: updated.date ?? new Date(),
      playerName: bw.name,
      team: inn1FieldingTeam,
      role: "bowler",
      batting: { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0, isNotOut: false, innings: 1 },
      bowling: {
        balls: bw.balls,
        overs: ballsToOvers(bw.balls),
        runsConceded: bw.runs,
        wickets: bw.wickets,
        maidens: bw.maidens,
        economy: bw.economy,
        dots: bw.dots,
        wides: bw.wides,
        noBalls: bw.noBalls,
      },
    });
  }

  // Innings 2 batsmen from batsmanHistory
  const inn2Batsmen = state.batsmanHistory ?? [];
  const inn2Team =
    state.currentInnings === 2
      ? inn1Team === state.config.team1
        ? state.config.team2
        : state.config.team1
      : "";

  for (const b of inn2Batsmen) {
    statDocs.push({
      tournamentId: oid,
      tournamentName,
      matchDate: updated.date ?? new Date(),
      playerName: b.name,
      team: inn2Team,
      role: "batsman",
      batting: {
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.strikeRate,
        dotBalls: 0,
        isNotOut: b.isNotOut,
        innings: 2,
      },
      bowling: { balls: 0, overs: "0.0", runsConceded: 0, wickets: 0, maidens: 0, economy: 0, dots: 0, wides: 0, noBalls: 0 },
    });
  }

  // Innings 2 bowlers from bowlerHistory
  const inn2Bowlers = state.bowlerHistory ?? [];
  const inn2BowlingTeam = inn2Team === state.config.team1 ? state.config.team2 : state.config.team1;

  for (const bw of inn2Bowlers) {
    statDocs.push({
      tournamentId: oid,
      tournamentName,
      matchDate: updated.date ?? new Date(),
      playerName: bw.name,
      team: inn2BowlingTeam,
      role: "bowler",
      batting: { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0, isNotOut: false, innings: 2 },
      bowling: {
        balls: bw.balls,
        overs: ballsToOvers(bw.balls),
        runsConceded: bw.runs,
        wickets: bw.wickets,
        maidens: bw.maidens,
        economy: bw.economy,
        dots: bw.dots,
        wides: bw.wides,
        noBalls: bw.noBalls,
      },
    });
  }

  if (statDocs.length > 0) {
    await PlayerStat.insertMany(statDocs);
  }

  return { tournament: updated, playerStatsCount: statDocs.length };
}

// ─────────────────────────────────────────────
// Save live snapshot (manual save during match)
// ─────────────────────────────────────────────

export async function saveSnapshot(tournamentId: string, state: MatchState) {
  if (!mongoose.isValidObjectId(tournamentId)) return null;

  const innings1 = state.firstInningsSummary;
  const firstExtras = innings1?.extras ?? { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };

  return (Tournament as any).findByIdAndUpdate(
    tournamentId,
    {
      $set: {
        firstInningsScore: innings1?.runs ?? (state.currentInnings === 1 ? state.runs : 0),
        firstInningsWickets: innings1?.wickets ?? (state.currentInnings === 1 ? state.wickets : 0),
        firstInningsOvers: innings1?.overs ?? (state.currentInnings === 1 ? ballsToOvers(state.balls) : "0.0"),
        firstInningsExtras: firstExtras,
        secondInningsScore: state.currentInnings === 2 ? state.runs : 0,
        secondInningsWickets: state.currentInnings === 2 ? state.wickets : 0,
        secondInningsOvers: state.currentInnings === 2 ? ballsToOvers(state.balls) : "0.0",
        secondInningsExtras: state.currentInnings === 2 ? state.extras : { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        matchStateSnapshot: state as unknown as Record<string, unknown>,
        status: "live",
      },
    },
    { new: true }
  ).lean();
}

// ─────────────────────────────────────────────
// Player stats queries
// ─────────────────────────────────────────────

/** Get all player stats for a specific tournament */
export async function getPlayerStatsByTournament(tournamentId: string) {
  if (!mongoose.isValidObjectId(tournamentId)) return [];
  return PlayerStat.find({ tournamentId: new mongoose.Types.ObjectId(tournamentId) })
    .sort({ "batting.runs": -1 })
    .lean();
}

/** Aggregate career stats for all players (or a specific player) */
export async function getCareerStats(playerName?: string) {
  const matchStage = playerName
    ? { $match: { playerName: { $regex: new RegExp(playerName, "i") } } }
    : { $match: {} };

  return PlayerStat.aggregate([
    matchStage,
    {
      $group: {
        _id: "$playerName",
        team: { $last: "$team" },
        matches: { $sum: 1 },
        totalRuns: { $sum: "$batting.runs" },
        totalBalls: { $sum: "$batting.balls" },
        totalFours: { $sum: "$batting.fours" },
        totalSixes: { $sum: "$batting.sixes" },
        totalWickets: { $sum: "$bowling.wickets" },
        totalRunsConceded: { $sum: "$bowling.runsConceded" },
        totalBowlingBalls: { $sum: "$bowling.balls" },
        totalMaidens: { $sum: "$bowling.maidens" },
        highestScore: { $max: "$batting.runs" },
        bestWickets: { $max: "$bowling.wickets" },
      },
    },
    {
      $addFields: {
        battingAverage: {
          $cond: [{ $gt: ["$matches", 0] }, { $divide: ["$totalRuns", "$matches"] }, 0],
        },
        battingStrikeRate: {
          $cond: [
            { $gt: ["$totalBalls", 0] },
            { $multiply: [{ $divide: ["$totalRuns", "$totalBalls"] }, 100] },
            0,
          ],
        },
        bowlingEconomy: {
          $cond: [
            { $gt: ["$totalBowlingBalls", 0] },
            { $multiply: [{ $divide: ["$totalRunsConceded", "$totalBowlingBalls"] }, 6] },
            0,
          ],
        },
      },
    },
    { $sort: { totalRuns: -1 } },
  ]);
}
