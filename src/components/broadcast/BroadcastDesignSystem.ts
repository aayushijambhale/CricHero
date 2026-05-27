/**
 * BROADCAST DESIGN SYSTEM
 * Professional IPL/Cricket Broadcast Color, Typography, and Animation Palette
 */

export const BroadcastColors = {
  // Primary Backgrounds
  background: {
    primary: '#020617',    // Deep space black
    secondary: '#071226',  // Dark blue-black
    tertiary: '#0f172a',   // Navy slate
    panel: '#0d1628',      // Panel background
  },

  // Accent Colors
  accent: {
    purple: '#b794f6',     // Electric purple
    gold: '#fbbf24',       // Broadcast gold
    cyan: '#06b6d4',       // Cyan indicator
    silver: '#e2e8f0',     // Metallic silver
    red: '#ef4444',        // Alert red
    green: '#10b981',      // Success green
    amber: '#f59e0b',      // Warning amber
  },

  // Broadcast-specific
  live: '#ef4444',         // LIVE indicator
  program: '#dc2626',      // Program monitor border
  preview: '#10b981',      // Preview monitor border
  recording: '#f97316',    // Recording indicator
  
  // Score/Data
  runs: '#fbbf24',         // Gold runs
  wickets: '#ef4444',      // Red wickets
  overs: '#06b6d4',        // Cyan overs
  
  // Gradients
  gradient: {
    purple: 'linear-gradient(135deg, #5b21b6 0%, #b794f6 100%)',
    gold: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    neon: 'linear-gradient(135deg, #06b6d4 0%, #b794f6 100%)',
  },
};

export const BroadcastTypography = {
  // Font families
  families: {
    display: '"Bebas Neue", sans-serif',
    body: '"Rajdhani", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },

  // Font sizes for broadcast hierarchy
  sizes: {
    scoreMassive: '96px',  // Main score display
    scoreHuge: '72px',     // Overs, runs
    scoreLarge: '48px',    // Secondary scores
    scoreBase: '32px',     // Stat cards
    bodyLarge: '18px',     // Button text
    bodyBase: '14px',      // Regular text
    label: '11px',         // Labels, metadata
    micro: '9px',          // Timestamps, footer
  },

  // Letter spacing
  spacing: {
    tight: '-2px',
    normal: '0px',
    wide: '2px',
    wider: '4px',
  },
};

export const BroadcastAnimations = {
  // Durations (ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 1000,
  },

  // Easing functions
  easing: {
    sharp: 'cubic-bezier(0.4, 0, 1, 1)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Keyframes
  keyframes: {
    glowPulse: `
      @keyframes glowPulse {
        0%, 100% { 
          box-shadow: 0 0 20px rgba(183, 148, 246, 0.5);
        }
        50% {
          box-shadow: 0 0 40px rgba(183, 148, 246, 0.8);
        }
      }
    `,
    scoreCountUp: `
      @keyframes scoreCountUp {
        0% { transform: translateY(20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
    `,
    buttonPress: `
      @keyframes buttonPress {
        0% { transform: translate(0, 0); }
        50% { transform: translate(0, 4px); }
        100% { transform: translate(0, 0); }
      }
    `,
    wicketFlash: `
      @keyframes wicketFlash {
        0% { background-color: transparent; }
        50% { background-color: rgba(239, 68, 68, 0.5); }
        100% { background-color: transparent; }
      }
    `,
    liveIndicator: `
      @keyframes liveIndicator {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `,
    slideIn: `
      @keyframes slideIn {
        0% { transform: translateX(-100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
    `,
  },
};

export const BroadcastEffects = {
  // Glass effect for panels
  glass: `
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(148, 163, 184, 0.1);
  `,

  // Metallic button
  metallic: `
    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  `,

  // Neon glow
  neonGlow: (color: string) => `
    box-shadow: 
      0 0 10px ${color},
      0 0 20px ${color}40,
      inset 0 0 10px ${color}20;
  `,

  // Score glow
  scoreGlow: `
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
    filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.4));
  `,
};

export const BroadcastLayouts = {
  // Grid templates
  controlRoom: 'grid-cols-3 gap-4',
  scoreArea: 'grid-cols-4 gap-2',
  buttonMatrix: 'grid-cols-6 gap-2',
};
