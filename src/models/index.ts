import mongoose, { Schema, Document } from 'mongoose';

// 1. Tournaments (Bonus, needed to wrap matches)
export interface ITournament extends Document {
  name: string;
  season: string;
  format: string;
  startDate: Date;
  endDate?: Date;
  winnerTeamId?: mongoose.Types.ObjectId;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema({
  name: { type: String, required: true },
  season: { type: String, required: true },
  format: { type: String, required: true, enum: ['T20', 'ODI', 'TEST', 'T10', 'CUSTOM'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  winnerTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  status: { type: String, required: true, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
}, { timestamps: true });

// 2. Matches
export interface IMatch extends Document {
  tournamentId: mongoose.Types.ObjectId;
  matchType: string;
  venue: string;
  date: Date;
  tossWinner?: mongoose.Types.ObjectId;
  tossDecision?: 'bat' | 'bowl';
  battingTeam?: mongoose.Types.ObjectId;
  bowlingTeam?: mongoose.Types.ObjectId;
  currentInnings: number;
  inningsStatus: 'not_started' | 'in_progress' | 'innings_break' | 'completed';
  target?: number;
  revisedTarget?: number;
  revisedOvers?: number;
  isPowerplay: boolean;
  isStrategicTimeout: boolean;
  isDrinksBreak: boolean;
  isRainDelay: boolean;
  isSuperOver: boolean;
  currentRunRate: number;
  requiredRunRate: number;
  projectedScore: number;
  result?: string;
  status: 'scheduled' | 'live' | 'completed' | 'abandoned';
}

const MatchSchema = new Schema({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchType: { type: String, required: true },
  venue: { type: String, required: true },
  date: { type: Date, required: true },
  tossWinner: { type: Schema.Types.ObjectId, ref: 'Team' },
  tossDecision: { type: String, enum: ['bat', 'bowl'] },
  battingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  currentInnings: { type: Number, default: 1 },
  inningsStatus: { type: String, enum: ['not_started', 'in_progress', 'innings_break', 'completed'], default: 'not_started' },
  target: { type: Number },
  revisedTarget: { type: Number },
  revisedOvers: { type: Number },
  isPowerplay: { type: Boolean, default: false },
  isStrategicTimeout: { type: Boolean, default: false },
  isDrinksBreak: { type: Boolean, default: false },
  isRainDelay: { type: Boolean, default: false },
  isSuperOver: { type: Boolean, default: false },
  currentRunRate: { type: Number, default: 0 },
  requiredRunRate: { type: Number, default: 0 },
  projectedScore: { type: Number, default: 0 },
  result: { type: String },
  status: { type: String, required: true, enum: ['scheduled', 'live', 'completed', 'abandoned'], default: 'scheduled' },
  matchStateSnapshot: { type: Schema.Types.Mixed },
}, { timestamps: true });

// 3. Teams
const TeamSchema = new Schema({
  teamName: { type: String, required: true },
  shortName: { type: String, required: true },
  primaryColor: { type: String },
  secondaryColor: { type: String },
  accentColor: { type: String },
  glowColor: { type: String },
  logo: { type: String },
  coach: { type: String },
  captain: { type: Schema.Types.ObjectId, ref: 'Player' },
  squad: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
}, { timestamps: true });

// 4. Players
const PlayerSchema = new Schema({
  playerName: { type: String, required: true },
  shortName: { type: String, required: true },
  jerseyNumber: { type: Number },
  role: { type: String, enum: ['batsman', 'bowler', 'allrounder', 'wicketkeeper'] },
  battingStyle: { type: String, enum: ['right_hand', 'left_hand'] },
  bowlingStyle: { type: String },
  nationality: { type: String },
  image: { type: String },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
}, { timestamps: true });

// 5. Innings
const InningsSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsNumber: { type: Number, required: true },
  battingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 }, // Represented as 1.5, 2.0 etc.
  balls: { type: Number, default: 0 }, // Total legal balls
  extras: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  byes: { type: Number, default: 0 },
  legByes: { type: Number, default: 0 },
  currentRunRate: { type: Number, default: 0 },
  requiredRunRate: { type: Number, default: 0 },
  projectedScore: { type: Number, default: 0 },
  partnerships: [{ type: Schema.Types.ObjectId, ref: 'Partnership' }],
  fallOfWickets: [{ type: Schema.Types.ObjectId, ref: 'FallOfWicket' }],
  powerplayData: [{ type: Schema.Types.ObjectId, ref: 'Powerplay' }],
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

// 6. Batsmen
const BatsmanSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  name: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  dots: { type: Number, default: 0 },
  isStriker: { type: Boolean, default: false },
  isOut: { type: Boolean, default: false },
  dismissalType: { type: String, enum: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'retired_hurt', 'obstructing_field', 'timed_out', null] },
  dismissedBy: { type: Schema.Types.ObjectId, ref: 'Player' },
  wicketBall: { type: Schema.Types.ObjectId, ref: 'Delivery' },
}, { timestamps: true });

// 7. Bowlers
const BowlerSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  name: { type: String, required: true },
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  economy: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  dots: { type: Number, default: 0 },
  currentOver: [{ type: String }],
  isCurrentBowler: { type: Boolean, default: false },
}, { timestamps: true });

// 8. Deliveries (MOST IMPORTANT)
const DeliverySchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  over: { type: Number, required: true },
  ball: { type: Number, required: true },
  legalBall: { type: Boolean, default: true },
  striker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, required: true, default: 0 },
  batsmanRuns: { type: Number, required: true, default: 0 },
  extras: { type: Number, required: true, default: 0 },
  extraType: { type: String, enum: ['none', 'wide', 'noball', 'bye', 'legbye'], default: 'none' },
  totalRuns: { type: Number, required: true, default: 0 },
  wicket: { type: Boolean, default: false },
  dismissalType: { type: String },
  dismissedPlayer: { type: Schema.Types.ObjectId, ref: 'Player' },
  freeHit: { type: Boolean, default: false },
  powerplay: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});
// Optimizations for Deliveries
DeliverySchema.index({ matchId: 1, inningsId: 1, over: 1, ball: 1 });
DeliverySchema.index({ bowler: 1, matchId: 1 });
DeliverySchema.index({ striker: 1, matchId: 1 });

// 9. Partnerships
const PartnershipSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  batsman1: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  batsman2: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  startScore: { type: Number, required: true },
  endScore: { type: Number },
  status: { type: String, enum: ['active', 'broken'], default: 'active' },
}, { timestamps: true });

// 10. FallOfWickets
const FallOfWicketSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  wicketNumber: { type: Number, required: true },
  score: { type: Number, required: true },
  batsman: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  over: { type: Number, required: true },
  bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  dismissalType: { type: String, required: true },
});

// 11. Powerplays
const PowerplaySchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  phase: { type: String, required: true }, // e.g., 'P1', 'P2', 'P3'
  startOver: { type: Number, required: true },
  endOver: { type: Number, required: true },
  restrictions: { type: String },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
});

// 12. Overlays
const OverlaySchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
  theme: { type: String, default: 'neon' },
  stripStyle: { type: String, default: 'modern' },
  primaryColor: { type: String, default: '#1d4ed8' },
  secondaryColor: { type: String, default: '#581c87' },
  glowColor: { type: String, default: '#c084fc' },
  sponsor: { type: String },
  animationSpeed: { type: Number, default: 1 },
  currentGraphic: { type: String, default: 'none' }, // 'scorebug', 'wagon_wheel', 'partnership'
  liveIndicator: { type: Boolean, default: true },
  overlayMode: { type: String, default: 'broadcast' },
  lastEvent: { type: String },
}, { timestamps: true });

// 13. Events
const EventSchema = new Schema({
  eventType: { type: String, required: true }, // 'FOUR', 'SIX', 'WICKET', 'POWERPLAY', etc.
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings' },
  title: { type: String, required: true },
  description: { type: String },
  animation: { type: String },
  soundEffect: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  timestamp: { type: Date, default: Date.now },
});

// 14. Commentary
const CommentarySchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  over: { type: Number },
  ball: { type: Number },
  text: { type: String, required: true },
  eventType: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// 15. ScoreSnapshots
const ScoreSnapshotSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  score: { type: Number, required: true },
  wickets: { type: Number, required: true },
  overs: { type: Number, required: true },
  striker: { type: Schema.Types.ObjectId, ref: 'Player' },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player' },
  bowler: { type: Schema.Types.ObjectId, ref: 'Player' },
  timestamp: { type: Date, default: Date.now },
});

// 16. Admins
const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Should be hashed
  role: { type: String, enum: ['scorer', 'producer', 'overlay_operator', 'admin'], required: true },
  permissions: [{ type: String }],
  lastLogin: { type: Date },
  activeMatch: { type: Schema.Types.ObjectId, ref: 'Match' },
}, { timestamps: true });

// Models
export const Tournament = mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', TournamentSchema);
export const Match = mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
export const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
export const Player = mongoose.models.Player || mongoose.model('Player', PlayerSchema);
export const Innings = mongoose.models.Innings || mongoose.model('Innings', InningsSchema);
export const Batsman = mongoose.models.Batsman || mongoose.model('Batsman', BatsmanSchema);
export const Bowler = mongoose.models.Bowler || mongoose.model('Bowler', BowlerSchema);
export const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
export const Partnership = mongoose.models.Partnership || mongoose.model('Partnership', PartnershipSchema);
export const FallOfWicket = mongoose.models.FallOfWicket || mongoose.model('FallOfWicket', FallOfWicketSchema);
export const Powerplay = mongoose.models.Powerplay || mongoose.model('Powerplay', PowerplaySchema);
export const Overlay = mongoose.models.Overlay || mongoose.model('Overlay', OverlaySchema);
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
export const Commentary = mongoose.models.Commentary || mongoose.model('Commentary', CommentarySchema);
export const ScoreSnapshot = mongoose.models.ScoreSnapshot || mongoose.model('ScoreSnapshot', ScoreSnapshotSchema);
export const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
