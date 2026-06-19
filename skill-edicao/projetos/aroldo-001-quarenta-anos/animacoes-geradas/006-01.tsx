import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fraseExibida = "Aposentadoria que não paga nem despesa";
  const palavras = fraseExibida.split(/\s+/).filter(Boolean);
  const numPalavras = Math.max(palavras.length, 1);
  const framesPorPalavra = Math.max(1, Math.floor(durationInFrames / numPalavras));
  const palavraAtual = Math.min(Math.floor(frame / framesPorPalavra), numPalavras - 1);
  const ehUltima = palavraAtual === numPalavras - 1;

  // Fases cinematográficas
  const fase1End = durationInFrames * 0.20;
  const fase2End = durationInFrames * 0.45;
  const fase4Start = durationInFrames * 0.80;

  // FASE 1: fundo entra
  const fundoOpacity = interpolate(
    frame,
    [0, fase1End],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // FASE 2 e FASE 4: opacidade geral do texto
  const opacidade = interpolate(
    frame,
    [fase1End, fase2End, fase4Start, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Entrada da palavra com urgência: escala brusca
  const frameNaPalavra = frame - palavraAtual * framesPorPalavra;
  const escala = interpolate(
    frameNaPalavra,
    [0, 5, framesPorPalavra],
    [0.55, 1.06, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1.5, 0.36, 1) }
  );

  // Micro-vibração na fase estável para urgência
  const vibFreq = 2.8;
  const vibAmp = ehUltima ? 2.5 : 1.2;
  const fase3Progress = interpolate(frame, [fase2End, fase4Start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vibracao = frame >= fase2End && frame <= fase4Start
    ? Math.sin(frame * vibFreq) * vibAmp * (1 - fase3Progress * 0.7)
    : 0;

  // Textura creme — simulada com camadas
  const grainOpacity = interpolate(frame, [0, fase1End], [0, 0.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Linha decorativa superior
  const linhaScale = interpolate(frame, [0, fase1End * 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease });

  // Palavra destaque na última: "#D4651A" (primária urgente)
  const corPalavra = ehUltima ? "#D4651A" : "#1A1008";
  const fontSizePalavra = ehUltima ? 148 : 120;
  const fontWeightPalavra = ehUltima ? 900 : 700;

  // Sombra para urgência: alto contraste sobre fundo creme
  const sombraPalavra = ehUltima
    ? `0 0 50px rgba(212,101,26,0.55), 0 2px 0px #8B4513, 0 6px 20px rgba(0,0,0,0.45)`
    : `0 2px 0px rgba(139,69,19,0.35), 0 4px 16px rgba(0,0,0,0.25)`;

  // Fundo do texto: creme escuro semitransparente
  const bgTexto = ehUltima ? "rgba(212,101,26,0.10)" : "rgba(244,236,220,0.72)";

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>

      {/* FASE 1: Fundo texturizado creme */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(160deg, #EDE0CC 0%, #F5ECD8 40%, #E8D5B7 70%, #DEC9A0 100%)",
          opacity: fundoOpacity,
        }}
      />

      {/* Textura grain creme */}
      <AbsoluteFill
        style={{
          opacity: grainOpacity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      {/* Vinheta suave nas bordas */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(100,60,20,0.22) 100%)",
          opacity: fundoOpacity,
        }}
      />

      {/* Linha decorativa superior — zona segura y 0-162px */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 72,
          zIndex: 8,
          opacity: fundoOpacity,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: `${linhaScale * 520}px`,
            height: 3,
            background: "linear-gradient(90deg, transparent, #D4651A, #8B4513, transparent)",
            borderRadius: 2,
            marginBottom: 14,
          }}
        />
        <div
          style={{
            width: `${linhaScale * 260}px`,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(139,69,19,0.5), transparent)",
            borderRadius: 1,
          }}
        />
      </AbsoluteFill>

      {/* Linha decorativa inferior — zona segura y 918-1080px */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 72,
          zIndex: 8,
          opacity: fundoOpacity,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: `${linhaScale * 260}px`,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(139,69,19,0.5), transparent)",
            borderRadius: 1,
            marginBottom: 14,
          }}
        />
        <div
          style={{
            width: `${linhaScale * 520}px`,
            height: 3,
            background: "linear-gradient(90deg, transparent, #D4651A, #8B4513, transparent)",
            borderRadius: 2,
          }}
        />
      </AbsoluteFill>

      {/* TEXTO PRINCIPAL — zona segura y 162-756px */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: opacidade,
          zIndex: 100,
        }}
      >
        <p
          style={{
            color: corPalavra,
            fontSize: fontSizePalavra,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            textAlign: "center",
            lineHeight: 1.1,
            margin: 0,
            padding: "12px 32px",
            transform: `scale(${escala}) translateX(${vibracao}px)`,
            fontWeight: fontWeightPalavra,
            letterSpacing: ehUltima ? "-0.02em" : "0.01em",
            textShadow: sombraPalavra,
            backgroundColor: bgTexto,
            borderRadius: 8,
            wordBreak: "keep-all",
            whiteSpace: "normal",
            overflowWrap: "normal",
            borderBottom: ehUltima ? `3px solid #D4651A` : `1px solid rgba(139,69,19,0.18)`,
            transition: "border-color 0.1s",
          }}
        >
          {palavras[palavraAtual] || ""}
        </p>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};