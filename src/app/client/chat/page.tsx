"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase' // Changement ii : import de l'instance directe

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMessages = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
        if (data) setMessages(data)
    }
    fetchMessages()

    const channel = supabase.channel('client_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('messages').insert([{ 
        user_id: user.id, 
        content, 
        sender_type: 'client' 
    }])
    
    if (!error) setContent('')
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans">
      <header className="p-4 bg-emerald-900/20 backdrop-blur-md border-b border-emerald-500/30 flex items-center sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="mr-4 text-emerald-400 hover:text-white transition text-xl">
          ←
        </button>
        <h1 className="font-bold text-emerald-400">Support ChifPam</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-lg ${
                m.sender_type === 'client' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-zinc-800 border border-zinc-700 text-white rounded-bl-none'
            }`}>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-emerald-500/20">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2 items-center">
          <input 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 bg-zinc-900 border border-emerald-500/30 rounded-full px-5 py-3 focus:outline-none focus:border-emerald-500 transition text-sm"
            placeholder="Écrivez un message..."
          />
          <button type="submit" className="bg-emerald-500 p-3 rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-emerald-500/20">
             <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}
