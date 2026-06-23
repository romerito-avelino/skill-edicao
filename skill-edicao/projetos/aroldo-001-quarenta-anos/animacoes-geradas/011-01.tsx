import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

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

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(createParticles());
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const corDestaque = "#F5C842";
  const corTexto = "#3A1A00";
  const corPrimaria = "#D4651A";

  const fraseExibida = "Zé Raimundo chegou com coisa na cabeça";

  const totalSec = durationInFrames / fps;
  const t = frame / fps;

  // FASE 1: 0-20% fundo entra
  const fase1End = durationInFrames * 0.20;
  // FASE 2: 20-45% texto surge
  const fase2Start = durationInFrames * 0.20;
  const fase2End = durationInFrames * 0.45;
  // FASE 3: 45-80% estável
  const fase3End = durationInFrames * 0.80;
  // FASE 4: 80-100% saída

  // Fundo branco expansivo - entra na fase 1
  const bgOpacity = interpolate(frame, [0, fase1End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Círculo de luz expansiva (atmosfera esperançosa)
  const lightExpand = interpolate(frame, [0, fase2End], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fly progress esperançoso - spring stiffness 120-160, damping 14-17
  const flyProgress = interpolate(frame, [fase2Start, fase2End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2.5),
  });

  const scale = 0.08 + flyProgress * 0.92;

  // Flash de impacto (mais suave para alegria/esperança)
  const impactStart = fase2End - fps * 0.3;
  const impactPeak = fase2End - fps * 0.1;
  const impactEnd = fase2End + fps * 0.2;

  const brightness = interpolate(
    frame,
    [Math.floor(impactStart), Math.floor(impactPeak)],
    [1, 2.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const postBrightness = interpolate(
    frame,
    [Math.floor(impactPeak), Math.floor(impactEnd)],
    [2.2, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const finalBrightness = frame < impactPeak ? brightness : postBrightness;

  // Glow pulse esperançoso mais vivo
  const glowPulse = flyProgress >= 1
    ? 0.6 + 0.4 * Math.sin(t * Math.PI * 2 * 0.6)
    : 0;

  // Micro-animação de flutuação na fase 3
  const floatY = flyProgress >= 1
    ? Math.sin(t * Math.PI * 2 * 0.4) * 6
    : 0;

  // Linha decorativa inferior
  const lineExpand = interpolate(frame, [fase2End, fase3End], [0, 700], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Saída fase 4
  const saida = interpolate(frame, [fase3End, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const globalOpacity = interpolate(
    frame,
    [0, 8, fase3End, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Canvas: partículas douradas leves + flash
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CW, CH);

    if (flyProgress < 1) {
      const cx = CW / 2;
      const cy = CH / 2;
      particlesRef.current.forEach((p) => {
        const pt = (t + p.life * 2) % 2;
        const px = cx + p.vx * pt * 40 * (1 - flyProgress);
        const py = cy + p.vy * pt * 40 * (1 - flyProgress);
        const alpha = Math.max(0, 1 - pt / 2) * (1 - flyProgress) * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = corPrimaria + Math.round(alpha * 200).toString(16).padStart(2, "0");
        ctx.fill();
      });
    }

    // Partículas flutuantes de alegria na fase estável
    if (flyProgress >= 1) {
      particlesRef.current.forEach((p) => {
        const pt = (t * 0.4 + p.life * 3) % 3;
        const px = CW * p.life + p.vx * pt * 20;
        const py = CH * 0.5 + p.vy * pt * 60 - pt * 30;
        const alpha = Math.max(0, (1 - pt / 3)) * 0.25 * glowPulse;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = corDestaque + Math.round(alpha * 180).toString(16).padStart(2, "0");
        ctx.fill();
      });
    }

    // Flash de impacto suave
    if (frame >= impactStart && frame <= impactEnd) {
      const flashAlpha = Math.max(0, (finalBrightness - 1) / 1.2) * 0.25;
      ctx.fillStyle = `rgba(255, 240, 200, ${flashAlpha})`;
      ctx.fillRect(0, 0, CW, CH);
    }
  }, [frame]);

  const words = fraseExibida.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Fundo branco esperançoso */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, #ffffff 0%, #fdf6ec 40%, #f5e8d0 100%)`,
          opacity: bgOpacity,
        }}
      />

      {/* Halo de luz expansiva central */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${lightExpand * 80}% ${lightExpand * 60}% at 50% 50%,
            rgba(213, 101, 26, 0.10) 0%,
            rgba(245, 200, 66, 0.08) 40%,
            transparent 75%
          )`,
          opacity: bgOpacity,
        }}
      />

      {/* Linha decorativa superior — zona segura topo */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineExpand * 0.6}px`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${corPrimaria}88, ${corDestaque}, ${corPrimaria}88, transparent)`,
          opacity: flyProgress * (0.5 + glowPulse * 0.5),
          zIndex: 10,
        }}
      />

      {/* Ornamento ponto superior */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: corDestaque,
          opacity: flyProgress * (0.7 + glowPulse * 0.3),
          boxShadow: `0 0 ${12 + glowPulse * 16}px ${corDestaque}`,
          zIndex: 10,
        }}
      />

      {/* Canvas de partículas */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Texto principal voando */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${scale}) translateY(${floatY}px)`,
            textAlign: "center",
            filter: `brightness(${finalBrightness})`,
          }}
        >
          {/* Fundo semitransparente atrás do texto */}
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.82)",
              borderRadius: 16,
              padding: "28px 48px",
              display: "inline-block",
              boxShadow: `0 4px 40px rgba(212,101,26,${0.10 + glowPulse * 0.12}),
                          0 0 80px rgba(245,200,66,${0.06 + glowPulse * 0.08})`,
            }}
          >
            <div
              style={{
                color: corPrimaria,
                fontSize: 108,
                fontFamily: "Georgia, serif",
                fontWeight: 600,
                lineHeight: 1.2,
                textShadow: `
                  0 0 ${30 + glowPulse * 50}px rgba(212,101,26,${0.25 + glowPulse * 0.2}),
                  2px 4px 0 rgba(139, 69, 19, 0.15)
                `,
                letterSpacing: "0.015em",
              }}
            >
              {line1}
            </div>
            {line2 && (
              <div
                style={{
                  color: "#8B4513",
                  fontSize: 80,
                  fontFamily: "Georgia, serif",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  textShadow: `0 0 ${20 + glowPulse * 40}px rgba(245,200,66,${0.4 + glowPulse * 0.3})`,
                  letterSpacing: "0.03em",
                }}
              >
                {line2}
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>

      {/* Linha decorativa inferior — zona segura baixo */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineExpand}px`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${corPrimaria}99, ${corDestaque}, ${corPrimaria}99, transparent)`,
          opacity: flyProgress * (0.6 + glowPulse * 0.4),
          zIndex: 10,
        }}
      />

      {/* Ornamento ponto inferior */}
      <div
        style={{
          position: "absolute",
          bottom: 84,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: corDestaque,
          opacity: flyProgress * (0.7 + glowPulse * 0.3),
          boxShadow: `0 0 ${12 + glowPulse * 16}px ${corDestaque}`,
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
};