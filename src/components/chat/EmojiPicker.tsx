import React from 'react'
import { motion } from 'framer-motion'

const EMOJIS = ['😀','😅','😊','😍','😎','🤔','😭','👍','🔥','🎉','💯','❤️']

type Props = {
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ onSelect }: Props) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 bg-slate-900/60 border border-white/5 rounded-2xl shadow-lg">
      <div className="flex gap-2 flex-wrap max-w-[280px]">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => onSelect(e)} type="button" className="p-2 hover:scale-110 transition-transform text-2xl">
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
