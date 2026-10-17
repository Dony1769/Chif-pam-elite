"use client";

/**
 * FC CAREER 27 — Vitrine 3D : une seule scène react-three-fiber, une étagère
 * par rangée, chaque trophée tourne doucement ; les trophées pas encore gagnés
 * restent en silhouette sombre. Les libellés et les clics passent par une
 * grille HTML posée au-dessus (accessible au clavier).
 */

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrthographicCamera } from "@react-three/drei";
import type * as THREE from "three";
import { Model } from "../../manager/_ui/cinematics/TrophyScene";
import { CELL_H, CELL_W } from "../../game/player2/cabinet";
import type { Shelf } from "../../game/player2/cabinet";


function Piece({ shelf, x, y, active, hover, i }: { shelf: Shelf; x: number; y: number; active: boolean; hover: boolean; i: number }) {
  const g = useRef<THREE.Group>(null);
  const locked = shelf.entries.length === 0;
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    const lift = active || hover ? 1 : 0;
    g.current.rotation.y += dt * (locked ? 0.15 : 0.5 + lift * 1.6);
    const target = 0.5 + lift * 0.08;
    const sc = g.current.scale.x + (target - g.current.scale.x) * Math.min(1, dt * 8);
    g.current.scale.setScalar(sc);
    g.current.position.y = y + 0.6 + Math.sin(clock.elapsedTime * 1.2 + i) * (locked ? 0 : 0.05) + lift * 0.12;
  });
  return (
    <group>
      <group ref={g} position={[x, y + 0.6, 0]} scale={0.5}>
        <Model kind={shelf.model} finish={shelf.finish} locked={locked} />
      </group>
      {/* Socle */}
      <mesh position={[x, y - 0.2, 0]}><cylinderGeometry args={[0.42, 0.5, 0.18, 48]} /><meshPhysicalMaterial color={active ? "#2a3fb0" : "#0d1a6e"} metalness={0.6} roughness={0.3} clearcoat={1} /></mesh>
    </group>
  );
}

export default function CabinetScene({ shelves, cols, width, height, active, hover }: {
  shelves: Shelf[]; cols: number; width: number; height: number; active: string | null; hover: string | null;
}) {
  const rows = Math.ceil(shelves.length / cols);
  const zoom = Math.min(width / (cols * CELL_W), height / (rows * CELL_H));
  const pos = (k: number) => {
    const c = k % cols, r = Math.floor(k / cols);
    return { x: (c - (cols - 1) / 2) * CELL_W, y: ((rows - 1) / 2 - r) * CELL_H };
  };
  return (
    <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={zoom} />
      <ambientLight intensity={0.35} />
      <spotLight position={[0, 8, 6]} angle={0.8} penumbra={0.8} intensity={160} color="#fff4d6" />
      <pointLight position={[-6, 2, 4]} intensity={30} color="#B9FF39" />
      <pointLight position={[6, -2, 4]} intensity={35} color="#4b7bff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={6} position={[0, 4, -4]} scale={[10, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={5} position={[0, 0, 6]} scale={[10, 6, 1]} color="#fff2cc" />
        <Lightformer form="ring" intensity={5} position={[4, 1, 3]} scale={2.5} color="#ffe08a" />
      </Environment>
      {/* Étagères de verre */}
      {Array.from({ length: rows }, (_, r) => (
        <mesh key={r} position={[0, ((rows - 1) / 2 - r) * CELL_H - 0.35, -0.3]}>
          <boxGeometry args={[cols * CELL_W - 0.2, 0.08, 1.4]} />
          <meshPhysicalMaterial color="#9fb6ff" metalness={0.1} roughness={0.05} transmission={0.6} transparent opacity={0.35} />
        </mesh>
      ))}
      {shelves.map((sh, k) => { const p = pos(k); return <Piece key={sh.key} shelf={sh} x={p.x} y={p.y} i={k} active={active === sh.key} hover={hover === sh.key} />; })}
    </Canvas>
  );
}
