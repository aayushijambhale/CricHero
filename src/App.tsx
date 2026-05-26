/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { MatchState, ScreenType } from "./types";
import LauncherScreen from "./components/LauncherScreen";
import ControllerPanel from "./components/ControllerPanel";
import BroadcastOverlay from "./components/BroadcastOverlay";

// Beautiful production default baseline in case fetching is delayed
const defaultInitialState: MatchState = {
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

export default function App() {
  const [screen, setScreen] = useState<ScreenType>("launcher");
  const [initialData, setInitialData] = useState<MatchState>(defaultInitialState);
  const [loading, setLoading] = useState(true);

  // Parse path on initial setup
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/controller") {
      setScreen("controller");
    } else if (path === "/overlay") {
      setScreen("overlay");
    } else {
      setScreen("launcher");
    }

    async function fetchFreshState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          setInitialData(data);
        }
      } catch (err) {
        console.warn("Could not retrieve initial match state from backend. Using built-in default.", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFreshState();
  }, []);

  // Sync navigation bar address dynamically
  function handleNavigate(targetScreen: ScreenType) {
    setScreen(targetScreen);
    const targetUrl = targetScreen === "launcher" ? "/" : `/${targetScreen}`;
    window.history.pushState(null, "", targetUrl);
  }

  // Handle browser navigation back/forward actions
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;
      if (path === "/controller") {
        setScreen("controller");
      } else if (path === "/overlay") {
        setScreen("overlay");
      } else {
        setScreen("launcher");
      }
    }
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0c] flex flex-col justify-center items-center text-white gap-4 font-sans select-none">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">CRI-HD DIGITAL SYSTEM</h2>
          <p className="text-xs text-slate-500 font-medium">Booting transmission modules and WebGL overlays...</p>
        </div>
      </div>
    );
  }

  // Dynamic router render
  switch (screen) {
    case "controller":
      return <ControllerPanel initialState={initialData} />;
    case "overlay":
      return <BroadcastOverlay initialState={initialData} />;
    case "launcher":
    default:
      return (
        <LauncherScreen 
          initialState={initialData} 
          onNavigate={handleNavigate} 
        />
      );
  }
}
