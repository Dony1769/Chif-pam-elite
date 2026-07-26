import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { SceneBase } from './SceneBase';

function MeteorSceneComponent() {
  return (
    <SceneBase title="Meteor" accent="orange">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.4rem] border border-orange-400/20 bg-orange-400/10 p-4 text-center text-orange-200"
      >
        <motion.p
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              '0 0 0px rgba(249, 115, 22, 0.0)',
              '0 0 30px rgba(249, 115, 22, 0.6)',
              '0 0 0px rgba(249, 115, 22, 0.0)',
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-2xl font-black"
        >
          ☄️ Meteor
        </motion.p>
        <p className="mt-2 text-xs text-slate-400">Impact final</p>
      </motion.div>
    </SceneBase>
  );
}

export const MeteorScene = memo(MeteorSceneComponent);
