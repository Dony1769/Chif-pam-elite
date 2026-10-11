import React from 'react'
import { FileText } from 'lucide-react'

type Props = {
  url: string
}

export default function MessageFile({ url }: Props) {
  const fileName = url.split('/').pop() || 'fichier'
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white/5 rounded-md">
      <FileText />
      <div className="text-sm">
        <div className="font-bold truncate max-w-[240px]">{fileName}</div>
        <div className="text-[11px] opacity-60">Télécharger</div>
      </div>
    </a>
  )
}
