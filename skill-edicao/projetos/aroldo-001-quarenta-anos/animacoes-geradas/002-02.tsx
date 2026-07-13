import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const CW = 1920;
const CH = 1080;
const PARTICLE_COUNT = 80;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number };

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: 0, y: 0,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 3 - 1,
    life: Math.random(),
    size: 2 + Math.random() * 4,
  }));
}

type ShardProps = { x: number; y: number; w: number; h: number; angle: number; vx: number; vy: number; va: number; seed: number };

function createShards(): ShardProps[] {
  return Array.from({ length: 22 }, (_, i) => ({
    x: CW / 2 + (Math.random() - 0.5) * 700,
    y: CH / 2 + (Math.random() - 0.5) * 300,
    w: 30 + Math.random() * 120,
    h: 8 + Math.random() * 30,
    angle: (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 8 + 4,
    va: (Math.random() - 0.5) * 8,
    seed: Math.random(),
  }));
}

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(createParticles());
  const shardsRef = useRef<ShardProps[]>(createShards());
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fraseExibida = "Tudo pode desabar de uma vez";
  const corDestaque = "#D4651A";
  const corTexto = "#FFFFFF";
  const corSecundaria = "#8B4513";

  const totalSec = durationInFrames / fps;
  const t = frame / fps;

  // Fases: 0-20%, 20-45%, 45-80%, 80-100%
  const f1End = durationInFrames * 0.20;
  const f2Start = durationInFrames * 0.20;
  const f2End = durationInFrames * 0.45;
  const f3Start = durationInFrames * 0.45;
  const f3End = durationInFrames * 0.80;
  const f4Start = durationInFrames * 0.80;

  // flyProgress mantido para compatibilidade com lógica original, mapeia 0-45% do clip
  const flyProgress = Math.min(frame / (durationInFrames * 0.7), 1);
  const easedFly = 1 - Math.pow(1 - flyProgress, 3);

  // Camera shake — pesado/tenso: vibração sutil mas pesada
  const shakeActive = frame > f2Start && frame < f4Start;
  const shakeIntensity = interpolate(frame, [f2Start, f2End, f3End, f4Start], [0, 6, 3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shakeX = shakeActive ? Math.sin(t * 47.3 + 1.2) * Math.cos(t * 31.7) * shakeIntensity : 0;
  const shakeY = shakeActive ? Math.cos(t * 53.1 + 2.4) * Math.sin(t * 29.3) * shakeIntensity * 0.6 : 0;

  // Impact moment: 68%-78% do total (como original)
  const impactStart = fps * totalSec * 0.68;
  const impactPeak = fps * totalSec * 0.72;
  const impactEnd = fps * totalSec * 0.78;

  const brightness = interpolate(frame, [Math.floor(impactStart), Math.floor(impactPeak)], [1, 3.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const postBrightness = interpolate(frame, [Math.floor(impactPeak), Math.floor(impactEnd)], [3.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalBrightness = frame < impactPeak ? brightness : postBrightness;

  // Glow pulse após impacto
  const glowPulse = flyProgress >= 1 ? 0.7 + 0.3 * Math.sin(t * Math.PI * 2 * 0.5) : 0;

  // Escala do texto — pesado: começa menor, chegada mais lenta
  const scale = interpolate(frame, [f2Start, f2End], [0.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1.0, 0.36, 1.0),
  });
  const stableScale = frame >= f2End ? 1 + Math.sin(t * 1.8) * 0.004 : scale;
  const exitScale = interpolate(frame, [f3End, durationInFrames], [1, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalScale = frame >= f3End ? stableScale * exitScale : stableScale;

  // Shatter progress: disparado no impacto
  const shatterProgress = interpolate(frame, [Math.floor(impactStart), Math.floor(impactEnd + fps * 0.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Textura de fundo (concreto simulado via canvas pattern) + madeira via gradiente
  const bgOpacity = interpolate(frame, [0, f1End], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);

    // === FUNDO: TEXTURA DE MADEIRA SIMULADA ===
    const woodGrad = ctx.createLinearGradient(0, 0, CW, CH);
    woodGrad.addColorStop(0, "#1a0e06");
    woodGrad.addColorStop(0.15, "#2a1508");
    woodGrad.addColorStop(0.3, "#1c0d05");
    woodGrad.addColorStop(0.45, "#2e1a09");
    woodGrad.addColorStop(0.6, "#1a0d04");
    woodGrad.addColorStop(0.75, "#271305");
    woodGrad.addColorStop(1, "#120a02");
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, CW, CH);

    // Veios de madeira horizontais
    for (let i = 0; i < 40; i++) {
      const yv = (i / 40) * CH + Math.sin(i * 2.7) * 30;
      const lineGrad = ctx.createLinearGradient(0, yv, CW, yv + 3);
      lineGrad.addColorStop(0, "rgba(80,40,10,0)");
      lineGrad.addColorStop(0.2, `rgba(90,45,12,${0.08 + Math.sin(i * 1.3) * 0.05})`);
      lineGrad.addColorStop(0.5, `rgba(60,28,6,${0.12 + Math.cos(i * 0.9) * 0.04})`);
      lineGrad.addColorStop(0.8, `rgba(90,45,12,${0.06 + Math.sin(i * 1.7) * 0.03})`);
      lineGrad.addColorStop(1, "rgba(80,40,10,0)");
      ctx.beginPath();
      ctx.moveTo(0, yv);
      for (let x = 0; x <= CW; x += 40) {
        ctx.lineTo(x, yv + Math.sin(x * 0.008 + i * 0.4) * 4);
      }
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.strokeStyle = lineGrad;
      ctx.stroke();
    }

    // Textura granular — concreto/madeira áspera
    for (let i = 0; i < 1200; i++) {
      const gx = Math.random() * CW;
      const gy = Math.random() * CH;
      const gs = 0.5 + Math.random() * 2;
      const ga = Math.random() * 0.06;
      ctx.beginPath();
      ctx.arc(gx, gy, gs, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${20 + Math.random() * 40},${10 + Math.random() * 20},${Math.random() * 8},${ga})`;
      ctx.fill();
    }

    // Vinheta pesada
    const vignette = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.25, CW / 2, CH / 2, CH * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.6, "rgba(0,0,0,0.35)");
    vignette.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CW, CH);
    ctx.globalAlpha = 1;

    // === PARTÍCULAS DE TRILHA (fase de entrada do texto) ===
    if (flyProgress < 1) {
      const cx = CW / 2;
      const cy = CH / 2;
      particlesRef.current.forEach((p) => {
        const pt = (t + p.life * 2) % 2;
        const px = cx + p.vx * pt * 30 * (1 - easedFly);
        const py = cy + p.vy * pt * 30 * (1 - easedFly);
        const alpha = Math.max(0, 1 - pt / 2) * (1 - easedFly);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = corDestaque + Math.round(alpha * 220).toString(16).padStart(2, "0");
        ctx.fill();
      });
    }

    // === EFEITO SHATTER DE VIDRO ===
    if (shatterProgress > 0 && shatterProgress <= 1) {
      const shards = shardsRef.current;
      shards.forEach((s) => {
        const sp = shatterProgress;
        const delay = s.seed * 0.25;
        const localP = Math.max(0, Math.min(1, (sp - delay) / (1 - delay + 0.01)));
        if (localP <= 0) return;

        const sx = s.x + s.vx * localP * 80;
        const sy = s.y + s.vy * localP * 80 + localP * localP * 60;
        const sa = (s.angle + s.va * localP * 20) * (Math.PI / 180);
        const alpha = Math.max(0, 1 - localP * 1.2);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sa);
        ctx.globalAlpha = alpha * bgOpacity;

        // Fragmento estilo vidro — brilho de madeira quebrada
        const shardGrad = ctx.createLinearGradient(-s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
        shardGrad.addColorStop(0, `rgba(212,101,26,${0.7 * alpha})`);
        shardGrad.addColorStop(0.4, `rgba(245,200,66,${0.9 * alpha})`);
        shardGrad.addColorStop(1, `rgba(139,69,19,${0.5 * alpha})`);

        ctx.beginPath();
        // Polígono irregular para fragmento
        ctx.moveTo(-s.w / 2, -s.h / 3);
        ctx.lineTo(-s.w / 4 + s.seed * 10, -s.h / 2);
        ctx.lineTo(s.w / 3, -s.h / 2.5);
        ctx.lineTo(s.w / 2, s.h / 4);
        ctx.lineTo(s.w / 4, s.h / 2);
        ctx.lineTo(-s.w / 3, s.h / 2.5);
        ctx.closePath();
        ctx.fillStyle = shardGrad;
        ctx.fill();
        ctx.strokeStyle = `rgba(245,200,66,${0.4 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    // === RACHADURAS NO VIDRO ===
    if (shatterProgress > 0) {
      const crackAlpha = Math.min(shatterProgress * 3, 1) * bgOpacity;
      ctx.globalAlpha = crackAlpha * 0.8;
      ctx.strokeStyle = `rgba(245,200,66,0.9)`;
      ctx.lineWidth = 1.5;

      // Rachaduras irradiando do centro
      const crackSeeds = [
        { angle: 15, len: 320, branches: [[35, 160], [-20, 100]] },
        { angle: 72, len: 280, branches: [[50, 140], [-35, 90]] },
        { angle: 135, len: 350, branches: [[-40, 180], [25, 120]] },
        { angle: 198, len: 300, branches: [[30, 150], [-45, 80]] },
        { angle: 255, len: 260, branches: [[-25, 130], [40, 100]] },
        { angle: 320, len: 310, branches: [[45, 160], [-30, 110]] },
      ];

      crackSeeds.forEach((c) => {