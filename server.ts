// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CricHero Broadcast Production Server
 * Express + SSE real-time cricket broadcast engine
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { StateManager } from "./src/backend/engines/StateManager";
import { MatchState, createDefaultMatchState } from "./src/types";
import { Tournament, Match, Team, Player } from "./src/models";
import mongoose from "mongoose";
import { connectToDatabase, connectMongoose } from "./src/db";
import {
  createTournament,
  listTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  completeTournament,
  saveSnapshot,
  getPlayerStatsByTournament,
  getCareerStats,
} from "./src/services/tournamentService";
import { SocketManager } from "./src/backend/socket/SocketManager";
import http from 'http';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// ────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ────────────────────────────────────────────────────────

// Initialize with production demo data using StateManager
const stateManager = new StateManager(createDemoState());

function createDemoState(): MatchState {
  const base = createDefaultMatchState();
  return {
    ...base,
    config: {
      ...base.config,
      team1: "FALAK XI DARAVE",
      team2: "NASIR XI POLADPUR",
      totalOvers: 6,
      tossWinner: "NASIR XI POLADPUR",
      tossDecision: "bowl",
      format: "custom",
      team1Color: "#1d4ed8",
      team2Color: "#dc2626",
      team1ShortName: "FLK",
      team2ShortName: "NSR",
      powerplayOvers: 6,
      maxWickets: 10,
    },
    runs: 54,
    wickets: 6,
    balls: 31,
    currentInnings: 2,
    target: 58,
    batsman1: {
      name: "SACHIN N",
      runs: 12,
      balls: 9,
      isStriker: false,
      fours: 1,
      sixes: 0,
      strikeRate: 133.33,
      dotBalls: 3,
    },
    batsman2: {
      name: "AMIT PATIL",
      runs: 24,
      balls: 15,
      isStriker: true,
      fours: 3,
      sixes: 1,
      strikeRate: 160.00,
      dotBalls: 4,
    },
    bowler: {
      name: "JAGAT S",
      runs: 9,
      wickets: 2,
      balls: 4,
      maidens: 0,
      economy: 13.5,
      dots: 1,
      wides: 0,
      noBalls: 0,
    },
    thisOver: ["2", "6", "•", "1"],
    partnershipRuns: 36,
    partnershipBalls: 24,
    lastWicket: {
      name: "GOURAV",
      runs: 10,
      balls: 5,
      scoreAtWicket: "18-5",
    },
    powerplay: true,
    superOver: false,
    freeHit: false,
    eventTrigger: {
      type: "config",
      timestamp: Date.now(),
    },
    matchPhase: "chase",
    pressureState: { level: "high", score: 0.65, description: "Need 4 from 5 balls" },
    momentumState: {
      direction: "neutral",
      intensity: 0,
      consecutiveBoundaries: 0,
      consecutiveDots: 0,
      recentWickets: 2,
      scoringAcceleration: 0,
    },
    ballHistory: [],
    fallOfWickets: [],
    partnerships: [],
    bowlerHistory: [],
    batsmanHistory: [],
    firstInningsSummary: null,
    extras: { wides: 2, noBalls: 1, byes: 0, legByes: 0, total: 3 },
    currentRunRate: 10.45,
    requiredRunRate: 4.8,
    projectedScore: 63,
    runsNeeded: 4,
    ballsRemaining: 5,
    winProbability: { battingTeam: 72, bowlingTeam: 28 },
    activeProductionPanel: null,
    primaryColor: "#1d4ed8",
    secondaryColor: "#581c87",
    glowColor: "#c084fc",
    accentTextColor: "#fbbf24",
    panelBgColor: "#0a0a0c",
    infoPanelTheme: "projected",
  recentBalls: [],
    secondInningsLayout: "combined",
    celebrationTheme: "neon",
    maxSixText: "★★ MAX SIX ★★",
    fourBoundaryText: "★ BOUNDARY FOUR ★",
    overlayVisible: true,
    scoreStripVisible: true,
  };
}

// SSE Removed in favor of Socket.IO
// Broadcast utility for backward compatibility across endpoints
function broadcastState() {
  import("./src/backend/events/EventBus").then(({ eventBus }) => {
    eventBus.emit("ANY_EVENT", {
      type: "update",
      payload: stateManager.getState()
    });
  });
}

// ────────────────────────────────────────────────────────
// API ENDPOINTS
// ────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    undoDepth: stateManager.getUndoDepth(),
  });
});

// ────────────────────────────────────────────────────────
// TOURNAMENT & MATCH MANAGEMENT API
// ────────────────────────────────────────────────────────

app.get("/api/tournaments", async (_req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tournaments", async (req, res) => {
  try {
    const t = new Tournament({ ...req.body, status: "ongoing" });
    await t.save();
    res.json(t);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const filter = tournamentId ? { tournamentId } : {};
    const matches = await Match.find(filter).populate("battingTeam bowlingTeam").sort({ createdAt: -1 });
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/matches", async (req, res) => {
  try {
    const m = new Match({ ...req.body, status: "live" });
    await m.save();
    res.json(m);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/match-state/load/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    let newState: MatchState;
    if (match.matchStateSnapshot) {
      newState = match.matchStateSnapshot as unknown as MatchState;
    } else {
      newState = createDefaultMatchState();
      newState.matchId = matchId; // Assuming matchId exists in MatchState, or we just track it globally
      match.matchStateSnapshot = newState as any;
      await match.save();
    }
    
    // Inject matchId into state just to keep track
    newState.config = { ...newState.config, matchId };

    stateManager.replaceState(newState);
    broadcastState();
    res.json({ success: true, state: stateManager.getState() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get active state
app.get("/api/match-state", (_req, res) => {
  res.json(stateManager.getState());
});

// Update state via Config merge (used for settings updates)
app.post("/api/match-state", async (req, res) => {
  const updatedState = req.body;
  if (updatedState) {
    stateManager.updateConfig(updatedState);
    broadcastState();
    
    // Auto-save snapshot to DB if matchId is set
    const state = stateManager.getState();
    const matchId = (state.config as any).matchId;
    if (matchId) {
      await Match.findByIdAndUpdate(matchId, { matchStateSnapshot: state });
    }

    return res.json({ success: true, state });
  }

  return res.status(400).json({ error: "Invalid state update" });
});

// Process delivery string or object via MatchEngine
app.post("/api/match-state/delivery", async (req, res) => {
  try {
    const result = stateManager.processDelivery(req.body.delivery);
    broadcastState();

    // Auto-save snapshot
    const state = stateManager.getState();
    const matchId = (state.config as any).matchId;
    if (matchId) {
      await Match.findByIdAndUpdate(matchId, { matchStateSnapshot: state });
    }

    return res.json({ success: true, state, result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Undo last action
app.post("/api/match-state/undo", (_req, res) => {
  if (!stateManager.canUndo()) {
    return res.status(400).json({ error: "Nothing to undo" });
  }

  stateManager.undo();
  broadcastState();

  return res.json({ success: true, state: stateManager.getState(), undoDepth: stateManager.getUndoDepth() });
});

// ────────────────────────────────────────────────────────
// STANDALONE ENGINE ACTIONS
// ────────────────────────────────────────────────────────

app.post("/api/match-state/action/change-bowler", (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: "Bowler name required" });
  stateManager.changeBowler(req.body.name);
  broadcastState();
  return res.json({ success: true, state: stateManager.getState() });
});

app.post("/api/match-state/action/rotate-strike", (_req, res) => {
  stateManager.rotateStrike();
  broadcastState();
  return res.json({ success: true, state: stateManager.getState() });
});

app.post("/api/match-state/action/switch-innings", (_req, res) => {
  stateManager.switchInnings();
  broadcastState();
  return res.json({ success: true, state: stateManager.getState() });
});

app.post("/api/match-state/action/retire-batsman", (req, res) => {
  const { which, name, isHurt } = req.body;
  if (!which || !name) return res.status(400).json({ error: "Missing required fields" });
  stateManager.retireBatsman(which, name, isHurt || false);
  broadcastState();
  return res.json({ success: true, state: stateManager.getState() });
});

// Get ball-by-ball history
app.get("/api/match-state/history", (_req, res) => {
  const s = stateManager.getState();
  res.json({
    ballHistory: s.ballHistory,
    fallOfWickets: s.fallOfWickets,
    bowlerHistory: s.bowlerHistory,
    batsmanHistory: s.batsmanHistory,
  });
});

// Reset to new match (auto-saves current match to Atlas if it has runs)
app.post("/api/match-state/reset", async (_req, res) => {
  const stateBeforeReset = stateManager.getState();
  const base = createDefaultMatchState();
  const currentConfig = stateBeforeReset.config;

  const newState: MatchState = {
    ...base,
    config: {
      ...base.config,
      team1: currentConfig.team1,
      team2: currentConfig.team2,
      totalOvers: currentConfig.totalOvers,
      tossWinner: currentConfig.tossWinner,
      tossDecision: currentConfig.tossDecision,
      format: currentConfig.format,
      team1Color: currentConfig.team1Color,
      team2Color: currentConfig.team2Color,
      team1ShortName: currentConfig.team1ShortName,
      team2ShortName: currentConfig.team2ShortName,
      powerplayOvers: currentConfig.powerplayOvers,
      maxWickets: currentConfig.maxWickets,
    },
    primaryColor: stateBeforeReset.primaryColor,
    secondaryColor: stateBeforeReset.secondaryColor,
    glowColor: stateBeforeReset.glowColor,
    accentTextColor: stateBeforeReset.accentTextColor,
    panelBgColor: stateBeforeReset.panelBgColor,
    celebrationTheme: stateBeforeReset.celebrationTheme,
    maxSixText: stateBeforeReset.maxSixText,
    fourBoundaryText: stateBeforeReset.fourBoundaryText,
    eventTrigger: { type: "reset", timestamp: Date.now() },
  };

  stateManager.reset(newState);
  broadcastState();

  // Auto-save previous match to Atlas if it had any runs
  if (stateBeforeReset.runs > 0 || stateBeforeReset.wickets > 0) {
    try {
      const { createTournament: ct, completeTournament: complete } = await import("./src/services/tournamentService");
      const matchName = `${stateBeforeReset.config.team1} vs ${stateBeforeReset.config.team2} — ${new Date().toLocaleDateString("en-IN")}`;
      const newTournament = await ct({
        name: matchName,
        team1: stateBeforeReset.config.team1,
        team2: stateBeforeReset.config.team2,
        team1ShortName: stateBeforeReset.config.team1ShortName,
        team2ShortName: stateBeforeReset.config.team2ShortName,
        team1Color: stateBeforeReset.config.team1Color,
        team2Color: stateBeforeReset.config.team2Color,
        totalOvers: stateBeforeReset.config.totalOvers,
        format: stateBeforeReset.config.format as any,
        tossWinner: stateBeforeReset.config.tossWinner,
        tossDecision: stateBeforeReset.config.tossDecision,
        powerplayOvers: stateBeforeReset.config.powerplayOvers,
        maxWickets: stateBeforeReset.config.maxWickets,
      });
      await complete(newTournament._id!.toString(), stateBeforeReset);
      console.log(`[CricHero] Auto-saved match "${matchName}" to Atlas (id: ${newTournament._id})`);
    } catch (err) {
      console.warn("[CricHero] Auto-save to Atlas failed (non-critical):", err);
    }
  }

  return res.json({ success: true, state: stateManager.getState() });
});


// ────────────────────────────────────────────────────────
// TOURNAMENT & PLAYER STATS — DATABASE ROUTES
// ────────────────────────────────────────────────────────

/** POST /api/tournaments — Create a new tournament */
app.post("/api/tournaments", async (req, res) => {
  try {
    const tournament = await createTournament(req.body);
    res.status(201).json(tournament);
  } catch (error) {
    console.error("[Tournament] Create failed:", error);
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

/** GET /api/tournaments — List all tournaments */
app.get("/api/tournaments", async (req, res) => {
  try {
    const page = parseInt(String(req.query.page ?? "1"));
    const limit = parseInt(String(req.query.limit ?? "20"));
    const status = req.query.status as string | undefined;
    const result = await listTournaments(page, limit, status);
    res.json(result);
  } catch (error) {
    console.error("[Tournament] List failed:", error);
    res.status(500).json({ error: "Failed to list tournaments" });
  }
});

/** GET /api/tournaments/:id — Get a single tournament */
app.get("/api/tournaments/:id", async (req, res) => {
  try {
    const tournament = await getTournamentById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    // Optionally load the snapshot as active match state
    if (req.query.load === "true" && tournament.matchStateSnapshot) {
      stateManager.replaceState(tournament.matchStateSnapshot as unknown as MatchState);
      broadcastState();
    }

    return res.json(tournament);
  } catch (error) {
    console.error("[Tournament] Get failed:", error);
    return res.status(500).json({ error: "Failed to get tournament" });
  }
});

/** PUT /api/tournaments/:id — Update tournament fields */
app.put("/api/tournaments/:id", async (req, res) => {
  try {
    const updated = await updateTournament(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Tournament not found" });
    return res.json(updated);
  } catch (error) {
    console.error("[Tournament] Update failed:", error);
    return res.status(500).json({ error: "Failed to update tournament" });
  }
});

/** DELETE /api/tournaments/:id — Delete tournament + stats */
app.delete("/api/tournaments/:id", async (req, res) => {
  try {
    const ok = await deleteTournament(req.params.id);
    if (!ok) return res.status(404).json({ error: "Tournament not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("[Tournament] Delete failed:", error);
    return res.status(500).json({ error: "Failed to delete tournament" });
  }
});

/** POST /api/tournaments/:id/complete — Mark complete + save player stats */
app.post("/api/tournaments/:id/complete", async (req, res) => {
  try {
    const result = await completeTournament(req.params.id, stateManager.getState());
    if (!result) return res.status(404).json({ error: "Tournament not found" });
    return res.json(result);
  } catch (error) {
    console.error("[Tournament] Complete failed:", error);
    return res.status(500).json({ error: "Failed to complete tournament" });
  }
});

/** POST /api/tournaments/:id/save-snapshot — Manual live save */
app.post("/api/tournaments/:id/save-snapshot", async (req, res) => {
  try {
    const snapshot = await saveSnapshot(req.params.id, stateManager.getState());
    if (!snapshot) return res.status(404).json({ error: "Tournament not found" });
    return res.json({ success: true, tournament: snapshot });
  } catch (error) {
    console.error("[Tournament] Snapshot save failed:", error);
    return res.status(500).json({ error: "Failed to save snapshot" });
  }
});

/** GET /api/tournaments/:id/players — Player stats for a tournament */
app.get("/api/tournaments/:id/players", async (req, res) => {
  try {
    const stats = await getPlayerStatsByTournament(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error("[PlayerStats] Get failed:", error);
    res.status(500).json({ error: "Failed to get player stats" });
  }
});

/** GET /api/players/stats — Career aggregate stats */
app.get("/api/players/stats", async (req, res) => {
  try {
    const playerName = req.query.name as string | undefined;
    const stats = await getCareerStats(playerName);
    res.json(stats);
  } catch (error) {
    console.error("[PlayerStats] Career stats failed:", error);
    res.status(500).json({ error: "Failed to get career stats" });
  }
});

// ────────────────────────────────────────────────────────
// SOCKET INITIATION HAPPENS IN START()
// ────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────
// SERVER STARTUP
// ────────────────────────────────────────────────────────

async function start() {
  // Connect Mongoose (schema-based models)
  try {
    await connectMongoose();
  } catch (err) {
    console.warn("[CricHero] MongoDB Atlas connection failed — DB features unavailable", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = http.createServer(app);
  new SocketManager(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[CricHero] Broadcast Production Server started with Socket.IO`);
    console.log(`[CricHero] Live on http://localhost:${PORT}`);
    console.log(`[CricHero] Controller: http://localhost:${PORT}/controller`);
    console.log(`[CricHero] Overlay: http://localhost:${PORT}/overlay`);
  });
}

start().catch((err) => {
  console.error("Failed to start CricHero broadcast server", err);
});
