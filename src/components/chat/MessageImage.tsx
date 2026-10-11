import React, { useState } from 'react'
import ImageViewer from './ImageViewer'

type Props = {
  src: string
  alt?: string
}

export default function MessageImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="rounded-xl overflow-hidden border border-white/5 cursor-pointer" onClick={() => setOpen(true)}>
        <img src={src} alt={alt} className="w-full h-auto object-cover" />
      </div>
      {open && <ImageViewer src={src} onClose={() => setOpen(false)} />}
    </>
  )
}
