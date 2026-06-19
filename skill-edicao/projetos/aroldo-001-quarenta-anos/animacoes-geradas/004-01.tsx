import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AnimacaoGerada: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fraseExibida = "Escolhas erradas trilham caminhos diferentes";
  const W = 1920, H = 1080;

  // Paleta adaptada ao estilo creme/preto com tons quentes
  const corFundo = "#E8DCC8";
  const corTexto = "#1A1208";
  const corDestaque = "#D4651A";
  const corSecundaria = "#8B4513";

  // FASE 1 (0-36f): fundo e textura entram
  const fundoOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  // Cortina desliza para a direita revelando o fundo creme
  const cortinaX = interpolate(frame, [4, 44], [0, W], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  // FASE 2 (36-81f): texto surge com fade suave e leve ascensão
  const textoOpacity = interpolate(frame, [36, 72], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const textoY = interpolate(frame, [36, 78], [28, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });

  // FASE 3 (81-144f): micro-animação — leve vibração tenso/introspectiva
  const microPulso = interpolate(
    frame,
    [81, 90, 99, 108, 117, 126, 135, 144],
    [1, 1.008, 1, 1.006, 1, 1.004, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Linha decorativa cresce da esquerda
  const linhaLargura = interpolate(frame, [50, 90], [0, 320], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const linhaOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Segunda linha decorativa (direita)
  const linhaDir = interpolate(frame, [60, 100], [0, 240], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Marca tipográfica superior
  const marcaOpacity = interpolate(frame, [44, 72], [0, 0.6], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  // Número de clip
  const clipOpacity = interpolate(frame, [54, 80], [0, 0.45], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Mancha de sombra introspectiva no centro-baixo
  const manchaOpacity = interpolate(frame, [36, 80], [0, 0.18], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // FASE 4 (144-180f): saída elegante
  const saidaOpacity = interpolate(frame, [148, durationInFrames - 2], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  const saidaY = interpolate(frame, [148, durationInFrames], [0, -18], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  const opacidadeGeral = frame < 148 ? fundoOpacity : fundoOpacity * saidaOpacity;
  const textoOpacidadeFinal = frame < 148 ? textoOpacity : textoOpacity * saidaOpacity;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>

      {/* FUNDO CREME TEXTURIZADO */}
      <AbsoluteFill style={{
        background: `
          radial-gradient(ellipse at 30% 40%, #EDE0C4 0%, #D9CCB0 60%, #C8BA9A 100%)
        `,
        opacity: opacidadeGeral,
      }} />

      {/* Textura de papel simulada com linhas sutis */}
      <AbsoluteFill style={{ opacity: opacidadeGeral * 0.12 }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: i * 40,
            left: 0,
            width: "100%",
            height: 1,
            background: "#8B7355",
          }} />
        ))}
      </AbsoluteFill>

      {/* Mancha introspectiva — vinheta leve nas bordas */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(20,10,5,0.45) 100%)",
        opacity: manchaOpacity * (opacidadeGeral),
      }} />

      {/* Cortina deslizando para revelar o fundo creme */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        transform: `translateX(${cortinaX}px)`,
        background: `linear-gradient(135deg, #1A1208 0%, #2C1E0F 50%, #1A1208 100%)`,
        borderRight: `5px solid ${corDestaque}`,
        boxSizing: "border-box",
        zIndex: 50,
      }} />

      {/* ZONA DECORATIVA SUPERIOR (y: 0-162px) */}
      <div style={{
        position: "absolute",
        top: 48,
        left: 120,
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: marcaOpacity * opacidadeGeral,
        zIndex: 8,
        transform: `translateY(${saidaY}px)`,
      }}>
        {/* Linha decorativa esquerda */}
        <div style={{
          width: linhaLargura,
          height: 3,
          background: `linear-gradient(90deg, ${corDestaque}, ${corSecundaria})`,
          opacity: linhaOpacity,
          borderRadius: 2,
        }} />
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 13,
          fontWeight: 400,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: corSecundaria,
        }}>
          Documentário
        </span>
      </div>

      {/* Número de clip — canto superior direito */}
      <div style={{
        position: "absolute",
        top: 52,
        right: 120,
        opacity: clipOpacity * opacidadeGeral,
        zIndex: 8,
        transform: `translateY(${saidaY}px)`,
      }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: corSecundaria,
        }}>
          03 / 07
        </span>
      </div>

      {/* TEXTO PRINCIPAL — zona segura y: 162-756px */}
      <AbsoluteFill style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 160px",
        zIndex: 100,
        transform: `translateY(${textoY + saidaY}px) scale(${microPulso})`,
        opacity: textoOpacidadeFinal,
      }}>
        <div style={{
          backgroundColor: "rgba(232, 218, 190, 0.82)",
          borderRadius: 6,
          padding: "36px 52px",
          maxWidth: "74%",
          position: "relative",
        }}>
          {/* Borda superior colorida — hierarquia tipográfica */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 52,
            right: 52,
            height: 4,
            background: `linear-gradient(90deg, ${corDestaque} 0%, ${corSecundaria} 100%)`,
            borderRadius: "0 0 2px 2px",
          }} />

          {/* Epígrafe — hierarquia menor */}
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: corSecundaria,
            marginBottom: 20,
            opacity: 0.85,
          }}>
            Momento 5
          </div>

          {/* Frase principal — hierarquia máxima */}
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 72,
            fontWeight: 700,
            color: corTexto,
            lineHeight: 1.25,
            textAlign: "center",
            letterSpacing: "-0.01em",
            wordBreak: "keep-all",
            whiteSpace: "normal",
            overflowWrap: "normal",
          }}>
            {fraseExibida}
          </div>

          {/* Linha inferior decorativa */}
          <div style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}>
            <div style={{
              width: linhaDir,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${corSecundaria})`,
              opacity: linhaOpacity * 0.7,
              borderRadius: 1,
            }} />
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: corDestaque,
              opacity: linhaOpacity,
            }} />
            <div style={{
              width: linhaDir,
              height: 2,
              background: `linear-gradient(270deg, transparent, ${corSecundaria})`,
              opacity: linhaOpacity * 0.7,
              borderRadius: 1,
            }} />
          </div>

          {/* Borda inferior colorida */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 52,
            right: 52,
            height: 4,
            background: `linear-gradient(90deg, ${corSecundaria} 0%, ${corDestaque} 100%)`,
            borderRadius: "2px 2px 0 0",
          }} />
        </div>
      </AbsoluteFill>

      {/* ZONA DECORATIVA INFERIOR (y: 918-1080px) */}
      <div style={{
        position: "absolute",
        bottom: 62,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: marcaOpacity * opacidadeGeral * 0.7,
        zIndex: 8,
        transform: `translateY(${-saidaY}px)`,
      }}>
        <div style={{
          width: 480,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${corSecundaria}, transparent)`,
        }} />
      </div>

    </AbsoluteFill>
  );
};