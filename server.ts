/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MatchState } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize state with real-world production-quality placeholder data
let currentMatchState: MatchState = {
  config: {
    team1: "FALAK XI DARAVE",
    team2: "NASIR XI POLADPUR",
    totalOvers: 6,
    tossWinner: "NASIR XI POLADPUR",
    tossDecision: "bowl",
  },
  runs: 54,
  wickets: 6,
  balls: 31, // 5.1 overs
  currentInnings: 2,
  target: 58,
  batsman1: {
    name: "SACHIN N",
    runs: 12,
    balls: 9,
    isStriker: false,
  },
  batsman2: {
    name: "AMIT PATIL",
    runs: 24,
    balls: 15,
    isStriker: true,
  },
  bowler: {
    name: "JAGAT S",
    runs: 9,
    wickets: 2,
    balls: 4, // 0.4 overs
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
  primaryColor: "#1d4ed8",
  secondaryColor: "#581c87",
  glowColor: "#c084fc",
  accentTextColor: "#fbbf24",
  firstInningsDisplay: "projected",
  secondInningsLayout: "combined",
  panelBgColor: "#0a0a0c",
  celebrationTheme: "neon",
  maxSixText: "★★ MAX SIX ★★",
  fourBoundaryText: "★ BOUNDARY FOUR ★",
};

// Store active SSE connections
let sseClients: any[] = [];

// API - Get active state
app.get("/api/match-state", (req, res) => {
  res.json(currentMatchState);
});

// API - Update state
app.post("/api/match-state", (req, res) => {
  const updatedState = req.body;
  if (updatedState) {
    currentMatchState = {
      ...currentMatchState,
      ...updatedState,
    };
    
    // Broadcast the update to all connected SSE clients
    const payload = JSON.stringify({
      event: "update",
      data: currentMatchState,
    });
    
    sseClients.forEach((client) => {
      client.write(`data: ${payload}\n\n`);
    });
    
    return res.json({ success: true, state: currentMatchState });
  }
  
  return res.status(400).json({ error: "Invalid state update" });
});

// API - Simple Reset to Default
app.post("/api/match-state/reset", (req, res) => {
  currentMatchState = {
    config: {
      team1: "FALAK XI DARAVE",
      team2: "NASIR XI POLADPUR",
      totalOvers: 6,
      tossWinner: "NASIR XI POLADPUR",
      tossDecision: "bowl",
    },
    runs: 0,
    wickets: 0,
    balls: 0,
    currentInnings: 1,
    target: null,
    batsman1: {
      name: "BATSMAN 1",
      runs: 0,
      balls: 0,
      isStriker: true,
    },
    batsman2: {
      name: "BATSMAN 2",
      runs: 0,
      balls: 0,
      isStriker: false,
    },
    bowler: {
      name: "BOWLER",
      runs: 0,
      wickets: 0,
      balls: 0,
    },
    thisOver: [],
    partnershipRuns: 0,
    partnershipBalls: 0,
    lastWicket: null,
    powerplay: false,
    superOver: false,
    freeHit: false,
    eventTrigger: {
      type: "reset",
      timestamp: Date.now(),
    },
    primaryColor: "#1d4ed8",
    secondaryColor: "#581c87",
    glowColor: "#c084fc",
    accentTextColor: "#fbbf24",
    firstInningsDisplay: "projected",
    secondInningsLayout: "combined",
    panelBgColor: "#0a0a0c",
    celebrationTheme: "neon",
    maxSixText: "★★ MAX SIX ★★",
    fourBoundaryText: "★ BOUNDARY FOUR ★",
  };

  const payload = JSON.stringify({
    event: "update",
    data: currentMatchState,
  });
  
  sseClients.forEach((client) => {
    client.write(`data: ${payload}\n\n`);
  });

  return res.json({ success: true, state: currentMatchState });
});

// Real-time Event Stream (SSE)
app.get("/api/events", (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  // Send current state on connection
  const initialPayload = JSON.stringify({
    event: "initial",
    data: currentMatchState,
  });
  res.write(`data: ${initialPayload}\n\n`);
  
  // Register client
  sseClients.push(res);
  
  // Remove client on disconnect
  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

async function start() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    // Configure Vite to run in middlewareMode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Pass Vite requests through
    app.use(vite.middlewares);
  } else {
    // Serve static frontend files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Cricket Full-Stack Engine booting dynamically...`);
    console.log(`[Server] Live on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start cricket server", err);
});
