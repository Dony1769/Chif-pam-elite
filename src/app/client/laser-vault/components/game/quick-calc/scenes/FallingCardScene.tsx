import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function FallingCardSceneComponent() {
  return (
    <SceneBase title="Falling Card" accent="fuchsia">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4 text-center text-fuchsia-200"
      >
        <motion.p animate={{ y: [0, 12, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-2xl font-black">
          🏏 Falling Card
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Chute de cartes</p>
      </motion.div>
    </SceneBase>
  );
}

export const FallingCardScene = memo(FallingCardSceneComponent);
