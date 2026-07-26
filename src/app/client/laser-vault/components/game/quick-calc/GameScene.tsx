import React from 'react';
import { SceneManager } from '@/app/client/laser-vault/lib/game/quick-calc/SceneManager';
import { LaserScene } from './scenes/LaserScene';
import { BombScene } from './scenes/BombScene';
import { ShieldScene } from './scenes/ShieldScene';
import { DoorScene } from './scenes/DoorScene';
import { HackScene } from './scenes/HackScene';
import { CubeScene } from './scenes/CubeScene';
import { FallingCardScene } from './scenes/FallingCardScene';
import { MeteorScene } from './scenes/MeteorScene';

interface GameSceneProps {
  step: number;
  question?: { display: string; answer: number } | null;
}

export function GameScene({ step, question }: GameSceneProps) {
  const sceneManager = new SceneManager();
  const sceneName = sceneManager.getSceneForStep(step);

  const sceneMap: Record<string, React.ReactNode> = {
    Laser: <LaserScene />,
    Bomb: <BombScene />,
    Shield: <ShieldScene />,
    Door: <DoorScene />,
    Hack: <HackScene />,
    Cube: <CubeScene />,
    'Falling Card': <FallingCardScene />,
    Meteor: <MeteorScene />,
  };

  return (
    <div className="w-full max-w-xl space-y-4">
      {sceneMap[sceneName]}
      {question ? (
        <div className="rounded-[1.4rem] border border-cyan-400/20 bg-slate-900/80 p-4 text-center text-white">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">Question</p>
          <p className="mt-2 text-3xl font-black">{question.display}</p>
          <p className="mt-2 text-xs text-slate-400">Réponse attendue : {question.answer}</p>
        </div>
      ) : null}
    </div>
  );
}
