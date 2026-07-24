import React from 'react'

type Props = { text?: string }

export default function TypingIndicator({ text = 'L’utilisateur écrit...' }: Props) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-slate-400">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      <div>{text}</div>
    </div>
  )
}
