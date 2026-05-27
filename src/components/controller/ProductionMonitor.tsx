import React, { useEffect, useMemo, useRef, useState } from "react";
import { MatchState, ProductionPanelType } from "../../types";
import {
  Palette,
  Layers,
  RefreshCcw,
  Zap,
  SlidersHorizontal,
  Keyboard,
  Save,
  FolderOpen,
  RotateCcw,
  Sparkles,
  Timer,
  Radio,
  Play,
  MoveVertical,
} from "lucide-react";
import { motion } from "motion/react";

interface ProductionMonitorProps {
  state: MatchState;
  pushConfigUpdate: (config: any) => void;
  undo: () => void;
  loading: boolean;
}

type ControlTab =
  | "scoring"
  | "overlays"
  | "theme"
  | "players"
  | "animations"
  | "sponsor"
  | "replay"
  | "settings";

type QueueOverlayType =
  | "batsmanStatsCard"
  | "wicketOverlay"
  | "fallOfWicketCard"
  | "bowlerSpell"
  | "playerMilestone"
  | "partnership"
  | "matchInfo";

interface OverlayQueueItem {
  id: string;
  type: QueueOverlayType;
  label: string;
  duration: number;
  priority: number;
}

interface ThemePreset {
  name: string;
  values: Partial<MatchState> & {
    teamAColor: string;
    teamBColor: string;
  };
}

const THEME_PRESETS: ThemePreset[] = [
  { name: "IPL Dark Neon", values: { primaryColor: "#1d4ed8", secondaryColor: "#dc2626", glowColor: "#a855f7", accentTextColor: "#fbbf24", panelBgColor: "#020617", teamAColor: "#1d4ed8", teamBColor: "#dc2626", stripTransparency: 1, shadowDepth: 0.7, borderRadius: 8, gradientStyle: "linear", fontSelector: "Bebas Neue", stripLayoutSelector: "classic" } },
  { name: "Cricbuzz Modern", values: { primaryColor: "#0ea5e9", secondaryColor: "#14b8a6", glowColor: "#38bdf8", accentTextColor: "#facc15", panelBgColor: "#0b1220", teamAColor: "#0ea5e9", teamBColor: "#14b8a6", stripTransparency: 0.96, shadowDepth: 0.45, borderRadius: 10, gradientStyle: "split", fontSelector: "Rajdhani", stripLayoutSelector: "compact" } },
  { name: "Star Sports Gold", values: { primaryColor: "#0f172a", secondaryColor: "#7c2d12", glowColor: "#f59e0b", accentTextColor: "#fbbf24", panelBgColor: "#030712", teamAColor: "#1e293b", teamBColor: "#7c2d12", stripTransparency: 1, shadowDepth: 0.8, borderRadius: 6, gradientStyle: "linear", fontSelector: "Bebas Neue", stripLayoutSelector: "extended" } },
  { name: "Minimal Flat", values: { primaryColor: "#334155", secondaryColor: "#64748b", glowColor: "#94a3b8", accentTextColor: "#e2e8f0", panelBgColor: "#0f172a", teamAColor: "#334155", teamBColor: "#64748b", stripTransparency: 1, shadowDepth: 0.2, borderRadius: 4, gradientStyle: "linear", fontSelector: "Rajdhani", stripLayoutSelector: "compact" } },
  { name: "Glassmorphism", values: { primaryColor: "#1e40af", secondaryColor: "#9333ea", glowColor: "#60a5fa", accentTextColor: "#f8fafc", panelBgColor: "#020617", teamAColor: "#1e40af", teamBColor: "#9333ea", stripTransparency: 0.86, shadowDepth: 0.55, borderRadius: 14, gradientStyle: "radial", fontSelector: "Rajdhani", stripLayoutSelector: "classic" } },
  { name: "ESPN Style", values: { primaryColor: "#b91c1c", secondaryColor: "#111827", glowColor: "#ef4444", accentTextColor: "#f8fafc", panelBgColor: "#020617", teamAColor: "#b91c1c", teamBColor: "#1f2937", stripTransparency: 1, shadowDepth: 0.65, borderRadius: 6, gradientStyle: "split", fontSelector: "Bebas Neue", stripLayoutSelector: "extended" } },
  { name: "ICC Broadcast", values: { primaryColor: "#1d4ed8", secondaryColor: "#0f766e", glowColor: "#22d3ee", accentTextColor: "#fbbf24", panelBgColor: "#020617", teamAColor: "#1d4ed8", teamBColor: "#0f766e", stripTransparency: 1, shadowDepth: 0.7, borderRadius: 8, gradientStyle: "linear", fontSelector: "Bebas Neue", stripLayoutSelector: "classic" } },
  { name: "Sony Sports", values: { primaryColor: "#4c1d95", secondaryColor: "#e11d48", glowColor: "#c084fc", accentTextColor: "#f59e0b", panelBgColor: "#030712", teamAColor: "#4c1d95", teamBColor: "#e11d48", stripTransparency: 0.95, shadowDepth: 0.6, borderRadius: 8, gradientStyle: "radial", fontSelector: "Orbitron", stripLayoutSelector: "classic" } },
  { name: "Cinematic Red", values: { primaryColor: "#991b1b", secondaryColor: "#7f1d1d", glowColor: "#ef4444", accentTextColor: "#fde68a", panelBgColor: "#020617", teamAColor: "#991b1b", teamBColor: "#7f1d1d", stripTransparency: 0.98, shadowDepth: 0.9, borderRadius: 10, gradientStyle: "split", fontSelector: "Bebas Neue", stripLayoutSelector: "extended" } },
  { name: "Ultra Professional", values: { primaryColor: "#2563eb", secondaryColor: "#dc2626", glowColor: "#22d3ee", accentTextColor: "#facc15", panelBgColor: "#020617", teamAColor: "#2563eb", teamBColor: "#dc2626", stripTransparency: 1, shadowDepth: 0.75, borderRadius: 8, gradientStyle: "linear", fontSelector: "Orbitron", stripLayoutSelector: "classic" } },
];

export function ProductionMonitor({ state, pushConfigUpdate, undo, loading }: ProductionMonitorProps) {
  const [tab, setTab] = useState<ControlTab>("overlays");
  const [queue, setQueue] = useState<OverlayQueueItem[]>([]);
  const [isOverlayRunning, setIsOverlayRunning] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(THEME_PRESETS[0].name);
  const [theme, setTheme] = useState({
    primaryColor: state.primaryColor || "#1d4ed8",
    secondaryColor: state.secondaryColor || "#dc2626",
    teamAColor: state.config.team1Color || "#1d4ed8",
    teamBColor: state.config.team2Color || "#dc2626",
    gradientStyle: state.gradientStyle || "linear",
    stripTransparency: state.stripTransparency ?? 1,
    glowIntensity: state.glowIntensity ?? 0.75,
    borderRadius: state.borderRadius ?? 8,
    shadowDepth: state.shadowDepth ?? 0.6,
    fontSelector: state.fontSelector || "Bebas Neue",
    stripLayoutSelector: state.stripLayoutSelector || "classic",
    accentTextColor: state.accentTextColor || "#fbbf24",
    glowColor: state.glowColor || "#c084fc",
  });
  const runningTimerRef = useRef<number | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const lastEventTsRef = useRef<number>(0);

  useEffect(() => {
    setTheme(prev => ({
      ...prev,
      primaryColor: state.primaryColor || prev.primaryColor,
      secondaryColor: state.secondaryColor || prev.secondaryColor,
      teamAColor: state.config.team1Color || prev.teamAColor,
      teamBColor: state.config.team2Color || prev.teamBColor,
      gradientStyle: state.gradientStyle || prev.gradientStyle,
      stripTransparency: state.stripTransparency ?? prev.stripTransparency,
      glowIntensity: state.glowIntensity ?? prev.glowIntensity,
      borderRadius: state.borderRadius ?? prev.borderRadius,
      shadowDepth: state.shadowDepth ?? prev.shadowDepth,
      fontSelector: state.fontSelector || prev.fontSelector,
      stripLayoutSelector: state.stripLayoutSelector || prev.stripLayoutSelector,
      accentTextColor: state.accentTextColor || prev.accentTextColor,
      glowColor: state.glowColor || prev.glowColor,
    }));
  }, [state]);

  useEffect(() => {
    const evt = state.eventTrigger;
    if (!evt || evt.timestamp === lastEventTsRef.current) return;
    lastEventTsRef.current = evt.timestamp;

    if (evt.type === "wicket") enqueueOverlay("wicketOverlay", 10, 7000);
    else if (evt.type === "four" || evt.type === "six") enqueueOverlay("matchInfo", 5, 3200);
    else if (evt.type === "milestone") enqueueOverlay("playerMilestone", 9, 6500);
    if (state.partnershipRuns > 0 && state.partnershipRuns % 50 === 0) enqueueOverlay("partnership", 6, 5000);
    if (state.powerplay && state.balls % 6 === 0 && state.balls <= 36) enqueueOverlay("matchInfo", 4, 3000);
  }, [state.eventTrigger, state.partnershipRuns, state.powerplay, state.balls]);

  useEffect(() => {
    if (isOverlayRunning || queue.length === 0) return;
    const sorted = [...queue].sort((a, b) => b.priority - a.priority);
    const next = sorted[0];
    setQueue(prev => prev.filter(item => item.id !== next.id));
    activateOverlay(next);
  }, [queue, isOverlayRunning]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (e.key === "1") pushConfigUpdate({ scoreStripVisible: true, overlayVisible: true });
      if (e.key === "2") enqueueOverlay("batsmanStatsCard", 7, 5000);
      if (e.key === "3") enqueueOverlay("bowlerSpell", 7, 5000);
      if (e.key === "4") enqueueOverlay("wicketOverlay", 10, 7000);
      if (e.key === "5") enqueueOverlay("partnership", 6, 5000);
      if (e.key === "6") pushConfigUpdate({ activeProductionPanel: null, scoreStripVisible: false, overlayVisible: false });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pushConfigUpdate]);

  useEffect(() => {
    return () => {
      if (runningTimerRef.current) {
        window.clearTimeout(runningTimerRef.current);
      }
    };
  }, []);

  const overlayButtons = useMemo(
    () => [
      { type: "batsmanStatsCard" as const, label: "Batsman Stats", priority: 7, duration: 5000 },
      { type: "wicketOverlay" as const, label: "Wicket", priority: 10, duration: 7000 },
      { type: "fallOfWicketCard" as const, label: "Fall Of Wicket", priority: 8, duration: 5000 },
      { type: "bowlerSpell" as const, label: "Bowler Spell", priority: 7, duration: 5000 },
      { type: "playerMilestone" as const, label: "Milestone", priority: 9, duration: 6000 },
      { type: "partnership" as const, label: "Partnership", priority: 6, duration: 5000 },
      { type: "matchInfo" as const, label: "Match Info", priority: 5, duration: 4000 },
    ],
    []
  );

  function enqueueOverlay(type: QueueOverlayType, priority = 5, duration = 4000) {
    const label = overlayButtons.find(x => x.type === type)?.label || type;
    const item: OverlayQueueItem = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      label,
      priority,
      duration,
    };
    setQueue(prev => [...prev, item]);
  }

  function buildOverlayPayload(type: QueueOverlayType) {
    if (type === "batsmanStatsCard") {
      const striker = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
      return {
        panelType: "batsmanStatsCard" as ProductionPanelType,
        data: {
          name: striker.name,
          runs: striker.runs,
          balls: striker.balls,
          strikeRate: striker.strikeRate,
          fours: striker.fours,
          sixes: striker.sixes,
          partnershipRuns: state.partnershipRuns,
        },
        hideStrip: false,
      };
    }

    if (type === "wicketOverlay") {
      return {
        panelType: "wicketOverlay" as ProductionPanelType,
        data: {
          batsmanName: state.lastWicket?.name || "BATSMAN",
          score: `${state.lastWicket?.runs ?? 0} (${state.lastWicket?.balls ?? 0})`,
          dismissal: state.lastWicket?.dismissalType || "OUT",
          bowler: state.bowler.name,
          scoreAtWicket: state.lastWicket?.scoreAtWicket || `${state.runs}-${state.wickets}`,
          hideMainStrip: true,
        },
        hideStrip: true,
      };
    }

    if (type === "fallOfWicketCard") {
      return {
        panelType: "fallOfWicketCard" as ProductionPanelType,
        data: {
          scoreAtWicket: state.lastWicket?.scoreAtWicket || `${state.runs}-${state.wickets}`,
          over: `${Math.floor(state.balls / 6)}.${state.balls % 6}`,
          partnershipBroken: `${state.partnershipRuns} (${state.partnershipBalls})`,
          impact: state.requiredRunRate ? `RRR ${state.requiredRunRate.toFixed(2)}` : "N/A",
        },
        hideStrip: false,
      };
    }

    if (type === "bowlerSpell") {
      return {
        panelType: "bowlerSpell" as ProductionPanelType,
        data: {
          name: state.bowler.name,
          overs: `${Math.floor(state.bowler.balls / 6)}.${state.bowler.balls % 6}`,
          maidens: state.bowler.maidens,
          runs: state.bowler.runs,
          wickets: state.bowler.wickets,
          economy: state.bowler.economy,
        },
        hideStrip: false,
      };
    }

    if (type === "playerMilestone") {
      const striker = state.batsman1.isStriker ? state.batsman1 : state.batsman2;
      const milestone = striker.runs >= 100 ? "CENTURY" : striker.runs >= 50 ? "FIFTY" : "MILESTONE";
      return {
        panelType: "playerMilestone" as ProductionPanelType,
        data: {
          player: striker.name,
          milestone,
          runs: striker.runs,
          balls: striker.balls,
          hideMainStrip: true,
        },
        hideStrip: true,
      };
    }

    if (type === "matchInfo") {
      return {
        panelType: "matchInfo" as ProductionPanelType,
        data: {
          currentRunRate: state.currentRunRate,
          requiredRunRate: state.requiredRunRate,
          winProbability: state.winProbability,
          projectedScore: state.projectedScore,
        },
        hideStrip: false,
      };
    }

    return {
      panelType: "partnership" as ProductionPanelType,
      data: {
        batsman1: state.batsman1.name,
        batsman2: state.batsman2.name,
        runs: state.partnershipRuns,
        balls: state.partnershipBalls,
      },
      hideStrip: false,
    };
  }

  function activateOverlay(item: OverlayQueueItem) {
    const payload = buildOverlayPayload(item.type);
    setIsOverlayRunning(true);

    pushConfigUpdate({
      activeProductionPanel: {
        type: payload.panelType,
        visible: true,
        data: payload.data,
        displayDuration: item.duration,
        priority: item.priority,
        timestamp: Date.now(),
      },
      scoreStripVisible: payload.hideStrip ? false : true,
      overlayVisible: true,
    });

    runningTimerRef.current = window.setTimeout(() => {
      pushConfigUpdate({
        activeProductionPanel: null,
        scoreStripVisible: true,
      });
      setIsOverlayRunning(false);
      runningTimerRef.current = null;
    }, item.duration);
  }

  function onThemeChange<K extends keyof typeof theme>(key: K, value: (typeof theme)[K]) {
    const nextTheme = { ...theme, [key]: value };
    setTheme(nextTheme);

    pushConfigUpdate({
      primaryColor: nextTheme.primaryColor,
      secondaryColor: nextTheme.secondaryColor,
      glowColor: nextTheme.glowColor,
      accentTextColor: nextTheme.accentTextColor,
      gradientStyle: nextTheme.gradientStyle,
      stripTransparency: nextTheme.stripTransparency,
      glowIntensity: nextTheme.glowIntensity,
      borderRadius: nextTheme.borderRadius,
      shadowDepth: nextTheme.shadowDepth,
      fontSelector: nextTheme.fontSelector,
      stripLayoutSelector: nextTheme.stripLayoutSelector,
      config: {
        ...state.config,
        team1Color: nextTheme.teamAColor,
        team2Color: nextTheme.teamBColor,
      },
    });
  }

  function applyPreset(name: string) {
    const preset = THEME_PRESETS.find(p => p.name === name);
    if (!preset) return;
    setSelectedPreset(name);

    const values = preset.values;
    const next = {
      ...theme,
      primaryColor: values.primaryColor || theme.primaryColor,
      secondaryColor: values.secondaryColor || theme.secondaryColor,
      teamAColor: values.teamAColor,
      teamBColor: values.teamBColor,
      gradientStyle: values.gradientStyle || theme.gradientStyle,
      stripTransparency: values.stripTransparency ?? theme.stripTransparency,
      glowIntensity: values.glowIntensity ?? theme.glowIntensity,
      borderRadius: values.borderRadius ?? theme.borderRadius,
      shadowDepth: values.shadowDepth ?? theme.shadowDepth,
      fontSelector: values.fontSelector || theme.fontSelector,
      stripLayoutSelector: values.stripLayoutSelector || theme.stripLayoutSelector,
      accentTextColor: values.accentTextColor || theme.accentTextColor,
      glowColor: values.glowColor || theme.glowColor,
    };

    setTheme(next);
    pushConfigUpdate({
      ...values,
      config: {
        ...state.config,
        team1Color: values.teamAColor,
        team2Color: values.teamBColor,
      },
    });
  }

  function saveTheme() {
    localStorage.setItem("crichero-theme-studio", JSON.stringify(theme));
  }

  function loadSavedTheme() {
    const raw = localStorage.getItem("crichero-theme-studio");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const next = { ...theme, ...parsed };
      setTheme(next);
      pushConfigUpdate({
        primaryColor: next.primaryColor,
        secondaryColor: next.secondaryColor,
        glowColor: next.glowColor,
        accentTextColor: next.accentTextColor,
        gradientStyle: next.gradientStyle,
        stripTransparency: next.stripTransparency,
        glowIntensity: next.glowIntensity,
        borderRadius: next.borderRadius,
        shadowDepth: next.shadowDepth,
        fontSelector: next.fontSelector,
        stripLayoutSelector: next.stripLayoutSelector,
        config: {
          ...state.config,
          team1Color: next.teamAColor,
          team2Color: next.teamBColor,
        },
      });
    } catch {
      // ignore malformed local storage payload
    }
  }

  function resetTheme() {
    applyPreset("Ultra Professional");
  }

  function handleDragStart(id: string) {
    dragItemRef.current = id;
  }

  function handleDrop(id: string) {
    const dragId = dragItemRef.current;
    if (!dragId || dragId === id) return;

    setQueue(prev => {
      const from = prev.findIndex(q => q.id === dragId);
      const to = prev.findIndex(q => q.id === id);
      if (from < 0 || to < 0) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(from, 1);
      clone.splice(to, 0, moved);
      return clone;
    });

    dragItemRef.current = null;
  }

  const tabs: Array<{ id: ControlTab; label: string }> = [
    { id: "scoring", label: "Scoring" },
    { id: "overlays", label: "Overlays" },
    { id: "theme", label: "Theme Studio" },
    { id: "players", label: "Players" },
    { id: "animations", label: "Animations" },
    { id: "sponsor", label: "Sponsor Graphics" },
    { id: "replay", label: "Replay Graphics" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-2">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2 py-2 rounded-lg text-[11px] font-bold tracking-wide transition ${tab === t.id ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#071226] border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          LIVE BROADCAST CONTROLS
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => pushConfigUpdate({ scoreStripVisible: !state.scoreStripVisible })} className="px-2 py-1 text-[10px] border border-slate-700 rounded bg-slate-900/80 text-slate-200 hover:border-cyan-400/40">Strip {state.scoreStripVisible ? "ON" : "OFF"}</button>
          <button onClick={() => pushConfigUpdate({ overlayVisible: !state.overlayVisible })} className="px-2 py-1 text-[10px] border border-slate-700 rounded bg-slate-900/80 text-slate-200 hover:border-cyan-400/40">Overlay {state.overlayVisible ? "ON" : "OFF"}</button>
          <button onClick={undo} disabled={loading} className="px-2 py-1 text-[10px] border border-red-800 rounded bg-red-950/70 text-red-300 hover:bg-red-900/70 disabled:opacity-50 flex items-center gap-1"><RefreshCcw className="w-3 h-3"/>Undo</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {(tab === "overlays" || tab === "scoring") && (
          <>
            <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
              <h3 className="text-xs font-bold text-cyan-300 tracking-widest flex items-center gap-2 mb-3"><Layers className="w-4 h-4"/>OVERLAY MANAGER</h3>
              <div className="grid grid-cols-2 gap-2">
                {overlayButtons.map(btn => (
                  <button
                    key={btn.type}
                    onClick={() => enqueueOverlay(btn.type, btn.priority, btn.duration)}
                    className="text-left px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-cyan-400/50 hover:bg-slate-800 text-slate-200"
                  >
                    <div className="text-xs font-bold">{btn.label}</div>
                    <div className="text-[10px] text-slate-500">P{btn.priority} • {Math.round(btn.duration / 1000)}s</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
              <h3 className="text-xs font-bold text-violet-300 tracking-widest flex items-center gap-2 mb-3"><Timer className="w-4 h-4"/>GRAPHICS QUEUE</h3>
              <div className="space-y-2">
                {queue.length === 0 && <div className="text-[11px] text-slate-500">Queue is empty.</div>}
                {queue.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(item.id)}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs flex items-center justify-between cursor-move"
                  >
                    <div className="flex items-center gap-2">
                      <MoveVertical className="w-3 h-3 text-slate-500" />
                      <span className="font-bold text-slate-200">{item.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">P{item.priority} • {Math.round(item.duration / 1000)}s</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
              <h3 className="text-xs font-bold text-amber-300 tracking-widest flex items-center gap-2 mb-2"><Keyboard className="w-4 h-4"/>HOTKEYS</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>1 = Show Score Strip</div><div>2 = Batsman Stats</div>
                <div>3 = Bowler Spell</div><div>4 = Wicket Overlay</div>
                <div>5 = Partnership</div><div>6 = Hide All</div>
              </div>
            </div>
          </>
        )}

        {tab === "theme" && (
          <>
            <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
              <h3 className="text-xs font-bold text-fuchsia-300 tracking-widest flex items-center gap-2 mb-3"><Palette className="w-4 h-4"/>THEME STUDIO</h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorControl label="Primary Strip" value={theme.primaryColor} onChange={v => onThemeChange("primaryColor", v)} />
                <ColorControl label="Secondary Accent" value={theme.secondaryColor} onChange={v => onThemeChange("secondaryColor", v)} />
                <ColorControl label="Team A" value={theme.teamAColor} onChange={v => onThemeChange("teamAColor", v)} />
                <ColorControl label="Team B" value={theme.teamBColor} onChange={v => onThemeChange("teamBColor", v)} />
                <ColorControl label="Glow" value={theme.glowColor} onChange={v => onThemeChange("glowColor", v)} />
                <ColorControl label="Accent Text" value={theme.accentTextColor} onChange={v => onThemeChange("accentTextColor", v)} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <SelectControl label="Gradient Style" value={theme.gradientStyle} options={["linear", "radial", "split"]} onChange={v => onThemeChange("gradientStyle", v as any)} />
                <SelectControl label="Font Selector" value={theme.fontSelector} options={["Bebas Neue", "Rajdhani", "Orbitron"]} onChange={v => onThemeChange("fontSelector", v as any)} />
                <SelectControl label="Strip Layout" value={theme.stripLayoutSelector} options={["classic", "compact", "extended"]} onChange={v => onThemeChange("stripLayoutSelector", v as any)} />
                <SelectControl label="Style" value={state.stripStyle || "modern"} options={["modern", "clean"]} onChange={v => pushConfigUpdate({ stripStyle: v })} />
              </div>

              <div className="mt-3 space-y-3">
                <SliderControl label="Transparency" min={0.5} max={1} step={0.01} value={theme.stripTransparency} onChange={v => onThemeChange("stripTransparency", v)} />
                <SliderControl label="Glow Intensity" min={0} max={1} step={0.01} value={theme.glowIntensity} onChange={v => onThemeChange("glowIntensity", v)} />
                <SliderControl label="Border Radius" min={0} max={20} step={1} value={theme.borderRadius} onChange={v => onThemeChange("borderRadius", v)} />
                <SliderControl label="Shadow Depth" min={0} max={1} step={0.01} value={theme.shadowDepth} onChange={v => onThemeChange("shadowDepth", v)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={saveTheme} className="px-3 py-2 text-xs font-bold rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 flex items-center gap-1"><Save className="w-3 h-3"/>Save Theme</button>
                <button onClick={loadSavedTheme} className="px-3 py-2 text-xs font-bold rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 flex items-center gap-1"><FolderOpen className="w-3 h-3"/>Load Theme Preset</button>
                <button onClick={resetTheme} className="px-3 py-2 text-xs font-bold rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 flex items-center gap-1"><RotateCcw className="w-3 h-3"/>Reset Theme</button>
              </div>
            </div>

            <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
              <h3 className="text-xs font-bold text-emerald-300 tracking-widest flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4"/>GRAPHICS PRESETS</h3>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.name)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-bold ${selectedPreset === preset.name ? "bg-emerald-600/20 border-emerald-400/50 text-emerald-300" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-emerald-400/40"}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {(tab === "animations" || tab === "sponsor" || tab === "replay" || tab === "players" || tab === "settings") && (
          <div className="bg-[#0b1220] border border-slate-700/60 rounded-xl p-3">
            <h3 className="text-xs font-bold text-slate-300 tracking-widest flex items-center gap-2 mb-3"><SlidersHorizontal className="w-4 h-4"/>LIVE BROADCAST CONTROLS</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 flex items-center gap-2"><Zap className="w-3 h-3 text-cyan-400"/>Auto Transitions</button>
              <button className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 flex items-center gap-2"><Play className="w-3 h-3 text-emerald-400"/>Run Sponsor Stinger</button>
              <button className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 flex items-center gap-2"><Sparkles className="w-3 h-3 text-amber-400"/>Replay Wipe</button>
              <button className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 flex items-center gap-2"><Layers className="w-3 h-3 text-violet-400"/>Emergency Clear Queue</button>
            </div>
            <div className="text-[11px] text-slate-500">Current tab: {tab}. Broadcast-grade controls are modular and synchronized in realtime over Socket.IO.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-300">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-6 bg-transparent border-0" />
        <span className="font-mono text-[10px] text-slate-500">{value}</span>
      </div>
    </label>
  );
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="text-[11px] text-slate-300">
      <div className="mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-2 text-[11px] text-slate-200">
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}

function SliderControl({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-[11px] text-slate-300 block">
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className="font-mono text-slate-500">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}
