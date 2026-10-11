import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function ShieldSceneComponent() {
  return (
    <SceneBase title="Shield" accent="emerald">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-center text-emerald-200"
      >
        <motion.p animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-2xl font-black">
          🛡️ Shield
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Protection active</p>
      </motion.div>
    </SceneBase>
  );
}

export const ShieldScene = memo(ShieldSceneComponent);
