'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, User, MessageSquare } from 'lucide-react'

export default function AdminChat() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').neq('role', 'admin').limit(20)
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  // Temps réel pour les messages de l'utilisateur sélectionné
  useEffect(() => {
    if (!selectedUser) return
    
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('user_id', selectedUser.id).order('created_at', { ascending: false })
      setMessages(data || [])
    }
    fetchMsgs()

    const sub = supabase.channel(`admin:${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${selectedUser.id}` }, 
      (p) => setMessages(prev => [p.new, ...prev]))
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [selectedUser])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUser) return
    const txt = reply; setReply('')
    await supabase.from('messages').insert({ content: txt, user_id: selectedUser.id, is_admin_message: true })
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex p-6 gap-6">
      {/* Liste des Clients */}
      <div className="w-80 bg-slate-900/50 border border-white/10 rounded-[2.5rem] backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-emerald-500">MESSAGES</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${selectedUser?.id === u.id ? 'bg-emerald-500 text-slate-950' : 'hover:bg-white/5 text-slate-400'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10"><User size={18}/></div>
              <div className="text-left overflow-hidden">
                <p className="font-black text-xs uppercase truncate">{u.username || u.phone}</p>
                <p className="text-[10px] opacity-70 italic tracking-tighter">Client actif</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 bg-slate-900/30 border border-white/5 rounded-[3rem] flex flex-col relative overflow-hidden">
        {selectedUser ? (
          <>
            <div className="p-6 bg-slate-900/80 border-b border-white/5 backdrop-blur-md">
              <h2 className="font-black uppercase italic tracking-widest text-emerald-500 underline decoration-2 underline-offset-8">Chat : {selectedUser.username}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 flex flex-col">
              {/* Input en haut car les messages descendent (plus intuitif pour admin) */}
              <form onSubmit={sendReply} className="mb-8">
                <input 
                  value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder={`Répondre à ${selectedUser.username}...`}
                  className="w-full bg-[#020617] border border-emerald-500/20 p-5 rounded-3xl outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </form>

              {messages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-end' : 'justify-start'}`}>
                   <div className={`p-4 rounded-2xl max-w-md text-sm font-bold ${m.is_admin_message ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'}`}>
                      {m.content}
                   </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <MessageSquare size={64} className="mb-4 text-emerald-500" />
            <p className="font-black italic uppercase tracking-[0.5em]">Sélectionne un client</p>
          </div>
        )}
      </div>
    </main>
  )
}

