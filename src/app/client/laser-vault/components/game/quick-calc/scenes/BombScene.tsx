import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function BombSceneComponent() {
  return (
    <SceneBase title="Bomb" accent="rose">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 p-4 text-center text-rose-200"
      >
        <motion.p animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-2xl font-black">
          💣 Bomb
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Scene d'alerte</p>
      </motion.div>
    </SceneBase>
  );
}

export const BombScene = memo(BombSceneComponent);
