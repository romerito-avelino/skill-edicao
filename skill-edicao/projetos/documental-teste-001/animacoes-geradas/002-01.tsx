import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import * as THREE from "three";

type Mount = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  particles: THREE.Points;
  barMesh: THREE.Mesh;
  silhouetteMeshes: THREE.Mesh[];
};

const CW = 1920;
const CH = 1080;

export const AnimacaoGerada: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountRef = useRef<Mount | null>(null);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const corDestaque = "#F5C842";
  const corTexto = "#FFFFFF";
  const corPrimaria = "#D4651A";
  const corVermelha = "#C0392B";

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
      const camera = new THREE.PerspectiveCamera(50, CW / CH, 0.1, 200);
      camera.position.set(0, 2, 14);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x1a0505, 0.5));
      const dir = new THREE.DirectionalLight(0xff3300, 0.6);
      dir.position.set(-4, 6, 4);
      dir.castShadow = true;
      scene.add(dir);

      const rimLight = new THREE.DirectionalLight(0xcc1111, 0.4);
      rimLight.position.set(6, 2, -4);
      scene.add(rimLight);

      // Grain particles (film grain effect in 3D space)
      const particleCount = 3000;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0x441111,
        size: 0.04,
        transparent: true,
        opacity: 0.35,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // Horizontal bar (the red bar that grows)
      const barGeo = new THREE.BoxGeometry(1, 0.18, 0.12);
      const barMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(corVermelha),
        emissive: new THREE.Color(corVermelha).multiplyScalar(0.4),
        metalness: 0.2,
        roughness: 0.6,
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(0, -2.2, 0);
      barMesh.castShadow = true;
      scene.add(barMesh);

      // Silhouette crowd — dense row of humanoid shapes
      const silhouetteMeshes: THREE.Mesh[] = [];
      const crowdCount = 22;
      const crowdSpread = 18;
      for (let i = 0; i < crowdCount; i++) {
        const heightVar = 0.7 + Math.random() * 0.5;
        const widthVar = 0.22 + Math.random() * 0.12;
        // Body
        const bodyGeo = new THREE.BoxGeometry(widthVar, heightVar, 0.1);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0a0000,
          emissive: new THREE.Color(0x1a0000),
          metalness: 0.0,
          roughness: 1.0,
          transparent: true,
          opacity: 0.92,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        const xPos = (i / (crowdCount - 1) - 0.5) * crowdSpread;
        const zPos = -1.5 - Math.random() * 2.5;
        body.position.set(xPos, -1.5 + heightVar / 2, zPos);
        body.castShadow = true;
        scene.add(body);
        silhouetteMeshes.push(body);

        // Head
        const headGeo = new THREE.SphereGeometry(widthVar * 0.45, 8, 8);
        const head = new THREE.Mesh(headGeo, bodyMat.clone());
        head.position.set(xPos, -1.5 + heightVar + widthVar * 0.45, zPos);
        scene.add(head);
        silhouetteMeshes.push(head);
      }

      // Second denser row further back
      const backCount = 30;
      for (let i = 0; i < backCount; i++) {
        const heightVar = 0.55 + Math.random() * 0.4;
        const widthVar = 0.18 + Math.random() * 0.1;
        const bodyGeo = new THREE.BoxGeometry(widthVar, heightVar, 0.08);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x060000,
          emissive: new THREE.Color(0x0d0000),
          metalness: 0.0,
          roughness: 1.0,
          transparent: true,
          opacity: 0.75,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        const xPos = (i / (backCount - 1) - 0.5) * 22;
        const zPos = -4.5 - Math.random() * 2;
        body.position.set(xPos, -1.5 + heightVar / 2, zPos);
        scene.add(body);
        silhouetteMeshes.push(body);

        const headGeo = new THREE.SphereGeometry(widthVar * 0.45, 6, 6);
        const head = new THREE.Mesh(headGeo, bodyMat.clone());
        head.position.set(xPos, -1.5 + heightVar + widthVar * 0.4, zPos);
        scene.add(head);
        silhouetteMeshes.push(head);
      }

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 20),
        new THREE.MeshStandardMaterial({ color: 0x020002, roughness: 1.0, metalness: 0.0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.5;
      floor.receiveShadow = true;
      scene.add(floor);

      mountRef.current = { renderer, scene, camera, particles, barMesh, silhouetteMeshes };
    }

    const { renderer, scene, camera, particles, barMesh, silhouetteMeshes } = mountRef.current!;
    const t = frame / fps;
    const totalSec = durationInFrames / fps;
    const progress = frame / durationInFrames;

    // FASE 1: bg/particles enter
    const particleOpacity = interpolate(frame, [0, durationInFrames * 0.2], [0, 0.35], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.ease,
    });
    (particles.material as THREE.PointsMaterial).opacity = particleOpacity;

    // Grain shimmer — micro flicker on particles
    particles.rotation.z = Math.sin(t * 0.3) * 0.01;
    particles.rotation.x = Math.cos(t * 0.2) * 0.008;

    // Bar growth — horizontal scale grows from 0 to full over 45%-80% of duration
    const barStart = durationInFrames * 0.20;
    const barEnd = durationInFrames * 0.75;
    const barProgress = interpolate(frame, [barStart, barEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    const barTargetWidth = 14;
    barMesh.scale.x = Math.max(barProgress * barTargetWidth, 0.001);
    barMesh.position.x = ((barProgress * barTargetWidth) / 2 - barTargetWidth / 2) * 0.5;

    // Bar emissive pulse
    const pulse = 0.3 + Math.sin(t * 2.1) * 0.08;
    (barMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;

    // Silhouettes rise from below
    const crowdStart = durationInFrames * 0.05;
    const crowdEnd = durationInFrames * 0.40;
    const crowdProgress = interpolate(frame, [crowdStart, crowdEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.2, 0.0, 0.3, 1),
    });
    silhouetteMeshes.forEach((mesh, i) => {
      const delay = (i % 12) * 0.03;
      const individualProgress = Math.max(0, Math.min(1, crowdProgress - delay));
      mesh.position.y = mesh.position.y;
      (mesh.material as THREE.MeshStandardMaterial).opacity = individualProgress * (mesh.position.z < -4 ? 0.75 : 0.92);
      // subtle breathing
      mesh.scale.y = 1 + Math.sin(t * 0.8 + i * 0.4) * 0.008;
    });

    // Slow heavy camera drift — pesado atmosphere
    camera.position.x = Math.sin(t * 0.04) * 0.6;
    camera.position.y = 2 + Math.sin(t * 0.06) * 0.15;
    camera.lookAt(0, -0.5, 0);

    // Exit phase — camera slowly pulls back
    if (progress > 0.80) {
      const exitP = (progress - 0.80) / 0.20;
      camera.position.z = 14 + exitP * 2.5;
    }

    renderer.render(scene, camera);
  }, [frame]);

  // Opacidades e timings baseados nas fases
  const globalOpacity = interpolate(
    frame,
    [0, 8, durationInFrames - 14, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Numero 72 milhões — grande destaque tipográfico
  const numOpacity = interpolate(
    frame,
    [durationInFrames * 0.20, durationInFrames * 0.35],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );
  const numScale = interpolate(
    frame,
    [durationInFrames * 0.20, durationInFrames * 0.40],
    [1.08, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
  );

  // Frase principal
  const fraseOpacity = interpolate(
    frame,
    [durationInFrames * 0.30, durationInFrames * 0.48],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Ano 2023
  const anoOpacity = interpolate(
    frame,
    [durationInFrames * 0.40, durationInFrames * 0.55],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Barra vermelha HTML (reforço visual 2D sobre a 3D)
  const barWidthPct = interpolate(
    frame,
    [durationInFrames * 0.20, durationInFrames * 0.75],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
  );

  // Micro-vibração pesada no número (fase 3)
  const t = frame / 30;
  const vibX = frame > durationInFrames * 0.45 && frame < durationInFrames * 0.80
    ? Math.sin(t * 7.3) * 1.2
    : 0;

  // Saída elegante
  const exitY = interpolate(
    frame,
    [durationInFrames * 0.82, durationInFrames],
    [0, -18],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.5, 0, 1, 0.5) }
  );

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Fundo base escuro */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 40% 55%, #1a0202 0%, #040000 60%, #000000 100%)" }} />

      {/* Canvas 3D */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Vinheta cinematográfica */}