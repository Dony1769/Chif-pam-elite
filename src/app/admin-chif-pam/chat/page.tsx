"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

// Types pour TypeScript
interface Conversation {
  user_id: string;
  last_message: string;
  last_created_at: string;
  profiles: { username: string; email: string };
}

export default function AdminChat() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. Charger la liste des conversations (Sidebar)
  useEffect(() => {
    const fetchConversations = async () => {
      const { data } = await supabase
        .from('latest_message_per_conversation')
        .select(`*, profiles:user_id(username, email)`)
        .order('last_created_at', { ascending: false })
      if (data) setConversations(data as any)
    }

    fetchConversations()

    // Realtime pour la sidebar (nouveaux messages qui font remonter une conv)
    const convChannel = supabase.channel('sidebar_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, () => {
        fetchConversations()
      }).subscribe()

    return () => { supabase.removeChannel(convChannel) }
  }, [])

  // 2. Charger les messages quand un client est sélectionné
  useEffect(() => {
    if (!selectedUserId) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMessages()

    const msgChannel = supabase.channel(`chat_${selectedUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `user_id=eq.${selectedUserId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      }).subscribe()

    return () => { supabase.removeChannel(msgChannel) }
  }, [selectedUserId])

  // Scroll auto en bas
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !selectedUserId) return

    await supabase.from('messages').insert([{ 
      user_id: selectedUserId, 
      content, 
      sender_type: 'admin' 
    }])
    setContent('')
  }

  // Filtrage pour la recherche
  const filteredConversations = conversations.filter(c => 
    c.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      
      {/* --- SIDEBAR GAUCHE --- */}
      <div className="w-1/3 border-r border-emerald-500/10 flex flex-col bg-black/40 backdrop-blur-md">
        <div className="p-4 border-b border-emerald-500/20">
          <h2 className="text-xl font-bold text-emerald-500 mb-4">Messages</h2>
          <input 
            type="text"
            placeholder="Rechercher un client..."
            className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/50 transition"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div 
              key={conv.user_id}
              onClick={() => setSelectedUserId(conv.user_id)}
              className={`p-4 cursor-pointer border-b border-white/5 transition hover:bg-emerald-500/5 ${selectedUserId === conv.user_id ? 'bg-emerald-500/10 border-r-4 border-r-emerald-500' : ''}`}
            >
              <p className="font-semibold text-emerald-400">{conv.profiles?.username || 'Utilisateur'}</p>
              <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- ZONE DE CHAT DROITE --- */}
      <div className="flex-1 flex flex-col relative">
        {selectedUserId ? (
          <>
            {/* Header du Chat */}
            <header className="p-4 bg-emerald-900/5 backdrop-blur-xl border-b border-emerald-500/10 shadow-lg">
               <span className="text-emerald-500 font-medium">Conversation avec</span>
               <p className="font-bold">{conversations.find(c => c.user_id === selectedUserId)?.profiles.username}</p>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-xl transition-all ${
                    m.sender_type === 'admin' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-white/5 backdrop-blur-md border border-white/10 rounded-bl-none'
                  }`}>
                    <p className="text-sm">{m.content}</p>
                    <span className="text-[10px] opacity-50 block mt-1 text-right">
                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input bar - Fixée en bas sans scroll */}
            <form onSubmit={sendMessage} className="p-4 bg-black border-t border-emerald-500/10">
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <input 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Répondre au client..."
                  className="flex-1 bg-transparent px-4 py-2 focus:outline-none"
                />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-6 rounded-xl transition">
                  Envoyer
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 italic">
            Sélectionnez une discussion pour commencer à répondre
          </div>
        )}
      </div>
    </div>
  )
}
