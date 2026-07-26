import React from 'react';
import { GameScene } from './GameScene';

interface SceneRendererProps {
  step: number;
  question?: { display: string; answer: number } | null;
}

export function SceneRenderer({ step, question }: SceneRendererProps) {
  return (
    <div className="w-full">
      <GameScene step={step} question={question} />
    </div>
  );
}
