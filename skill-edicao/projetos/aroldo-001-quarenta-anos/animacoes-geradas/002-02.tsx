import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const W = 1920, H = 1080;

  // Fases cinematográficas
  const fase1End = Math.floor(durationInFrames * 0.20);   // 0-48
  const fase2End = Math.floor(durationInFrames * 0.45);   // 48-108
  const fase3End = Math.floor(durationInFrames * 0.80);   // 108-192
  // fase4: 192-240

  // Opacidade geral com saída elegante
  const opacidadeGeral = interpolate(
    frame,
    [0, 8, durationInFrames - 18, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // === FASE 1: Fundo texturizado e elementos base ===
  const fundoEntrada = interpolate(frame, [0, fase1End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
  });

  // Textura de grão (linhas diagonais simuladas via gradientes)
  const grainShift = Math.sin(frame * 0.8) * 2;
  const grainShift2 = Math.cos(frame * 1.1) * 1.5;

  // === FASE 2: Texto entra ===
  const textoEntrada = interpolate(frame, [fase1End, fase2End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1)
  });

  const textoY = interpolate(frame, [fase1End, fase2End], [40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1)
  });

  // === FASE 3: Micro-animações tensas (vibração) ===
  const vibracao = interpolate(frame, [fase2End, fase3End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });

  const vibX = frame >= fase2End && frame <= fase3End
    ? Math.sin(frame * 1.7) * 2.2 * vibracao
    : 0;

  const pulsoOpacity = interpolate(
    frame,
    [fase2End, fase2End + 15, fase2End + 30, fase3End],
    [0, 0.8, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Linha horizontal que "racha" — entra na fase 2
  const linhaEntrada = interpolate(frame, [fase1End + 10, fase2End + 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.5, 1)
  });

  // Escala pulsante tensão
  const escalaPulso = interpolate(
    frame,
    [fase2End, fase2End + 8, fase2End + 16, fase2End + 24, fase3End],
    [0.92, 1.04, 0.98, 1.01, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // === FASE 4: Saída ===
  const saidaOpacity = interpolate(frame, [fase3End, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 1, 0.5)
  });
  const opacidadeConteudo = frame < fase3End ? 1 : saidaOpacity;

  // Elemento decorativo: crack/fratura diagonal
  const crackOpacity = interpolate(frame, [fase2End - 5, fase2End + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });

  // Partículas decorativas (fragmentos caindo)
  const particulas = [
    { x: 320, y: 280, delay: fase2End + 5, size: 6 },
    { x: 580, y: 420, delay: fase2End + 12, size: 4 },
    { x: 1400, y: 310, delay: fase2End + 8, size: 5 },
    { x: 1620, y: 450, delay: fase2End + 18, size: 3 },
    { x: 760, y: 760, delay: fase2End + 22, size: 4 },
    { x: 1180, y: 720, delay: fase2End + 14, size: 5 },
  ];

  const startX = 200;
  const endX = W - 200;
  const lineY = H * 0.72;

  const fraseExibida = "Tudo pode desabar de uma hora pra outra";

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>

      {/* === FUNDO CREME TEXTURIZADO === */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, #E8D5B0 0%, #D4B896 30%, #C9A87A 60%, #BF9A68 100%)`,
          opacity: fundoEntrada,
        }}
      />

      {/* Camada de textura — padrão granulado simulado */}
      <AbsoluteFill
        style={{
          opacity: fundoEntrada * 0.35,
          background: `
            repeating-linear-gradient(
              ${45 + grainShift}deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.04) 2px,
              rgba(0,0,0,0.04) 4px
            ),
            repeating-linear-gradient(
              ${-45 + grainShift2}deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.03) 3px,
              rgba(0,0,0,0.03) 6px
            )
          `,
        }}
      />

      {/* Vinheta lateral para tensão */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 35%, rgba(80,30,0,0.55) 100%)`,
          opacity: fundoEntrada * 0.85,
        }}
      />

      {/* Sombra superior — zona decorativa */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(50,20,0,0.4) 0%, transparent 18%)`,
          opacity: fundoEntrada,
          zIndex: 5,
        }}
      />

      {/* Sombra inferior — zona decorativa */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(0deg, rgba(50,20,0,0.4) 0%, transparent 15%)`,
          opacity: fundoEntrada,
          zIndex: 5,
        }}
      />

      {/* === SVG: linhas de tensão e crack === */}
      <AbsoluteFill style={{ opacity: opacidadeGeral * opacidadeConteudo, zIndex: 10 }}>
        <svg width={W} height={H} style={{ position: "absolute" }}>

          {/* Linha horizontal base — "horizonte que racha" */}
          <line
            x1={startX}
            y1={lineY}
            x2={startX + (endX - startX) * linhaEntrada}
            y2={lineY}
            stroke="#1A0A00"
            strokeWidth={2}
            opacity={0.35}
          />

          {/* Linha de destaque cor primária */}
          <line
            x1={startX}
            y1={lineY + 4}
            x2={startX + (endX - startX) * linhaEntrada * 0.85}
            y2={lineY + 4}
            stroke="#D4651A"
            strokeWidth={1.5}
            opacity={0.55 * linhaEntrada}
          />

          {/* Crack diagonal — elemento tensão */}
          <line
            x1={W * 0.5 - 60}
            y1={lineY - 80}
            x2={W * 0.5 + 40}
            y2={lineY + 60}
            stroke="#8B4513"
            strokeWidth={1.5}
            opacity={0.3 * crackOpacity}
            strokeDasharray="6 4"
          />
          <line
            x1={W * 0.5 + 40}
            y1={lineY + 60}
            x2={W * 0.5 + 80}
            y2={lineY + 120}
            stroke="#D4651A"
            strokeWidth={1}
            opacity={0.2 * crackOpacity}
            strokeDasharray="4 6"
          />

          {/* Ponto de tensão central */}
          <circle
            cx={W / 2}
            cy={lineY}
            r={interpolate(frame, [fase2End, fase2End + 20, fase3End], [0, 18, 10], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp"
            })}
            fill="#D4651A"
            opacity={0.12}
          />
          <circle
            cx={W / 2}
            cy={lineY}
            r={interpolate(frame, [fase2End, fase2End + 15, fase3End], [0, 7, 5], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp"
            })}
            fill="#D4651A"
            opacity={0.7}
          />

          {/* Partículas decorativas fragmentos */}
          {particulas.map((p, i) => {
            const pOp = interpolate(frame, [p.delay, p.delay + 10, p.delay + 40], [0, 0.6, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp"
            });
            const pY = interpolate(frame, [p.delay, p.delay + 40], [p.y, p.y + 28], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp"
            });
            return (
              <rect
                key={i}
                x={p.x}
                y={pY}
                width={p.size}
                height={p.size}
                fill="#8B4513"
                opacity={pOp}
                transform={`rotate(${frame * 1.5 + i * 40}, ${p.x + p.size / 2}, ${pY + p.size / 2})`}
              />
            );
          })}

          {/* Linhas de choque laterais */}
          {[-1, 1].map((dir, i) => (
            <line
              key={i}
              x1={W / 2}
              y1={lineY}
              x2={W / 2 + dir * (endX - startX) * 0.35 * linhaEntrada}
              y2={lineY - 8 * dir}
              stroke="#D4651A"
              strokeWidth={1}
              opacity={0.2 * linhaEntrada}
              strokeDasharray="8 6"
            />
          ))}

        </svg>
      </AbsoluteFill>

      {/* === PULSO DE IMPACTO na entrada do texto === */}
      <AbsoluteFill
        style={{
          zIndex: 15,
          opacity: pulsoOpacity * opacidadeGeral,
          background: `radial-gradient(ellipse at center, rgba(212,101,26,0.18) 0%, transparent 65%)`,
        }}
      />

      {/* === TEXTO PRINCIPAL === */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          opacity: textoEntrada * opacidadeGeral * opacidadeConteudo,
          transform: `translateY(${textoY}px) translateX(${vibX}px) scale(${escalaPulso})`,
          padding: "0 140px",
        }}
      >
        {/* Rótulo superior — hierarquia tipográfica */}
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.0)",
            color: "#8B4513",
            fontSize: 18,
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            marginBottom: 24,
            opacity: textoEntrada * 0.75,
          }}
        >
          momento crítico
        </div>

        {/* Frase principal com hierarquia forte */}
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.70)",
            borderRadius: 8,
            padding: "20px 36px",
            color: "#1A0800",
            fontSize: 82,
            fontFamily: "Georgia, serif",
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            wordBreak: "keep-all",
            whiteSpace: "normal",
            overflowWrap: "normal",
            maxWidth: 1200,
            // Sombra pesada para urgência
            textShadow: `
              0 2px 0 rgba(212,101,26,0.4),
              0 4px 12px rgba(0,0,0,0.5),
              0 8px 32px rgba(139,69,19,0.3)
            `,
            boxShadow: `
              0 0 0 1px rgba(139,69,19,0.25),
              0 8px 40px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
            // Override: texto escuro sobre fundo semitransparente
            backgroundColor: "rgba(255,245,230,0.88)",
          }}
        >
          {fraseExibida}
        </div>

        {/* Linha de destaque abaixo do texto — hierarquia visual */}
        <div
          style={{