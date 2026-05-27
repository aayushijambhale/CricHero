import { MatchState } from '../../types';
import { ScoreSnapshot } from '../../models';
import mongoose from 'mongoose';

export class ReplayEngine {
  /**
   * Captures the exact state of the match at this ball.
   */
  async captureSnapshot(matchId: string, inningsId: string, state: MatchState) {
    try {
      const snapshot = new ScoreSnapshot({
        matchId: new mongoose.Types.ObjectId(matchId),
        inningsId: new mongoose.Types.ObjectId(inningsId),
        score: state.runs,
        wickets: state.wickets,
        overs: Math.floor(state.balls / 6),
        striker: null,
        nonStriker: null,
        bowler: null,
        timestamp: new Date()
      });

      await snapshot.save();
      console.log(`[ReplayEngine] Snapshot captured for match ${matchId}`);
    } catch (err) {
      console.error(`[ReplayEngine] Failed to capture snapshot:`, err);
    }
  }
}

export const replayEngine = new ReplayEngine();
