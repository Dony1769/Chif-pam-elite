'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        fetchMessages(session.user.id)
        
        // TEMPS RÉEL ULTRA INSTANTANÉ
        const channel = supabase
          .channel(`chat:${session.user.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `user_id=eq.${session.user.id}` 
          }, (payload) => {
            setMessages(prev => [payload.new, ...prev]) // Le nouveau monte en haut
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      }
    }
    init()
  }, [])

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }) // Les plus récents en haut
    if (data) setMessages(data)
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !user) return
    const msg = text; setText('')
    await supabase.from('messages').insert({ content: msg, user_id: user.id, is_admin_message: false })
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans p-4 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
          <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-emerald-500" />
          </Link>
          <div>
            <h2 className="font-black italic uppercase text-sm tracking-widest">Support <span className="text-emerald-500">Chif-Pam</span></h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">En ligne</span>
            </div>
          </div>
        </div>

        {/* Messages - Les nouveaux sont en haut */}
        <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
          <form onSubmit={send} className="mb-6">
             <div className="relative group">
                <input 
                  value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Écris ton message..."
                  className="w-full bg-slate-900 border border-white/10 p-5 rounded-[2rem] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 pr-16"
                />
                <button type="submit" className="absolute right-3 top-3 p-3 bg-emerald-500 rounded-2xl text-slate-950 hover:scale-105 active:scale-95 transition-all">
                  <Send size={20} />
                </button>
             </div>
          </form>

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-bold ${
                m.is_admin_message 
                ? 'bg-slate-800 border border-white/5 text-white rounded-tl-none' 
                : 'bg-emerald-500 text-slate-950 rounded-tr-none shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
