import React, { useCallback, useMemo, useState } from 'react'
import type { ChatMessage } from '@/types/chat'
import { motion } from 'framer-motion'
import MessageImage from './MessageImage'
import MessageFile from './MessageFile'
import { ChatService } from '@/services/chat'
import { Copy, Edit2, Trash2, CornerUpLeft } from 'lucide-react'

type Props = {
  message: ChatMessage
}

const MessageBubble = React.memo(function MessageBubble({ message }: Props) {
  const isAdmin = message.is_admin_message

  const bubbleClasses = useMemo(
    () =>
      isAdmin
        ? 'bg-slate-900 border border-white/5 text-emerald-50 rounded-tl-none'
        : 'bg-emerald-500 border border-emerald-400 text-slate-950 rounded-tr-none',
    [isAdmin],
  )

  const content = message.content || ''
  const parsedContent = useMemo(() => {
    const imageMarker = content.match(/__img\|([^\s]+)__/)
    const fileMarker = content.match(/__file\|([^\|]+)\|([^\|]+)\|([^\s]+)__/)
    const replyMarker = content.match(/__reply\|([^\|]+)\|([^_]+)__/)

    return {
      imageUrl: imageMarker ? imageMarker[1] : null,
      fileUrl: fileMarker ? fileMarker[1] : null,
      isImage: Boolean(imageMarker) || /(https?:.*\.(?:png|jpg|jpeg|gif|webp))$/i.test(content),
      isFile: Boolean(fileMarker) || /(https?:.*\.(?:pdf|docx|zip))$/i.test(content),
      replyData: replyMarker ? { id: replyMarker[1], snippet: replyMarker[2] } : null,
    }
  }, [content])

  const { imageUrl, fileUrl, isImage, isFile, replyData } = parsedContent
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(content)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }, [content])

  const handleReply = useCallback(() => {
    const event = new CustomEvent('chat:reply', { detail: { message } })
    window.dispatchEvent(event)
  }, [message])

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    try {
      await ChatService.editMessage(message.id, editText)
      setEditing(false)
    } catch (err) {
      console.error('Edit failed', err)
    }
  }, [editText, message.id])

  const handleDelete = useCallback(async () => {
    if (!confirm('Supprimer ce message ?')) return
    try {
      await ChatService.deleteMessage(message.id)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }, [message.id])

  const displayTime = useMemo(
    () => new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [message.created_at],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`max-w-[85%] p-4 rounded-[1.8rem] text-sm font-bold shadow-xl ${bubbleClasses}`}
    >
      {replyData && (
        <div className="mb-2 p-2 bg-white/5 rounded">
          <div className="text-xs font-black opacity-70">Réponse à :</div>
          <div className="text-sm truncate">{replyData.snippet}</div>
        </div>
      )}

      {isImage ? (
        <MessageImage src={imageUrl ?? content} alt="image" />
      ) : isFile ? (
        <MessageFile url={fileUrl ?? content} />
      ) : editing ? (
        <div>
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            className="w-full p-2 rounded"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveEdit} className="px-3 py-1 bg-emerald-500 rounded">
              Enregistrer
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 bg-white/5 rounded">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-wrap wrap-break-word">{content}</div>
      )}

      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2">
          <button onClick={handleReply} className="p-1 hover:bg-white/5 rounded">
            <CornerUpLeft size={14} />
          </button>
          <button onClick={handleCopy} className="p-1 hover:bg-white/5 rounded">
            <Copy size={14} />
          </button>
          <button onClick={handleEdit} className="p-1 hover:bg-white/5 rounded">
            <Edit2 size={14} />
          </button>
          <button onClick={handleDelete} className="p-1 hover:bg-white/5 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-2">
        <p className="text-[10px] opacity-50 font-black uppercase tracking-tighter">{displayTime}</p>
      </div>
    </motion.div>
  )
})

export default MessageBubble
