'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase' // Ton fichier importé
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  content: string
  is_admin_message: boolean
  created_at: string
}

export default function ClientChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    // 1. Récupérer l'utilisateur courant
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login') // Rediriger si pas connecté
        return
      }
      setUserId(session.user.id)
      fetchMessages(session.user.id)
      subscribeToMessages(session.user.id)
    }
    getUser()
  }, [])

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (uid: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  const subscribeToMessages = (uid: string) => {
    const channel = supabase
      .channel('client-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${uid}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !userId) return

    const { error } = await supabase
      .from('messages')
      .insert({
        content: newMessage,
        user_id: userId,
        is_admin_message: false // C'est le client qui parle
      })

    if (!error) setNewMessage('')
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 border-x">
      <div className="p-4 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Support Chif Pam</h1>
        <p className="text-sm text-gray-500">Posez vos questions, un admin vous répondra.</p>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_admin_message ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg text-sm ${
                msg.is_admin_message
                  ? 'bg-gray-200 text-gray-800 rounded-bl-none'
                  : 'bg-green-600 text-white rounded-br-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
