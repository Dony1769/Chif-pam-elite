import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function HackSceneComponent() {
  return (
    <SceneBase title="Hack" accent="violet">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-violet-400/20 bg-violet-400/10 p-4 text-center text-violet-200"
      >
        <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="text-2xl font-black">
          🧠 Hack
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Accès réseau</p>
      </motion.div>
    </SceneBase>
  );
}

export const HackScene = memo(HackSceneComponent);
