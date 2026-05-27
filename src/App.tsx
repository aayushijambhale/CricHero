import { useState, useEffect } from "react";
import { MatchState, ScreenType, createDefaultMatchState } from "./types";
import TournamentDashboard from "./components/TournamentDashboard";
import UnifiedController from "./components/UnifiedController";
import BroadcastOverlay from "./components/BroadcastOverlay";

const defaultInitialState: MatchState = createDefaultMatchState();
defaultInitialState.config.team1 = "FALAK XI DARAVE";
defaultInitialState.config.team2 = "NASIR XI POLADPUR";
defaultInitialState.config.tossWinner = "NASIR XI POLADPUR";
defaultInitialState.config.tossDecision = "bowl";
defaultInitialState.config.format = "custom";
defaultInitialState.config.team1ShortName = "FLK";
defaultInitialState.config.team2ShortName = "NSR";
defaultInitialState.config.team1Color = "#1d4ed8";
defaultInitialState.config.team2Color = "#dc2626";
defaultInitialState.primaryColor = "#1d4ed8";
defaultInitialState.secondaryColor = "#dc2626";
defaultInitialState.runs = 54;
defaultInitialState.wickets = 6;
defaultInitialState.balls = 31;
defaultInitialState.currentInnings = 2;
defaultInitialState.target = 58;
defaultInitialState.batsman1 = {
  ...defaultInitialState.batsman1,
  name: "SACHIN N", runs: 12, balls: 9, isStriker: false, fours: 1, strikeRate: 133.33, dotBalls: 3
};
defaultInitialState.batsman2 = {
  ...defaultInitialState.batsman2,
  name: "AMIT PATIL", runs: 24, balls: 15, isStriker: true, fours: 3, sixes: 1, strikeRate: 160.00, dotBalls: 4
};
defaultInitialState.bowler = {
  ...defaultInitialState.bowler,
  name: "JAGAT S", runs: 9, wickets: 2, balls: 4, economy: 13.5, dots: 1
};
defaultInitialState.thisOver = ["2", "6", "•", "1"];
defaultInitialState.partnershipRuns = 36;
defaultInitialState.partnershipBalls = 24;
defaultInitialState.lastWicket = {
  name: "GOURAV", runs: 10, balls: 5, scoreAtWicket: "18-5"
};
defaultInitialState.matchPhase = "chase";
defaultInitialState.pressureState = {
  level: "high", score: 0.65, description: "Need 4 runs off 5 balls"
};
defaultInitialState.runsNeeded = 4;
defaultInitialState.ballsRemaining = 5;

export default function App() {
  const [screen, setScreen] = useState<ScreenType>("launcher");
  const [initialData, setInitialData] = useState<MatchState>(defaultInitialState);
  const [loading, setLoading] = useState(true);

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
          data.config = data.config || {};
          data.config.team1Color = data.config.team1Color || "#1d4ed8";
          data.config.team2Color = data.config.team2Color || "#dc2626";
          data.primaryColor = data.primaryColor || data.config.team1Color;
          data.secondaryColor = data.secondaryColor || data.config.team2Color;
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

  function handleNavigate(targetScreen: ScreenType) {
    setScreen(targetScreen);
    const targetUrl = targetScreen === "launcher" ? "/" : `/${targetScreen}`;
    window.history.pushState(null, "", targetUrl);
  }

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
      <div className="w-full min-h-screen bg-[#020617] flex flex-col justify-center items-center text-white gap-4 font-sans select-none">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">CRICSHOW DIGITAL SYSTEM</h2>
          <p className="text-xs text-slate-500 font-medium">Booting transmission modules...</p>
        </div>
      </div>
    );
  }

  switch (screen) {
    case "controller":
      return <UnifiedController initialState={initialData} onNavigate={handleNavigate} />;
    case "overlay":
      return <BroadcastOverlay initialState={initialData} />;
    case "launcher":
    default:
      return (
        <TournamentDashboard onNavigate={handleNavigate} />
      );
  }
}
