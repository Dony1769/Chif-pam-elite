import React from 'react'

type Props = {
  children: React.ReactNode
}

export default function ChatLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#030316] via-[#041022] to-[#020617] text-white p-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5 bg-[rgba(255,255,255,0.02)] backdrop-blur-md">
        {children}
      </div>
    </main>
  )
}
