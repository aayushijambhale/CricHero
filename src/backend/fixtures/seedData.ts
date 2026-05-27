import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectMongoose } from '../../db';
import { 
  Tournament, Match, Team, Player, Innings, Delivery, Batsman, Bowler 
} from '../../models';

dotenv.config();

async function seedDatabase() {
  try {
    await connectMongoose();
    console.log("Connected to MongoDB for Seeding...");

    // Clear existing
    await Promise.all([
      Tournament.deleteMany({}),
      Match.deleteMany({}),
      Team.deleteMany({}),
      Player.deleteMany({}),
      Innings.deleteMany({}),
      Delivery.deleteMany({}),
      Batsman.deleteMany({}),
      Bowler.deleteMany({})
    ]);

    // 1. Create Tournament
    const tournament = await Tournament.create({
      name: "ICC World Cup 2026",
      season: "2026",
      format: "ODI",
      startDate: new Date(),
      status: "ongoing"
    });

    // 2. Create Teams
    const india = await Team.create({
      teamName: "India",
      shortName: "IND",
      primaryColor: "#1d4ed8",
      secondaryColor: "#1e3a8a"
    });

    const australia = await Team.create({
      teamName: "Australia",
      shortName: "AUS",
      primaryColor: "#eab308",
      secondaryColor: "#ca8a04"
    });

    // 3. Create Players
    const virat = await Player.create({
      playerName: "Virat Kohli",
      shortName: "V. Kohli",
      jerseyNumber: 18,
      role: "batsman",
      teamId: india._id
    });

    const bumrah = await Player.create({
      playerName: "Jasprit Bumrah",
      shortName: "J. Bumrah",
      jerseyNumber: 93,
      role: "bowler",
      teamId: india._id
    });

    const starc = await Player.create({
      playerName: "Mitchell Starc",
      shortName: "M. Starc",
      jerseyNumber: 56,
      role: "bowler",
      teamId: australia._id
    });

    // 4. Create Match
    const match = await Match.create({
      tournamentId: tournament._id,
      matchType: "Final",
      venue: "Narendra Modi Stadium",
      date: new Date(),
      tossWinner: india._id,
      tossDecision: "bat",
      battingTeam: india._id,
      bowlingTeam: australia._id,
      status: "live"
    });

    // 5. Create Innings
    const innings1 = await Innings.create({
      matchId: match._id,
      inningsNumber: 1,
      battingTeam: india._id,
      bowlingTeam: australia._id
    });

    // 6. Create Delivery (Sample Ball)
    await Delivery.create({
      matchId: match._id,
      inningsId: innings1._id,
      over: 0,
      ball: 1,
      striker: virat._id,
      nonStriker: bumrah._id, // Just for sample
      bowler: starc._id,
      runs: 4,
      batsmanRuns: 4,
      totalRuns: 4
    });

    console.log("✅ Successfully seeded professional ICC database architecture!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedDatabase();
