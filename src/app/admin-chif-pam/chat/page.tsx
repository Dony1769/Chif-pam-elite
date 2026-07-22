'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { User, MessageSquare, Bell, Search } from 'lucide-react'
import { AdminChatService } from '@/services/admin/chat'

export default function AdminChat() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')

  // 1. Chargement et Tri Dynamique
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin')
      if (profiles) {
        const enhanced = await Promise.all(profiles.map(async (u) => {
          const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
            .eq('user_id', u.id).eq('is_read_by_admin', false).eq('is_admin_message', false)
          
          const { data: last } = await supabase.from('messages').select('created_at')
            .eq('user_id', u.id).order('created_at', { ascending: false }).limit(1).single()

          return { ...u, unread: count || 0, last_at: last?.created_at || u.created_at }
        }))
        setUsers(enhanced)
      }
    }
    fetchUsers()

    // ECOUTEUR GLOBAL : Pour faire monter les gens en haut de la liste
    const globalChannel = supabase.channel('admin_main')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        setUsers(prev => prev.map(u => {
          if (u.id === msg.user_id) {
            return {
              ...u,
              last_at: msg.created_at,
              unread: (selectedUser?.id !== u.id && !msg.is_admin_message) ? u.unread + 1 : u.unread
            }
          }
          return u
        }))
      }).subscribe()

    return () => { supabase.removeChannel(globalChannel) }
  }, [selectedUser])

  // Tri automatique : le message le plus récent met l'user en haut
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
  }, [users])

  // 2. Gestion de la lecture
  const markRead = async (uid: string) => {
    const result = await AdminChatService.markMessagesRead(uid)
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, unread: 0 } : u))
    }
  }

  useEffect(() => {
    if (!selectedUser) return
    markRead(selectedUser.id)
    
    // Fetch discussion
    const fetchChat = async () => {
      const { data } = await supabase.from('messages').select('*').eq('user_id', selectedUser.id).order('created_at', { ascending: false })
      setMessages(data || [])
    }
    fetchChat()

    const sub = supabase.channel(`chat_${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${selectedUser.id}` }, 
      (p) => {
        setMessages(prev => [p.new, ...prev])
        if (!p.new.is_admin_message) markRead(selectedUser.id)
      }).subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [selectedUser])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUser) return
    const txt = reply; setReply('')
    const result = await AdminChatService.sendReply(selectedUser.id, txt)
    if (!result.success) {
      setReply(txt)
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex p-6 gap-6 font-sans">
      {/* Sidebar : Liste de Gauche */}
      <div className="w-96 bg-slate-900/40 border border-white/10 rounded-[3rem] backdrop-blur-3xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-white/5 shadow-xl">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">MESSAGES</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Realtime Dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {sortedUsers.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u)} 
              className={`w-full p-5 rounded-[2.2rem] flex items-center gap-4 transition-all relative group ${
                selectedUser?.id === u.id ? 'bg-emerald-500 text-slate-950 shadow-2xl scale-[1.02]' : 'hover:bg-white/5 text-slate-400 border border-transparent hover:border-white/5'
              }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${selectedUser?.id === u.id ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-white/5'}`}>
                <User size={20}/>
              </div>
              <div className="text-left flex-1">
                <p className={`font-black text-xs uppercase truncate ${selectedUser?.id === u.id ? 'text-slate-950' : 'text-emerald-50'}`}>{u.username || u.phone}</p>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">
                    {new Date(u.last_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              {u.unread > 0 && selectedUser?.id !== u.id && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/50">
                  {u.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Zone de Discussion */}
      <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-[4rem] flex flex-col overflow-hidden backdrop-blur-xl relative">
        {selectedUser ? (
          <>
            <div className="p-8 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
               <h2 className="font-black uppercase italic tracking-[0.2em] text-emerald-500 underline decoration-4 underline-offset-8 decoration-emerald-500/20">
                 Session: {selectedUser.username || selectedUser.phone}
               </h2>
               <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase">Connecté</div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 flex flex-col">
              {/* Input Admin en haut pour le flux descendants */}
              <form onSubmit={send} className="mb-10 sticky top-0 z-10">
                <div className="relative group">
                  <input value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder={`Répondre à ${selectedUser.username}...`}
                    className="w-full bg-[#020617] border-2 border-emerald-500/10 p-6 rounded-[2.5rem] outline-none focus:border-emerald-500 transition-all font-bold text-lg shadow-2xl"
                  />
                  <button type="submit" className="absolute right-3 top-3 bottom-3 px-8 bg-emerald-500 text-slate-950 rounded-[1.8rem] font-black uppercase italic hover:bg-emerald-400 transition-all">
                    Flash Send
                  </button>
                </div>
              </form>

              {messages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-top-1 duration-300`}>
                   <div className={`p-5 rounded-4xl max-w-lg text-sm font-bold shadow-2xl border ${
                     m.is_admin_message 
                     ? 'bg-emerald-500 text-slate-950 rounded-tr-none border-emerald-400' 
                     : 'bg-slate-900 text-emerald-50 border-white/5 rounded-tl-none'
                   }`}>
                      {m.content}
                   </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 grayscale">
            <MessageSquare size={120} className="text-emerald-500 mb-6" />
            <h3 className="font-black italic uppercase tracking-[1.5em] text-xl">CHIF-PAM ADMIN</h3>
          </div>
        )}
      </div>
    </main>
  )
}
