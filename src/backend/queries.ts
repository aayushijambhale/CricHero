import mongoose from 'mongoose';
import { Delivery, Player, Match } from '../models';

/**
 * Aggregation Pipeline: Get Player Career Batting Stats
 * Extracts runs, balls, fours, sixes, and strike rate for a specific player across all matches.
 */
export async function getPlayerCareerBattingStats(playerId: mongoose.Types.ObjectId) {
  return await Delivery.aggregate([
    { $match: { striker: playerId, legalBall: true } },
    {
      $group: {
        _id: '$striker',
        totalRuns: { $sum: '$batsmanRuns' },
        ballsFaced: { $sum: 1 },
        fours: {
          $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] }
        },
        sixes: {
          $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        playerId: '$_id',
        totalRuns: 1,
        ballsFaced: 1,
        fours: 1,
        sixes: 1,
        strikeRate: {
          $cond: [
            { $gt: ['$ballsFaced', 0] },
            { $multiply: [{ $divide: ['$totalRuns', '$ballsFaced'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
}

/**
 * Aggregation Pipeline: Get Bowler Economy and Wickets
 * Calculates overs bowled, total runs conceded, and wickets taken.
 */
export async function getBowlerCareerStats(playerId: mongoose.Types.ObjectId) {
  return await Delivery.aggregate([
    { $match: { bowler: playerId } },
    {
      $group: {
        _id: '$bowler',
        legalBalls: {
          $sum: { $cond: ['$legalBall', 1, 0] }
        },
        runsConceded: { $sum: '$totalRuns' },
        wickets: {
          $sum: { $cond: ['$wicket', 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        playerId: '$_id',
        runsConceded: 1,
        wickets: 1,
        oversBowled: {
          $add: [
            { $floor: { $divide: ['$legalBalls', 6] } },
            { $divide: [{ $mod: ['$legalBalls', 6] }, 10] }
          ]
        },
        economy: {
          $cond: [
            { $gt: ['$legalBalls', 0] },
            { $multiply: [{ $divide: ['$runsConceded', '$legalBalls'] }, 6] },
            0
          ]
        }
      }
    }
  ]);
}

/**
 * Aggregation Pipeline: Get Match Summary
 * Groups deliveries by innings to calculate score, wickets, and extras per team.
 */
export async function getMatchSummary(matchId: mongoose.Types.ObjectId) {
  return await Delivery.aggregate([
    { $match: { matchId } },
    {
      $group: {
        _id: '$inningsId',
        totalRuns: { $sum: '$totalRuns' },
        totalWickets: { $sum: { $cond: ['$wicket', 1, 0] } },
        totalExtras: { $sum: '$extras' },
        legalBalls: { $sum: { $cond: ['$legalBall', 1, 0] } }
      }
    },
    {
      $lookup: {
        from: 'innings',
        localField: '_id',
        foreignField: '_id',
        as: 'inningsDetails'
      }
    },
    { $unwind: '$inningsDetails' },
    {
      $project: {
        inningsNumber: '$inningsDetails.inningsNumber',
        battingTeam: '$inningsDetails.battingTeam',
        totalRuns: 1,
        totalWickets: 1,
        totalExtras: 1,
        overs: {
          $add: [
            { $floor: { $divide: ['$legalBalls', 6] } },
            { $divide: [{ $mod: ['$legalBalls', 6] }, 10] }
          ]
        }
      }
    },
    { $sort: { inningsNumber: 1 } }
  ]);
}
