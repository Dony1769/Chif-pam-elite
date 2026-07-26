import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function DoorSceneComponent() {
  return (
    <SceneBase title="Door" accent="amber">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 p-4 text-center text-amber-200"
      >
        <motion.p animate={{ x: [0, 2, -2, 0] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-2xl font-black">
          🚪 Door
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Ouverture du portail</p>
      </motion.div>
    </SceneBase>
  );
}

export const DoorScene = memo(DoorSceneComponent);
