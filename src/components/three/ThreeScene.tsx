"use client";

import { Center, Float, PerformanceMonitor, Points, PointMaterial, Sparkles, Torus, useCursor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as THREE from "three";

export type ThreeSurfaceVariant = "ambient" | "home" | "auth" | "uno" | "vip";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61M55 45L76 24M76 24H58M76 24V42" fill="none" stroke="#6EE7C8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function LogoMark({ interactive = true }: { interactive?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { invalidate } = useThree();
  useCursor(hovered, "pointer", "auto");
  const geometries = useMemo(() => {
    const data = new SVGLoader().parse(LOGO_SVG);
    return data.paths.flatMap((path) => path.toShapes().map((shape) => new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false })));
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * (hovered ? 0.5 : 0.12);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, hovered ? 0.22 : 0, 0.08);
  });

  return (
    <group
      ref={group}
      scale={hovered ? 1.12 : 1}
      onPointerOver={(event) => { if (interactive) { event.stopPropagation(); setHovered(true); invalidate(); } }}
      onPointerOut={() => { setHovered(false); invalidate(); }}
    >
      {geometries.map((geometry, index) => <mesh key={index} geometry={geometry} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#6EE7C8" emissive="#0f766e" emissiveIntensity={hovered ? 0.65 : 0.25} metalness={0.35} roughness={0.42} /></mesh>)}
    </group>
  );
}

function ParticleField({ count = 70, color = "#6EE7C8" }: { count?: number; color?: string }) {
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let index = 0; index < data.length; index += 3) {
      const seed = index / 3;
      data[index] = (Math.sin(seed * 12.9898) * 0.5) * 7;
      data[index + 1] = (Math.sin(seed * 78.233) * 0.5) * 4.5;
      data[index + 2] = (Math.sin(seed * 39.425) * 0.5) * 2;
    }
    return data;
  }, [count]);
  const points = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * 0.018;
  });
  return <Points ref={points} positions={positions} stride={3} frustumCulled><PointMaterial transparent color={color} size={0.025} sizeAttenuation depthWrite={false} opacity={0.7} /></Points>;
}

function AuthOrb() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = state.pointer.y * 0.25;
    mesh.current.rotation.y = state.pointer.x * 0.35;
  });
  return <mesh ref={mesh}><icosahedronGeometry args={[0.8, 1]} /><meshStandardMaterial color="#67e8f9" emissive="#155e75" emissiveIntensity={0.45} wireframe metalness={0.4} roughness={0.3} /></mesh>;
}

function VipToken() {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useFrame((_, delta) => { if (mesh.current) mesh.current.rotation.y += delta * (hovered ? 1.2 : 0.45); });
  return <mesh ref={mesh} scale={hovered ? 1.15 : 1} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><cylinderGeometry args={[0.7, 0.7, 0.16, 32]} /><meshStandardMaterial color="#fbbf24" emissive="#92400e" emissiveIntensity={hovered ? 0.8 : 0.35} metalness={0.8} roughness={0.2} /></mesh>;
}

function UnoTable() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => { if (group.current) group.current.rotation.x = -0.22 + state.pointer.y * 0.03; });
  return <group ref={group} rotation={[-0.22, 0, 0]}><mesh><boxGeometry args={[3.8, 2.2, 0.12]} /><meshStandardMaterial color="#123b3a" emissive="#064e3b" emissiveIntensity={0.25} roughness={0.7} /></mesh><mesh position={[0, 0, 0.1]}><boxGeometry args={[3.35, 1.75, 0.02]} /><meshStandardMaterial color="#0f766e" roughness={0.85} /></mesh><Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.18}><mesh position={[0, 0, 0.25]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.55, 0.82, 0.04]} /><meshStandardMaterial color="#f8fafc" emissive="#99f6e4" emissiveIntensity={0.2} /></mesh></Float></group>;
}

function SceneContent({ variant }: { variant: ThreeSurfaceVariant }) {
  const isHome = variant === "home";
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[2, 3, 4]} intensity={1.2} />
    {isHome ? <><Center position={[2.2, 0.25, 0]}><LogoMark /></Center><ParticleField count={48} /></> : null}
    {variant === "ambient" ? <ParticleField count={42} color="#67e8f9" /> : null}
    {variant === "auth" ? <><Center position={[2.2, 0, 0]}><AuthOrb /></Center><Sparkles count={22} scale={3.5} size={1.4} speed={0.22} color="#67e8f9" /></> : null}
    {variant === "uno" ? <><Center position={[2.35, -0.25, 0]}><UnoTable /></Center><ParticleField count={26} color="#f0abfc" /></> : null}
    {variant === "vip" ? <><Center position={[2.3, 0, 0]}><VipToken /></Center><Torus args={[1.02, 0.018, 8, 48]} rotation={[Math.PI / 2, 0, 0]}><meshBasicMaterial color="#fbbf24" transparent opacity={0.48} /></Torus></> : null}
  </>;
}

export default function ThreeScene({ variant }: { variant: ThreeSurfaceVariant }) {
  const [dpr, setDpr] = useState(1);
  return <Canvas
    frameloop="demand"
    dpr={dpr}
    camera={{ position: [0, 0, 6], fov: 42 }}
    gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    onCreated={({ gl }) => { gl.setPixelRatio(Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))); }}
  >
    <PerformanceMonitor onIncline={() => setDpr(1.25)} onDecline={() => setDpr(1)} flipflops={3}>
      <SceneContent variant={variant} />
    </PerformanceMonitor>
  </Canvas>;
}