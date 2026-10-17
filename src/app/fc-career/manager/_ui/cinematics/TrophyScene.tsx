"use client";

/** Trophées en 3D (react-three-fiber) pour les cérémonies : or, argent, piédestal, projecteurs. */

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { Trophy } from "./events";

const GOLD = { color: "#F6C84A", metalness: 0.9, roughness: 0.22, clearcoat: 1, envMapIntensity: 4, emissive: "#6b4a00", emissiveIntensity: 0.35 };
const SILVER = { color: "#E6ECFF", metalness: 0.9, roughness: 0.16, clearcoat: 1, envMapIntensity: 4, emissive: "#28305a", emissiveIntensity: 0.3 };

function starShape(outer = 1, inner = 0.45, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
function bootShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 1.1); s.lineTo(0.15, 1.1); s.lineTo(0.2, -0.2); s.quadraticCurveTo(0.9, -0.35, 1.15, -0.7);
  s.quadraticCurveTo(1.2, -0.95, 0.9, -0.95); s.lineTo(-0.6, -0.95); s.quadraticCurveTo(-0.75, -0.9, -0.7, -0.6); s.closePath();
  return s;
}
function shieldShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.1); s.lineTo(0.95, 0.8); s.quadraticCurveTo(0.95, -0.4, 0, -1.2); s.quadraticCurveTo(-0.95, -0.4, -0.95, 0.8); s.closePath();
  return s;
}

const LOCKED = { color: "#1a2350", metalness: 0.4, roughness: 0.6, clearcoat: 0.3, envMapIntensity: 0.6, emissive: "#000000", emissiveIntensity: 0 };

export type ModelKind = Trophy | "medal" | "plate";

export function Model({ kind, finish, locked }: { kind: ModelKind; finish?: "gold" | "silver"; locked?: boolean }) {
  const G = locked ? LOCKED : finish === "silver" ? SILVER : GOLD;
  const S = locked ? LOCKED : finish === "gold" ? GOLD : SILVER;
  const extrude = { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4 };
  const star = useMemo(() => new THREE.ExtrudeGeometry(starShape(), extrude), []); // eslint-disable-line react-hooks/exhaustive-deps
  const boot = useMemo(() => new THREE.ExtrudeGeometry(bootShape(), { ...extrude, depth: 0.45 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const shield = useMemo(() => new THREE.ExtrudeGeometry(shieldShape(), extrude), []); // eslint-disable-line react-hooks/exhaustive-deps
  const cup = useMemo(() => {
    const pts = [[0, -1.3], [0.55, -1.3], [0.55, -1.15], [0.18, -1.0], [0.14, -0.4], [0.3, -0.25], [0.75, 0.2], [0.85, 0.9], [0.8, 0.95], [0.68, 0.3], [0.25, -0.15], [0, -0.2]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 64);
  }, []);
  switch (kind) {
    case "medal":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.85, 0.85, 0.16, 64]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh><torusGeometry args={[0.85, 0.08, 16, 96]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh position={[0, 0, 0.1]} geometry={star} scale={0.42}><meshPhysicalMaterial {...G} /></mesh>
          <mesh position={[0, 1.05, 0]}><torusGeometry args={[0.18, 0.05, 12, 48]} /><meshPhysicalMaterial {...G} /></mesh>
        </group>
      );
    case "plate":
      return (
        <group rotation={[0.35, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.1, 1.0, 0.1, 64]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh><torusGeometry args={[1.08, 0.06, 16, 96]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.04, 48]} /><meshPhysicalMaterial {...G} /></mesh>
        </group>
      );
    case "ballon":
      return <mesh><icosahedronGeometry args={[1.05, 1]} /><meshPhysicalMaterial {...G} flatShading /></mesh>;
    case "globe":
      return (
        <group>
          <mesh><sphereGeometry args={[0.85, 48, 48]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[1.15, 0.05, 16, 96]} /><meshPhysicalMaterial {...G} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 3]}><torusGeometry args={[1.25, 0.04, 16, 96]} /><meshPhysicalMaterial {...G} /></mesh>
        </group>
      );
    case "star":
      return (
        <group>
          <mesh geometry={star} position={[0, 0, -0.11]}><meshPhysicalMaterial {...S} /></mesh>
          <mesh><torusGeometry args={[1.35, 0.06, 16, 96]} /><meshPhysicalMaterial {...S} /></mesh>
        </group>
      );
    case "shield":
      return <mesh geometry={shield} position={[0, 0, -0.11]}><meshPhysicalMaterial {...S} /></mesh>;
    case "glove":
      return <mesh><dodecahedronGeometry args={[1, 0]} /><meshPhysicalMaterial {...G} flatShading /></mesh>;
    case "boot":
      return <mesh geometry={boot} position={[-0.2, 0, -0.22]}><meshPhysicalMaterial {...G} /></mesh>;
    case "cup":
    default:
      return (
        <group>
          <mesh geometry={cup}><meshPhysicalMaterial {...S} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0.95, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.28, 0.05, 12, 48, Math.PI]} /><meshPhysicalMaterial {...S} /></mesh>
          <mesh position={[-0.95, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]}><torusGeometry args={[0.28, 0.05, 12, 48, Math.PI]} /><meshPhysicalMaterial {...S} /></mesh>
        </group>
      );
  }
}

function Spin({ children, rise }: { children: React.ReactNode; rise: boolean }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - t0.current) / 1.6);
    const ease = 1 - Math.pow(1 - t, 3);
    g.current.position.y = rise ? -3 + ease * 3.2 : 0.2;
    g.current.rotation.y += dt * 0.7;
  });
  return <group ref={g}>{children}</group>;
}

export default function TrophyScene({ kind, rise = true, accent = "#B9FF39" }: { kind: Trophy; rise?: boolean; accent?: string }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.6, 5.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.3} />
      <spotLight position={[0, 6, 2]} angle={0.45} penumbra={0.7} intensity={120} color="#fff4d6" />
      <pointLight position={[-3, 1, 2]} intensity={20} color={accent} />
      <pointLight position={[3, -1, 2]} intensity={25} color="#4b7bff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={6} position={[0, 4, -4]} scale={[10, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={4} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#7aa0ff" />
        <Lightformer form="rect" intensity={5} position={[0, 0, 6]} scale={[10, 6, 1]} color="#fff2cc" />
        <Lightformer form="ring" intensity={5} position={[4, 1, 3]} scale={2.5} color="#ffe08a" />
      </Environment>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <Spin rise={rise}><Model kind={kind} /></Spin>
      </Float>
      <mesh position={[0, -1.75, 0]}><cylinderGeometry args={[1.1, 1.3, 0.35, 64]} /><meshPhysicalMaterial color="#0a1460" metalness={0.6} roughness={0.3} clearcoat={1} /></mesh>
      <Sparkles count={70} scale={[6, 4, 3]} size={3} speed={0.5} color="#ffe08a" />
    </Canvas>
  );
}
