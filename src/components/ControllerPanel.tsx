/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MatchState, Batsman, Bowler, BallType, WicketType, ProductionPanel } from "../types";
import { 
  Users, ArrowLeftRight, RotateCcw, Play, Settings, RefreshCw, 
  Layers, Radio, TrendingUp, Sparkles, Sliders, History, Tv, Check, X,
  Activity, Star, Percent, BookOpen, UserPlus, Info
} from "lucide-react";

interface ControllerPanelProps {
  initialState: MatchState;
}

type TabType = "match" | "players" | "graphics" | "replay" | "aesthetics" | "settings";

export default function ControllerPanel({ initialState }: ControllerPanelProps) {
  const [state, setState] = useState<MatchState>(initialState);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("match");
  const [tournamentId, setTournamentId] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // Local input states for setup & substitutions
  const [team1, setTeam1] = useState(state.config.team1);
  const [team2, setTeam2] = useState(state.config.team2);
  const [totalOvers, setTotalOvers] = useState(state.config.totalOvers);
  const [tossWinner, setTossWinner] = useState(state.config.tossWinner);
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">(state.config.tossDecision);
  const [currentInnings, setCurrentInnings] = useState<1 | 2>(state.currentInnings);
  const [targetVal, setTargetVal] = useState(state.target || "");
  const [format, setFormat] = useState(state.config.format || "t20");
  const [team1Short, setTeam1Short] = useState(state.config.team1ShortName || "TMA");
  const [team2Short, setTeam2Short] = useState(state.config.team2ShortName || "TMB");
  
  // Batsman/Bowler setup inputs
  const [b1Name, setB1Name] = useState(state.batsman1.name);
  const [b2Name, setB2Name] = useState(state.batsman2.name);
  const [bowlerName, setBowlerName] = useState(state.bowler.name);

  // Dynamic Aesthetics Customizer panel states
  const [primaryColor, setPrimaryColor] = useState(state.primaryColor || "#1d4ed8");
  const [secondaryColor, setSecondaryColor] = useState(state.secondaryColor || "#581c87");
  const [glowColor, setGlowColor] = useState(state.glowColor || "#c084fc");
  const [accentTextColor, setAccentTextColor] = useState(state.accentTextColor || "#fbbf24");

  // Dynamic Panel Selection Settings panel states
  const [infoPanelTheme, setInfoPanelTheme] = useState(state.infoPanelTheme || "projected");
  const [secondInningsLayout, setSecondInningsLayout] = useState(state.secondInningsLayout || "combined");

  // Substitution / Next Player modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [nextBatsmanName, setNextBatsmanName] = useState("");
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [nextBowlerName, setNextBowlerName] = useState("");

  // Wicket details
  const [wicketDismissal, setWicketDismissal] = useState<WicketType>("bowled");
  const [wicketOutOfWho, setWicketOutOfWho] = useState<"striker" | "non-striker">("striker");

  // Operator board aesthetics
  const [panelBgColor, setPanelBgColor] = useState(state.panelBgColor || "#0a0a0c");
  const [celebrationTheme, setCelebrationTheme] = useState<"neon" | "metallic" | "cyber" | "epic">(state.celebrationTheme || "neon");
  const [maxSixText, setMaxSixText] = useState(state.maxSixText || "★★ MAX SIX ★★");
  const [fourBoundaryText, setFourBoundaryText] = useState(state.fourBoundaryText || "★ BOUNDARY FOUR ★");

  // SSE Subscription setup for instant synchronization
  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/match-state");
        const data = await res.json();
        if (data) {
          setState(data);
          syncLocalInputs(data);
        }
      } catch (err) {
        console.error("Failed to fetch initial controller state", err);
      }
    }
    fetchState();

    const sse = new EventSource("/api/events");
    sse.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.event === "update" || parsed.event === "initial") {
          setState(parsed.data);
        }
      } catch (err) {
        console.error("Failed to parse SSE", err);
      }
    };
    return () => sse.close();
  }, []);

  function syncLocalInputs(s: MatchState) {
    setTeam1(s.config.team1);
    setTeam2(s.config.team2);
    setTotalOvers(s.config.totalOvers);
    setTossWinner(s.config.tossWinner);
    setTossDecision(s.config.tossDecision);
    setCurrentInnings(s.currentInnings);
    setTargetVal(s.target || "");
    setFormat(s.config.format || "t20");
    setTeam1Short(s.config.team1ShortName || "TMA");
    setTeam2Short(s.config.team2ShortName || "TMB");
    setB1Name(s.batsman1.name);
    setB2Name(s.batsman2.name);
    setBowlerName(s.bowler.name);
    setPrimaryColor(s.primaryColor || "#1d4ed8");
    setSecondaryColor(s.secondaryColor || "#581c87");
    setGlowColor(s.glowColor || "#c084fc");
    setAccentTextColor(s.accentTextColor || "#fbbf24");
    setInfoPanelTheme(s.infoPanelTheme || "projected");
    setSecondInningsLayout(s.secondInningsLayout || "combined");
    setPanelBgColor(s.panelBgColor || "#0a0a0c");
    setCelebrationTheme(s.celebrationTheme || "neon");
    setMaxSixText(s.maxSixText || "★★ MAX SIX ★★");
    setFourBoundaryText(s.fourBoundaryText || "★ BOUNDARY FOUR ★");
  }

  // Push updates to the server
  async function pushUpdate(updatedFields: Partial<MatchState>) {
    setLoading(true);
    const completeState = {
      ...state,
      ...updatedFields,
    };

    try {
      const res = await fetch("/api/match-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeState),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (err) {
      console.error("Failed to sync controller state", err);
    } finally {
      setLoading(false);
    }
  }

  // scoring events handling (server-integrated logic)
  async function addScoreAction(runs: number, ballType: BallType) {
    // 1. Prepare copy of batsman & bowler
    const b1 = { ...state.batsman1 };
    const b2 = { ...state.batsman2 };
    const bowlerObj = { ...state.bowler };
    
    const striker = b1.isStriker ? b1 : b2;
    const nonStriker = b1.isStriker ? b2 : b1;

    let updatedRuns = state.runs;
    let updatedBalls = state.balls;
    let updatedThisOver = [...state.thisOver];
    let updatedPartnershipRuns = state.partnershipRuns;
    let updatedPartnershipBalls = state.partnershipBalls;
    let updatedFreeHit = state.freeHit || false;

    let runsForBatsman = 0;
    let runsForBowler = 0;
    let extraRuns = 0;
    let isValidBall = true;
    let triggerType: "four" | "six" | "single" | "wicket" | "config" = "single";

    if (ballType === "wide") {
      isValidBall = false;
      extraRuns = 1 + runs;
      state.extras.wides += extraRuns;
      state.extras.total += extraRuns;
      runsForBowler = extraRuns;
      updatedThisOver.push(runs > 0 ? `${runs + 1}WD` : "WD");
    } else if (ballType === "noball") {
      isValidBall = false;
      extraRuns = 1;
      state.extras.noBalls += 1;
      state.extras.total += 1;
      runsForBatsman = runs;
      runsForBowler = 1 + runs;
      updatedThisOver.push(runs > 0 ? `${runs}NB` : "NB");
      updatedFreeHit = true;
    } else if (ballType === "bye") {
      extraRuns = runs;
      state.extras.byes += runs;
      state.extras.total += runs;
      updatedThisOver.push(runs > 0 ? `${runs}B` : "B");
    } else if (ballType === "legbye") {
      extraRuns = runs;
      state.extras.legByes += runs;
      state.extras.total += runs;
      updatedThisOver.push(runs > 0 ? `${runs}LB` : "LB");
    } else {
      runsForBatsman = runs;
      runsForBowler = runs;
      if (runs === 4) {
        updatedThisOver.push("4");
        triggerType = "four";
      } else if (runs === 6) {
        updatedThisOver.push("6");
        triggerType = "six";
      } else if (runs === 0) {
        updatedThisOver.push("•");
      } else {
        updatedThisOver.push(runs.toString());
      }
      if (updatedFreeHit) updatedFreeHit = false;
    }

    const totalRunsThisBall = runsForBatsman + extraRuns;
    updatedRuns += totalRunsThisBall;
    if (isValidBall) updatedBalls += 1;

    // Update striker
    striker.runs += runsForBatsman;
    striker.balls += isValidBall ? 1 : 0;
    if (runsForBatsman === 4) striker.fours += 1;
    if (runsForBatsman === 6) striker.sixes += 1;
    if (runsForBatsman === 0 && isValidBall) striker.dotBalls += 1;
    striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;

    // Update bowler
    bowlerObj.runs += runsForBowler;
    bowlerObj.balls += isValidBall ? 1 : 0;
    if (runsForBatsman === 0 && isValidBall) bowlerObj.dots += 1;
    if (ballType === "wide") bowlerObj.wides += extraRuns;
    if (ballType === "noball") bowlerObj.noBalls += 1;
    bowlerObj.economy = bowlerObj.balls > 0 ? (bowlerObj.runs / bowlerObj.balls) * 6 : 0;

    // Update partnership
    updatedPartnershipRuns += totalRunsThisBall;
    updatedPartnershipBalls += isValidBall ? 1 : 0;

    // Strike rotation on odd runs
    if (runs % 2 !== 0 && ballType !== "wide") {
      striker.isStriker = false;
      nonStriker.isStriker = true;
    }

    // Auto rotate strike on over completion
    const isOverComplete = isValidBall && updatedBalls % 6 === 0;
    if (isOverComplete) {
      b1.isStriker = !b1.isStriker;
      b2.isStriker = !b2.isStriker;
      setShowBowlerModal(true);
    }

    // Calculations
    const curRR = updatedBalls > 0 ? (updatedRuns / updatedBalls) * 6 : 0;
    const projScore = Math.round(curRR * state.config.totalOvers);

    let runsNeed = null;
    let ballsRemain = 120;
    let reqRR = null;

    if (state.currentInnings === 2 && state.target !== null) {
      runsNeed = Math.max(0, state.target - updatedRuns);
      ballsRemain = Math.max(0, (state.config.totalOvers * 6) - updatedBalls);
      reqRR = ballsRemain > 0 ? (runsNeed / ballsRemain) * 6 : null;
    }

    pushUpdate({
      runs: updatedRuns,
      balls: updatedBalls,
      batsman1: b1,
      batsman2: b2,
      bowler: bowlerObj,
      thisOver: updatedThisOver,
      partnershipRuns: updatedPartnershipRuns,
      partnershipBalls: updatedPartnershipBalls,
      freeHit: updatedFreeHit,
      currentRunRate: curRR,
      projectedScore: projScore,
      runsNeeded: runsNeed,
      ballsRemaining: ballsRemain,
      requiredRunRate: reqRR,
      eventTrigger: {
        type: triggerType,
        timestamp: Date.now(),
      },
    });
  }

  // manual strike swap
  function rotateStrikeManually() {
    pushUpdate({
      batsman1: { ...state.batsman1, isStriker: !state.batsman1.isStriker },
      batsman2: { ...state.batsman2, isStriker: !state.batsman2.isStriker },
    });
  }

  // Wicket handler
  function handleWicketEvent() {
    setNextBatsmanName("");
    setWicketDismissal("bowled");
    setWicketOutOfWho("striker");
    setShowWicketModal(true);
  }

  function confirmDetailedWicket() {
    if (!nextBatsmanName.trim()) {
      alert("Please specify incoming batsman name.");
      return;
    }

    const b1 = { ...state.batsman1 };
    const b2 = { ...state.batsman2 };
    const bowlerObj = { ...state.bowler };
    
    const striker = b1.isStriker ? b1 : b2;
    const nonStriker = b1.isStriker ? b2 : b1;

    const dismissedIsStriker = (wicketOutOfWho === "striker");
    const dismissedBatsmanObj = dismissedIsStriker ? striker : nonStriker;
    
    // Increment wickets
    const updatedWickets = state.wickets + 1;
    const updatedBalls = state.balls + 1;
    const updatedThisOver = [...state.thisOver, "W"];

    // Bowler wickets calculation
    if (["bowled", "caught", "lbw", "stumped", "hitwicket"].includes(wicketDismissal)) {
      bowlerObj.wickets += 1;
    }
    bowlerObj.balls += 1;
    bowlerObj.economy = bowlerObj.balls > 0 ? (bowlerObj.runs / bowlerObj.balls) * 6 : 0;

    // Save previous batsman to history list
    const prevBatsman = {
      name: dismissedBatsmanObj.name,
      runs: dismissedBatsmanObj.runs,
      balls: dismissedBatsmanObj.balls,
      fours: dismissedBatsmanObj.fours,
      sixes: dismissedBatsmanObj.sixes,
      strikeRate: dismissedBatsmanObj.strikeRate,
      isNotOut: false,
    };
    const updatedBatsmanHistory = [...state.batsmanHistory, prevBatsman];

    // Bring in new batsman at the correct strike end
    const newBat: Batsman = {
      name: nextBatsmanName.toUpperCase(),
      runs: 0,
      balls: 0,
      isStriker: dismissedIsStriker,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      dotBalls: 0,
    };

    if (dismissedIsStriker) {
      if (b1.isStriker) {
        b1.name = newBat.name;
        b1.runs = 0;
        b1.balls = 0;
        b1.fours = 0;
        b1.sixes = 0;
        b1.strikeRate = 0;
        b1.dotBalls = 0;
      } else {
        b2.name = newBat.name;
        b2.runs = 0;
        b2.balls = 0;
        b2.fours = 0;
        b2.sixes = 0;
        b2.strikeRate = 0;
        b2.dotBalls = 0;
      }
    } else {
      if (b1.isStriker) {
        b2.name = newBat.name;
        b2.runs = 0;
        b2.balls = 0;
        b2.fours = 0;
        b2.sixes = 0;
        b2.strikeRate = 0;
        b2.dotBalls = 0;
      } else {
        b1.name = newBat.name;
        b1.runs = 0;
        b1.balls = 0;
        b1.fours = 0;
        b1.sixes = 0;
        b1.strikeRate = 0;
        b1.dotBalls = 0;
      }
    }

    // Reset partnership
    state.partnerships.push({
      totalRuns: state.partnershipRuns,
      totalBalls: state.partnershipBalls,
      batsman1: b1.name,
      batsman1Runs: b1.runs,
      batsman1Balls: b1.balls,
      batsman2: b2.name,
      batsman2Runs: b2.runs,
      batsman2Balls: b2.balls,
    });

    const fow = {
      wicketNumber: updatedWickets,
      runs: state.runs,
      overs: `${Math.floor(updatedBalls / 6)}.${updatedBalls % 6}`,
      batsmanName: dismissedBatsmanObj.name,
      dismissalType: wicketDismissal,
    };

    // Auto rotate strike on over completion
    const isOverComplete = updatedBalls % 6 === 0;
    if (isOverComplete) {
      b1.isStriker = !b1.isStriker;
      b2.isStriker = !b2.isStriker;
      setShowBowlerModal(true);
    }

    pushUpdate({
      wickets: updatedWickets,
      balls: updatedBalls,
      batsman1: b1,
      batsman2: b2,
      bowler: bowlerObj,
      thisOver: updatedThisOver,
      partnershipRuns: 0,
      partnershipBalls: 0,
      batsmanHistory: updatedBatsmanHistory,
      fallOfWickets: [...state.fallOfWickets, fow],
      lastWicket: {
        name: dismissedBatsmanObj.name,
        runs: dismissedBatsmanObj.runs,
        balls: dismissedBatsmanObj.balls,
        scoreAtWicket: `${state.runs}-${updatedWickets}`,
      },
      eventTrigger: {
        type: "wicket",
        timestamp: Date.now(),
      },
    });

    setShowWicketModal(false);
  }

  // Change Bowler rotation
  function confirmBowlerRotation() {
    if (!nextBowlerName.trim()) {
      alert("Please specify next bowler name.");
      return;
    }

    pushUpdate({
      bowler: {
        name: nextBowlerName.toUpperCase(),
        runs: 0,
        wickets: 0,
        balls: 0,
        maidens: 0,
        economy: 0,
        dots: 0,
        wides: 0,
        noBalls: 0,
      },
      thisOver: [],
    });

    setNextBowlerName("");
    setShowBowlerModal(false);
  }

  // Server-side Undo
  async function handleUndo() {
    setLoading(true);
    try {
      const res = await fetch("/api/match-state/undo", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        syncLocalInputs(data.state);
      } else {
        alert("Nothing to undo!");
      }
    } catch (err) {
      console.error("Undo failed", err);
    } finally {
      setLoading(false);
    }
  }

  // Save match snapshot to MongoDB Atlas
  async function saveMatchToAtlas() {
    if (!tournamentId.trim()) {
      const name = window.prompt(
        "Enter a name for this match (or paste an existing Tournament ID to update):",
        `${state.config.team1} vs ${state.config.team2}`
      );
      if (!name) return;

      setSaveStatus("saving");
      try {
        // Create a new tournament and save snapshot
        const createRes = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            team1: state.config.team1,
            team2: state.config.team2,
            team1ShortName: state.config.team1ShortName,
            team2ShortName: state.config.team2ShortName,
            team1Color: state.config.team1Color,
            team2Color: state.config.team2Color,
            totalOvers: state.config.totalOvers,
            format: state.config.format,
            tossWinner: state.config.tossWinner,
            tossDecision: state.config.tossDecision,
            powerplayOvers: state.config.powerplayOvers,
            maxWickets: state.config.maxWickets,
          }),
        });
        const created = await createRes.json();
        const newId = created._id;
        setTournamentId(newId);

        // Now save snapshot
        await fetch(`/api/tournaments/${newId}/save-snapshot`, { method: "POST" });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
      return;
    }

    // Update existing tournament snapshot
    setSaveStatus("saving");
    try {
      await fetch(`/api/tournaments/${tournamentId}/save-snapshot`, { method: "POST" });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  // Reset to new match
  async function resetToNewMatch() {
    if (!window.confirm("RESET SCOREBOARD? All session statistics will be lost.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match-state/reset", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        syncLocalInputs(data.state);
      }
    } catch (err) {
      console.error("Reset failed", err);
    } finally {
      setLoading(false);
    }
  }

  // Switch Innings
  async function handleSwitchInnings() {
    if (!window.confirm("Switch to 2nd innings? This locks in the 1st innings total as the target!")) return;
    
    // Build first innings summary
    const Summary = {
      team: state.config.team1,
      runs: state.runs,
      wickets: state.wickets,
      overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
      runRate: state.currentRunRate,
      batsmanList: [...state.batsmanHistory, { ...state.batsman1, isNotOut: true }, { ...state.batsman2, isNotOut: true }],
      bowlerList: [...state.bowlerHistory, state.bowler],
      fallOfWickets: [...state.fallOfWickets],
      extras: state.extras,
      partnerships: state.partnerships || [],
    };

    pushUpdate({
      currentInnings: 2,
      target: state.runs + 1,
      runs: 0,
      wickets: 0,
      balls: 0,
      batsman1: {
        name: "CHASER 1",
        runs: 0,
        balls: 0,
        isStriker: true,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        dotBalls: 0,
      },
      batsman2: {
        name: "CHASER 2",
        runs: 0,
        balls: 0,
        isStriker: false,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        dotBalls: 0,
      },
      bowler: {
        name: "DEFENDER 1",
        runs: 0,
        wickets: 0,
        balls: 0,
        maidens: 0,
        economy: 0,
        dots: 0,
        wides: 0,
        noBalls: 0,
      },
      thisOver: [],
      partnershipRuns: 0,
      partnershipBalls: 0,
      lastWicket: null,
      powerplay: true,
      ballHistory: [],
      fallOfWickets: [],
      partnerships: [],
      bowlerHistory: [],
      batsmanHistory: [],
      firstInningsSummary: Summary,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      currentRunRate: 0,
      runsNeeded: state.runs + 1,
      ballsRemaining: state.config.totalOvers * 6,
      requiredRunRate: ((state.runs + 1) / (state.config.totalOvers * 6)) * 6,
      winProbability: { battingTeam: 45, bowlingTeam: 55 },
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
      eventTrigger: {
        type: "reset",
        timestamp: Date.now(),
      },
    });

    setActiveTab("match");
  }

  // TV graphics controller actions
  function triggerProductionPanel(type: any, visible: boolean = true) {
    let dataObj = {};
    let duration = 8000;
    let priority = 70;

    if (type === "playerCard") {
      const bat = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
      dataObj = {
        name: bat.name,
        runs: bat.runs,
        balls: bat.balls,
        fours: bat.fours,
        sixes: bat.sixes,
        strikeRate: bat.strikeRate,
      };
      priority = 80;
    } else if (type === "partnership") {
      dataObj = {
        totalRuns: state.partnershipRuns,
        totalBalls: state.partnershipBalls,
        batsman1: state.batsman1.name,
        batsman1Runs: state.batsman1.runs,
        batsman1Balls: state.batsman1.balls,
        batsman2: state.batsman2.name,
        batsman2Runs: state.batsman2.runs,
        batsman2Balls: state.batsman2.balls,
      };
    } else if (type === "requiredEquation") {
      dataObj = {
        runsNeeded: state.runsNeeded || 0,
        ballsRemaining: state.ballsRemaining,
        requiredRunRate: state.requiredRunRate || 0,
        currentRunRate: state.currentRunRate,
      };
      priority = 90;
      duration = 6000;
    } else if (type === "fallOfWickets") {
      dataObj = { fow: state.fallOfWickets };
      duration = 10000;
    } else if (type === "powerplayStats") {
      dataObj = {
        runs: state.runs,
        wickets: state.wickets,
        overs: state.config.powerplayOvers,
        boundaries: state.ballHistory.filter(b => b.isBoundary).length,
        sixes: state.ballHistory.filter(b => b.isSix).length,
      };
    } else if (type === "winProbability") {
      dataObj = {
        battingTeam: state.currentInnings === 1 ? state.config.team1 : state.config.team2,
        bowlingTeam: state.currentInnings === 1 ? state.config.team2 : state.config.team1,
        battingProb: state.winProbability.battingTeam,
        bowlingProb: state.winProbability.bowlingTeam,
      };
      priority = 85;
    } else if (type === "teamComparison") {
      dataObj = {
        team1: state.config.team1,
        team2: state.config.team2,
        innings1: state.firstInningsSummary ? {
          runs: state.firstInningsSummary.runs,
          wickets: state.firstInningsSummary.wickets,
          overs: state.firstInningsSummary.overs,
          runRate: state.firstInningsSummary.runRate,
        } : null,
        innings2: {
          runs: state.runs,
          wickets: state.wickets,
          overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
          runRate: state.currentRunRate,
        },
      };
    } else if (type === "wormGraph") {
      // Build dummy worm points
      const i1Worm = [];
      const total = state.firstInningsSummary?.runs || 60;
      for (let i = 0; i <= 36; i++) {
        i1Worm.push(Math.round((total / 36) * i));
      }
      const i2Worm = state.ballHistory.map(b => b.cumulativeScore);

      dataObj = {
        innings1: i1Worm,
        innings2: i2Worm,
        team1: state.config.team1,
        team2: state.config.team2,
        target: state.target,
      };
      duration = 12000;
    } else if (type === "bowlerAnalysis") {
      dataObj = {
        currentBowler: {
          name: state.bowler.name,
          overs: `${Math.floor(state.bowler.balls / 6)}.${state.bowler.balls % 6}`,
          runs: state.bowler.runs,
          wickets: state.bowler.wickets,
          economy: state.bowler.economy,
          dots: state.bowler.dots,
          maidens: state.bowler.maidens,
        },
      };
    } else if (type === "strategicTimeout") {
      dataObj = {
        battingTeam: state.currentInnings === 1 ? state.config.team1 : state.config.team2,
        runs: state.runs,
        wickets: state.wickets,
        overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
      };
      duration = 0;
      priority = 100;
    } else if (type === "matchSummary") {
      dataObj = {
        firstInnings: state.firstInningsSummary,
        secondInnings: {
          team: state.config.team2,
          runs: state.runs,
          wickets: state.wickets,
          overs: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
        },
        result: state.runs >= (state.target || 0) 
          ? `${state.config.team2} won by ${state.config.maxWickets - state.wickets} wickets` 
          : `${state.config.team1} won defended title`,
      };
      duration = 0;
      priority = 100;
    }

    const panel: ProductionPanel = {
      type,
      visible,
      data: dataObj,
      displayDuration: duration,
      priority,
      timestamp: Date.now(),
    };

    pushUpdate({ activeProductionPanel: visible ? panel : null });
  }

  // Hotkey support via react hook
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showWicketModal || showBowlerModal) return; // ignore when typing in modals
      const key = e.key.toLowerCase();
      
      if (key === "0") addScoreAction(0, "normal");
      else if (key === "1") addScoreAction(1, "normal");
      else if (key === "2") addScoreAction(2, "normal");
      else if (key === "3") addScoreAction(3, "normal");
      else if (key === "4") addScoreAction(4, "normal");
      else if (key === "6") addScoreAction(6, "normal");
      else if (key === "w") handleWicketEvent();
      else if (key === "z") handleUndo();
      else if (key === "s") rotateStrikeManually();
      else if (key === "p") triggerProductionPanel("playerCard", !state.activeProductionPanel);
      else if (key === " ") {
        e.preventDefault();
        pushUpdate({ activeProductionPanel: null });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, showWicketModal, showBowlerModal]);

  // config save
  function handleConfigSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushUpdate({
      config: {
        team1: team1.toUpperCase(),
        team2: team2.toUpperCase(),
        totalOvers: Number(totalOvers),
        tossWinner: tossWinner.toUpperCase(),
        tossDecision: tossDecision,
        format: format as any,
        team1Color: primaryColor,
        team2Color: secondaryColor,
        team1ShortName: team1Short.toUpperCase(),
        team2ShortName: team2Short.toUpperCase(),
        powerplayOvers: format === "t20" ? 6 : format === "odi" ? 10 : 2,
        maxWickets: 10,
      },
      currentInnings,
      target: currentInnings === 2 ? Number(targetVal) : null,
      primaryColor,
      secondaryColor,
      glowColor,
      accentTextColor,
      infoPanelTheme,
      secondInningsLayout,
    });
    alert("Configurations synchronized with graphics system!");
  }

  // player save
  function handlePlayersSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushUpdate({
      batsman1: {
        ...state.batsman1,
        name: b1Name.toUpperCase(),
      },
      batsman2: {
        ...state.batsman2,
        name: b2Name.toUpperCase(),
      },
      bowler: {
        ...state.bowler,
        name: bowlerName.toUpperCase(),
      },
    });
    alert("Broadcast squad names updated!");
  }

  return (
    <div className="w-full min-h-screen select-none text-slate-200 font-sans py-6 transition-all duration-300"
         style={{ backgroundColor: panelBgColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* OPERATOR STATUS HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#151821] border border-slate-800 p-4 rounded-xl mb-6 gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest animate-pulse text-white">
              LIVE FEED
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white italic uppercase font-mono">CricHero Operator OS v5.0</h1>
              <p className="text-[9px] text-blue-400 font-extrabold tracking-widest uppercase mt-0.5">Cricket Broadcast Control Console</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="text-right border-r border-slate-800 pr-4">
              <span className="text-slate-500 uppercase text-[9px] font-bold block">Graphics Sync</span>
              <span className="text-green-400 font-black uppercase text-[11px] flex items-center gap-1 mt-0.5 font-mono">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-ping" />
                ACTIVE TRANS
              </span>
            </div>
            <div className="text-right border-r border-slate-800 pr-4">
              <span className="text-slate-500 uppercase text-[9px] font-bold block">Match Status</span>
              <span className="text-amber-400 font-black uppercase text-[11px] font-mono mt-0.5">
                {state.runs}-{state.wickets} ({Math.floor(state.balls / 6)}.{state.balls % 6} OV)
              </span>
            </div>
            {/* Save Match Button */}
            <button
              type="button"
              id="save-match-btn"
              onClick={saveMatchToAtlas}
              disabled={saveStatus === "saving"}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase cursor-pointer transition-transform active:scale-95 border ${
                saveStatus === "saved"
                  ? "bg-green-900/40 border-green-700/40 text-green-300"
                  : saveStatus === "error"
                  ? "bg-red-900/40 border-red-700/40 text-red-300"
                  : saveStatus === "saving"
                  ? "bg-indigo-900/40 border-indigo-700/40 text-indigo-300 opacity-70"
                  : "bg-indigo-950/40 border-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300"
              }`}
            >
              {saveStatus === "saving" ? (
                <span className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin inline-block" />
              ) : saveStatus === "saved" ? (
                <Check className="w-3 h-3" />
              ) : saveStatus === "error" ? (
                <X className="w-3 h-3" />
              ) : (
                <BookOpen className="w-3 h-3" />
              )}
              {saveStatus === "saving" ? "SAVING..." : saveStatus === "saved" ? "SAVED!" : saveStatus === "error" ? "FAILED" : "SAVE MATCH"}
            </button>
            <button type="button" onClick={resetToNewMatch}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 border border-red-900/40 hover:bg-red-900/60 rounded-md text-[10px] text-red-300 font-bold uppercase cursor-pointer transition-transform active:scale-95">
              <RefreshCw className="w-3 h-3" />
              RESET SCORES
            </button>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex gap-1.5 bg-[#151821] p-1 rounded-lg border border-slate-800 mb-6 overflow-x-auto">
          {[
            { id: "match", label: "MATCH CONTROL", icon: Activity },
            { id: "players", label: "PLAYERS & SQUAD", icon: Users },
            { id: "graphics", label: "TV OVERLAYS", icon: Tv },
            { id: "replay", label: "REPLAY & LOGS", icon: History },
            { id: "aesthetics", label: "AESTHETICS", icon: Sliders },
            { id: "settings", label: "SETTINGS", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-md cursor-pointer transition-all ${active ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN TABS WINDOW */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 shadow-2xl relative overflow-hidden min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* TAB 1: MATCH CONTROL */}
          {activeTab === "match" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Scoring pads */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">SCORING PAD</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { runs: 0, label: "DOT BALL" },
                      { runs: 1, label: "SINGLE" },
                      { runs: 2, label: "2 RUNS" },
                      { runs: 3, label: "3 RUNS" },
                      { runs: 4, label: "FOUR" },
                      { runs: 6, label: "SIX" },
                    ].map((btn) => (
                      <button key={btn.runs} type="button" onClick={() => addScoreAction(btn.runs, "normal")}
                              className="bg-slate-900 border border-slate-800 hover:bg-blue-900/20 hover:border-blue-600 rounded-xl py-5 px-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md group">
                        <span className="text-3xl font-black font-mono text-white group-hover:text-blue-400">{btn.runs}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras pad */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CONCEDE EXTRAS</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { type: "wide", label: "WIDE BALL" },
                      { type: "noball", label: "NO BALL" },
                      { type: "bye", label: "BYES" },
                      { type: "legbye", label: "LEG BYES" },
                    ].map((extra) => (
                      <button key={extra.type} type="button" onClick={() => addScoreAction(1, extra.type as any)}
                              className="bg-slate-900 border border-slate-800 hover:bg-amber-900/20 hover:border-amber-600 rounded-xl py-4 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md">
                        <span className="text-sm font-black text-white">{extra.label}</span>
                        <span className="text-[8px] font-bold text-amber-500 tracking-wider">CONCEDE (+1)</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wicket / Strike actions */}
                <div className="flex gap-4">
                  <button type="button" onClick={handleWicketEvent}
                          className="flex-1 bg-red-950/40 border border-red-900 hover:bg-red-900 rounded-xl py-4 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg text-red-300">
                    <Star className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-black uppercase">OUT / WICKET LOSS</span>
                  </button>

                  <button type="button" onClick={rotateStrikeManually}
                          className="flex-1 bg-slate-900 border border-slate-800 hover:bg-blue-900/20 rounded-xl py-4 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md text-slate-300">
                    <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-black uppercase">SWAP STRIKE</span>
                  </button>

                  <button type="button" onClick={handleUndo}
                          className="flex-1 bg-slate-900 border border-slate-800 hover:bg-amber-900/20 rounded-xl py-4 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md text-amber-400">
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-sm font-black uppercase">UNDO LAST</span>
                  </button>
                </div>
              </div>

              {/* Status bar */}
              <div className="lg:col-span-4 bg-slate-900/40 border border-slate-900 rounded-xl p-5 shadow-inner flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CURRENT LIVE OVER</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {state.thisOver.length === 0 ? (
                      <span className="text-xs text-slate-500 font-bold uppercase italic py-2">Over starting...</span>
                    ) : (
                      state.thisOver.map((ball, idx) => (
                        <span key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center font-black font-mono text-xs shadow-md border ${
                          ball.includes("W") ? "bg-red-600 border-red-500 text-white" :
                          ball.includes("4") || ball.includes("6") ? "bg-amber-500 border-amber-400 text-slate-950" :
                          "bg-slate-950 border-slate-800 text-white"
                        }`}>
                          {ball}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 mt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>STRIKER:</span>
                    <span className="font-mono text-white uppercase">{state.batsman1.isStriker ? state.batsman1.name : state.batsman2.name} ({state.batsman1.isStriker ? state.batsman1.runs : state.batsman2.runs} runs)</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 border-t border-slate-900 pt-2">
                    <span>BOWLER:</span>
                    <span className="font-mono text-white uppercase">{state.bowler.name} ({state.bowler.wickets}/{state.bowler.runs})</span>
                  </div>
                  {state.currentInnings === 2 && state.target && (
                    <div className="flex justify-between text-xs font-semibold text-amber-500 border-t border-slate-900 pt-2">
                      <span>EQUATION:</span>
                      <span className="font-mono font-black uppercase">NEED {state.runsNeeded} OFF {state.ballsRemaining} BALLS</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYERS & SQUAD */}
          {activeTab === "players" && (
            <form onSubmit={handlePlayersSubmit} className="max-w-xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">ACTIVE PLAYERS SETUP</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Provide names for overlay displays</p>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Batsman 1 Name</label>
                <input type="text" value={b1Name} onChange={(e) => setB1Name(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase font-mono" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Batsman 2 Name</label>
                <input type="text" value={b2Name} onChange={(e) => setB2Name(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase font-mono" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Bowler Name</label>
                <input type="text" value={bowlerName} onChange={(e) => setBowlerName(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase font-mono" />
              </div>

              <button type="submit"
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-xs font-black uppercase cursor-pointer tracking-wider active:scale-95 transition-transform">
                LOAD NAMES TO GRAPHICS
              </button>
            </form>
          )}

          {/* TAB 3: TV OVERLAYS */}
          {activeTab === "graphics" && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">TELEVISION PRODUCTION GRAPHICS</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Trigger full-screen lower third broadcast cards on screen</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: "playerCard", label: "Batsman Card" },
                  { id: "partnership", label: "Partnership" },
                  { id: "requiredEquation", label: "Match Equation" },
                  { id: "bowlerAnalysis", label: "Bowler Profile" },
                  { id: "winProbability", label: "Win Probability" },
                  { id: "teamComparison", label: "Team Comparison" },
                  { id: "wormGraph", label: "Worm Line Graph" },
                  { id: "fallOfWickets", label: "Fall of Wickets" },
                  { id: "powerplayStats", label: "Powerplay Stats" },
                  { id: "strategicTimeout", label: "Strategic Timeout" },
                  { id: "matchSummary", label: "Match Summary" },
                ].map((panel) => {
                  const active = state.activeProductionPanel?.type === panel.id;
                  return (
                    <button key={panel.id} type="button" onClick={() => triggerProductionPanel(panel.id, !active)}
                            className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center cursor-pointer transition-all active:scale-95 ${
                              active ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-lg" : "bg-slate-900 border-slate-900 text-slate-400 hover:text-white"
                            }`}>
                      <Star className="w-5 h-5 mb-2" />
                      <span className="text-xs font-black uppercase leading-none">{panel.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-900 pt-6 mt-2 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <button type="button" onClick={() => triggerProductionPanel("playerCard", false)}
                        className="bg-red-950/40 border border-red-900 hover:bg-red-900 text-red-300 rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-transform flex items-center gap-1">
                  <X className="w-4 h-4" />
                  DISMISS BROADCAST GRAPHICS
                </button>

                <div className="flex gap-4">
                  <button type="button" onClick={() => pushUpdate({ scoreStripVisible: !state.scoreStripVisible })}
                          className={`px-4 py-2 border rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-transform ${
                            state.scoreStripVisible !== false ? "bg-blue-600/10 border-blue-500 text-blue-400" : "bg-slate-900 border-slate-900 text-slate-400"
                          }`}>
                    SCORE STRIP: {state.scoreStripVisible !== false ? "VISIBLE" : "HIDDEN"}
                  </button>
                </div>
              </div>

              {/* NEW: DYNAMIC INFO PANEL THEME & RECENT BALLS */}
              <div className="border-t border-slate-900 pt-6 mt-2 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">STRIP INFO PANEL THEME</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Toggle between Project Score, CRR, and Toss Decision in real-time</p>
                  
                  <div className="flex gap-4">
                    {["projected", "crr", "toss"].map((theme) => (
                      <button key={theme} type="button" onClick={() => {
                        setInfoPanelTheme(theme as any);
                        pushUpdate({ infoPanelTheme: theme as any });
                      }}
                        className={`px-5 py-2.5 rounded-lg border text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${
                          infoPanelTheme === theme ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}>
                        {theme === "projected" ? "PROJECTED SCORE" : theme === "crr" ? "RUN-RATE (CRR)" : "TOSS DECISION"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">BOWLER RECENT BALLS (OVERRIDE)</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Manually set the 6-ball array (comma separated, e.g. 4,2,1,W). Leave blank to auto-sync from live data.</p>
                  <input type="text" 
                         value={(state.recentBalls || []).join(",")}
                         onChange={(e) => {
                           const arr = e.target.value.split(",").map(s => s.trim()).filter(s => s);
                           pushUpdate({ recentBalls: arr });
                         }}
                         placeholder="e.g. 4,2,W,0"
                         className="w-full max-w-md bg-slate-900 border border-slate-800 rounded px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPLAY & LOGS */}
          {activeTab === "replay" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">DELIVERY PROGRESSION LOGS</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Chronological delivery history of this innings</p>
              </div>

              <div className="w-full bg-slate-900/40 border border-slate-900 rounded-xl max-h-[350px] overflow-y-auto p-4 font-mono text-xs flex flex-col gap-2">
                {state.ballHistory.length === 0 ? (
                  <div className="text-slate-600 italic py-6 text-center">No balls bowled in this innings yet.</div>
                ) : (
                  [...state.ballHistory].reverse().map((ball, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950/50 border border-slate-900 p-2.5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">Ball {ball.ballNumber}:</span>
                        <span className="font-bold text-white uppercase">{ball.runs} runs ({ball.batsmanOnStrike} faced {ball.bowler})</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ball.isWicket ? "bg-red-950/40 border-red-900 text-red-400" :
                        ball.runs === 4 || ball.runs === 6 ? "bg-amber-950/40 border-amber-900 text-amber-400" :
                        "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        {ball.isWicket ? `OUT (${ball.wicketType})` : ball.runs === 4 ? "FOUR" : ball.runs === 6 ? "SIX" : "LEGAL"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AESTHETICS */}
          {activeTab === "aesthetics" && (
            <form onSubmit={handleConfigSubmit} className="max-w-xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">DYNAMIC GRAPHICS CUSTOMIZER</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Fine-tune transmission colors and accent glows</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Primary Theme (Team A)</label>
                  <div className="flex gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                           className="w-10 h-8 p-0 border border-slate-800 rounded bg-transparent cursor-pointer" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                           className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Secondary Theme (Team B)</label>
                  <div className="flex gap-2">
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}
                           className="w-10 h-8 p-0 border border-slate-800 rounded bg-transparent cursor-pointer" />
                    <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}
                           className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Bloom Glow Color</label>
                <div className="flex gap-2">
                  <input type="color" value={glowColor} onChange={(e) => setGlowColor(e.target.value)}
                         className="w-10 h-8 p-0 border border-slate-800 rounded bg-transparent cursor-pointer" />
                  <input type="text" value={glowColor} onChange={(e) => setGlowColor(e.target.value)}
                         className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Boundary Celebration Text</label>
                  <input type="text" value={fourBoundaryText} onChange={(e) => setFourBoundaryText(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Max Six Celebration Text</label>
                  <input type="text" value={maxSixText} onChange={(e) => setMaxSixText(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none font-mono" />
                </div>
              </div>

              <button type="submit"
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-xs font-black uppercase cursor-pointer tracking-wider active:scale-95 transition-transform">
                LOAD THEME TO OVERLAYS
              </button>
            </form>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <form onSubmit={handleConfigSubmit} className="max-w-xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">MATCH SPECIFICATION & PRESETS</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Lock match structures for calculations</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Format Preset</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none">
                    <option value="t20">T20 Preset (20 Overs)</option>
                    <option value="odi">ODI Preset (50 Overs)</option>
                    <option value="superover">Super Over (1 Over)</option>
                    <option value="custom">Custom Format</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Match Overs Limit</label>
                  <input type="number" value={totalOvers} onChange={(e) => setTotalOvers(Number(e.target.value))}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Team 1 Name</label>
                  <input type="text" value={team1} onChange={(e) => setTeam1(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Team 2 Name</label>
                  <input type="text" value={team2} onChange={(e) => setTeam2(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Team 1 Initials</label>
                  <input type="text" value={team1Short} onChange={(e) => setTeam1Short(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Team 2 Initials</label>
                  <input type="text" value={team2Short} onChange={(e) => setTeam2Short(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none uppercase font-mono" />
                </div>
              </div>

              {state.currentInnings === 1 ? (
                <button type="button" onClick={handleSwitchInnings}
                        className="mt-2 bg-amber-600 hover:bg-amber-700 text-slate-950 rounded-lg py-2.5 px-4 text-xs font-black uppercase cursor-pointer tracking-wider active:scale-95 transition-transform">
                  SWITCH TO 2ND INNINGS
                </button>
              ) : (
                <div className="bg-[#151821] p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-500 uppercase">2nd Innings Target Defending:</span>
                  <span className="font-mono font-black text-white">{state.target} runs</span>
                </div>
              )}

              <button type="submit"
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-xs font-black uppercase cursor-pointer tracking-wider active:scale-95 transition-transform">
                SYNCHRONIZE MATCH CONFIGS
              </button>
            </form>
          )}
        </div>
      </div>

      {/* QUICK WICKET SUBMODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-[450px] p-6 rounded-2xl shadow-2xl flex flex-col gap-4 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4.5 h-4.5" />
                WICKET DISMISSAL DETAILS
              </h3>
              <button type="button" onClick={() => setShowWicketModal(false)}
                      className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Dismissal Type</label>
              <select value={wicketDismissal} onChange={(e) => setWicketDismissal(e.target.value as WicketType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none">
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="stumped">Stumped</option>
                <option value="runout">Run Out</option>
                <option value="hitwicket">Hit Wicket</option>
                <option value="retired">Retired Hurt</option>
                <option value="obstructing">Obstructing Field</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Which Batsman Out</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setWicketOutOfWho("striker")}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded border cursor-pointer ${wicketOutOfWho === "striker" ? "bg-red-600/10 border-red-500 text-red-400" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                  STRIKER
                </button>
                <button type="button" onClick={() => setWicketOutOfWho("non-striker")}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded border cursor-pointer ${wicketOutOfWho === "non-striker" ? "bg-red-600/10 border-red-500 text-red-400" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                  NON-STRIKER
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Incoming Batsman Name</label>
              <input type="text" value={nextBatsmanName} onChange={(e) => setNextBatsmanName(e.target.value)}
                     placeholder="e.g. MS DHONI"
                     className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none font-mono uppercase" />
            </div>

            <button type="button" onClick={confirmDetailedWicket}
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-transform">
              CONFIRM DISMISSAL OUT
            </button>
          </div>
        </div>
      )}

      {/* QUICK BOWLER ROTATION MODAL */}
      {showBowlerModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-[400px] p-6 rounded-2xl shadow-2xl flex flex-col gap-4 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider">
                OVER COMPLETE — ROTATE BOWLER
              </h3>
              <button type="button" onClick={() => setShowBowlerModal(false)}
                      className="text-slate-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1 uppercase">Incoming Bowler Name</label>
              <input type="text" value={nextBowlerName} onChange={(e) => setNextBowlerName(e.target.value)}
                     placeholder="e.g. JASPRIT BUMRAH"
                     className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none font-mono uppercase" />
            </div>

            <button type="button" onClick={confirmBowlerRotation}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-transform">
              CONFIRM BOWLER Spell
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
