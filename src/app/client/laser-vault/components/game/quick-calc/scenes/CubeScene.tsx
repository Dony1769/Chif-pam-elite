import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function CubeSceneComponent() {
  return (
    <SceneBase title="Cube" accent="sky">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-sky-400/20 bg-sky-400/10 p-4 text-center text-sky-200"
      >
        <motion.p animate={{ rotateX: [0, 360], rotateY: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="text-2xl font-black">
          🧸 Cube
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Cube de stabilité</p>
      </motion.div>
    </SceneBase>
  );
}

export const CubeScene = memo(CubeSceneComponent);
