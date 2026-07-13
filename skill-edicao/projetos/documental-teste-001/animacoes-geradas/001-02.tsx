import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const CW = 1920;
const CH = 1080;
const GRAIN_COUNT = 120;

type GrainParticle = { x: number; y: number; size: number; opacity: number; speed: number };

function createGrain(): GrainParticle[] {
  return Array.from({ length: GRAIN_COUNT }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH,
    size: 0.5 + Math.random() * 1.5,
    opacity: 0.02 + Math.random() * 0.06,
    speed: 0.3 + Math.random() * 0.7,
  }));
}

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<GrainParticle[]>(createGrain());
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const frase = "Uma pergunta que pode mudar tudo";
  const corDestaque = "#F5C842";
  const corPrimaria = "#D4651A";
  const corSecundaria = "#8B4513";

  const totalSec = durationInFrames / fps;
  const t = frame / fps;

  // Fases cinematográficas
  const fase1End = durationInFrames * 0.20;
  const fase2Start = durationInFrames * 0.20;
  const fase2End = durationInFrames * 0.45;
  const fase3End = durationInFrames * 0.80;
  const fase4End = durationInFrames;

  // FASE 1 — fundo e textura entram
  const fundoOpacity = interpolate(frame, [0, fase1End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });

  const luzCentralScale = interpolate(frame, [0, fase1End * 1.5], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });

  // FASE 2 — texto surge progressivamente
  const textoOpacity = interpolate(frame, [fase2Start, fase2End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
  });

  const textoTranslateY = interpolate(frame, [fase2Start, fase2End], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
  });

  // FASE 3 — micro-animações reflexivas lentas
  const microFloat = frame >= fase2End && frame <= fase3End
    ? Math.sin(t * Math.PI * 0.35) * 4
    : 0;

  const microGlow = frame >= fase2End
    ? 0.85 + 0.15 * Math.sin(t * Math.PI * 0.28)
    : 0;

  // Linha decorativa inferior — surge na fase 2
  const linhaWidth = interpolate(frame, [fase2Start + 20, fase2End + 30], [0, 480], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
  });

  // FASE 4 — saída elegante
  const saidaOpacity = interpolate(frame, [fase3End, fase4End], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.55, 0.085, 0.68, 0.53),
  });

  const globalOpacity = frame >= fase3End ? saidaOpacity : 1;

  // Texto por palavras — surge progressivamente na fase 2
  const words = frase.split(" ");
  const wordDelayFrames = (fase2End - fase2Start) / (words.length + 1);

  // Canvas — grão analógico + luz pontual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);

    // Luz pontual central quente
    const luzAlpha = fundoOpacity * 0.55;
    const grad = ctx.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, 680 * luzCentralScale);
    grad.addColorStop(0, `rgba(212, 101, 26, ${luzAlpha * 0.38})`);
    grad.addColorStop(0.4, `rgba(139, 69, 19, ${luzAlpha * 0.18})`);
    grad.addColorStop(0.75, `rgba(60, 28, 8, ${luzAlpha * 0.08})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Grão de filme analógico
    const grainOpacity = fundoOpacity * 0.9;
    grainRef.current.forEach((g) => {
      const nx = (g.x + frame * g.speed * 0.7) % CW;
      const ny = (g.y + frame * g.speed * 0.3) % CH;
      const flicker = 0.4 + 0.6 * Math.sin(frame * 0.17 + g.x * 0.01 + g.y * 0.02);
      ctx.beginPath();
      ctx.arc(nx, ny, g.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 200, 150, ${g.opacity * grainOpacity * flicker})`;
      ctx.fill();
    });

    // Vinheta de textura sépia nas bordas
    const vigAlpha = fundoOpacity * 0.82;
    const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.3, CW / 2, CH / 2, CH * 0.88);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.6, `rgba(8, 4, 2, ${vigAlpha * 0.15})`);
    vig.addColorStop(1, `rgba(4, 2, 1, ${vigAlpha * 0.72})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CW, CH);

    // Riscos horizontais de textura — simula grão de película
    if (Math.sin(frame * 0.13) > 0.82) {
      const y = 80 + Math.random() * (CH - 160);
      const scratchAlpha = 0.04 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(255, 220, 160, ${scratchAlpha})`;
      ctx.fillRect(0, y, CW, 0.5 + Math.random() * 1);
    }
  }, [frame]);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Fundo sépia envelhecido */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 52% 48%, #1c0d04 0%, #0e0602 45%, #050200 100%)`,
          opacity: fundoOpacity,
        }}
      />

      {/* Textura sépia — camada de cor quente sutil */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(160deg, rgba(80,35,8,0.18) 0%, rgba(40,15,3,0.32) 50%, rgba(20,8,2,0.45) 100%)`,
          opacity: fundoOpacity,
          mixBlendMode: "multiply",
        }}
      />

      {/* Canvas — grão analógico + luz pontual */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Linha decorativa superior — zona segura topo */}
      <div
        style={{
          position: "absolute",
          top: 88,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${linhaWidth * 0.7}px`,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${corSecundaria}88, transparent)`,
          opacity: textoOpacity * 0.6,
          zIndex: 8,
        }}
      />

      {/* Ornamento ponto central superior */}
      <div
        style={{
          position: "absolute",
          top: 82,
          left: "50%",
          transform: "translateX(-50%)",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: corPrimaria,
          opacity: textoOpacity * 0.55,
          zIndex: 8,
        }}
      />

      {/* Bloco de texto principal */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <div
          style={{
            transform: `translateY(${textoTranslateY + microFloat}px)`,
            opacity: textoOpacity,
            textAlign: "center",
            maxWidth: 1100,
            padding: "0 80px",
          }}
        >
          {/* Subtítulo reflexivo acima */}
          <div
            style={{
              color: corPrimaria,
              fontSize: 18,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 400,
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              marginBottom: 32,
              opacity: textoOpacity * 0.75,
              textShadow: `0 0 24px ${corPrimaria}66`,
            }}
          >
            reflexão
          </div>

          {/* Frase principal — palavra por palavra */}
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.70)",
              borderRadius: 8,
              padding: "28px 48px 32px",
              display: "inline-block",
            }}
          >
            <div
              style={{
                color: "#F0E8D8",
                fontSize: 92,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                lineHeight: 1.22,
                letterSpacing: "0.015em",
                textShadow: `
                  0 0 ${48 + microGlow * 32}px ${corPrimaria}${Math.round(microGlow * 80 + 60).toString(16).padStart(2, "0")},
                  0 0 120px ${corSecundaria}22,
                  2px 4px 12px rgba(0,0,0,0.85)
                `,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "0 18px",
              }}
            >
              {words.map((word, i) => {
                const wordStart = fase2Start + i * wordDelayFrames;
                const wordEnd = wordStart + wordDelayFrames * 2.2;
                const wordOpacity = interpolate(frame, [wordStart, wordEnd], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 0.61, 0.36, 1),
                });
                const wordSlide = interpolate(frame, [wordStart, wordEnd], [14, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 0.61, 0.36, 1),
                });
                // Destaque na palavra "tudo"
                const isDestaque = word.toLowerCase() === "tudo";
                return (
                  <span
                    key={i}
                    style={{
                      opacity: wordOpacity,
                      transform: `translateY(${wordSlide}px)`,
                      display: "inline-block",
                      color: isDestaque ? corDestaque : "#F0E8D8",
                      textShadow: isDestaque
                        ? `0 0 ${40 + microGlow * 30}px ${corDestaque}aa, 0 0 80px ${corDestaque}44, 2px 4px 12px rgba(0,0,0,0.85)`
                        : undefined,
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Linha decorativa inferior — zona segura */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${linhaWidth}px`,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${corPrimaria}${Math.round(microGlow * 120 + 80).toString(16).padStart(2, "0")}, transparent)`,
          opacity: textoOpacity * (0.55 + microGlow * 0.2),
          zIndex: 8,
          transition: "width 0.1s",
        }}
      />

      {/* Ponto ornamental inferior */}
      <div
        style={{
          position: "absolute",
          bottom: 104,
          left: "50%",
          transform: "translateX(-50%)",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: corPrimaria,
          opacity: textoOpacity * 0.5,
          zIndex: 8,
        }}
      />
    </AbsoluteFill>
  );
};