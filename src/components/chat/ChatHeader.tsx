import React from 'react'

type Props = {
  title?: string
  subtitle?: string
}

export default function ChatHeader({ title, subtitle }: Props) {
  return (
    <div className="p-6 border-b border-white/5 bg-slate-900/30 flex items-center justify-between">
      <div>
        <h2 className="font-black italic uppercase tracking-tight text-emerald-400">{title}</h2>
        {subtitle && <div className="text-[12px] text-slate-400">{subtitle}</div>}
      </div>
      <div className="text-sm text-slate-400">Support • Réponse moyenne 5 min</div>
    </div>
  )
}
