import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const SCATTER_OFFSET = [
  { x: -700, y: -330 }, { x: 580, y: -370 }, { x: -640, y: 290 },
  { x: 680, y: 310 }, { x: 0, y: -430 }, { x: -800, y: 30 },
  { x: 740, y: 20 }, { x: 10, y: 440 }, { x: -380, y: -390 },
  { x: 390, y: -400 }, { x: -430, y: 360 }, { x: 430, y: 370 },
];

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fraseExibida = "Talvez ainda dê tempo pra você";
  const palavras = fraseExibida.split(/\s+/).filter(Boolean);
  const numPalavras = palavras.length;

  const opacidade = interpolate(
    frame,
    [0, 8, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const CONVERGENCIA_INICIO = 28;
  const CONVERGENCIA_FIM = 58;
  const BRILHO_INICIO = 62;

  const faseOrganizada = frame >= CONVERGENCIA_FIM;

  // Textura de fundo — grade de pontos
  const pontos = Array.from({ length: 18 * 10 }).map((_, i) => {
    const col = i % 18;
    const row = Math.floor(i / 18);
    const ox = (col / 17) * 1920;
    const oy = (row / 9) * 1080;
    const fase = Math.sin((frame * 0.04) + col * 0.7 + row * 1.1) * 0.35 + 0.55;
    const entradaFundo = interpolate(frame, [0, 42], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { ox, oy, fase, entradaFundo };
  });

  // Luz expansiva esperançosa — pulso suave
  const pulso = Math.sin((frame * 0.05)) * 0.06 + 0.94;
  const entradaLuz = interpolate(frame, [0, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const saidaGeral = interpolate(
    frame,
    [durationInFrames - 22, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Linha decorativa horizontal — zona segura inferior
  const entradaLinha = interpolate(frame, [18, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>

      {/* Fundo creme texturizado */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(160deg, #EDE0CB 0%, #F5ECD8 45%, #E8D9BF 100%)",
          opacity: saidaGeral,
        }}
      />

      {/* Textura de ruído visual — pontos sutis */}
      <AbsoluteFill style={{ opacity: saidaGeral }}>
        {pontos.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.ox,
              top: p.oy,
              width: 2,
              height: 2,
              borderRadius: "50%",
              backgroundColor: "#8B4513",
              opacity: p.fase * p.entradaFundo * 0.18,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* Luz radial esperançosa — tom laranja suave */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 52%, rgba(212,101,26,${0.13 * pulso}) 0%, rgba(212,101,26,0.04) 55%, transparent 80%)`,
          opacity: entradaLuz * saidaGeral,
        }}
      />

      {/* Linha decorativa superior — zona segura */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${entradaLinha * 520}px`,
          height: 2,
          backgroundColor: "#D4651A",
          opacity: 0.55 * saidaGeral,
          zIndex: 8,
          borderRadius: 2,
          transition: "width 0.1s",
        }}
      />

      {/* Linha decorativa inferior — zona segura */}
      <div
        style={{
          position: "absolute",
          bottom: 88,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${entradaLinha * 320}px`,
          height: 1,
          backgroundColor: "#8B4513",
          opacity: 0.35 * saidaGeral,
          zIndex: 8,
          borderRadius: 2,
        }}
      />

      {/* Ponto decorativo — interrogação visual (esperança/dúvida) */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 210,
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: "#D4651A",
          opacity: entradaLinha * 0.7 * saidaGeral,
          zIndex: 9,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 210,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#8B4513",
          opacity: entradaLinha * 0.45 * saidaGeral,
          zIndex: 9,
        }}
      />

      {/* Animação principal */}
      <AbsoluteFill style={{ opacity: opacidade }}>

        {/* Fase 1 e 2: palavras espalhadas convergindo */}
        {!faseOrganizada && palavras.map((palavra, i) => {
          const scatter = SCATTER_OFFSET[i % SCATTER_OFFSET.length];
          const flutuacao = Math.sin((frame + i * 12) / 22) * 7;

          const convergP = interpolate(frame, [CONVERGENCIA_INICIO, CONVERGENCIA_FIM], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = scatter.x * (1 - convergP);
          const y = scatter.y * (1 - convergP) + flutuacao * (1 - convergP);
          const scatterOp = interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const ehUltima = i === numPalavras - 1;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                opacity: scatterOp * (1 - convergP * 0.35),
                zIndex: 110,
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(0,0,0,0.70)",
                  borderRadius: 8,
                  padding: "12px 24px",
                  color: ehUltima ? "#D4651A" : "#1A1208",
                  fontSize: 56,
                  fontFamily: "Georgia, serif",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                  letterSpacing: "0.02em",
                }}
              >
                {palavra}
              </div>
            </div>
          );
        })}

        {/* Fase 3: texto organizado com brilho esperançoso em sequência */}
        {faseOrganizada && (
          <AbsoluteFill
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              alignContent: "center",
              padding: "0 140px",
              gap: "0.35em",
              zIndex: 110,
            }}
          >
            {palavras.map((palavra, i) => {
              const ehUltima = i === numPalavras - 1;
              const brilhoFrame = BRILHO_INICIO + i * 5;
              const brilho = interpolate(
                frame,
                [brilhoFrame, brilhoFrame + 9, brilhoFrame + 20],
                [0, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              const aparecimento = interpolate(
                frame,
                [CONVERGENCIA_FIM, CONVERGENCIA_FIM + 12],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              // Micro-animação de levitação suave — fase estável
              const levita = Math.sin((frame * 0.045) + i * 0.9) * 3;

              // Cor hierárquica:
              // "você" — destaque laranja, maior
              // "Talvez" — duvidoso, mais leve
              // demais — preto sobre creme
              let corBase = "#1A1208";
              let pesoFonte: number | string = 500;
              let tamFonte = 78;

              if (ehUltima) {
                corBase = "#D4651A";
                pesoFonte = 700;
                tamFonte = 100;
              } else if (i === 0) {
                // "Talvez" — hierarquia questionadora, levemente menor
                corBase = "#3D2B1F";
                pesoFonte = 400;
                tamFonte = 68;
              }

              const corComBrilho = brilho > 0.1 ? "#D4651A" : corBase;

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    color: corComBrilho,
                    fontSize: tamFonte,
                    fontFamily: "Georgia, serif",
                    fontWeight: pesoFonte,
                    fontStyle: i === 0 ? "italic" : "normal",
                    backgroundColor: "rgba(0,0,0,0.70)",
                    borderRadius: 8,
                    padding: "12px 24px",
                    textShadow: brilho > 0.1
                      ? `0 0 38px #D4651Acc, 0 3px 18px rgba(0,0,0,0.7)`
                      : "0 2px 14px rgba(0,0,0,0.65)",
                    opacity: aparecimento,
                    lineHeight: 1.25,
                    letterSpacing: ehUltima ? "0.04em" : "0.015em",
                    wordBreak: "keep-all",
                    whiteSpace: "normal",
                    overflowWrap: "normal",
                    transform: `translateY(${levita}px)`,
                    transition: "color 0.1s",
                  }}
                >
                  {palavra}
                </span>
              );
            })}
          </AbsoluteFill>
        )}
      </AbsoluteFill>

    </AbsoluteFill>
  );
};