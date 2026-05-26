/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MatchState, Batsman, Bowler } from "../types";
import { 
  Users, ArrowLeftRight, RotateCcw, Award, Play, Shield, 
  Settings, RefreshCw, Layers, Radio, TrendingUp, AlertTriangle,
  Sparkles, Sliders
} from "lucide-react";

interface ControllerPanelProps {
  initialState: MatchState;
}

export default function ControllerPanel({ initialState }: ControllerPanelProps) {
  const [state, setState] = useState<MatchState>(initialState);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Local input states for setup & substitutions
  const [team1, setTeam1] = useState(state.config.team1);
  const [team2, setTeam2] = useState(state.config.team2);
  const [totalOvers, setTotalOvers] = useState(state.config.totalOvers);
  const [tossWinner, setTossWinner] = useState(state.config.tossWinner);
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">(state.config.tossDecision);
  const [currentInnings, setCurrentInnings] = useState<1 | 2>(state.currentInnings);
  const [targetVal, setTargetVal] = useState(state.target || "");
  
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
  const [firstInningsDisplay, setFirstInningsDisplay] = useState(state.firstInningsDisplay || "projected");
  const [secondInningsLayout, setSecondInningsLayout] = useState(state.secondInningsLayout || "combined");

  // Substitution / Next Player modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [nextBatsmanName, setNextBatsmanName] = useState("");
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [nextBowlerName, setNextBowlerName] = useState("");

  // Comprehensive Cricket Consequence Rules & Popups
  const [wicketDismissal, setWicketDismissal] = useState<"Bowled" | "Caught" | "Caught & Bowled" | "LBW" | "Stumped" | "Run Out" | "Hit Wicket" | "Obstructing">("Bowled");
  const [wicketOutOfWho, setWicketOutOfWho] = useState<"striker" | "non-striker">("striker");
  const [runoutRunsScored, setRunoutRunsScored] = useState<number>(0);
  const [runoutBallType, setRunoutBallType] = useState<"legal" | "wide" | "noball" | "bye" | "legbye">("legal");

  // Customized Operator Board BG Color & Celebration Alerts
  const [panelBgColor, setPanelBgColor] = useState(state.panelBgColor || "#0a0a0c");
  const [celebrationTheme, setCelebrationTheme] = useState<"neon" | "metallic" | "cyber" | "epic">(state.celebrationTheme || "neon");
  const [maxSixText, setMaxSixText] = useState(state.maxSixText || "★★ MAX SIX ★★");
  const [fourBoundaryText, setFourBoundaryText] = useState(state.fourBoundaryText || "★ BOUNDARY FOUR ★");

  // History state stack for UNDO action
  const [historyStack, setHistoryStack] = useState<MatchState[]>([]);

  // Periodically fetch active state during startup to ensure synchronization
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
  }, []);

  function syncLocalInputs(s: MatchState) {
    setTeam1(s.config.team1);
    setTeam2(s.config.team2);
    setTotalOvers(s.config.totalOvers);
    setTossWinner(s.config.tossWinner);
    setTossDecision(s.config.tossDecision);
    setCurrentInnings(s.currentInnings);
    setTargetVal(s.target || "");
    setB1Name(s.batsman1.name);
    setB2Name(s.batsman2.name);
    setBowlerName(s.bowler.name);
    setPrimaryColor(s.primaryColor || "#1d4ed8");
    setSecondaryColor(s.secondaryColor || "#581c87");
    setGlowColor(s.glowColor || "#c084fc");
    setAccentTextColor(s.accentTextColor || "#fbbf24");
    setFirstInningsDisplay(s.firstInningsDisplay || "projected");
    setSecondInningsLayout(s.secondInningsLayout || "combined");
    setPanelBgColor(s.panelBgColor || "#0a0a0c");
    setCelebrationTheme(s.celebrationTheme || "neon");
    setMaxSixText(s.maxSixText || "★★ MAX SIX ★★");
    setFourBoundaryText(s.fourBoundaryText || "★ BOUNDARY FOUR ★");
  }

  // Send state update block to Express server
  async function pushUpdate(updatedState: Partial<MatchState>) {
    setLoading(true);
    // Push current event trigger
    const completeState = {
      ...state,
      ...updatedState,
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
      console.error("Failed to sync controller state to backend", err);
    } finally {
      setLoading(false);
    }
  }

  // Push full match state hard reset
  async function resetToNewMatch() {
    if (!window.confirm("Are you sure you want to reset the scoreboard? All current session points will be cleared.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match-state/reset", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        syncLocalInputs(data.state);
        setHistoryStack([]);
      }
    } catch (err) {
      console.error("Failed to reset scoring board", err);
    } finally {
      setLoading(false);
    }
  }

  // Save current step to undo history stack before applying update
  function recordHistory() {
    setHistoryStack((prev) => [...prev, JSON.parse(JSON.stringify(state))]);
  }

  function handleUndo() {
    if (historyStack.length === 0) {
      alert("No score events left to undo in this session!");
      return;
    }
    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    pushUpdate(previousState);
  }

  // ────────────────────────────────────────────────────────
  // SCORING EVENT LOGIC HANDLERS
  // ────────────────────────────────────────────────────────

  function addScoreAction(runsScored: number, ballType: "legal" | "wide" | "noball" | "bye" | "legbye") {
    recordHistory();
    
    let updatedRuns = state.runs;
    let updatedWickets = state.wickets;
    let updatedBalls = state.balls;
    let updatedThisOver = [...state.thisOver];
    let updatedPartnershipRuns = state.partnershipRuns;
    let updatedPartnershipBalls = state.partnershipBalls;
    let updatedFreeHit = state.freeHit || false;

    const b1 = { ...state.batsman1 };
    const b2 = { ...state.batsman2 };
    const currentBowlerObj = { ...state.bowler };

    const striker = b1.isStriker ? b1 : b2;
    const nonStriker = b1.isStriker ? b2 : b1;

    let triggerType: "four" | "six" | "single" | "wicket" | "config" = "single";
    if (runsScored === 4 && (ballType === "legal" || ballType === "bye" || ballType === "legbye")) triggerType = "four";
    if (runsScored === 6 && (ballType === "legal" || ballType === "bye" || ballType === "legbye")) triggerType = "six";

    // Standard Legal Ball Delivery
    if (ballType === "legal") {
      updatedRuns += runsScored;
      updatedBalls += 1;
      updatedPartnershipRuns += runsScored;
      updatedPartnershipBalls += 1;

      // Update Striker performance digits
      striker.runs += runsScored;
      striker.balls += 1;

      // Update Bowler concessions
      currentBowlerObj.runs += runsScored;
      currentBowlerObj.balls += 1;

      // Highlight Free hit outcomes in timeline
      if (state.freeHit) {
        updatedThisOver.push(`${runsScored === 0 ? "•" : runsScored} (FH)`);
        updatedFreeHit = false; // Free hit is consumed on a legal delivery!
      } else {
        updatedThisOver.push(`${runsScored === 0 ? "•" : runsScored}`);
      }

      // Handle custom batsman strike rotation on odd single runs
      if (runsScored % 2 !== 0) {
        striker.isStriker = false;
        nonStriker.isStriker = true;
      }
    } 
    // EXTRAS: Wide ball (concede 1 wide run + any running runs scored off wide)
    else if (ballType === "wide") {
      const wideConcession = runsScored + 1; // 1 penalty run + runs scored
      updatedRuns += wideConcession;
      updatedPartnershipRuns += wideConcession;
      currentBowlerObj.runs += wideConcession;
      
      if (runsScored > 0) {
        updatedThisOver.push(`${wideConcession}wd`);
      } else {
        updatedThisOver.push("wd");
      }

      // Wide run rotations - only runsScored (extra running runs) cause rotation on odd numbers
      if (runsScored % 2 !== 0) {
        striker.isStriker = false;
        nonStriker.isStriker = true;
      }
      
      // Free hit status is NOT consumed by wide; it continues on!
    } 
    // EXTRAS: No ball (concede 1 no-ball run + batsman runs off bat)
    else if (ballType === "noball") {
      const noBallConcession = runsScored + 1; // 1 penalty run + runs scored off bat
      updatedRuns += noBallConcession;
      updatedPartnershipRuns += noBallConcession;
      
      striker.runs += runsScored;
      striker.balls += 1; // faced delivery
      currentBowlerObj.runs += noBallConcession; // concessions update

      updatedThisOver.push(runsScored > 0 ? `${runsScored}nb` : "nb");

      // Rotate strike on odd runs off the bat
      if (runsScored % 2 !== 0) {
        striker.isStriker = false;
        nonStriker.isStriker = true;
      }

      // NO-BALL ALWAYS triggers a Free Hit!
      updatedFreeHit = true;
    }
    // EXTRAS: Bye / Leg Bye
    else if (ballType === "bye" || ballType === "legbye") {
      updatedRuns += runsScored;
      updatedBalls += 1;
      updatedPartnershipRuns += runsScored;
      updatedPartnershipBalls += 1;

      striker.balls += 1; // faced delivery
      currentBowlerObj.balls += 1; // bowled delivery! Runs don't go to bowler concessions
      
      const prefix = ballType === "bye" ? "B" : "LB";
      if (state.freeHit) {
        updatedThisOver.push(`${prefix}${runsScored} (FH)`);
        updatedFreeHit = false; // Free hit is consumed on legal bye/legbye deliveries
      } else {
        updatedThisOver.push(`${prefix}${runsScored}`);
      }

      // Rotate strike on odd runs
      if (runsScored % 2 !== 0) {
        striker.isStriker = false;
        nonStriker.isStriker = true;
      }
    }

    // Auto rotate strike on over completion (6 legal balls in current over)
    const isOverComplete = (updatedBalls % 6 === 0) && (ballType === "legal" || ballType === "bye" || ballType === "legbye");
    if (isOverComplete) {
      b1.isStriker = !b1.isStriker;
      b2.isStriker = !b2.isStriker;
      setShowBowlerModal(true);
    }

    pushUpdate({
      runs: updatedRuns,
      balls: updatedBalls,
      batsman1: b1,
      batsman2: b2,
      bowler: currentBowlerObj,
      thisOver: updatedThisOver,
      partnershipRuns: updatedPartnershipRuns,
      partnershipBalls: updatedPartnershipBalls,
      freeHit: updatedFreeHit,
      eventTrigger: {
        type: triggerType,
        timestamp: Date.now(),
      },
    });
  }

  function handleWicketEvent() {
    setNextBatsmanName("");
    setWicketDismissal("Bowled");
    setWicketOutOfWho("striker");
    setRunoutRunsScored(0);
    setRunoutBallType("legal");
    setShowWicketModal(true);
  }

  function confirmDetailedWicket() {
    if (!nextBatsmanName.trim()) {
      alert("Please enter incoming batsman name.");
      return;
    }

    recordHistory();

    let updatedRuns = state.runs;
    let updatedWickets = state.wickets;
    let updatedBalls = state.balls;
    let updatedThisOver = [...state.thisOver];
    let updatedPartnershipRuns = state.partnershipRuns;
    let updatedPartnershipBalls = state.partnershipBalls;
    let updatedFreeHit = state.freeHit || false;

    const b1 = { ...state.batsman1 };
    const b2 = { ...state.batsman2 };
    const currentBowlerObj = { ...state.bowler };

    const striker = b1.isStriker ? b1 : b2;
    const nonStriker = b1.isStriker ? b2 : b1;

    const dismissedIsStriker = (wicketOutOfWho === "striker");
    const dismissedBatsmanObj = dismissedIsStriker ? striker : nonStriker;
    const stayingBatsmanObj = dismissedIsStriker ? nonStriker : striker;

    let isExempt = false;
    let exemptionReason = "";

    const isFreeHitDelivery = state.freeHit;
    const isNoBallDelivery = (runoutBallType === "noball");
    const isWideDelivery = (runoutBallType === "wide");

    if (isFreeHitDelivery) {
      if (wicketDismissal !== "Run Out" && wicketDismissal !== "Obstructing") {
        isExempt = true;
        exemptionReason = `NOT OUT! Cannot be dismissed ${wicketDismissal} on a Free Hit (Law 21.18).`;
      }
    } else if (isNoBallDelivery) {
      if (wicketDismissal !== "Run Out" && wicketDismissal !== "Obstructing") {
        isExempt = true;
        exemptionReason = `NOT OUT! Cannot be dismissed ${wicketDismissal} on a No-Ball (Law 21.18).`;
      }
    } else if (isWideDelivery) {
      if (wicketDismissal === "Bowled" || wicketDismissal === "Caught" || wicketDismissal === "Caught & Bowled" || wicketDismissal === "LBW") {
        isExempt = true;
        exemptionReason = `NOT OUT! Cannot be dismissed ${wicketDismissal} on a Wide (Law 22.1).`;
      }
    }

    if (isExempt) {
      alert(`${exemptionReason} Scoring will proceed as a regular delivery without any wicket lost.`);
      
      if (runoutBallType === "legal") {
        updatedRuns += runoutRunsScored;
        updatedBalls += 1;
        updatedPartnershipRuns += runoutRunsScored;
        updatedPartnershipBalls += 1;
        striker.runs += runoutRunsScored;
        striker.balls += 1;
        currentBowlerObj.runs += runoutRunsScored;
        currentBowlerObj.balls += 1;
        updatedThisOver.push(`${runoutRunsScored === 0 ? "•" : runoutRunsScored}${isFreeHitDelivery ? " (FH)" : ""}`);
        updatedFreeHit = false; 
        
        if (runoutRunsScored % 2 !== 0) {
          striker.isStriker = false;
          nonStriker.isStriker = true;
        }
      } else if (runoutBallType === "wide") {
        const extraRuns = runoutRunsScored + 1;
        updatedRuns += extraRuns;
        updatedPartnershipRuns += extraRuns;
        currentBowlerObj.runs += extraRuns;
        updatedThisOver.push(`${extraRuns}wd`);
        if (runoutRunsScored % 2 !== 0) {
          striker.isStriker = false;
          nonStriker.isStriker = true;
        }
      } else if (runoutBallType === "noball") {
        const extraRuns = runoutRunsScored + 1;
        updatedRuns += extraRuns;
        updatedPartnershipRuns += extraRuns;
        striker.runs += runoutRunsScored;
        striker.balls += 1;
        currentBowlerObj.runs += extraRuns;
        updatedThisOver.push(`${extraRuns}nb`);
        updatedFreeHit = true; 
        if (runoutRunsScored % 2 !== 0) {
          striker.isStriker = false;
          nonStriker.isStriker = true;
        }
      } else if (runoutBallType === "bye" || runoutBallType === "legbye") {
        updatedRuns += runoutRunsScored;
        updatedBalls += 1;
        updatedPartnershipRuns += runoutRunsScored;
        updatedPartnershipBalls += 1;
        striker.balls += 1;
        currentBowlerObj.balls += 1;
        const prefix = runoutBallType === "bye" ? "B" : "LB";
        updatedThisOver.push(`${prefix}${runoutRunsScored}${isFreeHitDelivery ? " (FH)" : ""}`);
        updatedFreeHit = false; 
        if (runoutRunsScored % 2 !== 0) {
          striker.isStriker = false;
          nonStriker.isStriker = true;
        }
      }
    } else {
      updatedWickets += 1;

      if (runoutBallType === "legal") {
        updatedBalls += 1;
        updatedPartnershipBalls += 1;
        striker.balls += 1;
        currentBowlerObj.balls += 1;

        if (wicketDismissal === "Run Out" || wicketDismissal === "Obstructing") {
          updatedRuns += runoutRunsScored;
          updatedPartnershipRuns += runoutRunsScored;
          currentBowlerObj.runs += runoutRunsScored;
          
          if (wicketOutOfWho === "striker") {
            striker.runs += runoutRunsScored;
          }
          
          updatedThisOver.push(`${runoutRunsScored} W-RO`);
          
          if (runoutRunsScored % 2 !== 0) {
            b1.isStriker = !b1.isStriker;
            b2.isStriker = !b2.isStriker;
          }
        } else {
          currentBowlerObj.wickets += 1; 
          updatedThisOver.push("W");
        }

        updatedFreeHit = false; 
      } else if (runoutBallType === "wide") {
        const penalties = runoutRunsScored + 1;
        updatedRuns += penalties;
        updatedPartnershipRuns += penalties;
        currentBowlerObj.runs += penalties;

        if (wicketDismissal === "Stumped" || wicketDismissal === "Hit Wicket") {
          currentBowlerObj.wickets += 1;
          updatedThisOver.push("W-Wd");
        } else {
          updatedThisOver.push("W-RO");
        }

        if (runoutRunsScored % 2 !== 0) {
          b1.isStriker = !b1.isStriker;
          b2.isStriker = !b2.isStriker;
        }
      } else if (runoutBallType === "noball") {
        const penalties = runoutRunsScored + 1;
        updatedRuns += penalties;
        updatedPartnershipRuns += penalties;
        striker.balls += 1; 
        currentBowlerObj.runs += penalties;

        if (wicketOutOfWho === "striker") {
          striker.runs += runoutRunsScored;
        }

        updatedThisOver.push("W-RO");

        if (runoutRunsScored % 2 !== 0) {
          b1.isStriker = !b1.isStriker;
          b2.isStriker = !b2.isStriker;
        }

        updatedFreeHit = true; 
      } else if (runoutBallType === "bye" || runoutBallType === "legbye") {
        updatedBalls += 1;
        updatedPartnershipBalls += 1;
        striker.balls += 1;
        currentBowlerObj.balls += 1;

        updatedRuns += runoutRunsScored;
        updatedPartnershipRuns += runoutRunsScored;
        
        updatedThisOver.push("W-RO");

        if (runoutRunsScored % 2 !== 0) {
          b1.isStriker = !b1.isStriker;
          b2.isStriker = !b2.isStriker;
        }
        updatedFreeHit = false; 
      }

      const lastWickObj = {
        name: dismissedBatsmanObj.name,
        runs: dismissedBatsmanObj.runs,
        balls: dismissedBatsmanObj.balls,
        scoreAtWicket: `${state.runs}-${state.wickets}`,
      };

      if (b1.name === dismissedBatsmanObj.name) {
        b1.name = nextBatsmanName.toUpperCase();
        b1.runs = 0;
        b1.balls = 0;
      } else {
        b2.name = nextBatsmanName.toUpperCase();
        b2.runs = 0;
        b2.balls = 0;
      }

      if (updatedWickets >= 10) {
        alert("All out! Innings over.");
      }

      pushUpdate({
        runs: updatedRuns,
        wickets: updatedWickets,
        balls: updatedBalls,
        batsman1: b1,
        batsman2: b2,
        bowler: currentBowlerObj,
        thisOver: updatedThisOver,
        partnershipRuns: 0,
        partnershipBalls: 0,
        lastWicket: lastWickObj,
        freeHit: updatedFreeHit,
        eventTrigger: {
          type: "wicket",
          timestamp: Date.now(),
        },
      });
    }

    const isOverComplete = (updatedBalls % 6 === 0) && (runoutBallType === "legal" || runoutBallType === "bye" || runoutBallType === "legbye");
    if (isOverComplete) {
      b1.isStriker = !b1.isStriker;
      b2.isStriker = !b2.isStriker;
      setShowBowlerModal(true);
    }

    setShowWicketModal(false);
  }

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
      },
      thisOver: [], // Reset current over ball list
    });

    setNextBowlerName("");
    setShowBowlerModal(false);
  }

  function rotateStrikeManually() {
    recordHistory();
    pushUpdate({
      batsman1: { ...state.batsman1, isStriker: !state.batsman1.isStriker },
      batsman2: { ...state.batsman2, isStriker: !state.batsman2.isStriker },
    });
  }

  function handleConfigSubmit(e: React.FormEvent) {
    e.preventDefault();
    recordHistory();
    
    pushUpdate({
      config: {
        team1: team1.toUpperCase(),
        team2: team2.toUpperCase(),
        totalOvers: Number(totalOvers),
        tossWinner: tossWinner.toUpperCase(),
        tossDecision: tossDecision,
      },
      currentInnings: currentInnings,
      target: currentInnings === 2 ? Number(targetVal) : null,
      primaryColor,
      secondaryColor,
      glowColor,
      accentTextColor,
      firstInningsDisplay,
      secondInningsLayout,
      eventTrigger: {
        type: "config",
        timestamp: Date.now(),
      },
    });

    alert("Match configurations saved and synced successfully!");
  }

  function handlePlayersSubmit(e: React.FormEvent) {
    e.preventDefault();
    recordHistory();

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

    alert("Active players list loaded into match graphics!");
  }

  const formatOvers = (b: number) => {
    return `${Math.floor(b / 6)}.${b % 6}`;
  };

  return (
    <div 
      className="w-full min-h-screen select-none text-slate-200 font-sans py-6 transition-all duration-300"
      style={{ backgroundColor: panelBgColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ────────────────────────────────────────────────────────
            OPERATOR STATUS HEADER (Geometric Balance)
            ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#161b22] border border-slate-800 p-5 rounded-xl mb-6 gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest animate-pulse text-white">
              Live Broadcast
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 italic">PRO-SCORE ENGINE v4.2</h1>
              <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-0.5">Operator Scoring & Graphics Controller</p>
            </div>
          </div>
          
          {/* Realtime status indicators */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex flex-col items-end text-right border-r border-slate-800 pr-5">
              <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Sync Status</span>
              <span className="text-green-400 font-bold uppercase text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-ping" />
                Connected (Socket.IO)
              </span>
            </div>

            <div className="flex flex-col items-end text-right border-r border-slate-800 pr-5">
              <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Output Mode</span>
              <span className="text-blue-400 font-bold uppercase text-xs mt-0.5">OBS Alpha Overlay</span>
            </div>

            <button 
              type="button" 
              onClick={resetToNewMatch}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-950/40 border border-red-900/40 hover:bg-red-900/60 rounded-md text-xs text-red-300 transition-all font-semibold cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
              RESET ENGINE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ────────────────────────────────────────────────────────
            LEFT COLUMN (MANAGEMENT PANELS)
            ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* A. CONFIGURATION WORKSPACE */}
          <div className="bg-slate-950 rounded-xl border border-slate-900 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900 border-b border-blue-950 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase">TOSS & CONFIGURATION</h2>
            </div>
            
            <form onSubmit={handleConfigSubmit} className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">TEAM 1 Name</label>
                  <input 
                    type="text" 
                    value={team1} 
                    onChange={(e) => setTeam1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">TEAM 2 Name</label>
                  <input 
                    type="text" 
                    value={team2} 
                    onChange={(e) => setTeam2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-600 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">Total MATCH OVERS</label>
                  <input 
                    type="number" 
                    value={totalOvers} 
                    onChange={(e) => setTotalOvers(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">Innings Selection</label>
                  <select 
                    value={currentInnings} 
                    onChange={(e) => setCurrentInnings(Number(e.target.value) as 1 | 2)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-600 block"
                  >
                    <option value={1}>1st Innings</option>
                    <option value={2}>2nd Innings (Chase)</option>
                  </select>
                </div>
              </div>

              {currentInnings === 2 && (
                <div className="bg-blue-950/20 p-2.5 rounded border border-blue-900/35">
                  <label className="block text-amber-400 text-[10px] font-bold tracking-wider mb-1">TARGET SCORE (Innings 2)</label>
                  <input 
                    type="number" 
                    value={targetVal} 
                    onChange={(e) => setTargetVal(e.target.value)}
                    placeholder="e.g. 58"
                    className="w-full bg-slate-900 border border-blue-900/70 rounded px-2.5 py-1.5 text-xs font-bold text-amber-400 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">Toss Winner</label>
                  <input 
                    type="text" 
                    value={tossWinner} 
                    onChange={(e) => setTossWinner(e.target.value)}
                    placeholder="Team name"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">Toss Decision</label>
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setTossDecision("bat")}                     
                      className={`flex-1 text-center py-1.5 rounded font-bold text-[10px] tracking-wider uppercase border cursor-pointer ${tossDecision === "bat" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                    >
                      BAT
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTossDecision("bowl")}
                      className={`flex-1 text-center py-1.5 rounded font-bold text-[10px] tracking-wider uppercase border cursor-pointer ${tossDecision === "bowl" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                    >
                      BOWL
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 p-2 rounded text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
              >
                <Layers className="w-4 h-4" />
                APPLY CONFIGURATIONS
              </button>
            </form>
          </div>

          {/* B. ACTIVE PLAYERS REGISTRY */}
          <div className="bg-slate-950 rounded-xl border border-slate-900 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900 border-b border-blue-950 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase">ACTIVE PLAYERS</h2>
            </div>
            
            <form onSubmit={handlePlayersSubmit} className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">BATSMAN 1 NAME</label>
                <input 
                  type="text" 
                  value={b1Name} 
                  onChange={(e) => setB1Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">BATSMAN 2 NAME</label>
                <input 
                  type="text" 
                  value={b2Name} 
                  onChange={(e) => setB2Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold tracking-wider mb-1">BOWLER NAME</label>
                <input 
                  type="text" 
                  value={bowlerName} 
                  onChange={(e) => setBowlerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold uppercase"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-500 p-2 rounded text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <Award className="w-4 h-4" />
                LOAD GRAPHICS NAMES
              </button>
            </form>
          </div>

          {/* C. BROADCAST LAYOUT & GRAPHICS THEME STYLER */}
          <div className="bg-slate-950 rounded-xl border border-slate-900 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900 border-b border-blue-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold tracking-wide uppercase font-sans">THEME & PANEL GRAPHICS</h2>
              </div>
              <span className="text-[9px] bg-purple-950 text-purple-350 font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">
                OBS LIVE
              </span>
            </div>

            <div className="p-4 flex flex-col gap-4">
              
              {/* 1. SELECTION DESK AREA */}
              <div className="border border-slate-900 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
                  💡 Dynamic Info Selection
                </span>
                
                {/* 1st Innings select */}
                <div>
                  <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-1 uppercase">
                    1st Innings Panel 3 Metric
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: "projected", label: "PROJ." },
                      { value: "crr", label: "RUN RATE" },
                      { value: "partnership", label: "P'SHIP" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFirstInningsDisplay(opt.value);
                          pushUpdate({ firstInningsDisplay: opt.value as any });
                        }}
                        className={`text-center py-1.5 rounded font-bold text-[10px] tracking-wider uppercase border cursor-pointer transition-all ${
                          firstInningsDisplay === opt.value
                            ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-350"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2nd Innings select */}
                <div>
                  <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-1 uppercase">
                    2nd Innings Graphics Strip
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: "normal", label: "Target & Runrate" },
                      { value: "combined", label: "Chase (Runs/Balls)" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSecondInningsLayout(opt.value);
                          pushUpdate({ secondInningsLayout: opt.value as any });
                        }}
                        className={`text-center py-1.5 rounded font-bold text-[9px] tracking-wider uppercase border cursor-pointer transition-all ${
                          secondInningsLayout === opt.value
                            ? "bg-purple-600/20 border-purple-500 text-purple-400 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-355"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. THEME PRESETS */}
              <div className="border border-slate-900 bg-slate-900/40 p-3 rounded-lg">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-2">
                  🎨 Broadcast Presets Palette
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      name: "IPL Cosmic Blue",
                      primary: "#1d4ed8",
                      secondary: "#581c87",
                      glow: "#c084fc",
                      accent: "#fbbf24",
                      class: "bg-gradient-to-r from-blue-600 to-purple-800"
                    },
                    {
                      name: "World Cup Elite",
                      primary: "#b91c1c",
                      secondary: "#1e293b",
                      glow: "#fca5a5",
                      accent: "#f59e0b",
                      class: "bg-gradient-to-r from-red-600 to-slate-800"
                    },
                    {
                      name: "T20 Neon Mint",
                      primary: "#059669",
                      secondary: "#064e3b",
                      glow: "#6ee7b7",
                      accent: "#fbbf24",
                      class: "bg-gradient-to-r from-emerald-600 to-emerald-950"
                    },
                    {
                      name: "Gold Cyberpunk",
                      primary: "#d97706",
                      secondary: "#db2777",
                      glow: "#fbcfe8",
                      accent: "#ffffff",
                      class: "bg-gradient-to-r from-amber-600 to-pink-600"
                    }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                        setGlowColor(preset.glow);
                        setAccentTextColor(preset.accent);
                        pushUpdate({
                          primaryColor: preset.primary,
                          secondaryColor: preset.secondary,
                          glowColor: preset.glow,
                          accentTextColor: preset.accent
                        });
                      }}
                      className="p-1 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 rounded transition-all text-left flex items-center gap-2 cursor-pointer active:scale-95 text-[10px] font-medium"
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${preset.class} shrink-0`} />
                      <span className="text-slate-300 font-bold tracking-tight leading-none text-[10px]">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. HARDWARE COLOR KNOBS */}
              <div className="border border-slate-900 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
                  🔧 Full Custom Hex Mixing
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-0.5 uppercase">
                      Primary Acc.
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          pushUpdate({ primaryColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          if (e.target.value.length === 7) {
                            pushUpdate({ primaryColor: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 text-[10px] font-mono p-1 rounded font-bold uppercase text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-0.5 uppercase">
                      Secondary Acc.
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          pushUpdate({ secondaryColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          if (e.target.value.length === 7) {
                            pushUpdate({ secondaryColor: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 text-[10px] font-mono p-1 rounded font-bold uppercase text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-0.5 uppercase">
                      Stadium Glow
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={glowColor}
                        onChange={(e) => {
                          setGlowColor(e.target.value);
                          pushUpdate({ glowColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={glowColor}
                        onChange={(e) => {
                          setGlowColor(e.target.value);
                          if (e.target.value.length === 7) {
                            pushUpdate({ glowColor: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 text-[10px] font-mono p-1 rounded font-bold uppercase text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-0.5 uppercase">
                      Digit Accent
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={accentTextColor}
                        onChange={(e) => {
                          setAccentTextColor(e.target.value);
                          pushUpdate({ accentTextColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={accentTextColor}
                        onChange={(e) => {
                          setAccentTextColor(e.target.value);
                          if (e.target.value.length === 7) {
                            pushUpdate({ accentTextColor: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 text-[10px] font-mono p-1 rounded font-bold uppercase text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. BROADCAST ALERT MARQUEES & DYNAMIC CELEBRATIONS */}
              <div className="border border-slate-900 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest text-[#a855f7] uppercase block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Broadcast Alert Customizations
                </span>

                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-1 uppercase">
                      Boundary Four Wording (Max 24 chars)
                    </label>
                    <input
                      type="text"
                      value={fourBoundaryText}
                      onChange={(e) => {
                        setFourBoundaryText(e.target.value);
                        pushUpdate({ fourBoundaryText: e.target.value });
                      }}
                      className="w-full bg-slate-950 border border-slate-850 text-xs p-1.5 rounded font-bold text-slate-300 uppercase focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-1 uppercase">
                      Max Six Wording (Max 24 chars)
                    </label>
                    <input
                      type="text"
                      value={maxSixText}
                      onChange={(e) => {
                        setMaxSixText(e.target.value);
                        pushUpdate({ maxSixText: e.target.value });
                      }}
                      className="w-full bg-slate-950 border border-slate-850 text-xs p-1.5 rounded font-bold text-slate-300 uppercase focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-1 uppercase">
                      Broadcast Alert Theme
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { value: "neon", label: "NEON" },
                        { value: "metallic", label: "METAL" },
                        { value: "cyber", label: "CYBER" },
                        { value: "epic", label: "EPIC" }
                      ].map((themeOpt) => (
                        <button
                          key={themeOpt.value}
                          type="button"
                          onClick={() => {
                            setCelebrationTheme(themeOpt.value as any);
                            pushUpdate({ celebrationTheme: themeOpt.value as any });
                          }}
                          className={`text-[9px] font-extrabold p-1 rounded border transition-all uppercase cursor-pointer ${celebrationTheme === themeOpt.value ? "bg-purple-600/20 border-purple-500 text-purple-400" : "bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-350"}`}
                        >
                          {themeOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. OPERATOR DESK BACKGROUND & BUTTONS CUSTOMIZER */}
              <div className="border border-slate-900 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest text-[#10b981] uppercase block flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  Console Aesthetics Customizer
                </span>

                <div className="flex flex-col gap-2">
                  <label className="block text-slate-500 text-[9px] font-bold tracking-wider mb-0.5 uppercase">
                    Operator Desk Background Preset
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 mb-1">
                    {[
                      { name: "Cosmic", hex: "#0a0a0c" },
                      { name: "Slate", hex: "#0f172a" },
                      { name: "Emerald", hex: "#022c22" },
                      { name: "Navy", hex: "#020617" },
                      { name: "Ruby", hex: "#1c1917" }
                    ].map((pal) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => {
                          setPanelBgColor(pal.hex);
                          pushUpdate({ panelBgColor: pal.hex });
                        }}
                        className={`text-[9px] font-bold py-1 px-0.5 rounded border transition cursor-pointer text-slate-350 ${panelBgColor === pal.hex ? "border-amber-500 bg-slate-900/80 font-black text-amber-400 animate-pulse" : "border-slate-800 bg-slate-950/40"}`}
                      >
                        {pal.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={panelBgColor}
                      onChange={(e) => {
                        setPanelBgColor(e.target.value);
                        pushUpdate({ panelBgColor: e.target.value });
                      }}
                      className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-850 text-[10px] font-mono p-1 rounded font-bold uppercase text-slate-300 focus:outline-none"
                      value={panelBgColor}
                      onChange={(e) => {
                        setPanelBgColor(e.target.value);
                        if (e.target.value.length === 7) {
                          pushUpdate({ panelBgColor: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ────────────────────────────────────────────────────────
            RIGHT COLUMN (SCORING HUB)
            ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* C. MONITOR SCREEN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 border border-slate-900 rounded-xl p-4 shadow-xl">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase mb-1">LIVE RUNS</span>
              <span className="text-3xl font-bold font-mono text-amber-400">{state.runs} - {state.wickets}</span>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase mb-1">OVERS</span>
              <span className="text-3xl font-bold font-mono">{formatOvers(state.balls)} <span className="text-sm text-slate-500">({state.config.totalOvers})</span></span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase mb-1">CURRENT R.R</span>
              <span className="text-3xl font-bold font-mono text-blue-400">
                {state.balls > 0 ? ((state.runs / state.balls) * 6).toFixed(2) : "0.00"}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase mb-1">PROJECTED</span>
              <span className="text-3xl font-bold font-mono text-emerald-400">
                {state.balls > 0 ? Math.round(((state.runs / state.balls) * 6) * state.config.totalOvers) : "0"}
              </span>
            </div>
          </div>

          {/* D. LIVE MATCH OPERATING CONTROL DESK */}
          <div className="bg-slate-950 rounded-xl border border-slate-900 shadow-xl overflow-hidden p-6 flex flex-col gap-6">
            
            {/* Status overview list bar */}
            <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 flex flex-col md:flex-row justify-between gap-4">
              
              {/* Batter 1 card helper */}
              <div className={`flex-1 border p-3 rounded-lg ${state.batsman1.isStriker ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    {state.batsman1.isStriker && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block animate-ping" />}
                    {state.batsman1.name || "BATSMAN 1"}
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-400">{state.batsman1.runs} <span className="text-[10px] text-slate-500">({state.batsman1.balls})</span></span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold font-mono">BATTER INNINGS 01</div>
              </div>

              {/* ROTATE ACTION KEY */}
              <div className="flex items-center justify-center px-1">
                <button 
                  type="button" 
                  onClick={rotateStrikeManually}
                  title="Rotate Batsman Strike"
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-all text-blue-400 active:scale-90 cursor-pointer"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>

              {/* Batter 2 card helper */}
              <div className={`flex-1 border p-3 rounded-lg ${state.batsman2.isStriker ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    {state.batsman2.isStriker && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block animate-ping" />}
                    {state.batsman2.name || "BATSMAN 2"}
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-400">{state.batsman2.runs} <span className="text-[10px] text-slate-500">({state.batsman2.balls})</span></span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold font-mono">BATTER INNINGS 02</div>
              </div>

              {/* Active Bowler tracker */}
              <div className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-300">{state.bowler.name || "BOWLER"}</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {state.bowler.wickets} - {state.bowler.runs}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold font-mono">OVERS: {formatOvers(state.bowler.balls)}</div>
              </div>
            </div>

            {/* LIVE EVENTS BUTTON MATRIX */}
            <div>
              <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">TACTICAL GRAPHICS DESK BOARD</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
                {/* 0 DOT */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(0, "legal")}
                  className="h-16 bg-slate-800 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group shadow-md"
                >
                  <span className="text-2xl font-black font-mono text-slate-300 group-hover:scale-110 transition-transform">0</span>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider">DOT DELIV</span>
                </button>

                {/* 1 RUN */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(1, "legal")}
                  className="h-16 bg-slate-850 border border-slate-700 hover:bg-slate-750 active:bg-slate-700 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group"
                >
                  <span className="text-2xl font-black font-mono text-white group-hover:scale-110 transition-transform">1</span>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider">SINGLE</span>
                </button>

                {/* 2 RUNS */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(2, "legal")}
                  className="h-16 bg-slate-850 border border-slate-700 hover:bg-slate-750 active:bg-slate-700 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group"
                >
                  <span className="text-2xl font-black font-mono text-indigo-300 group-hover:scale-110 transition-transform">2</span>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider">DOUBLE</span>
                </button>

                {/* 3 RUNS */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(3, "legal")}
                  className="h-16 bg-slate-850 border border-slate-700 hover:bg-slate-750 active:bg-slate-700 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group"
                >
                  <span className="text-2xl font-black font-mono text-indigo-400 group-hover:scale-110 transition-transform">3</span>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider">TRIPLE</span>
                </button>

                {/* 4 BOUNDARY */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(4, "legal")}
                  className="h-16 bg-blue-950 border border-blue-800 hover:bg-blue-900 active:bg-blue-800 text-blue-300 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group shadow-lg shadow-blue-900/10"
                >
                  <span className="text-2xl font-black font-mono group-hover:scale-125 transition-transform">4</span>
                  <span className="text-[9px] font-bold tracking-wider">FOUR BOUND</span>
                </button>

                {/* 6 MAXIMUM */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(6, "legal")}
                  className="h-16 bg-amber-950 border border-amber-800 hover:bg-amber-900 active:bg-amber-800 text-amber-400 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center group shadow-lg shadow-amber-900/15"
                >
                  <span className="text-2xl font-black font-mono group-hover:scale-125 transition-transform">6</span>
                  <span className="text-[9px] font-bold tracking-wider">SIX MAXIMUM</span>
                </button>
              </div>

              {/* EXTRAS + SYSTEM FUNCTION BUTTONS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                
                {/* WIDE DELIV */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(0, "wide")}
                  className="py-3 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-900 rounded-lg text-xs font-bold text-indigo-300 tracking-wider cursor-pointer text-center"
                >
                  +1 WIDE (WD)
                </button>

                {/* NO BALL DELIV */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(0, "noball")}
                  className="py-3 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-900 rounded-lg text-xs font-bold text-indigo-300 tracking-wider cursor-pointer text-center"
                >
                  +1 NO BALL (NB)
                </button>

                {/* BYES CARD */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(1, "bye")}
                  className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 tracking-wider cursor-pointer text-center"
                >
                  +1 BYE (B1)
                </button>

                {/* LEG BYES CARD */}
                <button 
                  type="button" 
                  onClick={() => addScoreAction(1, "legbye")}
                  className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 tracking-wider cursor-pointer text-center"
                >
                  +1 LEG BYE (LB1)
                </button>

                {/* WICKET BUTTON (TAKE OUT AT LEVEL) */}
                <button 
                  type="button" 
                  onClick={handleWicketEvent}
                  className="py-3 bg-red-950/75 hover:bg-red-900 border border-red-800 hover:border-red-600 rounded-lg text-xs font-bold text-red-200 tracking-wider cursor-pointer text-center md:col-span-2 shadow-lg"
                >
                  🚨 TARGET OUT (WICKET)
                </button>
              </div>
            </div>

            {/* FEED OF THIS OVER LEGAL EVENTS */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">CURRENT OVER TIMELINE LOG</span>
                
                <button 
                  type="button" 
                  onClick={handleUndo}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-bold bg-amber-500/5 px-2.5 py-1 rounded border border-amber-500/20 hover:border-amber-500/50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  UNDO LAST BALL
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap min-h-10 p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                {state.thisOver.length === 0 ? (
                  <span className="text-xs text-slate-500 font-bold italic uppercase tracking-wider">No deliveries recorded in this over yet...</span>
                ) : (
                  state.thisOver.map((sym, index) => {
                    let pillBg = "bg-slate-800 border-slate-700 text-slate-300";
                    if (sym === "6") pillBg = "bg-amber-500 text-slate-950 border-amber-400 font-black";
                    if (sym === "4") pillBg = "bg-blue-600 text-white border-blue-500 font-black";
                    if (sym === "W") pillBg = "bg-red-600 text-white border-red-500 font-black animate-pulse";
                    return (
                      <div 
                        key={index} 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-sm border shadow ${pillBg}`}
                      >
                        {sym}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          MODALS & OVERLAY WORKSPACES (HTML SUB DIALOGS)
          ──────────────────────────────────────────────────────── */}
      
      {/* 1. BATSMAN WICKET SUBSTITUTION MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-red-900/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in scale-in duration-200 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-red-950/70 pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h3 className="text-base font-black tracking-widest uppercase">CRICKET DISMISSAL DESK</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowWicketModal(false)}
                className="text-slate-500 hover:text-slate-350 text-xs font-bold uppercase transition cursor-pointer"
              >
                [CANCEL]
              </button>
            </div>

            {/* Governed Cricket Law Alerts */}
            {state.freeHit && (
              <div className="bg-blue-950/40 border border-blue-500/50 text-blue-400 rounded-lg p-3 text-xs font-bold flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  🚀 FREE HIT PRIVILEGE (Law 21.18)
                </span>
                <span className="text-[10px] font-normal text-slate-300">
                  A batsman CANNOT be out Caught, Bowled, LBW, or Stumped off a Free Hit delivery. Only Run Out & Obstructing can dismiss stays.
                </span>
              </div>
            )}

            {/* Main Form Fields Grid */}
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* A. Dismissal Selector */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Dismissal Type</label>
                  <select 
                    value={wicketDismissal}
                    onChange={(e) => setWicketDismissal(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Bowled">Bowled</option>
                    <option value="Caught">Caught</option>
                    <option value="Caught & Bowled">Caught & Bowled</option>
                    <option value="LBW">LBW</option>
                    <option value="Stumped">Stumped</option>
                    <option value="Run Out">Run Out</option>
                    <option value="Hit Wicket">Hit Wicket</option>
                    <option value="Obstructing">Obstructing the Field</option>
                  </select>
                </div>

                {/* B. Ball Delivery Selector */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Ball Delivery Type</label>
                  <select 
                    value={runoutBallType}
                    onChange={(e) => setRunoutBallType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="legal">Legal Delivery</option>
                    <option value="wide">Wide Ball (Wide + Runs)</option>
                    <option value="noball">No Ball (No Ball + Runs)</option>
                    <option value="bye">Byes</option>
                    <option value="legbye">Leg Byes</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Rules Exemption Notification Banner */}
              {(() => {
                let showExemptionAlert = false;
                let alertMsg = "";
                
                if (state.freeHit && ["Bowled", "Caught", "Caught & Bowled", "LBW", "Stumped"].includes(wicketDismissal)) {
                  showExemptionAlert = true;
                  alertMsg = `🚨 FREE-HIT LAW: Batsman will be declared NOT OUT (Caught/Bowled exemption). Standard runs will still count!`;
                } else if (runoutBallType === "noball" && ["Bowled", "Caught", "Caught & Bowled", "LBW", "Stumped"].includes(wicketDismissal)) {
                  showExemptionAlert = true;
                  alertMsg = `🚨 NO-BALL LAW (Law 21.18): Batsman will be declared NOT OUT. +1 Penalty extras and bat runs still score.`;
                } else if (runoutBallType === "wide" && ["Bowled", "Caught", "Caught & Bowled", "LBW"].includes(wicketDismissal)) {
                  showExemptionAlert = true;
                  alertMsg = `🚨 WIDE BALL LAW: Batsman will be declared NOT OUT (Wides cannot bowl/catch). +1 Wide penalty and runs still count.`;
                }

                if (!showExemptionAlert) return null;
                return (
                  <div className="bg-amber-950/40 border border-amber-600/50 text-amber-400 rounded-lg p-3 text-xs font-bold font-sans">
                    {alertMsg}
                  </div>
                );
              })()}

              {/* C. Run Out Specific Fields Section */}
              {(wicketDismissal === "Run Out" || wicketDismissal === "Obstructing" || runoutBallType === "wide" || runoutBallType === "noball") && (
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 flex flex-col gap-2.5">
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-emerald-400 block mb-0.5">Scoring & Runout Diagnostics</span>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase">Candidate Dismissed</label>
                      <div className="flex gap-1.5">
                        <button 
                          type="button" 
                          onClick={() => setWicketOutOfWho("striker")}
                          className={`flex-1 text-[10px] font-bold py-1.5 px-1.5 rounded border transition cursor-pointer uppercase ${wicketOutOfWho === "striker" ? "bg-red-600/20 border-red-500 text-red-400" : "bg-slate-950 border-slate-800 text-slate-500"}`}
                        >
                          Striker
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setWicketOutOfWho("non-striker")}
                          className={`flex-1 text-[10px] font-bold py-1.5 px-1.5 rounded border transition cursor-pointer uppercase ${wicketOutOfWho === "non-striker" ? "bg-red-600/20 border-red-500 text-red-400" : "bg-slate-950 border-slate-800 text-slate-500"}`}
                        >
                          Non-Striker
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase">Runs Completed</label>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((val) => (
                          <button 
                            key={val}
                            type="button" 
                            onClick={() => setRunoutRunsScored(val)}
                            className={`flex-1 text-[10px] font-mono font-bold py-1 rounded border cursor-pointer ${runoutRunsScored === val ? "bg-amber-600/20 border-amber-500 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-500"}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* D. Incoming Batsman Name Input */}
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">Incoming Batsman replacement</label>
                <input 
                  type="text" 
                  value={nextBatsmanName}
                  onChange={(e) => setNextBatsmanName(e.target.value)}
                  placeholder="e.g. VIRAT K"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-red-500 text-amber-400 font-sans tracking-wide"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmDetailedWicket();
                  }}
                />
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex gap-2 justify-end border-t border-red-950/40 pt-3">
              <button 
                type="button" 
                onClick={() => setShowWicketModal(false)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold px-4 py-2 rounded text-[11px] uppercase transition cursor-pointer"
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={confirmDetailedWicket}
                className="bg-red-700 hover:bg-red-600 text-white font-black px-5 py-2 rounded text-[11px] uppercase transition shadow-lg shadow-red-500/10 cursor-pointer"
              >
                Confirm Play & Rotate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OVER COMPLETE NEXT BOWLER ROTATION MODAL */}
      {showBowlerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-blue-900/60 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in scale-in">
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <Play className="w-6 h-6" />
              <h3 className="text-lg font-bold tracking-wide uppercase">OVER COMPLETE!</h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-4 h-auto leading-relaxed">
              Standard over spell completed. Please enter the name of the next bowler taking charge from the opposite end.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">Next Bowler Name</label>
              <input 
                type="text" 
                value={nextBowlerName}
                onChange={(e) => setNextBowlerName(e.target.value)}
                placeholder="e.g. JASPRIT B"
                className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-sm font-bold uppercase focus:outline-none focus:border-blue-500 text-emerald-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmBowlerRotation();
                }}
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button 
                type="button" 
                onClick={confirmBowlerRotation}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded text-xs font-bold uppercase transition duration-150 cursor-pointer"
              >
                LOAD NEXT OVER
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
