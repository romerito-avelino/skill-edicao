import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fraseExibida = "Tem uma pergunta que cê nunca quer responder tarde";
  const palavras = fraseExibida.split(/\s+/).filter(Boolean);

  // Atmosfera reflexiva + tenso: fade global lento
  const opacidade = interpolate(
    frame,
    [0, 18, durationInFrames - 18, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Aspas surgem devagar — reflexivo
  const aspasOp = interpolate(frame, [0, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  // Agrupar palavras em até 3 linhas
  const tamanhoLinha = Math.ceil(palavras.length / Math.min(3, Math.ceil(palavras.length / 6)));
  const linhas: string[] = [];
  for (let i = 0; i < palavras.length; i += tamanhoLinha) {
    linhas.push(palavras.slice(i, i + tamanhoLinha).join(" "));
  }

  // Linha de destaque cresce — mais lenta, reflexiva
  const linhaW = interpolate(frame, [30, 70], [0, 560], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  // Respiração suave e lenta — stiffness 80-120 reflexivo
  const completionFrame = 28 + linhas.length * 20;
  const breathCycle = (frame - completionFrame) % 110;
  const respiracao = interpolate(breathCycle, [0, 55, 110], [1, 1.006, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Textura granulada via pseudo-noise com SVG embutido
  const noiseOpacity = interpolate(frame, [0, 20], [0, 0.07], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Vinheta pulsando levemente — tensão contida
  const vignetteIntensity = interpolate(
    (frame - completionFrame) % 110,
    [0, 55, 110],
    [0.82, 0.88, 0.82],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Linha vertical de tensão — entra na fase 1
  const linhaVertH = interpolate(frame, [8, 40], [0, 380], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.42, 0, 0.58, 1),
  });

  // Sombra do texto pulsa sutilmente — tensão reflexiva
  const shadowBlur = interpolate(
    (frame - completionFrame) % 110,
    [0, 55, 110],
    [18, 28, 18],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>

      {/* === FASE 1: Fundo texturizado creme === */}
      {/* Base creme com gradiente quente */}
      <AbsoluteFill style={{
        background: "linear-gradient(170deg, #E8D5B0 0%, #C9B48A 40%, #B8A070 70%, #A08050 100%)",
      }} />

      {/* Textura granulada SVG */}
      <AbsoluteFill style={{ opacity: noiseOpacity }}>
        <svg width="1920" height="1080" style={{ position: "absolute", top: 0, left: 0 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="1920" height="1080" filter="url(#noise)" opacity="1" />
        </svg>
      </AbsoluteFill>

      {/* Vinheta escura nas bordas — clima introspectivo */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at center, transparent 35%, rgba(30,15,5,${vignetteIntensity}) 100%)`,
      }} />

      {/* Mancha de luz central quente — foco no texto */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,101,26,0.12) 0%, transparent 70%)",
        opacity: interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />

      {/* Linha vertical de tensão — decorativa, zona segura topo */}
      <div style={{
        position: "absolute",
        left: 172,
        top: 0,
        width: 2,
        height: linhaVertH,
        backgroundColor: "#D4651A",
        opacity: 0.55,
        zIndex: 10,
        borderRadius: 1,
      }} />

      {/* Linha vertical espelho direita */}
      <div style={{
        position: "absolute",
        right: 172,
        bottom: 0,
        width: 2,
        height: linhaVertH,
        backgroundColor: "#8B4513",
        opacity: 0.35,
        zIndex: 10,
        borderRadius: 1,
      }} />

      {/* === FASES 2-4: Conteúdo de texto === */}
      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 200px",
        opacity: opacidade,
        transform: `scale(${respiracao})`,
        zIndex: 100,
      }}>

        {/* Aspas de abertura — cor primária sobre creme */}
        <div style={{
          fontSize: 110,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#D4651A",
          opacity: aspasOp,
          lineHeight: 0.65,
          alignSelf: "flex-start",
          marginLeft: 24,
          userSelect: "none",
          textShadow: "0 4px 20px rgba(139,69,19,0.4)",
          zIndex: 110,
        }}>
          &#8220;
        </div>

        {/* Bloco de texto */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.28em",
          zIndex: 110,
        }}>
          {linhas.map((linha, i) => {
            // Reflexivo: stiffness suave, entradas lentas
            const inicioFade = 26 + i * 20;
            const op = interpolate(frame, [inicioFade, inicioFade + 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            });
            const ty = interpolate(frame, [inicioFade, inicioFade + 22], [16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            });

            // Primeira linha maior — hierarquia tipográfica
            const isFirst = i === 0;
            const fontSize = isFirst ? 78 : 64;
            const fontWeight = isFirst ? 700 : 400;

            return (
              <div key={i} style={{ opacity: op, transform: `translateY(${ty}px)` }}>
                <div style={{
                  backgroundColor: "rgba(0,0,0,0.70)",
                  borderRadius: 8,
                  padding: isFirst ? "10px 28px" : "8px 22px",
                  color: "#1A0F05",
                  fontSize,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontWeight,
                  textAlign: "center",
                  wordBreak: "keep-all",
                  whiteSpace: "normal",
                  overflowWrap: "normal",
                  lineHeight: 1.4,
                  textShadow: `0 2px ${shadowBlur}px rgba(0,0,0,0.85)`,
                  letterSpacing: isFirst ? "0.02em" : "0.01em",
                  // Fundo creme semitransparente atrás do texto escuro
                  backdropFilter: "none",
                  // Override: texto preto sobre fundo claro com bg semi
                  color: "#120A02",
                  backgroundColor: "rgba(212,180,130,0.82)",
                  boxShadow: "0 4px 32px rgba(139,69,19,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}>
                  {linha}
                </div>
              </div>
            );
          })}
        </div>

        {/* Linha de destaque — cor primária */}
        <div style={{
          width: linhaW,
          height: 2.5,
          backgroundColor: "#D4651A",
          borderRadius: 2,
          opacity: 0.75,
          marginTop: 20,
          boxShadow: "0 0 12px rgba(212,101,26,0.5)",
          zIndex: 110,
        }} />

        {/* Aspas de fechamento */}
        <div style={{
          fontSize: 110,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#8B4513",
          opacity: aspasOp * 0.8,
          lineHeight: 0.65,
          alignSelf: "flex-end",
          marginRight: 24,
          userSelect: "none",
          textShadow: "0 4px 20px rgba(139,69,19,0.3)",
          zIndex: 110,
        }}>
          &#8221;
        </div>

      </AbsoluteFill>

      {/* Barra inferior — zona segura, indicador de clip 1/7 */}
      <div style={{
        position: "absolute",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        zIndex: 10,
        opacity: interpolate(frame, [30, 55], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        {[...Array(7)].map((_, idx) => (
          <div key={idx} style={{
            width: idx === 0 ? 28 : 8,
            height: 3,
            borderRadius: 2,
            backgroundColor: idx === 0 ? "#D4651A" : "#8B4513",
            opacity: idx === 0 ? 1 : 0.4,
          }} />
        ))}
      </div>

    </AbsoluteFill>
  );
};