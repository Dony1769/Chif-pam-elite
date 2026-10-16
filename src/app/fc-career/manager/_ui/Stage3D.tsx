"use client";

/**
 * FC CAREER 27 — Décor 3D (react-three-fiber) : solides parfaits en verre et chrome
 * qui flottent dans une nuit de stade bleu cobalt. Couleur du club sur un solide,
 * parallaxe au pointeur, éclairage construit sans fichier HDR (aucun réseau).
 * Mouvement réduit : une seule image fixe.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, Edges } from "@react-three/drei";
import * as THREE from "three";

type Kind = "ico" | "octa" | "dodeca" | "tetra" | "cube" | "torus";

const SOLIDS: { kind: Kind; pos: [number, number, number]; scale: number; speed: number; mat: "glass" | "chrome" | "club" }[] = [
  { kind: "ico", pos: [-5.2, 2.4, -3], scale: 1.25, speed: 0.9, mat: "club" },
  { kind: "octa", pos: [5.4, 2.8, -4], scale: 1.05, speed: 1.2, mat: "chrome" },
  { kind: "dodeca", pos: [4.6, -2.6, -2.5], scale: 1.1, speed: 0.7, mat: "glass" },
  { kind: "tetra", pos: [-4.4, -2.9, -2], scale: 0.9, speed: 1.4, mat: "chrome" },
  { kind: "torus", pos: [0.6, 3.9, -7], scale: 1.3, speed: 0.6, mat: "glass" },
  { kind: "cube", pos: [-1.2, -4.2, -6], scale: 0.8, speed: 1.0, mat: "club" },
];

function Geo({ kind }: { kind: Kind }) {
  switch (kind) {
    case "ico": return <icosahedronGeometry args={[1, 0]} />;
    case "octa": return <octahedronGeometry args={[1, 0]} />;
    case "dodeca": return <dodecahedronGeometry args={[1, 0]} />;
    case "tetra": return <tetrahedronGeometry args={[1.1, 0]} />;
    case "cube": return <boxGeometry args={[1.3, 1.3, 1.3]} />;
    case "torus": return <torusGeometry args={[0.9, 0.28, 24, 64]} />;
  }
}

function Solid({ s, club, accent }: { s: (typeof SOLIDS)[number]; club: string; accent: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.12 * s.speed;
    ref.current.rotation.y += dt * 0.18 * s.speed;
  });
  const color = s.mat === "club" ? club : s.mat === "chrome" ? "#c9d6ff" : "#8fb4ff";
  return (
    <Float speed={s.speed} rotationIntensity={0.4} floatIntensity={1.1}>
      <mesh ref={ref} position={s.pos} scale={s.scale}>
        <Geo kind={s.kind} />
        {s.mat === "glass" ? (
          <meshPhysicalMaterial color={color} roughness={0.08} metalness={0.1} transmission={0.92} thickness={1.2} ior={1.45} iridescence={0.6} clearcoat={1} transparent opacity={0.9} envMapIntensity={2.5} emissive="#2a5bff" emissiveIntensity={0.18} />
        ) : (
          <meshPhysicalMaterial color={color} roughness={s.mat === "chrome" ? 0.08 : 0.18} metalness={s.mat === "chrome" ? 1 : 0.45} clearcoat={1} clearcoatRoughness={0.05} emissive={s.mat === "club" ? club : "#1b3cff"} emissiveIntensity={s.mat === "club" ? 0.35 : 0.12} envMapIntensity={2.2} />
        )}
        {s.kind !== "torus" && <Edges threshold={15} color={s.mat === "club" ? accent : "#9fd8ff"} />}
      </mesh>
    </Float>
  );
}

/** Parallaxe douce de la caméra au pointeur et au défilement. */
function Rig() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => { target.current.x = (e.clientX / window.innerWidth - 0.5) * 1.2; target.current.y = (e.clientY / window.innerHeight - 0.5) * 0.8; };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useFrame(() => {
    const scroll = Math.min(1, window.scrollY / 1600);
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (-target.current.y - scroll * 1.5 - camera.position.y) * 0.04;
    camera.lookAt(0, -scroll * 1.5, -4);
  });
  return null;
}

function Scene({ club, accent }: { club: string; accent: string }) {
  return (
    <>
      <color attach="background" args={["#040a2a"]} />
      <fog attach="fog" args={["#040a2a", 9, 22]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} color="#dfe8ff" />
      <pointLight position={[-6, -3, 2]} intensity={30} color={accent} distance={14} />
      <pointLight position={[6, 4, -2]} intensity={40} color="#4b7bff" distance={16} />
      {/* Éclairage studio construit à la main : pas de fichier HDR à télécharger */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={8} position={[0, 4, -6]} scale={[12, 2, 1]} color="#cfe0ff" />
        <Lightformer form="rect" intensity={6} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#5f86ff" />
        <Lightformer form="rect" intensity={5} position={[0, -5, 4]} rotation-x={-Math.PI / 2} scale={[10, 4, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={6} position={[5, 1, 3]} scale={3} color={accent} />
      </Environment>
      {SOLIDS.map((s, i) => <Solid key={i} s={s} club={club} accent={accent} />)}
      <Rig />
    </>
  );
}

export default function Stage3D({ club = "#3d6bff", accent = "#B9FF39" }: { club?: string; accent?: string }) {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);
  return (
    <div className="mg-stage" aria-hidden="true">
      <Canvas dpr={dpr} frameloop={reduced || !visible ? "demand" : "always"} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}>
        <Scene club={club} accent={accent} />
      </Canvas>
    </div>
  );
}
