"use client"
import React, { useEffect, useRef, useState } from 'react'
import EmojiPicker from './EmojiPicker'
import { Send, Image } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/services/chat'


type Props = {
  text: string
  setText: (v: string) => void
  sendMessage: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  // optional target user id for admin -> used for broadcasting typing/presence
  targetUserId?: string | null
}

export default function MessageInput({ text, setText, sendMessage, targetUserId }: Props) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const typingTimeout = useRef<number | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; snippet: string } | null>(null)

  const submitWithPreview = async (event?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault?.()

    let final = text
    if (preview) {
      const lower = (previewName || '').toLowerCase()
      if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        final = `__img|${preview}__\n${final}`
      } else {
        final = `__file|${preview}|${previewName || 'file'}|unknown__\n${final}`
      }
    }
    if (replyTo) {
      final = `__reply|${replyTo.id}|${replyTo.snippet}__\n${final}`
    }

    setText(final)
    setTimeout(() => {
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        currentTarget: null,
        target: null,
        bubbles: false,
        cancelable: false,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: false,
        nativeEvent: null,
        timeStamp: Date.now(),
        type: 'submit',
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {},
        getModifierState: () => false,
      } as React.FormEvent<HTMLFormElement>

      void sendMessage(syntheticEvent)
    }, 50)

    setPreview(null)
    setPreviewName(null)
    setReplyTo(null)
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: { id: string; content?: string } }>
      const message = customEvent.detail?.message
      if (message) {
        setReplyTo({ id: message.id, snippet: (message.content || '').slice(0, 120) })
      }
    }
    window.addEventListener('chat:reply', handler)
    return () => window.removeEventListener('chat:reply', handler)
  }, [])

  const onSelectEmoji = (emoji: string) => {
    setText(text + emoji)
    setShowEmoji(false)
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      // get user id
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      }
      const uid = userId
      const publicUrl = await ChatService.uploadFile(uid || 'anonymous', f)
      setPreview(publicUrl)
      setPreviewName(f.name)
    } catch (err) {
      console.error('Upload failed', err)
      // fallback to data url preview
      const reader = new FileReader()
      reader.onload = () => {
        const data = reader.result as string
        setPreview(data)
      }
      reader.readAsDataURL(f)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (mounted) setUserId(user?.id ?? null)
    })()
    return () => { mounted = false }
  }, [])

  const sendTyping = (isTyping: boolean) => {
    try {
      if (targetUserId) {
        ChatService.broadcastTyping(targetUserId, { isTyping, from: userId ?? undefined })
      } else if (userId) {
        ChatService.broadcastTyping(userId, { isTyping, from: userId })
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-4 border-t border-white/5 bg-linear-to-t from-transparent to-black/30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEmoji((s) => !s)} className="p-2 rounded-lg hover:bg-white/5">
            😊
          </button>
          <label className="p-2 rounded-lg hover:bg-white/5 cursor-pointer" aria-label="Ajouter une pièce jointe">
            <Image aria-hidden="true" />
            <input onChange={onFileChange} className="hidden" type="file" accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip" />
          </label>
        </div>

        <input value={text} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submitWithPreview(event)
          }
        }} onChange={(e) => {
          setText(e.target.value)
          // send typing events
          sendTyping(true)
          if (typingTimeout.current) window.clearTimeout(typingTimeout.current)
          typingTimeout.current = window.setTimeout(() => sendTyping(false), 1500)
        }} placeholder="Écris un message..." className="flex-1 bg-transparent outline-none p-3 rounded-2xl border border-white/6" />

        <button type="button" onClick={() => void submitWithPreview()} className="px-4 py-2 bg-emerald-500 rounded-2xl text-slate-950 hover:scale-105 transition-transform">
          <Send />
        </button>
      </div>

      {showEmoji && <div className="mt-3"><EmojiPicker onSelect={onSelectEmoji} /></div>}

      {replyTo && (
        <div className="mt-3 p-2 bg-white/5 rounded">
          <div className="text-xs font-black">Répondre à</div>
          <div className="text-sm truncate">{replyTo.snippet}</div>
        </div>
      )}

      {preview && (
        <div className="mt-3 p-2 bg-white/5 rounded-lg flex items-center gap-3">
          <img src={preview} alt={previewName || 'Prévisualisation du fichier'} className="max-h-36 object-contain rounded" />
          <div className="flex-1">
            <div className="font-bold">{previewName || 'Fichier'}</div>
            <div className="text-sm text-slate-400">Prévisualisation</div>
          </div>
        </div>
      )}
    </div>
  )
}
