import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import * as THREE from "three";

type Mount = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  bars: THREE.Mesh[];
  targets: number[];
};

const CW = 1920;
const CH = 1080;

const DADOS = [48, 55, 61, 67, 72];
const LABELS = ["2019", "2020", "2021", "2022", "2023"];
const MAX_VAL = 72;
const COR_BARRA = "#8B1A1A";
const COR_DESTAQUE_BARRA = "#CC2222";
const COR_TEXTO = "#FFFFFF";
const COR_GRAIN = "rgba(180,20,20,0.04)";

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountRef = useRef<Mount | null>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const totalSec = durationInFrames / fps;
  const t = frame / fps;

  // Fases
  const phase1End = durationInFrames * 0.20;
  const phase2End = durationInFrames * 0.45;
  const phase3End = durationInFrames * 0.80;

  // Grain cinematográfico
  useEffect(() => {
    const gc = grainCanvasRef.current;
    if (!gc) return;
    const ctx = gc.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CW, CH);
    const imageData = ctx.createImageData(CW, CH);
    const data = imageData.data;
    const seed = frame * 1237;
    for (let i = 0; i < data.length; i += 4) {
      const px = Math.floor(i / 4);
      const noise = ((Math.sin(px * 127.1 + seed) * 43758.5453) % 1) * 0.5 + 0.5;
      const v = noise * 28;
      data[i] = v + 10;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = noise * 18;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [frame]);

  // Three.js
  useEffect(() => {
    return () => {
      mountRef.current?.renderer.dispose();
      mountRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!mountRef.current) {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(CW, CH);
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, CW / CH, 0.1, 200);
      camera.position.set(-2, 3.5, 10);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x1a0000, 0.9));
      const dir = new THREE.DirectionalLight(0xff4444, 0.6);
      dir.position.set(4, 8, 4);
      dir.castShadow = true;
      scene.add(dir);
      const accent = new THREE.PointLight(new THREE.Color("#CC2222"), 1.2, 22);
      accent.position.set(0, 6, 5);
      scene.add(accent);
      const rimLight = new THREE.PointLight(0x330000, 0.8, 18);
      rimLight.position.set(-5, 2, -3);
      scene.add(rimLight);

      const gridHelper = new THREE.GridHelper(14, 14, 0x2a0000, 0x1a0000);
      scene.add(gridHelper);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x080000, metalness: 0.05, roughness: 0.95 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      floor.receiveShadow = true;
      scene.add(floor);

      const targets = DADOS.map(v => (v / MAX_VAL) * 5);
      const bars: THREE.Mesh[] = [];
      const count = DADOS.length;
      const spacing = 2.2;
      const totalW = (count - 1) * spacing;

      DADOS.forEach((v, i) => {
        const isLast = i === DADOS.length - 1;
        const barColor = isLast ? new THREE.Color(COR_DESTAQUE_BARRA) : new THREE.Color(COR_BARRA);
        const geo = new THREE.BoxGeometry(1.2, 1, 1.2);
        const mat = new THREE.MeshStandardMaterial({
          color: barColor,
          emissive: barColor.clone().multiplyScalar(isLast ? 0.35 : 0.10),
          metalness: 0.2,
          roughness: 0.6,
        });
        const bar = new THREE.Mesh(geo, mat);
        bar.position.x = i * spacing - totalW / 2;
        bar.position.y = 0;
        bar.castShadow = true;
        bar.receiveShadow = true;
        scene.add(bar);
        bars.push(bar);
      });

      mountRef.current = { renderer, scene, camera, bars, targets };
    }

    const { renderer, scene, camera, bars, targets } = mountRef.current!;

    const growProgress = interpolate(frame, [phase1End, phase2End + 30], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });

    bars.forEach((bar, i) => {
      const targetH = targets[i];
      const stagger = i * 0.08;
      const barProgress = interpolate(growProgress, [stagger, Math.min(stagger + 0.7, 1)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      const currentH = barProgress * targetH;
      bar.scale.y = Math.max(currentH, 0.001);
      bar.position.y = currentH / 2;

      // Micro-pulsação na barra destaque (2023)
      if (i === DADOS.length - 1 && frame > phase2End) {
        const pulse = Math.sin(t * 1.8) * 0.012;
        (bar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + pulse;
      }
    });

    // Câmera lenta e pesada
    const camProgress = interpolate(frame, [0, durationInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const camAngle = camProgress * 0.12;
    camera.position.x = Math.cos(camAngle) * (-2) - Math.sin(camAngle) * 10;
    camera.position.z = Math.sin(camAngle) * (-2) + Math.cos(camAngle) * 10;
    camera.lookAt(0, 2, 0);

    renderer.render(scene, camera);
  }, [frame]);

  // Opacidades por fase
  const globalOpacity = interpolate(
    frame,
    [0, 12, durationInFrames - 14, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bgOpacity = interpolate(frame, [0, phase1End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  const canvasOpacity = interpolate(frame, [phase1End * 0.3, phase1End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  // Contador numérico: chega em 72 durante fase 2
  const counterRaw = interpolate(frame, [phase1End, phase2End], [0, 72], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.66, 1),
  });
  const counterValue = Math.floor(counterRaw);

  const mainTextOpacity = interpolate(frame, [phase2End - 20, phase2End + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  const anoOpacity = interpolate(frame, [phase2End + 10, phase2End + 40], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  const labelOpacity = interpolate(frame, [phase1End + 10, phase2End], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  // Micro-tremor pesado no contador durante fase 3
  const tremor = frame > phase2End && frame < phase3End
    ? Math.sin(frame * 0.7) * 1.2
    : 0;

  // Linha vermelha horizontal decorativa
  const lineWidth = interpolate(frame, [phase1End, phase1End + 40], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Fundo profundo */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 40%, #1a0000 0%, #0a0000 55%, #000000 100%)",
          opacity: bgOpacity,
        }}
      />

      {/* Grain cinematográfico */}
      <canvas
        ref={grainCanvasRef}
        width={CW}
        height={CH}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "screen",
          opacity: 0.6,
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      {/* Canvas Three.js */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: canvasOpacity,
          zIndex: 2,
        }}
      />

      {/* Vinheta vermelha nas bordas */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(80,0,0,0.55) 100%)",
          zIndex: 6,
          pointerEvents: "none",
          opacity: bgOpacity,
        }}
      />

      {/* Linha decorativa superior */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineWidth}%`,
          height: 2,
          background: "linear-gradient(90deg, transparent, #CC2222, transparent)",
          zIndex: 10,
          opacity: bgOpacity,
        }}
      />

      {/* Linha decorativa inferior */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${lineWidth * 0.7}%`,
          height: 1,
          background: "linear-gradient(90deg, transparent, #8B1A1A, transparent)",
          zIndex: 10,
          opacity: bgOpacity,
        }}
      />

      {/* Bloco central: contador + frase */}
      <div
        style={{
          position: "absolute",
          top: 162,
          left: 0,
          right: 0,
          bottom: 324,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          gap: 0,
        }}
      >
        {/* Contador numérico */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            transform: `translateX(${tremor}px)`,
            opacity: mainTextOpacity,
          }}
        >
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 152,
              fontWeight: 800,
              color: "#CC2222",
              lineHeight: 1,
              letterSpacing: "-4px",
              textShadow:
                "0 0 60px rgba(180,0,0,0.8), 0 4px 40px rgba(0,0,0,0.95)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {counterValue}
          </span>
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 56,
              fontWeight: 700,
              color: "#FF6666",
              textShadow: "0 2px 20px rgba(0,0,0,0.9)",
              letterSpacing: "1px",
              paddingBottom: 12,
            }}
          >
            milhões
          </span>
        </div>

        {/* Frase principal */}
        <div
          style={{
            marginTop: 8,
            opacity: mainTextOpacity,
            backgroundColor: "rgba(0,0,0,0.70)",
            borderRadius: 8,
            padding: "12px 40px",
          }}
        >
          <p