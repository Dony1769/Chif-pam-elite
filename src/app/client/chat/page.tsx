"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client' // Ton chemin supabase ssr

export default function ClientChat() {
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. Charger les messages et écouter en temps réel
  useEffect(() => {
    const fetchMessages = async () => {
        const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
        if (data) setMessages(data)
    }
    fetchMessages()

    const channel = supabase.channel('realtime_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('messages').insert([{ user_id: user?.id, content, sender_type: 'client' }])
    setContent('')
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header avec bouton retour */}
      <header className="p-4 bg-emerald-900/20 backdrop-blur-md border-b border-emerald-500/30 flex items-center">
        <button onClick={() => window.history.back()} className="mr-4">← Retour</button>
        <h1 className="font-bold text-emerald-400">Support ChifPam</h1>
      </header>

      {/* Messages avec scroll auto */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${m.sender_type === 'client' ? 'bg-emerald-600' : 'bg-gray-800 border border-gray-700'}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input fixé en bas */}
      <form onSubmit={sendMessage} className="p-4 bg-black/50 backdrop-blur-xl border-t border-emerald-500/20">
        <div className="flex gap-2">
          <input 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 bg-gray-900 border border-emerald-500/30 rounded-full px-4 py-2 focus:outline-none focus:border-emerald-500"
            placeholder="Écrivez votre message..."
          />
          <button type="submit" className="bg-emerald-500 p-2 rounded-full px-6 hover:bg-emerald-400 transition">Envoyer</button>
        </div>
      </form>
    </div>
  )
}
