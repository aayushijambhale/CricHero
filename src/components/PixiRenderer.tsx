/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { MatchState } from "../types";

interface PixiRendererProps {
  state: MatchState;
}

// ────────────────────────────────────────────────────────
// HELPER UTILITIES FOR COLOUR BLENDING & IN-GAME STYLING
// ────────────────────────────────────────────────────────

function hexStringToNumber(hex: string | undefined, defaultVal: number): number {
  if (!hex) return defaultVal;
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return isNaN(num) ? defaultVal : num;
}

function blendHexColors(c1: string, c2: string, ratio: number): string {
  c1 = c1.replace("#", "");
  c2 = c2.replace("#", "");
  try {
    const r1 = parseInt(c1.substring(0, 2), 16);
    const g1 = parseInt(c1.substring(2, 4), 16);
    const b1 = parseInt(c1.substring(4, 6), 16);
    const r2 = parseInt(c2.substring(0, 2), 16);
    const g2 = parseInt(c2.substring(2, 4), 16);
    const b2 = parseInt(c2.substring(4, 6), 16);
    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join("");
  } catch (e) {
    return "#" + c1;
  }
}

function blendStringToNumber(c1: string, defaultHex: number, ratio: number): number {
  try {
    const blended = blendHexColors(c1, "#000000", ratio);
    return hexStringToNumber(blended, defaultHex);
  } catch (e) {
    return defaultHex;
  }
}

function createGradientTexture(colors: string[], w: number, h: number): PIXI.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    colors.forEach((color, index) => {
      grad.addColorStop(index / (colors.length - 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  return PIXI.Texture.from(canvas);
}

function drawGlowBarLive(glow: PIXI.Graphics, xTop: number, xBottom: number, h: number, colors: number[]) {
  glow.clear();
  
  // 1. Hot white thin line
  glow.stroke({ color: 0xffffff, width: 2.2, alignment: 0.5 });
  glow.moveTo(xTop, 0);
  glow.lineTo(xBottom, h);
  glow.stroke();
  
  // 2. Linear Bloom (staged bloom glow indices)
  glow.stroke({ color: colors[0], width: 7, alignment: 0.5, alpha: 0.35 });
  glow.moveTo(xTop, 0);
  glow.lineTo(xBottom, h);
  glow.stroke();
  
  glow.stroke({ color: colors[1] || colors[0], width: 16, alignment: 0.5, alpha: 0.16 });
  glow.moveTo(xTop, 0);
  glow.lineTo(xBottom, h);
  glow.stroke();
}

export default function PixiRenderer({ state }: PixiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  
  // Keep track of previous coordinates for animating changes
  const prevStateRef = useRef<MatchState | null>(null);
  const dynamicFieldsRef = useRef<{
    scoreText?: PIXI.Text;
    oversText?: PIXI.Text;
    tickerText?: PIXI.Text;
    teamNameText?: PIXI.Text;
    
    batsman1Name?: PIXI.Text;
    batsman1Runs?: PIXI.Text;
    batsman1Balls?: PIXI.Text;
    batsman1StrikerIndicator?: PIXI.Graphics;
    
    batsman2Name?: PIXI.Text;
    batsman2Runs?: PIXI.Text;
    batsman2Balls?: PIXI.Text;
    batsman2StrikerIndicator?: PIXI.Graphics;
    
    infoTitleText?: PIXI.Text;
    infoValueText?: PIXI.Text;
    infoValueLabelSub?: PIXI.Text;
    
    bowlerName?: PIXI.Text;
    bowlerFigures?: PIXI.Text;
    bowlerOvers?: PIXI.Text;
    ballsContainer?: PIXI.Container;
    
    chaseRunsValueText?: PIXI.Text;
    chaseBallsValueText?: PIXI.Text;
    
    opponentBrandText1?: PIXI.Text;
    opponentBrandText2?: PIXI.Text;
    
    eventOverlayContainer?: PIXI.Container;
    eventOverlayText?: PIXI.Text;
    eventOverlayBg?: PIXI.Graphics;
    
    stripContainer?: PIXI.Container;
    glowingBar?: PIXI.Graphics;

    // Gradient backgrounds containers
    p1NasirBg?: PIXI.Container;
    p1FalakBg?: PIXI.Container;
    p3SlateBg?: PIXI.Container;
    p3PurpleBg?: PIXI.Container;
    p4BowlerBg?: PIXI.Container;
    p4ChaseBg?: PIXI.Container;
    p5FalakBg?: PIXI.Container;
    p5NasirBg?: PIXI.Container;

    // Dynamic sprite & border pointers for theme refresh
    p1NasirBgSprite?: PIXI.Sprite;
    p1NasirBgBorder?: PIXI.Graphics;
    p1FalakBgSprite?: PIXI.Sprite;
    p1FalakBgBorder?: PIXI.Graphics;

    p2BgSprite?: PIXI.Sprite;
    p2BgBorder?: PIXI.Graphics;

    p3SlateBgSprite?: PIXI.Sprite;
    p3SlateBgBorder?: PIXI.Graphics;
    p3PurpleBgSprite?: PIXI.Sprite;
    p3PurpleBgBorder?: PIXI.Graphics;

    p4BowlerBgSprite?: PIXI.Sprite;
    p4BowlerBgBorder?: PIXI.Graphics;
    p4ChaseBgSprite?: PIXI.Sprite;
    p4ChaseBgBorder?: PIXI.Graphics;

    p5FalakBgSprite?: PIXI.Sprite;
    p5FalakBgBorder?: PIXI.Graphics;
    p5NasirBgSprite?: PIXI.Sprite;
    p5NasirBgBorder?: PIXI.Graphics;

    // Group containers
    p4BowlerContainer?: PIXI.Container;
    p4ChaseContainer?: PIXI.Container;

    // Neon glow bars
    glowBar1?: PIXI.Graphics;
    glowBar2?: PIXI.Graphics;
    edgeHighlight?: PIXI.Graphics;
  }>({});

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let isDestroyed = false;

    async function initPixi() {
      if (!containerRef.current) return;
      
      const width = 1420;
      const height = 150;

      const newApp = new PIXI.Application();
      
      // Safeguard: define dummy _cancelResize
      (newApp as any)._cancelResize = () => {};

      try {
        await newApp.init({
          width: width,
          height: height,
          backgroundAlpha: 0, // Transparent background for video overlay
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
      } catch (err) {
        console.error("PIXI application initialization failed", err);
        return;
      }

      if (isDestroyed) {
        try {
          newApp.destroy(true, { children: true });
        } catch (e) {
          console.warn("Error destroying unused PIXI app instance:", e);
        }
        return;
      }

      app = newApp;
      pixiAppRef.current = newApp;
      containerRef.current.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "auto";
      app.canvas.style.maxWidth = "1420px";
      app.canvas.style.display = "block";
      app.canvas.style.margin = "0 auto";

      // Root container with slight y-offset
      const stripContainer = new PIXI.Container();
      stripContainer.y = 20;
      app.stage.addChild(stripContainer);
      dynamicFieldsRef.current.stripContainer = stripContainer;

      // ────────────────────────────────────────────────────────
      // CORE GRADIENT TEXTURES (HTML5 Canvas Bridges initializers)
      // ────────────────────────────────────────────────────────
      const nasirBatTexture = createGradientTexture(["#1d4ed8", "#1e3a8a", "#070b15"], 450, 85);
      const falakBatTexture = createGradientTexture(["#1e293b", "#0f172a", "#030408"], 450, 85);
      const batsmanTexture = createGradientTexture(["#070d1a", "#03050b"], 390, 85);
      const darkInfoTexture = createGradientTexture(["#070b14", "#020306"], 160, 85);
      const purpleInfoTexture = createGradientTexture(["#581c87", "#2e1065", "#0a0515"], 160, 85);
      const bowlerTexture = createGradientTexture(["#070b14", "#020306"], 280, 85);
      const purpleChaseTexture = createGradientTexture(["#581c87", "#2e1065", "#0a0515"], 280, 85);
      const falakBrandTexture = createGradientTexture(["#1e293b", "#0f172a", "#030408"], 170, 85);
      const nasirBrandTexture = createGradientTexture(["#581c87", "#2e1065", "#0a0515"], 170, 85);

      // ────────────────────────────────────────────────────────
      // GEOMETRIC SLANTED BASE PANEL BUILDER
      // Height of strip is 85px. Skew angle is 10px.
      // ────────────────────────────────────────────────────────
      const drawPanelBg = (
        xTopStart: number,
        xTopEnd: number,
        xBottomStart: number,
        xBottomEnd: number,
        texture: PIXI.Texture,
        strokeColor: number,
        strokeWidth: number = 1.5
      ) => {
        const pContainer = new PIXI.Container();
        
        // 1. Mask shape
        const mask = new PIXI.Graphics();
        mask.fill({ color: 0xffffff });
        mask.moveTo(xTopStart, 0);
        mask.lineTo(xTopEnd, 0);
        mask.lineTo(xBottomEnd, 85);
        mask.lineTo(xBottomStart, 85);
        mask.closePath();
        mask.fill();
        
        // 2. Sprite matching bounds
        const minX = Math.min(xTopStart, xBottomStart);
        const maxX = Math.max(xTopEnd, xBottomEnd);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = minX;
        sprite.y = 0;
        sprite.width = maxX - minX;
        sprite.height = 85;
        sprite.mask = mask;
        
        pContainer.addChild(sprite);
        pContainer.addChild(mask);
        
        // 3. Crisp outer border alignment
        const border = new PIXI.Graphics();
        border.stroke({ color: strokeColor, width: strokeWidth, alignment: 1 });
        border.moveTo(xTopStart, 0);
        border.lineTo(xTopEnd, 0);
        border.lineTo(xBottomEnd, 85);
        border.lineTo(xBottomStart, 85);
        border.closePath();
        border.stroke();
        
        pContainer.addChild(border);
        stripContainer.addChild(pContainer);
        return { container: pContainer, sprite, border };
      };

      // Instantiating all background layers
      const p1Nasir = drawPanelBg(0, 440, 0, 430, nasirBatTexture, 0x1d4ed8, 2);
      const p1Falak = drawPanelBg(0, 440, 0, 430, falakBatTexture, 0x2d3748, 2);
      dynamicFieldsRef.current.p1NasirBg = p1Nasir.container;
      dynamicFieldsRef.current.p1NasirBgSprite = p1Nasir.sprite;
      dynamicFieldsRef.current.p1NasirBgBorder = p1Nasir.border;

      dynamicFieldsRef.current.p1FalakBg = p1Falak.container;
      dynamicFieldsRef.current.p1FalakBgSprite = p1Falak.sprite;
      dynamicFieldsRef.current.p1FalakBgBorder = p1Falak.border;

      // Elegant cyan highlight indicator stripe on far-left
      const edgeHighlight = new PIXI.Graphics();
      edgeHighlight.fill({ color: 0x3b82f6 });
      edgeHighlight.moveTo(0, 0);
      edgeHighlight.lineTo(6, 0);
      edgeHighlight.lineTo(6, 85);
      edgeHighlight.lineTo(0, 85);
      edgeHighlight.closePath();
      edgeHighlight.fill();
      stripContainer.addChild(edgeHighlight);
      dynamicFieldsRef.current.edgeHighlight = edgeHighlight;

      // Panel 2: Stats (always static background)
      const p2 = drawPanelBg(446, 820, 436, 810, batsmanTexture, 0x1e3a8a, 1.5);
      dynamicFieldsRef.current.p2BgSprite = p2.sprite;
      dynamicFieldsRef.current.p2BgBorder = p2.border;

      // Panel 3: Info Panel
      const p3Slate = drawPanelBg(826, 980, 816, 970, darkInfoTexture, 0x334155, 1.5);
      const p3Purple = drawPanelBg(826, 980, 816, 970, purpleInfoTexture, 0xa855f7, 2);
      dynamicFieldsRef.current.p3SlateBg = p3Slate.container;
      dynamicFieldsRef.current.p3SlateBgSprite = p3Slate.sprite;
      dynamicFieldsRef.current.p3SlateBgBorder = p3Slate.border;

      dynamicFieldsRef.current.p3PurpleBg = p3Purple.container;
      dynamicFieldsRef.current.p3PurpleBgSprite = p3Purple.sprite;
      dynamicFieldsRef.current.p3PurpleBgBorder = p3Purple.border;

      // Panel 4: Contextual (Bowler statistics vs Chase remaining)
      const p4BowlerBg = drawPanelBg(986, 1260, 976, 1250, bowlerTexture, 0x334155, 1.5);
      const p4ChaseBg = drawPanelBg(986, 1260, 976, 1250, purpleChaseTexture, 0xa855f7, 2);
      dynamicFieldsRef.current.p4BowlerBg = p4BowlerBg.container;
      dynamicFieldsRef.current.p4BowlerBgSprite = p4BowlerBg.sprite;
      dynamicFieldsRef.current.p4BowlerBgBorder = p4BowlerBg.border;

      dynamicFieldsRef.current.p4ChaseBg = p4ChaseBg.container;
      dynamicFieldsRef.current.p4ChaseBgSprite = p4ChaseBg.sprite;
      dynamicFieldsRef.current.p4ChaseBgBorder = p4ChaseBg.border;

      // Panel 5: Opponent Branding
      const p5Falak = drawPanelBg(1266, 1420, 1256, 1420, falakBrandTexture, 0x334155, 1.5);
      const p5Nasir = drawPanelBg(1266, 1420, 1256, 1420, nasirBrandTexture, 0xa855f7, 2);
      dynamicFieldsRef.current.p5FalakBg = p5Falak.container;
      dynamicFieldsRef.current.p5FalakBgSprite = p5Falak.sprite;
      dynamicFieldsRef.current.p5FalakBgBorder = p5Falak.border;

      dynamicFieldsRef.current.p5NasirBg = p5Nasir.container;
      dynamicFieldsRef.current.p5NasirBgSprite = p5Nasir.sprite;
      dynamicFieldsRef.current.p5NasirBgBorder = p5Nasir.border;

      // ────────────────────────────────────────────────────────
      // NEON GLOW DIVIDER LAYERS (Active during pressure chases)
      // ────────────────────────────────────────────────────────
      const glowBar1 = new PIXI.Graphics();
      const glowBar2 = new PIXI.Graphics();
      stripContainer.addChild(glowBar1);
      stripContainer.addChild(glowBar2);
      
      drawGlowBarLive(glowBar1, 983, 973, 85, [0xffffff, 0xc084fc]);
      drawGlowBarLive(glowBar2, 1263, 1253, 85, [0xffffff, 0xc084fc]);
      
      dynamicFieldsRef.current.glowBar1 = glowBar1;
      dynamicFieldsRef.current.glowBar2 = glowBar2;

      // ────────────────────────────────────────────────────────
      // GROUP SEGMENT CONTAINERS
      // ────────────────────────────────────────────────────────
      const p1Container = new PIXI.Container();
      const p2Container = new PIXI.Container();
      const p3Container = new PIXI.Container();
      const p4BowlerContainer = new PIXI.Container();
      const p4ChaseContainer = new PIXI.Container();
      const p5Container = new PIXI.Container();

      stripContainer.addChild(p1Container);
      stripContainer.addChild(p2Container);
      stripContainer.addChild(p3Container);
      stripContainer.addChild(p4BowlerContainer);
      stripContainer.addChild(p4ChaseContainer);
      stripContainer.addChild(p5Container);

      dynamicFieldsRef.current.p4BowlerContainer = p4BowlerContainer;
      dynamicFieldsRef.current.p4ChaseContainer = p4ChaseContainer;

      // ────────────────────────────────────────────────────────
      // PLACING TYPOGRAPHICAL ELEMENTS (Pixel-Perfect Alignment)
      // ────────────────────────────────────────────────────────

      // Panel 1: Batting Score, Overs, Ticker
      const teamNameText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 19,
          fontWeight: "800",
          fill: 0xffffff,
          align: "left",
          letterSpacing: 0.5,
        }),
      });
      teamNameText.x = 24;
      teamNameText.y = 15;
      p1Container.addChild(teamNameText);
      dynamicFieldsRef.current.teamNameText = teamNameText;

      const tickerText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "700",
          fill: 0xdde3ea, 
          align: "left",
          letterSpacing: 0.2,
        }),
      });
      tickerText.x = 24;
      tickerText.y = 52;
      p1Container.addChild(tickerText);
      dynamicFieldsRef.current.tickerText = tickerText;

      const scoreText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 50,
          fill: 0xfbbf24, // Vivid amber/gold
          fontWeight: "bold",
          letterSpacing: 0.5,
        }),
      });
      scoreText.x = 265;
      scoreText.y = 5;
      p1Container.addChild(scoreText);
      dynamicFieldsRef.current.scoreText = scoreText;

      const oversText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 22,
          fill: 0xffffff,
          fontWeight: "bold",
        }),
      });
      oversText.x = 368;
      oversText.y = 26;
      p1Container.addChild(oversText);
      dynamicFieldsRef.current.oversText = oversText;

      // Panel 2: Dual Batsmen details
      const batsman1Name = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 17,
          fontWeight: "700",
          fill: 0xffffff,
        }),
      });
      batsman1Name.x = 485;
      batsman1Name.y = 15;
      p2Container.addChild(batsman1Name);
      dynamicFieldsRef.current.batsman1Name = batsman1Name;

      const b1Striker = new PIXI.Graphics();
      b1Striker.fill({ color: 0xffffff });
      b1Striker.moveTo(0, 0);
      b1Striker.lineTo(10, 5);
      b1Striker.lineTo(0, 10);
      b1Striker.closePath();
      b1Striker.fill();
      b1Striker.x = 466;
      b1Striker.y = 21;
      b1Striker.visible = false;
      p2Container.addChild(b1Striker);
      dynamicFieldsRef.current.batsman1StrikerIndicator = b1Striker;

      const batsman1Runs = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 22,
          fill: 0xfbbf24,
          fontWeight: "bold",
          letterSpacing: 0.5,
        }),
      });
      batsman1Runs.x = 735;
      batsman1Runs.y = 12;
      p2Container.addChild(batsman1Runs);
      dynamicFieldsRef.current.batsman1Runs = batsman1Runs;

      const batsman1Balls = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 16,
          fontWeight: "600",
          fill: 0x94a3b8,
        }),
      });
      batsman1Balls.x = 770;
      batsman1Balls.y = 16;
      p2Container.addChild(batsman1Balls);
      dynamicFieldsRef.current.batsman1Balls = batsman1Balls;

      const batsman2Name = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 17,
          fontWeight: "700",
          fill: 0xa1a1aa,
        }),
      });
      batsman2Name.x = 485;
      batsman2Name.y = 48;
      p2Container.addChild(batsman2Name);
      dynamicFieldsRef.current.batsman2Name = batsman2Name;

      const b2Striker = new PIXI.Graphics();
      b2Striker.fill({ color: 0xffffff });
      b2Striker.moveTo(0, 0);
      b2Striker.lineTo(10, 5);
      b2Striker.lineTo(0, 10);
      b2Striker.closePath();
      b2Striker.fill();
      b2Striker.x = 466;
      b2Striker.y = 54;
      b2Striker.visible = false;
      p2Container.addChild(b2Striker);
      dynamicFieldsRef.current.batsman2StrikerIndicator = b2Striker;

      const batsman2Runs = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 22,
          fill: 0xfbbf24,
          fontWeight: "bold",
          letterSpacing: 0.5,
        }),
      });
      batsman2Runs.x = 735;
      batsman2Runs.y = 45;
      p2Container.addChild(batsman2Runs);
      dynamicFieldsRef.current.batsman2Runs = batsman2Runs;

      const batsman2Balls = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 16,
          fontWeight: "600",
          fill: 0x94a3b8,
        }),
      });
      batsman2Balls.x = 770;
      batsman2Balls.y = 49;
      p2Container.addChild(batsman2Balls);
      dynamicFieldsRef.current.batsman2Balls = batsman2Balls;

      // Panel 3: Projection metrics and titles
      const infoTitleText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0xffffff,
          letterSpacing: 1.5,
          align: "center",
        }),
      });
      infoTitleText.x = 903; 
      infoTitleText.y = 15;
      infoTitleText.anchor.set(0.5, 0);
      p3Container.addChild(infoTitleText);
      dynamicFieldsRef.current.infoTitleText = infoTitleText;

      const infoValueText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 34,
          fill: 0xfbbf24,
          fontWeight: "bold",
          align: "center",
        }),
      });
      infoValueText.x = 903;
      infoValueText.y = 35;
      infoValueText.anchor.set(0.5, 0);
      p3Container.addChild(infoValueText);
      dynamicFieldsRef.current.infoValueText = infoValueText;

      const infoValueLabelSub = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 11,
          fontWeight: "700",
          fill: 0x94a3b8,
          align: "center",
        }),
      });
      infoValueLabelSub.x = 903;
      infoValueLabelSub.y = 66;
      infoValueLabelSub.anchor.set(0.5, 0);
      p3Container.addChild(infoValueLabelSub);
      dynamicFieldsRef.current.infoValueLabelSub = infoValueLabelSub;

      // Panel 4: Case A (Bowling & balls outcome display)
      const bowlerName = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 17,
          fontWeight: "700",
          fill: 0xffffff,
          align: "left",
        }),
      });
      bowlerName.x = 1006;
      bowlerName.y = 15;
      p4BowlerContainer.addChild(bowlerName);
      dynamicFieldsRef.current.bowlerName = bowlerName;

      const bowlerFigures = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 24,
          fill: 0xfbbf24,
          align: "left",
        }),
      });
      bowlerFigures.x = 1170;
      bowlerFigures.y = 12;
      p4BowlerContainer.addChild(bowlerFigures);
      dynamicFieldsRef.current.bowlerFigures = bowlerFigures;

      const bowlerOvers = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 12,
          fontWeight: "600",
          fill: 0x94a3b8,
          align: "left",
        }),
      });
      bowlerOvers.x = 1220;
      bowlerOvers.y = 16;
      p4BowlerContainer.addChild(bowlerOvers);
      dynamicFieldsRef.current.bowlerOvers = bowlerOvers;

      const ballsContainer = new PIXI.Container();
      ballsContainer.x = 1006;
      ballsContainer.y = 46;
      p4BowlerContainer.addChild(ballsContainer);
      dynamicFieldsRef.current.ballsContainer = ballsContainer;

      // Panel 4: Case B (Target runs remaining dashboard)
      const chaseRunsLabelText = new PIXI.Text({
        text: "RUNS REQUIRED",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 11,
          fontWeight: "800",
          fill: 0xffffff,
          letterSpacing: 1.2,
          align: "center",
        }),
      });
      chaseRunsLabelText.x = 1060;
      chaseRunsLabelText.y = 16;
      chaseRunsLabelText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseRunsLabelText);

      const chaseRunsValueText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 36,
          fill: 0xffffff,
          fontWeight: "bold",
          align: "center",
        }),
      });
      chaseRunsValueText.x = 1060;
      chaseRunsValueText.y = 35;
      chaseRunsValueText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseRunsValueText);
      dynamicFieldsRef.current.chaseRunsValueText = chaseRunsValueText;

      const dividerLine = new PIXI.Graphics();
      dividerLine.stroke({ color: 0xffffff, width: 1, alignment: 0.5, alpha: 0.25 });
      dividerLine.moveTo(1123, 12);
      dividerLine.lineTo(1123, 73);
      dividerLine.stroke();
      p4ChaseContainer.addChild(dividerLine);

      const chaseBallsLabelText = new PIXI.Text({
        text: "BALLS LEFT",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 11,
          fontWeight: "800",
          fill: 0xffffff,
          letterSpacing: 1.2,
          align: "center",
        }),
      });
      chaseBallsLabelText.x = 1185;
      chaseBallsLabelText.y = 16;
      chaseBallsLabelText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseBallsLabelText);

      const chaseBallsValueText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 36,
          fill: 0xffffff,
          fontWeight: "bold",
          align: "center",
        }),
      });
      chaseBallsValueText.x = 1185;
      chaseBallsValueText.y = 35;
      chaseBallsValueText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseBallsValueText);
      dynamicFieldsRef.current.chaseBallsValueText = chaseBallsValueText;

      // Panel 5: Bowling/Opponent team stacked block
      const opponentBrandText1 = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 15,
          fontWeight: "800",
          fill: 0xffffff,
          align: "center",
          letterSpacing: 0.5,
        }),
      });
      opponentBrandText1.x = 1343; // mid-point
      opponentBrandText1.y = 22;
      opponentBrandText1.anchor.set(0.5, 0);
      p5Container.addChild(opponentBrandText1);
      dynamicFieldsRef.current.opponentBrandText1 = opponentBrandText1;

      const opponentBrandText2 = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 15,
          fontWeight: "800",
          fill: 0xffffff,
          align: "center",
          letterSpacing: 0.5,
        }),
      });
      opponentBrandText2.x = 1343;
      opponentBrandText2.y = 44;
      opponentBrandText2.anchor.set(0.5, 0);
      p5Container.addChild(opponentBrandText2);
      dynamicFieldsRef.current.opponentBrandText2 = opponentBrandText2;

      // ────────────────────────────────────────────────────────
      // EVENT FLASH OVERLAY (Runs, Wicket production wipe panels)
      // ────────────────────────────────────────────────────────
      const eventOverlayContainer = new PIXI.Container();
      eventOverlayContainer.y = 0;
      eventOverlayContainer.visible = false;
      stripContainer.addChild(eventOverlayContainer);
      dynamicFieldsRef.current.eventOverlayContainer = eventOverlayContainer;

      const eventOverlayBg = new PIXI.Graphics();
      eventOverlayContainer.addChild(eventOverlayBg);
      dynamicFieldsRef.current.eventOverlayBg = eventOverlayBg;

      const eventOverlayText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 52,
          fill: 0xffffff,
          letterSpacing: 3,
        }),
      });
      eventOverlayText.x = width / 2;
      eventOverlayText.y = 42;
      eventOverlayText.anchor.set(0.5, 0.5);
      eventOverlayContainer.addChild(eventOverlayText);
      dynamicFieldsRef.current.eventOverlayText = eventOverlayText;

      // Initial state sync render (styles and coordinates mapped)
      updatePixiData(state);
    }

    initPixi();

    return () => {
      isDestroyed = true;
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          console.warn("Error destroying PIXI application:", e);
        }
      }
    };
  }, []);

  // Update render elements when state props update
  useEffect(() => {
    if (pixiAppRef.current) {
      updatePixiData(state);
    }
  }, [state]);

  function calculateOvers(totalBalls: number): string {
    const ov = Math.floor(totalBalls / 6);
    const bl = totalBalls % 6;
    return `${ov}.${bl}`;
  }

  function getTickerText(s: MatchState): string {
    if (s.superOver) {
      return "★ SUPER OVER SCENARIO - MAXIMUM PRESSURE ★";
    }
    
    if (s.currentInnings === 2 && s.target) {
      const remainingBalls = (s.config.totalOvers * 6) - s.balls;
      const runsNeeded = s.target - s.runs;
      if (runsNeeded <= 0) {
        return `${s.config.team2.toUpperCase()} WON THE MATCH!`;
      }
      if (remainingBalls <= 0) {
        return `${s.config.team1.toUpperCase()} WON THE MATCH!`;
      }
      return `NEED ${runsNeeded} RUNS FROM ${remainingBalls} BALLS`;
    }

    // Toss fallback
    const tossText = `${s.config.tossWinner} WON THE TOSS & DECIDED TO ${s.config.tossDecision === "bat" ? "BAT" : "BOWL"}`;
    return tossText.toUpperCase();
  }

  // ────────────────────────────────────────────────────────
  // DYNAMIC STYLING REFRESH CODE (TRIGGERED ON ACTION UPDATES)
  // ────────────────────────────────────────────────────────
  function refreshStyles(s: MatchState) {
    const fields = dynamicFieldsRef.current;
    if (!fields) return;

    const primaryColor = s.primaryColor || "#1d4ed8";
    const secondaryColor = s.secondaryColor || "#581c87";
    const glowColor = s.glowColor || "#c084fc";
    const accentTextColor = s.accentTextColor || "#fbbf24";

    const primNum = hexStringToNumber(primaryColor, 0x1d4ed8);
    const secNum = hexStringToNumber(secondaryColor, 0x581c87);
    const glowNum = hexStringToNumber(glowColor, 0xc084fc);
    const accentNum = hexStringToNumber(accentTextColor, 0xfbbf24);

    // 1. Redraw glowing neon bars live
    if (fields.glowBar1) {
      drawGlowBarLive(fields.glowBar1, 983, 973, 85, [0xffffff, glowNum]);
    }
    if (fields.glowBar2) {
      drawGlowBarLive(fields.glowBar2, 1263, 1253, 85, [0xffffff, glowNum]);
    }

    // 2. Refresh Edge Highlight stripe on far-left
    if (fields.edgeHighlight) {
      fields.edgeHighlight.clear();
      fields.edgeHighlight.fill({ color: primNum });
      fields.edgeHighlight.moveTo(0, 0);
      fields.edgeHighlight.lineTo(6, 0);
      fields.edgeHighlight.lineTo(6, 85);
      fields.edgeHighlight.lineTo(0, 85);
      fields.edgeHighlight.closePath();
      fields.edgeHighlight.fill();
    }

    // 3. Generate new gradient step textures
    const nasirBatTexture = createGradientTexture([primaryColor, blendHexColors(primaryColor, "#000000", 0.5), "#070b15"], 450, 85);
    const falakBatTexture = createGradientTexture(["#1e293b", "#0f172a", "#030408"], 450, 85);
    const batsmanTexture = createGradientTexture(["#070d1a", "#03050b"], 390, 85);
    const darkInfoTexture = createGradientTexture(["#070b14", "#020306"], 160, 85);
    const purpleInfoTexture = createGradientTexture([secondaryColor, blendHexColors(secondaryColor, "#000000", 0.5), "#0a0515"], 160, 85);
    const bowlerTexture = createGradientTexture(["#070b14", "#020306"], 280, 85);
    const purpleChaseTexture = createGradientTexture([secondaryColor, blendHexColors(secondaryColor, "#000000", 0.5), "#0a0515"], 280, 85);
    const falakBrandTexture = createGradientTexture(["#1e293b", "#0f172a", "#030408"], 170, 85);
    const nasirBrandTexture = createGradientTexture([secondaryColor, blendHexColors(secondaryColor, "#000000", 0.5), "#0a0515"], 170, 85);

    const assignTex = (sprite: PIXI.Sprite | undefined, tex: PIXI.Texture) => {
      if (!sprite) return;
      const old = sprite.texture;
      sprite.texture = tex;
      if (old && old !== PIXI.Texture.EMPTY) {
        try {
          old.destroy(true);
        } catch (e) {
          // Texture already cleaned
        }
      }
    };

    assignTex(fields.p1NasirBgSprite, nasirBatTexture);
    assignTex(fields.p1FalakBgSprite, falakBatTexture);
    assignTex(fields.p2BgSprite, batsmanTexture);
    assignTex(fields.p3SlateBgSprite, darkInfoTexture);
    assignTex(fields.p3PurpleBgSprite, purpleInfoTexture);
    assignTex(fields.p4BowlerBgSprite, bowlerTexture);
    assignTex(fields.p4ChaseBgSprite, purpleChaseTexture);
    assignTex(fields.p5FalakBgSprite, falakBrandTexture);
    assignTex(fields.p5NasirBgSprite, nasirBrandTexture);

    // 4. Redraw Crisp Geometrical slanted borders
    const redrawBorder = (border: PIXI.Graphics | undefined, xTopStart: number, xTopEnd: number, xBottomStart: number, xBottomEnd: number, color: number, strokeWidth: number = 1.5) => {
      if (!border) return;
      border.clear();
      border.stroke({ color, width: strokeWidth, alignment: 1 });
      border.moveTo(xTopStart, 0);
      border.lineTo(xTopEnd, 0);
      border.lineTo(xBottomEnd, 85);
      border.lineTo(xBottomStart, 85);
      border.closePath();
      border.stroke();
    };

    redrawBorder(fields.p1NasirBgBorder, 0, 440, 0, 430, primNum, 2);
    redrawBorder(fields.p1FalakBgBorder, 0, 440, 0, 430, 0x2d3748, 2);
    redrawBorder(fields.p2BgBorder, 446, 820, 436, 810, blendStringToNumber(primaryColor, 0x1e3a8a, 0.45), 1.5);
    redrawBorder(fields.p3SlateBgBorder, 826, 980, 816, 970, 0x334155, 1.5);
    redrawBorder(fields.p3PurpleBgBorder, 826, 980, 816, 970, secNum, 2);
    redrawBorder(fields.p4BowlerBgBorder, 986, 1260, 976, 1250, 0x334155, 1.5);
    redrawBorder(fields.p4ChaseBgBorder, 986, 1260, 976, 1250, secNum, 2);
    redrawBorder(fields.p5FalakBgBorder, 1266, 1420, 1256, 1420, 0x334155, 1.5);
    redrawBorder(fields.p5NasirBgBorder, 1266, 1420, 1256, 1420, secNum, 2);

    // 5. Update font text style colors
    const applyTextFill = (text: PIXI.Text | undefined, colorNum: number) => {
      if (text) text.style.fill = colorNum;
    };

    applyTextFill(fields.scoreText, accentNum);
    applyTextFill(fields.batsman1Runs, s.batsman1.isStriker ? accentNum : 0xffffff);
    applyTextFill(fields.batsman2Runs, s.batsman2.isStriker ? accentNum : 0xffffff);
    applyTextFill(fields.infoValueText, accentNum);
    applyTextFill(fields.bowlerFigures, accentNum);
  }

  function updatePixiData(s: MatchState) {
    const fields = dynamicFieldsRef.current;
    if (!fields) return;

    // Trigger dyn color reload if values altered
    const prev = prevStateRef.current;
    const colorsChanged = !prev || 
      prev.primaryColor !== s.primaryColor || 
      prev.secondaryColor !== s.secondaryColor ||
      prev.glowColor !== s.glowColor ||
      prev.accentTextColor !== s.accentTextColor;

    if (colorsChanged) {
      refreshStyles(s);
    }

    const battingTeamName = s.currentInnings === 1 ? s.config.team1 : s.config.team2;
    const bowlingTeamName = s.currentInnings === 1 ? s.config.team2 : s.config.team1;

    const isNasirBatting = battingTeamName.toUpperCase().includes("NASIR");
    const isNasirBowling = bowlingTeamName.toUpperCase().includes("NASIR");
    
    const isChaseActive = s.currentInnings === 2 && s.target !== null;
    const secondInningsLayout = s.secondInningsLayout || "combined";

    // Toggle panel background visibilities depending on Active Innings Layout
    if (fields.p1NasirBg) fields.p1NasirBg.visible = isNasirBatting;
    if (fields.p1FalakBg) fields.p1FalakBg.visible = !isNasirBatting;

    // Panel 3 is purple during active chase (2nd Innings Target mode), slate during normal innings
    if (fields.p3SlateBg) fields.p3SlateBg.visible = !isChaseActive;
    if (fields.p3PurpleBg) fields.p3PurpleBg.visible = isChaseActive;

    // Switch for 2nd Innings layout configuration
    const isCombinedLayout = isChaseActive && secondInningsLayout === "combined";
    const showBowlerState = !isChaseActive || (isChaseActive && secondInningsLayout === "normal");

    // Toggle Panel 4 graphics backgrounds (Bowler details vs chase statistics)
    if (fields.p4BowlerBg) fields.p4BowlerBg.visible = showBowlerState;
    if (fields.p4ChaseBg) fields.p4ChaseBg.visible = !showBowlerState;

    if (fields.p5FalakBg) fields.p5FalakBg.visible = !isNasirBowling;
    if (fields.p5NasirBg) fields.p5NasirBg.visible = isNasirBowling;

    // Toggle graphical text overlays
    if (fields.p4BowlerContainer) fields.p4BowlerContainer.visible = showBowlerState;
    if (fields.p4ChaseContainer) fields.p4ChaseContainer.visible = !showBowlerState;

    // Toggle blooming neon glow bars on 2nd Inning combined mode
    if (fields.glowBar1) fields.glowBar1.visible = isCombinedLayout;
    if (fields.glowBar2) fields.glowBar2.visible = isCombinedLayout;

    // ────────────────────────────────────────────────────────
    // PANEL 1 UPDATES (Batting Team, Score, Overs, Ticker)
    // ────────────────────────────────────────────────────────
    if (fields.teamNameText) {
      fields.teamNameText.text = battingTeamName.toUpperCase();
    }
    if (fields.scoreText) {
      fields.scoreText.text = `${s.runs}-${s.wickets}`;
    }
    if (fields.oversText) {
      fields.oversText.text = `${calculateOvers(s.balls)} (${s.config.totalOvers})`;
    }
    if (fields.tickerText) {
      fields.tickerText.text = getTickerText(s);
    }

    // ────────────────────────────────────────────────────────
    // PANEL 2 BATTING LIST UPDATES
    // ────────────────────────────────────────────────────────
    if (fields.batsman1Name) {
      fields.batsman1Name.text = s.batsman1.name.toUpperCase();
      fields.batsman1Name.style.fill = s.batsman1.isStriker ? 0xffffff : 0xa1a1aa;
    }
    if (fields.batsman1Runs) {
      fields.batsman1Runs.text = String(s.batsman1.runs);
      fields.batsman1Runs.style.fill = s.batsman1.isStriker ? hexStringToNumber(s.accentTextColor, 0xfbbf24) : 0xffffff;
    }
    if (fields.batsman1Balls) {
      fields.batsman1Balls.text = String(s.batsman1.balls);
      fields.batsman1Balls.style.fill = s.batsman1.isStriker ? 0x94a3b8 : 0x71717a;
    }
    if (fields.batsman1StrikerIndicator) {
      fields.batsman1StrikerIndicator.visible = s.batsman1.isStriker;
    }

    if (fields.batsman2Name) {
      fields.batsman2Name.text = s.batsman2.name.toUpperCase();
      fields.batsman2Name.style.fill = s.batsman2.isStriker ? 0xffffff : 0xa1a1aa;
    }
    if (fields.batsman2Runs) {
      fields.batsman2Runs.text = String(s.batsman2.runs);
      fields.batsman2Runs.style.fill = s.batsman2.isStriker ? hexStringToNumber(s.accentTextColor, 0xfbbf24) : 0xffffff;
    }
    if (fields.batsman2Balls) {
      fields.batsman2Balls.text = String(s.batsman2.balls);
      fields.batsman2Balls.style.fill = s.batsman2.isStriker ? 0x94a3b8 : 0x71717a;
    }
    if (fields.batsman2StrikerIndicator) {
      fields.batsman2StrikerIndicator.visible = s.batsman2.isStriker;
    }

    // ────────────────────────────────────────────────────────
    // PANEL 3 DYNAMIC DISPLAY METRICS & LAYOUT SELECTIONS
    // ────────────────────────────────────────────────────────
    const targetScore = s.target || 0;
    const runsToTarget = targetScore - s.runs;
    const remainingBalls = Math.max(0, (s.config.totalOvers * 6) - s.balls);
    const rrr = remainingBalls > 0 ? (runsToTarget / remainingBalls) * 6 : 0;

    if (!isChaseActive) {
      // First Innings dynamic configurations
      const displayType = s.firstInningsDisplay || "projected";
      
      if (displayType === "crr") {
        const crr = s.balls > 0 ? (s.runs / s.balls) * 6 : 0;
        
        if (fields.infoTitleText) fields.infoTitleText.text = "RUN RATE";
        if (fields.infoValueText) fields.infoValueText.text = crr.toFixed(2);
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = "CURRENT CRR";
      } 
      else if (displayType === "partnership") {
        if (fields.infoTitleText) fields.infoTitleText.text = "PARTNERSHIP";
        if (fields.infoValueText) fields.infoValueText.text = String(s.partnershipRuns);
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `${s.partnershipBalls} BALLS`;
      } 
      else {
        // Fallback or explicit projected selection
        const crr = s.balls > 0 ? (s.runs / s.balls) * 6 : 0;
        const proj = s.balls > 0 ? Math.round(crr * s.config.totalOvers) : 0;
        
        if (fields.infoTitleText) fields.infoTitleText.text = "PROJECTED";
        if (fields.infoValueText) fields.infoValueText.text = proj > 0 ? `${proj}` : "-";
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `${s.config.totalOvers} OVERS`;
      }
    } else {
      // Second Innings active layouts
      if (secondInningsLayout === "normal") {
        // Option 1: Displays TARGET score in middle panel, RRR below
        if (fields.infoTitleText) fields.infoTitleText.text = "TARGET";
        if (fields.infoValueText) fields.infoValueText.text = String(targetScore);
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `RRR ${rrr.toFixed(2)}`;
      } else {
        // Option 2 (Combined): Displays TO WIN chase branding in middle, RRR below
        if (fields.infoTitleText) fields.infoTitleText.text = "TO WIN";
        if (fields.infoValueText) fields.infoValueText.text = "CHASE";
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `RRR ${rrr.toFixed(2)}`;
      }
    }

    // ────────────────────────────────────────────────────────
    // PANEL 4 BOWLER DETAILS VS COMBINED CHASE DIGITS
    // ────────────────────────────────────────────────────────
    if (showBowlerState) {
      // Renders active bowler figures and timeline (normal mode or 1st Innings)
      if (fields.bowlerName) {
        fields.bowlerName.text = s.bowler.name.toUpperCase();
      }
      if (fields.bowlerFigures) {
        fields.bowlerFigures.text = `${s.bowler.wickets}-${s.bowler.runs}`;
      }
      if (fields.bowlerOvers) {
        fields.bowlerOvers.text = `${calculateOvers(s.bowler.balls)} OVER`;
      }

      // Recent balls timeline widgets
      if (fields.ballsContainer) {
        fields.ballsContainer.removeChildren().forEach((child) => child.destroy());

        const maxRecentBalls = 6;
        const bArray = s.thisOver.slice(-maxRecentBalls);
        let cumulativeX = 0;

        bArray.forEach((ballSymbol) => {
          const ballItem = new PIXI.Container();
          ballItem.x = cumulativeX;
          fields.ballsContainer!.addChild(ballItem);

          const cardWidth = 32;
          const cardHeight = 22;
          const ballBorder = new PIXI.Graphics();

          let bgHex = 0xffffff;
          let borderHex = 0xd1d5db;
          let textHex = 0x0f172a;

          if (ballSymbol === "6") {
            bgHex = hexStringToNumber(s.accentTextColor, 0xfbbf24); 
            borderHex = blendStringToNumber(s.accentTextColor || "#fbbf24", 0xd97706, 0.4);
          } else if (ballSymbol === "4") {
            bgHex = hexStringToNumber(s.primaryColor, 0x1d4ed8); 
            borderHex = blendStringToNumber(s.primaryColor || "#1d4ed8", 0x1e3a8a, 0.5);
            textHex = 0xffffff;
          } else if (ballSymbol === "W" || ballSymbol.toUpperCase().includes("W")) {
            bgHex = 0xef4444; 
            borderHex = 0xb91c1c;
            textHex = 0xffffff;
          } else if (ballSymbol === "•" || ballSymbol === "0") {
            bgHex = 0x1e293b; 
            borderHex = 0x334155;
            textHex = 0xffffff;
          } else {
            bgHex = 0xf8fafc;
            borderHex = 0xcbd5e1;
          }

          ballBorder.roundRect(0, 0, cardWidth, cardHeight, 4);
          ballBorder.fill({ color: bgHex });
          ballBorder.stroke({ color: borderHex, width: 1.5 });
          ballItem.addChild(ballBorder);

          const bt = new PIXI.Text({
            text: ballSymbol,
            style: new PIXI.TextStyle({
              fontFamily: "Rajdhani",
              fontSize: 13,
              fontWeight: "800",
              fill: textHex,
              align: "center",
            }),
          });
          bt.x = cardWidth / 2;
          bt.y = cardHeight / 2 - 1;
          bt.anchor.set(0.5, 0.5);
          ballItem.addChild(bt);

          cumulativeX += 40; 
        });
      }
    } else {
      // Option 2 (Combined Chase Mode): Renders runs & balls remaining in panel 4
      if (fields.chaseRunsValueText) {
        fields.chaseRunsValueText.text = runsToTarget <= 0 ? "0" : String(runsToTarget);
      }
      if (fields.chaseBallsValueText) {
        fields.chaseBallsValueText.text = remainingBalls <= 0 ? "0" : String(remainingBalls);
      }
    }

    // ────────────────────────────────────────────────────────
    // PANEL 5 OPPONENT BRAND NAME ACTION COMPONENT
    // ────────────────────────────────────────────────────────
    if (fields.opponentBrandText1 && fields.opponentBrandText2) {
      const parts = bowlingTeamName.split(" ");
      if (parts.length >= 2) {
        fields.opponentBrandText1.text = parts.slice(0, 2).join(" ").toUpperCase();
        fields.opponentBrandText2.text = parts.slice(2).join(" ").toUpperCase() || "TEAM";
      } else {
        fields.opponentBrandText1.text = bowlingTeamName.toUpperCase();
        fields.opponentBrandText2.text = "CLUB";
      }
    }

    // ────────────────────────────────────────────────────────
    // LIVE BROADCAST SHAKE AND TRANSITION FLASHER WIPE
    // ────────────────────────────────────────────────────────
    if (s.eventTrigger && s.eventTrigger.timestamp !== prev?.eventTrigger?.timestamp) {
      triggerTvGraphicsWipe(s.eventTrigger.type);
    }

    // Store state in ref
    prevStateRef.current = JSON.parse(JSON.stringify(s));
  }

  function triggerTvGraphicsWipe(type: "four" | "six" | "wicket" | "single" | "config" | "reset") {
    const fields = dynamicFieldsRef.current;
    if (!fields || !fields.eventOverlayContainer || !fields.eventOverlayText || !fields.eventOverlayBg) return;

    let bannerColor = hexStringToNumber(state.primaryColor, 0x1d4ed8); 
    let bannerText = "PLAY!";
    let duration = 2.5;

    if (type === "four") {
      bannerColor = hexStringToNumber(state.primaryColor, 0x1e3a8a); 
      bannerText = state.fourBoundaryText || "★ BOUNDARY FOUR ★";
    } else if (type === "six") {
      bannerColor = hexStringToNumber(state.accentTextColor, 0xd97706); 
      bannerText = state.maxSixText || "★★ MAX SIX ★★";
    } else if (type === "wicket") {
      bannerColor = 0xb91c1c; 
      bannerText = "🚨 WICKET OUT! 🚨";
      duration = 3.0; 
    } else if (type === "single" || type === "config" || type === "reset") {
      if (fields.scoreText) {
        gsap.fromTo(fields.scoreText.scale, 
          { x: 1.3, y: 1.3 }, 
          { x: 1, y: 1, duration: 0.6, ease: "bounce.out" }
        );
      }
      return;
    }

    const celTheme = state.celebrationTheme || "neon";
    let strokeColor = 0xffffff;
    let strokeWidth = 2.5;

    if (celTheme === "metallic") {
      strokeColor = 0xcbd5e1; // Silver metal
      strokeWidth = 3.5;
    } else if (celTheme === "cyber") {
      strokeColor = 0x22d3ee; // High-contrast electrical cyan
      strokeWidth = 4.0;
    } else if (celTheme === "epic") {
      strokeColor = 0xf59e0b; // Gold border
      strokeWidth = 3.5;
    } else {
      // neon
      strokeColor = hexStringToNumber(state.glowColor, 0xffffff);
      strokeWidth = 2.5;
    }

    const width = 1420;
    const height = 85;
    
    fields.eventOverlayBg.clear();
    fields.eventOverlayBg.fill({ color: bannerColor });
    fields.eventOverlayBg.stroke({ color: strokeColor, width: strokeWidth });
    fields.eventOverlayBg.moveTo(0, 0);
    fields.eventOverlayBg.lineTo(width, 0);
    fields.eventOverlayBg.lineTo(width - 15, height);
    fields.eventOverlayBg.lineTo(15, height);
    fields.eventOverlayBg.closePath();
    fields.eventOverlayBg.fill();
    fields.eventOverlayBg.stroke();

    fields.eventOverlayText.text = bannerText;

    const tl = gsap.timeline({
      onStart: () => {
        fields.eventOverlayContainer!.visible = true;
      },
      onComplete: () => {
        fields.eventOverlayContainer!.visible = false;
      }
    });

    if (type === "wicket" || type === "six") {
      tl.to(fields.stripContainer!, {
        x: "+=8",
        yoyo: true,
        repeat: 10,
        duration: 0.05,
      });
    }

    tl.fromTo(fields.eventOverlayContainer,
      { alpha: 0, scaleY: 0, y: 42 },
      { alpha: 1, scaleY: 1, y: 0, duration: 0.45, ease: "power2.out" },
      0
    );

    tl.fromTo(fields.eventOverlayText.scale,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1, duration: 0.65, ease: "elastic.out(1, 0.5)" },
      0.2
    );

    tl.to(fields.eventOverlayContainer, {
      alpha: 0,
      scaleY: 0,
      y: -20,
      duration: 0.35,
      ease: "power2.in",
      delay: duration,
    });
  }

  return (
    <div className="w-full relative select-none">
      <div 
        ref={containerRef} 
        className="w-full h-full relative" 
        style={{ minHeight: "135px" }} 
        id="pixi-graphics-canvas"
      />
    </div>
  );
}
