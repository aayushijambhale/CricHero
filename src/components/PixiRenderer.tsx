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
    // Flat clean panel gradient (no gloss/scanline overlays)
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    colors.forEach((color, index) => {
      grad.addColorStop(index / (colors.length - 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  return PIXI.Texture.from(canvas);
}

function drawGlowBarLive(glow: PIXI.Graphics, x: number, h: number, colors: number[], intensity: number = 1) {
  glow.clear();
  const safeIntensity = Math.max(0, Math.min(1, intensity));
  
  // 1. Hot white thin line
  glow.stroke({ color: 0xffffff, width: 2.2, alignment: 0.5 });
  glow.moveTo(x, 0);
  glow.lineTo(x, h);
  glow.stroke();
  
  // 2. Linear Bloom (staged bloom glow indices)
  glow.stroke({ color: colors[0], width: 7, alignment: 0.5, alpha: 0.35 * safeIntensity });
  glow.moveTo(x, 0);
  glow.lineTo(x, h);
  glow.stroke();
  
  glow.stroke({ color: colors[1] || colors[0], width: 16, alignment: 0.5, alpha: 0.16 * safeIntensity });
  glow.moveTo(x, 0);
  glow.lineTo(x, h);
  glow.stroke();
}

function getTeamInitials(fullName: string, shortName?: string): string {
  if (shortName && shortName.trim().length > 0) {
    return shortName.trim().toUpperCase();
  }
  if (!fullName) return "T";
  const words = fullName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

function updateTextMarquee(
  textObj: PIXI.Text | undefined,
  maskWidth: number,
  align: "left" | "right" = "left"
) {
  if (!textObj) return;
  
  const currentText = textObj.text;
  if ((textObj as any)._lastMarqueeText === currentText && (textObj as any)._marqueeTween) {
    // Text is unchanged and already animating, do not restart tween
    return;
  }
  
  // Kill any existing marquee tween
  if ((textObj as any)._marqueeTween) {
    (textObj as any)._marqueeTween.kill();
    (textObj as any)._marqueeTween = null;
  }
  
  (textObj as any)._lastMarqueeText = currentText;
  
  const textWidth = textObj.width;
  
  if (textWidth <= maskWidth) {
    textObj.alpha = 1;
    if (align === "right") {
      textObj.x = maskWidth - textWidth;
    } else {
      textObj.x = 0;
    }
    return;
  }
  
  // Set starting x to 0 for scrolling
  textObj.x = 0;
  textObj.alpha = 1;
  
  const scrollDistance = textWidth - maskWidth;
  const scrollDuration = scrollDistance / 35; // 35px/sec speed
  
  const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
  
  // Scroll left
  tl.to(textObj, {
    x: -scrollDistance,
    duration: scrollDuration,
    ease: "none",
  });
  
  // Hold at the end
  tl.to(textObj, {
    duration: 1.5,
  });
  
  // Fade out
  tl.to(textObj, {
    alpha: 0,
    duration: 0.3,
    onComplete: () => {
      textObj.x = 0;
    }
  });
  
  // Fade in at start
  tl.to(textObj, {
    alpha: 1,
    duration: 0.2,
  });
  
  // Hold at start
  tl.to(textObj, {
    duration: 1.0,
  });
  
  (textObj as any)._marqueeTween = tl;
}

export default function PixiRenderer({ state }: PixiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  
  // Keep track of previous coordinates for animating changes
  const prevStateRef = useRef<MatchState | null>(null);
  const latestStateRef = useRef<MatchState>(state);
  
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const dynamicFieldsRef = useRef<{
    scoreText?: PIXI.Text;
    oversText?: PIXI.Text;
    tickerText?: PIXI.Text;
    teamNameText?: PIXI.Text;
    vsOpponentText?: PIXI.Text;
    tournamentText?: PIXI.Text;
    unifiedBorder?: PIXI.Graphics;
    
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
    powerplayBadge?: PIXI.Graphics;
    powerplayText?: PIXI.Text;
    leftLogoSunburst?: PIXI.Sprite;
    leftLogoCircle?: PIXI.Graphics;
    leftLogoText?: PIXI.Text;
    rightLogoSunburst?: PIXI.Sprite;
    rightLogoCircle?: PIXI.Graphics;
    rightLogoText?: PIXI.Text;
  }>({});

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let isDestroyed = false;

    async function initPixi() {
      try {
        if (!containerRef.current) return;

      
      const width = 1920;
      const height = 220;

      const newApp = new PIXI.Application();

      await newApp.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
      });

      // Wait for font loading with timeout fallback
      if (document.fonts) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise(resolve => setTimeout(resolve, 500))
          ]);
        } catch (e) {
          // ignore timeout
        }
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
      app.canvas.style.maxWidth = "1920px";
      app.canvas.style.display = "block";
      app.canvas.style.margin = "0 auto";

      // Root container with slight y-offset
      const stripContainer = new PIXI.Container();
      stripContainer.y = 20;
      stripContainer.alpha = latestStateRef.current.stripTransparency ?? 1;
      app.stage.addChild(stripContainer);
      dynamicFieldsRef.current.stripContainer = stripContainer;

      // ────────────────────────────────────────────────────────
      // CORE GRADIENT TEXTURES (HTML5 Canvas Bridges initializers)
      // ────────────────────────────────────────────────────────
      const nasirBatTexture = createGradientTexture(["#1d4ed8", "#1e3a8a", "#070b15"], 1080, 85);
      const falakBatTexture = createGradientTexture(["#1e293b", "#0f172a", "#030408"], 1080, 85);
      const batsmanTexture = createGradientTexture(["#070d1a", "#03050b"], 530, 85);
      const darkInfoTexture = createGradientTexture(["#070b14", "#020306"], 200, 85);
      const purpleInfoTexture = createGradientTexture(["#581c87", "#2e1065", "#0a0515"], 200, 85);
      const bowlerTexture = createGradientTexture(["#070b14", "#020306"], 370, 85);
      const purpleChaseTexture = createGradientTexture(["#0a0515", "#2e1065", "#581c87"], 370, 85); // reversed gradient!
      const falakBrandTexture = createGradientTexture(["#030408", "#0f172a", "#1e293b"], 640, 85); // reversed gradient!
      const nasirBrandTexture = createGradientTexture(["#0a0515", "#2e1065", "#581c87"], 640, 85); // reversed gradient!

      // ────────────────────────────────────────────────────────
      // GEOMETRIC RECTANGULAR BASE PANEL BUILDER
      // Height of strip is 85px.
      // ────────────────────────────────────────────────────────
      const drawPanelBg = (
        xStart: number,
        xEnd: number,
        texture: PIXI.Texture,
        strokeColor: number,
        strokeWidth: number = 1.5
      ) => {
        const pContainer = new PIXI.Container();
        
        // 1. Mask shape (rectangular)
        const mask = new PIXI.Graphics();
        mask.fill({ color: 0xffffff });
        mask.rect(xStart, 0, xEnd - xStart, 85);
        mask.fill();
        
        // 2. Sprite matching bounds
        const sprite = new PIXI.Sprite(texture);
        sprite.x = xStart;
        sprite.y = 0;
        sprite.width = xEnd - xStart;
        sprite.height = 85;
        sprite.mask = mask;
        
        pContainer.addChild(sprite);
        pContainer.addChild(mask);
        
        // 3. Border layer kept for compatibility, but intentionally not drawn
        const border = new PIXI.Graphics();

        pContainer.addChild(border);
        stripContainer.addChild(pContainer);
        return { container: pContainer, sprite, border };
      };

      // Instantiating all background layers (perfectly seamless rectangular layout!)
      // Combined Section 1-2 background (spans 0 to 1080)
      const p1Nasir = drawPanelBg(0, 1080, nasirBatTexture, 0x1d4ed8, 2);
      const p1Falak = drawPanelBg(0, 1080, falakBatTexture, 0x2d3748, 2);
      dynamicFieldsRef.current.p1NasirBg = p1Nasir.container;
      dynamicFieldsRef.current.p1NasirBgSprite = p1Nasir.sprite;
      dynamicFieldsRef.current.p1NasirBgBorder = p1Nasir.border;

      dynamicFieldsRef.current.p1FalakBg = p1Falak.container;
      dynamicFieldsRef.current.p1FalakBgSprite = p1Falak.sprite;
      dynamicFieldsRef.current.p1FalakBgBorder = p1Falak.border;

      // Elegant cyan highlight indicator stripe on far-left (rectangular)
      const edgeHighlight = new PIXI.Graphics();
      edgeHighlight.fill({ color: 0x3b82f6 });
      edgeHighlight.rect(0, 0, 6, 85);
      edgeHighlight.fill();
      stripContainer.addChild(edgeHighlight);
      dynamicFieldsRef.current.edgeHighlight = edgeHighlight;

      // Panel 2: Stats (always static background - hidden so Panel 1 combined gradient shines through)
      const p2 = drawPanelBg(550, 1080, batsmanTexture, 0x1e3a8a, 1.5);
      p2.container.visible = false;
      dynamicFieldsRef.current.p2BgSprite = p2.sprite;
      dynamicFieldsRef.current.p2BgBorder = p2.border;

      // Panel 3: Info Panel
      const p3Slate = drawPanelBg(1080, 1280, darkInfoTexture, 0x334155, 1.5);
      const p3Purple = drawPanelBg(1080, 1280, purpleInfoTexture, 0xa855f7, 2);
      dynamicFieldsRef.current.p3SlateBg = p3Slate.container;
      dynamicFieldsRef.current.p3SlateBgSprite = p3Slate.sprite;
      dynamicFieldsRef.current.p3SlateBgBorder = p3Slate.border;

      dynamicFieldsRef.current.p3PurpleBg = p3Purple.container;
      dynamicFieldsRef.current.p3PurpleBgSprite = p3Purple.sprite;
      dynamicFieldsRef.current.p3PurpleBgBorder = p3Purple.border;

      // Panel 4: Contextual (Bowler statistics vs Chase remaining - hidden so Panel 5 combined gradient shines through)
      const p4BowlerBg = drawPanelBg(1280, 1650, bowlerTexture, 0x334155, 1.5);
      const p4ChaseBg = drawPanelBg(1280, 1650, purpleChaseTexture, 0xa855f7, 2);
      p4BowlerBg.container.visible = false;
      p4ChaseBg.container.visible = false;
      dynamicFieldsRef.current.p4BowlerBg = p4BowlerBg.container;
      dynamicFieldsRef.current.p4BowlerBgSprite = p4BowlerBg.sprite;
      dynamicFieldsRef.current.p4BowlerBgBorder = p4BowlerBg.border;

      dynamicFieldsRef.current.p4ChaseBg = p4ChaseBg.container;
      dynamicFieldsRef.current.p4ChaseBgSprite = p4ChaseBg.sprite;
      dynamicFieldsRef.current.p4ChaseBgBorder = p4ChaseBg.border;

      // Panel 5: Opponent Branding - Combined Section 4-5 background (spans 1280 to 1920)
      const p5Falak = drawPanelBg(1280, 1920, falakBrandTexture, 0x334155, 1.5);
      const p5Nasir = drawPanelBg(1280, 1920, nasirBrandTexture, 0xa855f7, 2);
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
      
      drawGlowBarLive(glowBar1, 1280, 85, [0xffffff, 0xc084fc], latestStateRef.current.glowIntensity ?? 0.75);
      drawGlowBarLive(glowBar2, 1650, 85, [0xffffff, 0xc084fc], latestStateRef.current.glowIntensity ?? 0.75);
      
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
      // UNIFIED OUTER BORDER & SEPARATORS
      // ────────────────────────────────────────────────────────
      const unifiedBorder = new PIXI.Graphics();
      stripContainer.addChild(unifiedBorder);
      dynamicFieldsRef.current.unifiedBorder = unifiedBorder;

      // ────────────────────────────────────────────────────────
      // PLACING TYPOGRAPHICAL ELEMENTS (Pixel-Perfect Alignment)
      // ────────────────────────────────────────────────────────

      // Circular Team Emblems & AI Generated Glow Ray Halos (Far Left & Far Right)
      const leftLogoSunburst = PIXI.Sprite.from("/sunburst_radial_pattern.png");
      leftLogoSunburst.anchor.set(0.5, 0.5);
      leftLogoSunburst.width = 140;
      leftLogoSunburst.height = 140;
      leftLogoSunburst.blendMode = 'add';
      p1Container.addChild(leftLogoSunburst);
      dynamicFieldsRef.current.leftLogoSunburst = leftLogoSunburst;

      const leftLogoCircle = new PIXI.Graphics();
      p1Container.addChild(leftLogoCircle);
      dynamicFieldsRef.current.leftLogoCircle = leftLogoCircle;

      const leftLogoText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 28,
          fontWeight: "bold",
          fill: 0xffffff,
          align: "center",
        }),
      });
      leftLogoText.anchor.set(0.5, 0.5);
      p1Container.addChild(leftLogoText);
      dynamicFieldsRef.current.leftLogoText = leftLogoText;

      const rightLogoSunburst = PIXI.Sprite.from("/sunburst_radial_pattern.png");
      rightLogoSunburst.anchor.set(0.5, 0.5);
      rightLogoSunburst.width = 140;
      rightLogoSunburst.height = 140;
      rightLogoSunburst.blendMode = 'add';
      p5Container.addChild(rightLogoSunburst);
      dynamicFieldsRef.current.rightLogoSunburst = rightLogoSunburst;

      const rightLogoCircle = new PIXI.Graphics();
      p5Container.addChild(rightLogoCircle);
      dynamicFieldsRef.current.rightLogoCircle = rightLogoCircle;

      const rightLogoText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 28,
          fontWeight: "bold",
          fill: 0xffffff,
          align: "center",
        }),
      });
      rightLogoText.anchor.set(0.5, 0.5);
      p5Container.addChild(rightLogoText);
      dynamicFieldsRef.current.rightLogoText = rightLogoText;

      // 1px Golden Dividers between panels
      const dividers = new PIXI.Graphics();
      dividers.moveTo(550, 5); dividers.lineTo(550, 80);
      dividers.moveTo(1080, 5); dividers.lineTo(1080, 80);
      dividers.moveTo(1280, 5); dividers.lineTo(1280, 80);
      dividers.moveTo(1650, 5); dividers.lineTo(1650, 80);
      dividers.stroke({ color: 0xfbbf24, width: 1, alpha: 0.6 });
      stripContainer.addChild(dividers);

      // Powerplay square badge
      const powerplayBadge = new PIXI.Graphics();
      p1Container.addChild(powerplayBadge);
      dynamicFieldsRef.current.powerplayBadge = powerplayBadge;

      const powerplayText = new PIXI.Text({
        text: "P",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 16,
          fontWeight: "bold",
          fill: 0x000000,
          align: "center",
        }),
      });
      powerplayText.anchor.set(0.5, 0.5);
      p1Container.addChild(powerplayText);
      dynamicFieldsRef.current.powerplayText = powerplayText;

      // Panel 1: Batting Score, Overs, Ticker (Stacked Grid Typography with Scrolling Marquees)
      const teamNameContainer = new PIXI.Container();
      teamNameContainer.x = 92;
      teamNameContainer.y = 12;
      
      const teamNameMask = new PIXI.Graphics();
      teamNameMask.fill({ color: 0xffffff });
      teamNameMask.rect(0, 0, 198, 40);
      teamNameMask.fill();
      teamNameContainer.addChild(teamNameMask);
      teamNameContainer.mask = teamNameMask;
      
      const teamNameText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 26,
          fontWeight: "800",
          fill: 0xffffff,
          align: "left",
          letterSpacing: 0.5,
        }),
      });
      teamNameText.x = 0;
      teamNameText.y = 0;
      teamNameContainer.addChild(teamNameText);
      p1Container.addChild(teamNameContainer);
      dynamicFieldsRef.current.teamNameText = teamNameText;

      const vsOpponentText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0x94a3b8, // Silver-gray
          align: "left",
          letterSpacing: 0.2,
        }),
      });
      vsOpponentText.x = 92;
      vsOpponentText.y = 48;
      p1Container.addChild(vsOpponentText);
      dynamicFieldsRef.current.vsOpponentText = vsOpponentText;

      const scoreText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Bebas Neue",
          fontSize: 38,
          fill: 0xfbbf24, // Vivid amber/gold
          fontWeight: "bold",
          letterSpacing: 0.5,
        }),
      });
      scoreText.x = 300;
      scoreText.y = 6;
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
      oversText.x = 420;
      oversText.y = 20;
      p1Container.addChild(oversText);
      dynamicFieldsRef.current.oversText = oversText;

      const tournamentContainer = new PIXI.Container();
      tournamentContainer.x = 300;
      tournamentContainer.y = 48;
      
      const tournamentMask = new PIXI.Graphics();
      tournamentMask.fill({ color: 0xffffff });
      tournamentMask.rect(0, 0, 240, 25);
      tournamentMask.fill();
      tournamentContainer.addChild(tournamentMask);
      tournamentContainer.mask = tournamentMask;

      const tournamentText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0xffffff,
          align: "left",
          letterSpacing: 0.5,
        }),
      });
      tournamentText.x = 0;
      tournamentText.y = 0;
      tournamentContainer.addChild(tournamentText);
      p1Container.addChild(tournamentContainer);
      dynamicFieldsRef.current.tournamentText = tournamentText;

      // Keep tickerText initialized but hidden/empty so no typescript errors or issues
      const tickerText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 11,
          fontWeight: "700",
          fill: 0x94a3b8,
        }),
      });
      tickerText.visible = false;
      p1Container.addChild(tickerText);
      dynamicFieldsRef.current.tickerText = tickerText;

      // Panel 2: Dual Batsmen details (Stretched and with Scrolling Marquees)
      const batsman1Container = new PIXI.Container();
      batsman1Container.x = 590;
      batsman1Container.y = 15;
      
      const batsman1Mask = new PIXI.Graphics();
      batsman1Mask.fill({ color: 0xffffff });
      batsman1Mask.rect(0, 0, 360, 25);
      batsman1Mask.fill();
      batsman1Container.addChild(batsman1Mask);
      batsman1Container.mask = batsman1Mask;

      const batsman1Name = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 17,
          fontWeight: "700",
          fill: 0xffffff,
        }),
      });
      batsman1Name.x = 0;
      batsman1Name.y = 0;
      batsman1Container.addChild(batsman1Name);
      p2Container.addChild(batsman1Container);
      dynamicFieldsRef.current.batsman1Name = batsman1Name;

      const b1Striker = new PIXI.Text({
        text: ">",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 18,
          fill: 0xffffff,
          fontWeight: "900",
        }),
      });
      b1Striker.x = 566;
      b1Striker.y = 13;
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
      batsman1Runs.x = 980;
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
      batsman1Balls.x = 1030;
      batsman1Balls.y = 16;
      p2Container.addChild(batsman1Balls);
      dynamicFieldsRef.current.batsman1Balls = batsman1Balls;

      const batsman2Container = new PIXI.Container();
      batsman2Container.x = 590;
      batsman2Container.y = 48;
      
      const batsman2Mask = new PIXI.Graphics();
      batsman2Mask.fill({ color: 0xffffff });
      batsman2Mask.rect(0, 0, 360, 25);
      batsman2Mask.fill();
      batsman2Container.addChild(batsman2Mask);
      batsman2Container.mask = batsman2Mask;

      const batsman2Name = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 17,
          fontWeight: "700",
          fill: 0xa1a1aa,
        }),
      });
      batsman2Name.x = 0;
      batsman2Name.y = 0;
      batsman2Container.addChild(batsman2Name);
      p2Container.addChild(batsman2Container);
      dynamicFieldsRef.current.batsman2Name = batsman2Name;

      const b2Striker = new PIXI.Text({
        text: ">",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 18,
          fill: 0xffffff,
          fontWeight: "900",
        }),
      });
      b2Striker.x = 566;
      b2Striker.y = 44;
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
      batsman2Runs.x = 980;
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
      batsman2Balls.x = 1030;
      batsman2Balls.y = 49;
      p2Container.addChild(batsman2Balls);
      dynamicFieldsRef.current.batsman2Balls = batsman2Balls;

      // Panel 3: Projection metrics and titles (Stretched)
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
      infoTitleText.x = 1180; 
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
      infoValueText.x = 1180;
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
      infoValueLabelSub.x = 1180;
      infoValueLabelSub.y = 66;
      infoValueLabelSub.anchor.set(0.5, 0);
      p3Container.addChild(infoValueLabelSub);
      dynamicFieldsRef.current.infoValueLabelSub = infoValueLabelSub;

      // Panel 4: Case A (Bowling & balls outcome display with Scrolling Marquees - Stretched)
      const bowlerNameContainer = new PIXI.Container();
      bowlerNameContainer.x = 1300;
      bowlerNameContainer.y = 15;
      
      const bowlerNameMask = new PIXI.Graphics();
      bowlerNameMask.fill({ color: 0xffffff });
      bowlerNameMask.rect(0, 0, 240, 25);
      bowlerNameMask.fill();
      bowlerNameContainer.addChild(bowlerNameMask);
      bowlerNameContainer.mask = bowlerNameMask;

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
      bowlerName.x = 0;
      bowlerName.y = 0;
      bowlerNameContainer.addChild(bowlerName);
      p4BowlerContainer.addChild(bowlerNameContainer);
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
      bowlerFigures.x = 1554;
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
      bowlerOvers.x = 1604;
      bowlerOvers.y = 16;
      p4BowlerContainer.addChild(bowlerOvers);
      dynamicFieldsRef.current.bowlerOvers = bowlerOvers;

      const ballsContainer = new PIXI.Container();
      ballsContainer.x = 1300;
      ballsContainer.y = 46;
      p4BowlerContainer.addChild(ballsContainer);
      dynamicFieldsRef.current.ballsContainer = ballsContainer;

      // Panel 4: Case B (Target runs remaining dashboard - Stretched)
      const chaseRunsLabelText = new PIXI.Text({
        text: "RUNS",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0xffffff,
          letterSpacing: 1.2,
          align: "center",
        }),
      });
      chaseRunsLabelText.x = 1372;
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
      chaseRunsValueText.x = 1372;
      chaseRunsValueText.y = 35;
      chaseRunsValueText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseRunsValueText);
      dynamicFieldsRef.current.chaseRunsValueText = chaseRunsValueText;

      const dividerLine = new PIXI.Graphics();
      dividerLine.moveTo(1465, 12);
      dividerLine.lineTo(1465, 73);
      dividerLine.stroke({ color: 0xffffff, width: 1, alignment: 0.5, alpha: 0.25 });
      p4ChaseContainer.addChild(dividerLine);

      const chaseBallsLabelText = new PIXI.Text({
        text: "BALLS",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0xffffff,
          letterSpacing: 1.2,
          align: "center",
        }),
      });
      chaseBallsLabelText.x = 1558;
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
      chaseBallsValueText.x = 1558;
      chaseBallsValueText.y = 35;
      chaseBallsValueText.anchor.set(0.5, 0);
      p4ChaseContainer.addChild(chaseBallsValueText);
      dynamicFieldsRef.current.chaseBallsValueText = chaseBallsValueText;

      // Panel 5: Bowling/Opponent team stacked block (with Scrolling Marquee - Stretched)
      const opponentBrandContainer = new PIXI.Container();
      opponentBrandContainer.x = 1650;
      opponentBrandContainer.y = 12;
      
      const opponentBrandMask = new PIXI.Graphics();
      opponentBrandMask.fill({ color: 0xffffff });
      opponentBrandMask.rect(0, 0, 178, 40);
      opponentBrandMask.fill();
      opponentBrandContainer.addChild(opponentBrandMask);
      opponentBrandContainer.mask = opponentBrandMask;

      const opponentBrandText1 = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 26,
          fontWeight: "800",
          fill: 0xffffff,
          align: "right",
          letterSpacing: 0.5,
        }),
      });
      opponentBrandText1.x = 0;
      opponentBrandText1.y = 0;
      opponentBrandContainer.addChild(opponentBrandText1);
      p5Container.addChild(opponentBrandContainer);
      dynamicFieldsRef.current.opponentBrandText1 = opponentBrandText1;

      const opponentBrandText2 = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
          fontFamily: "Rajdhani",
          fontSize: 13,
          fontWeight: "800",
          fill: 0x94a3b8, // Silver-gray
          align: "right",
          letterSpacing: 0.5,
        }),
      });
      opponentBrandText2.x = 1828; // Perfect symmetric offset from right circular logo
      opponentBrandText2.y = 48;
      opponentBrandText2.anchor.set(1, 0); // Right-anchored
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
      updatePixiData(latestStateRef.current);
      } catch (err) {
        console.error("Error in initPixi", err);
      }
    }

    initPixi();

    return () => {
      isDestroyed = true;
      
      // Kill all active GSAP marquees to avoid memory leaks
      const fields = dynamicFieldsRef.current;
      if (fields) {
        const marqueeFields = [
          fields.teamNameText,
          fields.opponentBrandText1,
          fields.tournamentText,
          fields.bowlerName,
          fields.batsman1Name,
          fields.batsman2Name
        ];
        marqueeFields.forEach(field => {
          if (field && (field as any)._marqueeTween) {
            try {
              (field as any)._marqueeTween.kill();
            } catch (e) {}
          }
        });
      }

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
      const remainingBalls = ((s.config?.totalOvers || 20) * 6) - s.balls;
      const runsNeeded = s.target - s.runs;
      if (runsNeeded <= 0) {
        return `${(s.config?.team2 || "TEAM 2").toUpperCase()} WON THE MATCH!`;
      }
      if (remainingBalls <= 0) {
        return `${(s.config?.team1 || "TEAM 1").toUpperCase()} WON THE MATCH!`;
      }
      return `NEED ${runsNeeded} RUNS FROM ${remainingBalls} BALLS`;
    }

    // Toss fallback
    const tossText = `${s.config?.tossWinner || "TEAM"} WON THE TOSS & DECIDED TO ${(s.config?.tossDecision || "bat") === "bat" ? "BAT" : "BOWL"}`;
    return tossText.toUpperCase();
  }

  // ────────────────────────────────────────────────────────
  // DYNAMIC STYLING REFRESH CODE (TRIGGERED ON ACTION UPDATES)
  // ────────────────────────────────────────────────────────
  function refreshStyles(s: MatchState) {
    const fields = dynamicFieldsRef.current;
    if (!fields) return;

    const primaryColor = s.primaryColor || "#1d4ed8";   // Team 1
    const secondaryColor = s.secondaryColor || "#581c87"; // Team 2
    const glowColor = s.glowColor || "#c084fc";
    const accentTextColor = s.accentTextColor || "#fbbf24";
    const gradientStyle = s.gradientStyle || "linear";
    const fontSelector = s.fontSelector || "Bebas Neue";
    const glowIntensity = s.glowIntensity ?? 0.75;
    const stripTransparency = s.stripTransparency ?? 1;

    const primNum = hexStringToNumber(primaryColor, 0x1d4ed8);
    const secNum = hexStringToNumber(secondaryColor, 0x581c87);
    const glowNum = hexStringToNumber(glowColor, 0xc084fc);
    const accentNum = hexStringToNumber(accentTextColor, 0xfbbf24);

    // 1. Redraw glowing neon bars live
    if (fields.glowBar1) {
      drawGlowBarLive(fields.glowBar1, 1280, 85, [0xffffff, glowNum], glowIntensity);
    }
    if (fields.glowBar2) {
      drawGlowBarLive(fields.glowBar2, 1650, 85, [0xffffff, glowNum], glowIntensity);
    }

    if (fields.stripContainer) {
      gsap.to(fields.stripContainer, {
        alpha: stripTransparency,
        duration: 0.35,
        ease: "power2.out",
      });
    }

    const buildGradient = (main: string, darkTarget: string, tail: string, width: number) => {
      if (gradientStyle === "radial") {
        return createGradientTexture([blendHexColors(main, "#ffffff", 0.08), main, darkTarget], width, 85);
      }
      if (gradientStyle === "split") {
        return createGradientTexture([main, main, darkTarget], width, 85);
      }
      return createGradientTexture([main, darkTarget, tail], width, 85);
    };

    const buildGradientReversed = (main: string, darkTarget: string, tail: string, width: number) => {
      if (gradientStyle === "radial") {
        return createGradientTexture([darkTarget, main, blendHexColors(main, "#ffffff", 0.08)], width, 85);
      }
      if (gradientStyle === "split") {
        return createGradientTexture([darkTarget, main, main], width, 85);
      }
      return createGradientTexture([tail, darkTarget, main], width, 85);
    };

    // 2. Refresh Edge Highlight stripe on far-left
    if (fields.edgeHighlight) {
      fields.edgeHighlight.clear();
      fields.edgeHighlight.fill({ color: primNum });
      fields.edgeHighlight.rect(0, 0, 6, 85);
      fields.edgeHighlight.fill();
    }

    // 3. Generate team-specific textures so left/right can switch by innings.
    const team1Texture = buildGradient(primaryColor, blendHexColors(primaryColor, "#000000", 0.55), "#070b15", 1080);
    const team2Texture = buildGradient(secondaryColor, blendHexColors(secondaryColor, "#000000", 0.55), "#070b15", 1080);
    const batsmanTexture = createGradientTexture(["#070d1a", "#03050b"], 530, 85);
    const darkInfoTexture = createGradientTexture(["#070b14", "#020306"], 200, 85);
    const purpleInfoTexture = createGradientTexture([secondaryColor, blendHexColors(secondaryColor, "#000000", 0.55), "#0a0515"], 200, 85);
    const bowlerTexture = createGradientTexture(["#070b14", "#020306"], 370, 85);
    const purpleChaseTexture = createGradientTexture(["#0a0515", blendHexColors(secondaryColor, "#000000", 0.55), secondaryColor], 370, 85); // reversed gradient!
    const team1RightTexture = buildGradientReversed(primaryColor, blendHexColors(primaryColor, "#000000", 0.55), "#070b15", 640);
    const team2RightTexture = buildGradientReversed(secondaryColor, blendHexColors(secondaryColor, "#000000", 0.55), "#0a0515", 640);

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

    assignTex(fields.p1NasirBgSprite, team1Texture);
    assignTex(fields.p1FalakBgSprite, team2Texture);
    assignTex(fields.p2BgSprite, batsmanTexture);
    assignTex(fields.p3SlateBgSprite, darkInfoTexture);
    assignTex(fields.p3PurpleBgSprite, purpleInfoTexture);
    assignTex(fields.p4BowlerBgSprite, bowlerTexture);
    assignTex(fields.p4ChaseBgSprite, purpleChaseTexture);
    assignTex(fields.p5FalakBgSprite, team1RightTexture);
    assignTex(fields.p5NasirBgSprite, team2RightTexture);

    // 4. Redraw Crisp Geometrical rectangular borders (Disabled for seamless layout)
    const redrawBorder = (border: PIXI.Graphics | undefined, xStart: number, xEnd: number, color: number, strokeWidth: number = 1.5) => {
      if (!border) return;
      border.clear();
      // Draw nothing to prevent overlapping individual borders
    };

    redrawBorder(fields.p1NasirBgBorder, 0, 1080, primNum, 2);
    redrawBorder(fields.p1FalakBgBorder, 0, 1080, secNum, 2);
    redrawBorder(fields.p2BgBorder, 550, 1080, blendStringToNumber(primaryColor, 0x1e3a8a, 0.45), 1.5);
    redrawBorder(fields.p3SlateBgBorder, 1080, 1280, 0x334155, 1.5);
    redrawBorder(fields.p3PurpleBgBorder, 1080, 1280, secNum, 2);
    redrawBorder(fields.p4BowlerBgBorder, 1280, 1650, 0x334155, 1.5);
    redrawBorder(fields.p4ChaseBgBorder, 1280, 1650, secNum, 2);
    redrawBorder(fields.p5FalakBgBorder, 1280, 1920, primNum, 2);
    redrawBorder(fields.p5NasirBgBorder, 1280, 1920, secNum, 2);

    // 4b. Draw Unified Outer Border and Separators
    if (fields.unifiedBorder) {
      fields.unifiedBorder.clear();

      // Keep only vertical separators for a flatter clean strip.
      fields.unifiedBorder.stroke({ color: 0xffffff, width: 1.0, alpha: 0.18 });
      const dividers = [550, 1080, 1280, 1650];
      dividers.forEach(x => {
        fields.unifiedBorder.moveTo(x, 0);
        fields.unifiedBorder.lineTo(x, 85);
      });
      fields.unifiedBorder.stroke();
    }

    // 5. Update font text style colors
    const applyTextFill = (text: PIXI.Text | undefined, colorNum: number) => {
      if (text) text.style.fill = colorNum;
    };

    applyTextFill(fields.scoreText, accentNum);
    applyTextFill(fields.batsman1Runs, s.batsman1.isStriker ? accentNum : 0xffffff);
    applyTextFill(fields.batsman2Runs, s.batsman2.isStriker ? accentNum : 0xffffff);
    applyTextFill(fields.infoValueText, accentNum);
    applyTextFill(fields.bowlerFigures, accentNum);

    const applyFontFamily = (text: PIXI.Text | undefined) => {
      if (text) text.style.fontFamily = fontSelector;
    };

    applyFontFamily(fields.scoreText);
    applyFontFamily(fields.teamNameText);
    applyFontFamily(fields.tournamentText);
    applyFontFamily(fields.bowlerName);
    applyFontFamily(fields.infoTitleText);
    applyFontFamily(fields.infoValueText);
  }

  function updatePixiData(s: MatchState) {
    try {
      const fields = dynamicFieldsRef.current;
      if (!fields) return;

      // Trigger dyn color reload if values altered
      const prev = prevStateRef.current;
      const colorsChanged = !prev || 
        prev.primaryColor !== s.primaryColor || 
        prev.secondaryColor !== s.secondaryColor ||
        prev.glowColor !== s.glowColor ||
        prev.accentTextColor !== s.accentTextColor ||
        prev.currentInnings !== s.currentInnings ||
        prev.gradientStyle !== s.gradientStyle ||
        prev.stripTransparency !== s.stripTransparency ||
        prev.glowIntensity !== s.glowIntensity ||
        prev.borderRadius !== s.borderRadius ||
        prev.shadowDepth !== s.shadowDepth ||
        prev.fontSelector !== s.fontSelector ||
        prev.stripLayoutSelector !== s.stripLayoutSelector ||
        prev.animationSpeed !== s.animationSpeed ||
        prev.overlayTheme !== s.overlayTheme ||
        prev.stripStyle !== s.stripStyle;

      if (colorsChanged) {
        refreshStyles(s);
      }

      const battingTeamName = s.currentInnings === 1 ? (s.config?.team1 || "Team A") : (s.config?.team2 || "Team B");
      const bowlingTeamName = s.currentInnings === 1 ? (s.config?.team2 || "Team B") : (s.config?.team1 || "Team A");

      const isTeam1Batting = s.currentInnings === 1;
      const isTeam1Bowling = !isTeam1Batting;
    
    const isChaseActive = s.currentInnings === 2 && s.target !== null;
    const secondInningsLayout = s.secondInningsLayout || "combined";

    // Toggle panel background visibilities depending on Active Innings Layout
    if (fields.p1NasirBg) fields.p1NasirBg.visible = isTeam1Batting;
    if (fields.p1FalakBg) fields.p1FalakBg.visible = !isTeam1Batting;

    // Panel 3 is purple during active chase (2nd Innings Target mode), slate during normal innings
    if (fields.p3SlateBg) fields.p3SlateBg.visible = !isChaseActive;
    if (fields.p3PurpleBg) fields.p3PurpleBg.visible = isChaseActive;

    // Switch for 2nd Innings layout configuration
    const isCombinedLayout = isChaseActive && secondInningsLayout === "combined";
    const showBowlerState = !isChaseActive || (isChaseActive && secondInningsLayout === "normal");

    // Toggle Panel 4 graphics backgrounds (Disabled: combined Section 4-5 background handles this seamlessly)
    // if (fields.p4BowlerBg) fields.p4BowlerBg.visible = showBowlerState;
    // if (fields.p4ChaseBg) fields.p4ChaseBg.visible = !showBowlerState;

    if (fields.p5FalakBg) fields.p5FalakBg.visible = isTeam1Bowling;
    if (fields.p5NasirBg) fields.p5NasirBg.visible = !isTeam1Bowling;

    // Toggle graphical text overlays
    if (fields.p4BowlerContainer) fields.p4BowlerContainer.visible = showBowlerState;
    if (fields.p4ChaseContainer) fields.p4ChaseContainer.visible = !showBowlerState;

    // Toggle blooming neon glow bars on 2nd Inning combined mode
    if (fields.glowBar1) fields.glowBar1.visible = isCombinedLayout;
    if (fields.glowBar2) fields.glowBar2.visible = isCombinedLayout;

    // ────────────────────────────────────────────────────────
    // DYNAMIC circular team emblems and sunburst radiating gold rays
    // ────────────────────────────────────────────────────────
    const team1Num = hexStringToNumber(s.primaryColor || "#1d4ed8", 0x1d4ed8);
    const team2Num = hexStringToNumber(s.secondaryColor || "#dc2626", 0xdc2626);
    const battingNum = isTeam1Batting ? team1Num : team2Num;
    const bowlingNum = isTeam1Batting ? team2Num : team1Num;

    if (fields.edgeHighlight) {
      fields.edgeHighlight.clear();
      fields.edgeHighlight.fill({ color: battingNum });
      fields.edgeHighlight.rect(0, 0, 6, 85);
      fields.edgeHighlight.fill();
    }

    // Left team logo circle and rays
    if (fields.leftLogoSunburst && fields.leftLogoCircle && fields.leftLogoText) {
      const cx = 45;
      const cy = 42.5;
      const r = 26;

      // 1. Tight gold cogwheel rim (36 tick ridges)
      // AI Sunburst tinting (matches primary team color for aesthetic blend)
      if (fields.leftLogoSunburst) {
        fields.leftLogoSunburst.tint = battingNum;
      }

      // 2. Filled circle and golden ring border
      fields.leftLogoCircle.clear();
      fields.leftLogoCircle.fill({ color: battingNum });
      fields.leftLogoCircle.drawCircle(cx, cy, r);
      fields.leftLogoCircle.fill();
      fields.leftLogoCircle.stroke({ color: 0xfbbf24, width: 2, alignment: 0.5 });
      fields.leftLogoCircle.drawCircle(cx, cy, r);
      fields.leftLogoCircle.stroke();

      // 3. Batting team initial text
      const battingShortName = s.currentInnings === 1 ? s.config.team1ShortName : s.config.team2ShortName;
      const battingInitials = getTeamInitials(battingTeamName, battingShortName);
      fields.leftLogoText.text = battingInitials;
      
      // Auto-scale font size depending on length
      if (battingInitials.length > 3) {
        fields.leftLogoText.style.fontSize = 12;
      } else if (battingInitials.length === 3) {
        fields.leftLogoText.style.fontSize = 15;
      } else if (battingInitials.length === 2) {
        fields.leftLogoText.style.fontSize = 19;
      } else {
        fields.leftLogoText.style.fontSize = 26;
      }
      
      fields.leftLogoText.x = cx;
      fields.leftLogoText.y = cy;
    }

    // Right team logo circle and rays
    if (fields.rightLogoSunburst && fields.rightLogoCircle && fields.rightLogoText) {
      const cx = 1875;
      const cy = 42.5;
      const r = 26;

      // 1. Tight gold cogwheel rim (36 tick ridges)
      // AI Sunburst tinting (matches secondary team color)
      if (fields.rightLogoSunburst) {
        fields.rightLogoSunburst.tint = bowlingNum;
      }

      // 2. Filled circle and golden ring border
      fields.rightLogoCircle.clear();
      fields.rightLogoCircle.fill({ color: bowlingNum });
      fields.rightLogoCircle.drawCircle(cx, cy, r);
      fields.rightLogoCircle.fill();
      fields.rightLogoCircle.stroke({ color: 0xfbbf24, width: 2, alignment: 0.5 });
      fields.rightLogoCircle.drawCircle(cx, cy, r);
      fields.rightLogoCircle.stroke();

      // 3. Bowling team initial text
      const bowlingShortName = s.currentInnings === 1 ? s.config.team2ShortName : s.config.team1ShortName;
      const bowlingInitials = getTeamInitials(bowlingTeamName, bowlingShortName);
      fields.rightLogoText.text = bowlingInitials;
      
      // Auto-scale font size depending on length
      if (bowlingInitials.length > 3) {
        fields.rightLogoText.style.fontSize = 12;
      } else if (bowlingInitials.length === 3) {
        fields.rightLogoText.style.fontSize = 15;
      } else if (bowlingInitials.length === 2) {
        fields.rightLogoText.style.fontSize = 19;
      } else {
        fields.rightLogoText.style.fontSize = 26;
      }
      
      fields.rightLogoText.x = cx;
      fields.rightLogoText.y = cy;
    }

    // ────────────────────────────────────────────────────────
    // PANEL 1 UPDATES (Batting Team, Score, Overs, Ticker - Stacked Grid)
    // ────────────────────────────────────────────────────────
    const battingShortName = s.currentInnings === 1 ? s.config.team1ShortName : s.config.team2ShortName;
    const bowlingShortName = s.currentInnings === 1 ? s.config.team2ShortName : s.config.team1ShortName;
    const battingAbbrev = (battingShortName || getTeamInitials(battingTeamName)).toUpperCase();
    const bowlingAbbrev = (bowlingShortName || getTeamInitials(bowlingTeamName)).toUpperCase();

    // Smart display names: use short names if configured, otherwise use full names to match screenshots!
    const battingDisplayName = (battingShortName && battingShortName !== "TMA" && battingShortName !== "TMB" && battingShortName.trim().length > 0)
      ? battingShortName.toUpperCase()
      : battingTeamName.toUpperCase();

    const bowlingDisplayName = (bowlingShortName && bowlingShortName !== "TMA" && bowlingShortName !== "TMB" && bowlingShortName.trim().length > 0)
      ? bowlingShortName.toUpperCase()
      : bowlingTeamName.toUpperCase();

    if (fields.teamNameText) {
      fields.teamNameText.text = battingDisplayName;
      let fontSize = 26;
      if (battingDisplayName.length > 12) {
        fontSize = 20;
      } else if (battingDisplayName.length > 8) {
        fontSize = 22;
      }
      fields.teamNameText.style.fontSize = fontSize;
      updateTextMarquee(fields.teamNameText, 198, "left");
    }

    if (fields.vsOpponentText) {
      fields.vsOpponentText.text = `v ${bowlingAbbrev}`;
    }
    
    const scoreX = 300; // Fixed consistent score X coordinate for widescreen 1920px screen width
    if (fields.scoreText) {
      fields.scoreText.x = scoreX;
      fields.scoreText.text = `${s.runs}-${s.wickets}`;
      
      // Dynamic alignment of Powerplay badge and overs text to prevent overlaps
      const scoreRight = fields.scoreText.x + fields.scoreText.width;
      
      if (fields.powerplayBadge && fields.powerplayText) {
        fields.powerplayBadge.clear();
        if (s.powerplay) {
          const badgeX = scoreRight + 8;
          const badgeY = 16;
          const badgeSize = 20;
          
          fields.powerplayBadge.roundRect(badgeX, badgeY, badgeSize, badgeSize, 4);
          fields.powerplayBadge.fill({ color: 0xfbbf24 });
          fields.powerplayBadge.stroke({ color: 0xd97706, width: 1 });
          fields.powerplayBadge.visible = true;
          
          fields.powerplayText.x = badgeX + badgeSize / 2;
          fields.powerplayText.y = badgeY + badgeSize / 2;
          fields.powerplayText.visible = true;
          
          if (fields.oversText) {
            fields.oversText.text = calculateOvers(s.balls);
            fields.oversText.x = badgeX + badgeSize + 8;
            fields.oversText.y = 15;
          }
        } else {
          fields.powerplayBadge.visible = false;
          fields.powerplayText.visible = false;
          
          if (fields.oversText) {
            fields.oversText.text = calculateOvers(s.balls);
            fields.oversText.x = scoreRight + 8;
            fields.oversText.y = 15;
          }
        }
      }
    } else {
      if (fields.oversText) {
        fields.oversText.text = calculateOvers(s.balls);
      }
    }

    if (fields.tournamentText) {
      if (s.superOver) {
        fields.tournamentText.text = "SUPER OVER SCENARIO";
      } else if (s.runsNeeded !== null && s.runsNeeded <= 0) {
        fields.tournamentText.text = `${s.runs >= (s.target || 0) ? battingAbbrev : bowlingAbbrev} WON!`;
      } else if (isChaseActive) {
        const runsNeeded = s.target !== null ? s.target - s.runs : 0;
        const ballsRemaining = Math.max(0, ((s.config?.totalOvers || 20) * 6) - s.balls);
        fields.tournamentText.text = `NEED ${runsNeeded} RUNS FROM ${ballsRemaining} BALLS`;
      } else {
        // First Innings - display toss decision (FALAK XI DARAVE DECIDED TO BOWL)
        const tossText = `${(s.config?.tossWinner || "TEAM").toUpperCase()} DECIDED TO ${(s.config?.tossDecision || "bat").toUpperCase() === "BAT" ? "BAT" : "BOWL"}`;
        fields.tournamentText.text = tossText;
      }
      
      fields.tournamentText.style.fontSize = 13;
      updateTextMarquee(fields.tournamentText, 240, "left");
    }
    
    if (fields.tickerText) {
      fields.tickerText.text = getTickerText(s);
    }

    // ────────────────────────────────────────────────────────
    // PANEL 2 BATTING LIST UPDATES
    // ────────────────────────────────────────────────────────
    const batsman1 = s.batsman1 || { name: "BATSMAN 1", runs: 0, balls: 0, isStriker: true };
    const batsman2 = s.batsman2 || { name: "BATSMAN 2", runs: 0, balls: 0, isStriker: false };
    const bowler = s.bowler || { name: "BOWLER", runs: 0, wickets: 0, balls: 0, oversBowled: [], currentOverRuns: 0 };

    if (fields.batsman1Name) {
      fields.batsman1Name.text = batsman1.name.toUpperCase();
      fields.batsman1Name.style.fill = batsman1.isStriker ? 0xffffff : 0xa1a1aa;
      fields.batsman1Name.style.fontSize = 17;
      updateTextMarquee(fields.batsman1Name, 360, "left");
    }
    if (fields.batsman1Runs) {
      fields.batsman1Runs.text = String(batsman1.runs);
      fields.batsman1Runs.style.fill = batsman1.isStriker ? hexStringToNumber(s.accentTextColor, 0xfbbf24) : 0xffffff;
    }
    if (fields.batsman1Balls) {
      fields.batsman1Balls.text = String(batsman1.balls);
      fields.batsman1Balls.style.fill = batsman1.isStriker ? 0x94a3b8 : 0x71717a;
    }
    if (fields.batsman1StrikerIndicator) {
      fields.batsman1StrikerIndicator.visible = batsman1.isStriker;
    }

    if (fields.batsman2Name) {
      fields.batsman2Name.text = batsman2.name.toUpperCase();
      fields.batsman2Name.style.fill = batsman2.isStriker ? 0xffffff : 0xa1a1aa;
      fields.batsman2Name.style.fontSize = 17;
      updateTextMarquee(fields.batsman2Name, 360, "left");
    }
    if (fields.batsman2Runs) {
      fields.batsman2Runs.text = String(batsman2.runs);
      fields.batsman2Runs.style.fill = batsman2.isStriker ? hexStringToNumber(s.accentTextColor, 0xfbbf24) : 0xffffff;
    }
    if (fields.batsman2Balls) {
      fields.batsman2Balls.text = String(batsman2.balls);
      fields.batsman2Balls.style.fill = batsman2.isStriker ? 0x94a3b8 : 0x71717a;
    }
    if (fields.batsman2StrikerIndicator) {
      fields.batsman2StrikerIndicator.visible = batsman2.isStriker;
    }

    // ────────────────────────────────────────────────────────
    // PANEL 3 DYNAMIC DISPLAY METRICS & LAYOUT SELECTIONS
    // ────────────────────────────────────────────────────────
    const targetScore = s.target || 0;
    const runsToTarget = targetScore - s.runs;
    const remainingBalls = Math.max(0, ((s.config?.totalOvers || 20) * 6) - s.balls);
    const rrr = remainingBalls > 0 ? (runsToTarget / remainingBalls) * 6 : 0;

    if (!isChaseActive) {
      // First Innings dynamic configurations (Standard colors: White titles, Gold values)
      if (fields.infoTitleText) fields.infoTitleText.style.fill = 0xffffff;
      if (fields.infoValueText) fields.infoValueText.style.fill = hexStringToNumber(s.accentTextColor, 0xfbbf24);
      if (fields.infoValueLabelSub) fields.infoValueLabelSub.style.fill = 0x94a3b8;

      const displayType = s.infoPanelTheme || "projected";
      const crr = s.balls > 0 ? (s.runs / s.balls) * 6 : 0;
      
      if (displayType === "crr") {
        if (fields.infoTitleText) fields.infoTitleText.text = "RUN-RATE";
        if (fields.infoValueText) fields.infoValueText.text = crr.toFixed(2);
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = "CURRENT";
      } 
      else if (displayType === "partnership") {
        if (fields.infoTitleText) fields.infoTitleText.text = "PARTNERSHIP";
        if (fields.infoValueText) fields.infoValueText.text = String(s.partnershipRuns);
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `${s.partnershipBalls} BALLS`;
      } 
      else if (displayType === "toss") {
        if (fields.infoTitleText) fields.infoTitleText.text = "TOSS";
        if (fields.infoValueText) fields.infoValueText.text = (s.config?.tossDecision || "bat").toUpperCase() === "BAT" ? "BAT" : "BOWL";
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = (s.config?.tossWinner || "TEAM").toUpperCase();
      }
      else {
        // "projected"
        const proj = s.balls > 0 ? Math.round(crr * (s.config?.totalOvers || 20)) : 0;
        
        if (fields.infoTitleText) fields.infoTitleText.text = "PROJECTED";
        if (fields.infoValueText) fields.infoValueText.text = proj > 0 ? `${proj}` : "-";
        if (fields.infoValueLabelSub) fields.infoValueLabelSub.text = `SCORE`;
      }
    } else {
      // Second Innings active layouts (Chase White Panel colors: High-contrast Black titles/values, dark slate RRR)
      if (fields.infoTitleText) fields.infoTitleText.style.fill = 0x000000;
      if (fields.infoValueText) fields.infoValueText.style.fill = 0x000000;
      if (fields.infoValueLabelSub) fields.infoValueLabelSub.style.fill = 0x475569;

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
        fields.bowlerName.text = bowler.name.toUpperCase();
        fields.bowlerName.style.fontSize = 17;
        updateTextMarquee(fields.bowlerName, 240, "left");
      }
      if (fields.bowlerFigures) {
        fields.bowlerFigures.text = `${bowler.wickets}-${bowler.runs}`;
      }
      if (fields.bowlerOvers) {
        fields.bowlerOvers.text = `${calculateOvers(bowler.balls)} OVER`;
      }

      // Recent balls timeline widgets
      if (fields.ballsContainer) {
        fields.ballsContainer.removeChildren().forEach((child) => child.destroy());

        const maxRecentBalls = 6;
        const bArray = s.recentBalls && s.recentBalls.length > 0 ? s.recentBalls : s.thisOver.slice(-maxRecentBalls);
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
          let isDotBall = ballSymbol === "•" || ballSymbol === "0" || ballSymbol.toLowerCase() === "dot";

          if (ballSymbol === "6" || ballSymbol === "4") {
            bgHex = hexStringToNumber(s.accentTextColor, 0xfbbf24); 
            borderHex = blendStringToNumber(s.accentTextColor || "#fbbf24", 0xd97706, 0.4);
            textHex = 0x0f172a; // High contrast dark text
          } else if (ballSymbol === "W" || ballSymbol.toUpperCase().includes("W")) {
            bgHex = 0xef4444; 
            borderHex = 0xb91c1c;
            textHex = 0xffffff;
          } else if (isDotBall) {
            bgHex = 0xf8fafc; // White background
            borderHex = 0xcbd5e1; // Light border
            textHex = 0x16a34a; // Unused but kept for consistency
          } else {
            bgHex = 0xf8fafc;
            borderHex = 0xcbd5e1;
          }

          ballBorder.roundRect(0, 0, cardWidth, cardHeight, 4);
          ballBorder.fill({ color: bgHex });
          ballBorder.stroke({ color: borderHex, width: 1.5 });
          ballItem.addChild(ballBorder);

          if (isDotBall) {
            // Draw a solid green dot
            const dotGraphics = new PIXI.Graphics();
            dotGraphics.fill({ color: 0x16a34a });
            dotGraphics.drawCircle(cardWidth / 2, cardHeight / 2, 4);
            dotGraphics.fill();
            ballItem.addChild(dotGraphics);
          } else {
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
          }

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
    // PANEL 5 OPPONENT BRAND NAME ACTION COMPONENT (Symmetric Stack)
    // ────────────────────────────────────────────────────────
    if (fields.opponentBrandText1 && fields.opponentBrandText2) {
      fields.opponentBrandText1.text = bowlingDisplayName;
      let fontSize = 26;
      if (bowlingDisplayName.length > 12) {
        fontSize = 20;
      } else if (bowlingDisplayName.length > 8) {
        fontSize = 22;
      }
      fields.opponentBrandText1.style.fontSize = fontSize;

      updateTextMarquee(fields.opponentBrandText1, 178, "right");

      fields.opponentBrandText2.text = `v ${battingAbbrev}`;
    }

    // ────────────────────────────────────────────────────────
    // LIVE BROADCAST SHAKE AND TRANSITION FLASHER WIPE
    // ────────────────────────────────────────────────────────
    if (s.eventTrigger && s.eventTrigger.timestamp !== prev?.eventTrigger?.timestamp) {
      triggerTvGraphicsWipe(s.eventTrigger.type);
    }

    // Store state in ref
    prevStateRef.current = JSON.parse(JSON.stringify(s));
    } catch (err) {
      console.error("Error in updatePixiData", err);
    }
  }

  function triggerTvGraphicsWipe(type: "four" | "six" | "wicket" | "single" | "config" | "reset" | "freehit" | "maiden" | "milestone") {
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

    const width = 1920;
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
        style={{ minHeight: "220px" }} 
        id="pixi-graphics-canvas"
      />
    </div>
  );
}
