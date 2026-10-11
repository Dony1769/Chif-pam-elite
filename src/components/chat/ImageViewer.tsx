"use client"
import React from 'react'

type Props = {
  src: string
  onClose: () => void
}

export default function ImageViewer({ src, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded">Fermer</button>
      <img src={src} alt="full" className="max-h-[90%] max-w-[90%] object-contain rounded" />
    </div>
  )
}
