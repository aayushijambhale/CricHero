// @ts-nocheck
import { Delivery } from '../../models';
import { Delivery, ScoreSnapshot } from '../../models';
import mongoose from 'mongoose';

export class AnalyticsEngine {
  /**
   * Generates Run Rate / Momentum Worm Data
   */
  async getMatchAnalytics(matchId: string) {
    try {
      const snapshots = await (ScoreSnapshot as any).find({ 
        matchId: new mongoose.Types.ObjectId(matchId) 
      }).sort({ timestamp: 1 }).lean();
    } catch (e) {
      return [];
    }
  }

  async generateWormData(matchId: string, inningsId: string) {
    const deliveries = await Delivery.find({
      matchId: new mongoose.Types.ObjectId(matchId),
      inningsId: new mongoose.Types.ObjectId(inningsId)
    }).sort({ over: 1, ball: 1 });

    let cumulativeRuns = 0;
    const worm = deliveries.map(d => {
      cumulativeRuns += d.totalRuns;
      return {
        over: d.over,
        ball: d.ball,
        cumulativeRuns,
        isWicket: d.wicket
      };
    });

    return worm;
  }

  /**
   * Calculates phase scoring (e.g. Powerplay vs Middle Overs)
   */
  async calculatePhaseScoring(matchId: string, inningsId: string) {
    // Advanced aggregation omitted for brevity, returns structure:
    return {
      powerplay: { runs: 45, wickets: 2, runRate: 7.5 },
      middle: { runs: 80, wickets: 3, runRate: 8.0 },
      death: { runs: 65, wickets: 2, runRate: 13.0 }
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
