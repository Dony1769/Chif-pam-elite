import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function LaserSceneComponent() {
  return (
    <SceneBase title="Laser" accent="cyan">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-cyan-400/20 bg-cyan-400/10 p-4 text-center text-cyan-200"
      >
        <motion.p animate={{ textShadow: ['0 0 10px rgba(34,211,238,0.5)', '0 0 20px rgba(34,211,238,0.8)'] }} transition={{ duration: 0.4, repeat: Infinity }} className="text-2xl font-black">
          ⚡ Laser
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Scene premium d'entrée</p>
      </motion.div>
    </SceneBase>
  );
}

export const LaserScene = memo(LaserSceneComponent);
