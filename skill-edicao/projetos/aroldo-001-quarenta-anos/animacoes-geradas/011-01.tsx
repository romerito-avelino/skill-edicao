import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const CW = 1920;
const CH = 1080;
const PARTICLE_COUNT = 60;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number };

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH,
    vx: (Math.random() - 0.5) * 1.2,
    vy: -0.4 - Math.random() * 0.8,
    life: Math.random(),
    size: 1.5 + Math.random() * 3,
  }));
}

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(createParticles());
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const frase = "Zé Raimundo chegou com coisa na cabeça";
  const corDestaque = "#D4651A";
  const corSecundaria = "#8B4513";

  const totalSec = durationInFrames / fps;
  const t = frame / fps;

  // Fases cinematográficas
  const fase1End = durationInFrames * 0.20;
  const fase2Start = durationInFrames * 0.20;
  const fase2End = durationInFrames * 0.45;
  const fase3End = durationInFrames * 0.80;
  const fase4End = durationInFrames;

  // Opacity global com entrada e saída
  const globalOpacity = interpolate(
    frame,
    [0, 10, fase3End, fase4End],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fundo textura — fade in fase 1
  const bgOpacity = interpolate(frame, [0, fase1End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });

  // Texto — surge suave na fase 2
  const textAppear = interpolate(frame, [fase2Start, fase2End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });
  const textEased = 1 - Math.pow(1 - textAppear, 2.5);

  // Texto Y: desce suavemente de cima na fase 2
  const textY = interpolate(frame, [fase2Start, fase2End], [-40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });

  // Micro-animação na fase 3 — flutuação leve (esperançoso)
  const floatY = frame >= fase2End
    ? Math.sin(t * Math.PI * 2 * 0.28) * 6
    : 0;

  // Linha decorativa — expande na fase 2
  const lineWidth = interpolate(frame, [fase2Start, fase2End + 20], [0, 420], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });

  // Brilho pulsante suave na fase 3
  const glowPulse = frame >= fase2End
    ? 0.6 + 0.4 * Math.sin(t * Math.PI * 2 * 0.4)
    : textEased * 0.6;

  // Divisão da frase em duas linhas
  const words = frase.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  // Partículas — pequenas manchinhas flutuantes estilo textura animada
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);

    if (frame < fase3End) {
      particlesRef.current.forEach((p) => {
        const pt = (t * 0.3 + p.life * 3) % 3;
        const px = p.x + p.vx * pt * 60;
        const py = p.y + p.vy * pt * 60;
        const alpha = Math.max(0, (1 - pt / 3)) * bgOpacity * 0.35;
        ctx.beginPath();
        ctx.arc(px % CW, py < 0 ? py + CH : py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 101, 26, ${alpha})`;
        ctx.fill();
      });
    }

    // Grão de textura sutil sobre o fundo
    if (bgOpacity > 0.1) {
      for (let i = 0; i < 180; i++) {
        const gx = (particlesRef.current[i % PARTICLE_COUNT].x + frame * 0.3) % CW;
        const gy = (particlesRef.current[i % PARTICLE_COUNT].y + i * 7.3) % CH;
        const gs = 0.8 + (i % 3) * 0.4;
        const ga = 0.04 * bgOpacity;
        ctx.beginPath();
        ctx.arc(gx, gy, gs, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 69, 19, ${ga})`;
        ctx.fill();
      }
    }
  }, [frame]);

  // Opacidade saída fase 4 para texto
  const textFadeOut = interpolate(frame, [fase3End, fase4End], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });
  const textOpacity = textEased * textFadeOut;

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>

      {/* Fundo creme texturizado */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 40%, #E8D5B0 0%, #C9B98A 55%, #B5A070 100%)",
          opacity: bgOpacity,
        }}
      />

      {/* Camada de textura simulada com padrão sutil */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity * 0.18,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(100,60,20,0.08) 3px,
              rgba(100,60,20,0.08) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 5px,
              rgba(100,60,20,0.05) 5px,
              rgba(100,60,20,0.05) 6px
            )
          `,
        }}
      />

      {/* Vinheta nas bordas */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(80,45,10,0.45) 100%)",
          opacity: bgOpacity,
        }}
      />

      {/* Canvas de partículas */}
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
          top: 108,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineWidth}px`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${corDestaque}, ${corSecundaria}, ${corDestaque}, transparent)`,
          opacity: textOpacity * 0.9,
          zIndex: 10,
        }}
      />

      {/* Ornamento superior pequeno */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: "50%",
          transform: "translateX(-50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: corDestaque,
          opacity: textOpacity * glowPulse,
          boxShadow: `0 0 ${12 + glowPulse * 16}px ${corDestaque}`,
          zIndex: 10,
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
            transform: `translateY(${textY + floatY}px)`,
            opacity: textOpacity,
            textAlign: "center",
            maxWidth: 1400,
            padding: "0 80px",
          }}
        >
          {/* Linha 1 — tipografia principal, maior */}
          <div
            style={{
              display: "inline-block",
              backgroundColor: "rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: "14px 36px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                color: "#1A0F05",
                fontSize: 108,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "0.01em",
                textShadow: `
                  2px 3px 0 rgba(212,101,26,0.25),
                  0 0 ${30 + glowPulse * 20}px rgba(212,101,26,0.15)
                `,
              }}
            >
              {line1}
            </div>
          </div>

          {/* Linha 2 — tipografia secundária, menor, cor destaque */}
          {line2 && (
            <div
              style={{
                display: "inline-block",
                backgroundColor: "rgba(0,0,0,0.07)",
                borderRadius: 8,
                padding: "10px 32px",
              }}
            >
              <div
                style={{
                  color: corDestaque,
                  fontSize: 76,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "0.04em",
                  textShadow: `
                    1px 2px 0 rgba(139,69,19,0.3),
                    0 0 ${20 + glowPulse * 30}px rgba(212,101,26,0.2)
                  `,
                }}
              >
                {line2}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Linha decorativa inferior — zona segura base */}
      <div
        style={{
          position: "absolute",
          bottom: 108,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineWidth * 0.65}px`,
          height: 1.5,
          background: `linear-gradient(90deg, transparent, ${corSecundaria}88, transparent)`,
          opacity: textOpacity * 0.7,
          zIndex: 10,
        }}
      />

      {/* Ornamento decorativo inferior — pequenos pontos */}
      <div
        style={{
          position: "absolute",
          bottom: 92,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 14,
          opacity: textOpacity * (0.5 + glowPulse * 0.5),
          zIndex: 10,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === 1 ? 10 : 6,
              height: i === 1 ? 10 : 6,
              borderRadius: "50%",
              background: i === 1 ? corDestaque : corSecundaria,
              opacity: i === 1 ? 1 : 0.6,
              boxShadow: i === 1 ? `0 0 ${8 + glowPulse * 10}px ${corDestaque}` : "none",
            }}
          />
        ))}
      </div>

    </AbsoluteFill>
  );
};