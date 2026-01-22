'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  MessageCircle,
  Mail,
  Inbox,
  User,
  Phone,
  RefreshCw,
  Send,
  Smile,
  Loader2,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  Archive,
  Ban,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatRelativeTime } from '@/lib/utils'
import { EmojiPicker } from '@/components/inbox/EmojiPicker'
import { FileUploader } from '@/components/inbox/FileUploader'
import { ConversationMenu } from '@/components/inbox/ConversationMenu'
import toast from 'react-hot-toast'

type ChannelFilter = 'all' | 'whatsapp' | 'email'

interface Conversation {
  id: string
  lead: {
    id: string
    name: string
    businessName: string | null
    email: string | null
    phone: string | null
    avatar: string | null
  }
  channel: 'whatsapp' | 'email' | 'both'
  lastMessage: string
  lastMessageAt: string
  lastMessageChannel: string
  isRead: boolean
  messageCount: number
  unreadCount: number
}

interface Message {
  id: string
  type: 'inbound' | 'outbound'
  channel: string
  content: string
  subject?: string | null
  timestamp: string
  from?: string
  to?: string
  status?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  errorMessage?: string | null
  isRead?: boolean
  metadata?: any
}

export default function InboxPage() {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  
  // Data states
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [actionLeadId, setActionLeadId] = useState<string | null>(null)
  const [actionLeadName, setActionLeadName] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch conversations
  useEffect(() => {
    fetchConversations()
    fetchWorkspace()
    // Polling every 10 seconds for new messages
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [channelFilter, searchQuery])

  async function fetchWorkspace() {
    try {
      const response = await fetch('/api/workspace')
      if (response.ok) {
        const data = await response.json()
        setWorkspaceId(data.id)
      }
    } catch (err) {
      console.error('Error fetching workspace:', err)
    }
  }

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId)
      // Mark as read
      markAsRead(selectedConversationId)
    }
  }, [selectedConversationId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [messageInput])

  async function fetchConversations() {
    try {
      const params = new URLSearchParams()
      if (channelFilter !== 'all') {
        params.append('channel', channelFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/inbox/conversations?${params}`)
      if (!response.ok) throw new Error('Error al cargar conversaciones')
      
      const data = await response.json()
      setConversations(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError('Error al cargar conversaciones')
    } finally {
      setIsLoadingConversations(false)
    }
  }

  async function fetchMessages(leadId: string) {
    setIsLoadingMessages(true)
    try {
      const response = await fetch(`/api/inbox/conversations/${leadId}`)
      if (!response.ok) throw new Error('Error al cargar mensajes')
      
      const data = await response.json()
      setMessages(data.messages)
      setError(null)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Error al cargar mensajes')
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function markAsRead(leadId: string) {
    try {
      await fetch(`/api/inbox/conversations/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === leadId 
          ? { ...conv, isRead: true, unreadCount: 0 }
          : conv
      ))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  function confirmDelete(leadId: string, leadName: string) {
    setActionLeadId(leadId)
    setActionLeadName(leadName)
    setShowDeleteModal(true)
  }

  async function deleteConversation() {
    if (!actionLeadId) return

    try {
      const response = await fetch(`/api/inbox/conversations/${actionLeadId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Error al eliminar conversación')
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== actionLeadId))
      
      // Clear selection if it was the selected conversation
      if (selectedConversationId === actionLeadId) {
        setSelectedConversationId(null)
        setMessages([])
      }
      
      toast.success('Conversación eliminada correctamente')
      setShowDeleteModal(false)
      setActionLeadId(null)
    } catch (err) {
      console.error('Error deleting conversation:', err)
      toast.error('Error al eliminar la conversación')
    }
  }

  function confirmArchive(leadId: string, leadName: string) {
    setActionLeadId(leadId)
    setActionLeadName(leadName)
    setShowArchiveModal(true)
  }

  async function archiveConversation() {
    if (!actionLeadId) return

    try {
      const response = await fetch(`/api/inbox/conversations/${actionLeadId}/archive`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Error al archivar conversación')
      
      // Remove from active conversations
      setConversations(prev => prev.filter(conv => conv.id !== actionLeadId))
      
      // Clear selection if it was the selected conversation
      if (selectedConversationId === actionLeadId) {
        setSelectedConversationId(null)
        setMessages([])
      }
      
      toast.success('Conversación archivada correctamente')
      setShowArchiveModal(false)
      setActionLeadId(null)
    } catch (err) {
      console.error('Error archiving conversation:', err)
      toast.error('Error al archivar la conversación')
    }
  }

  function confirmBlock(leadId: string, leadName: string) {
    setActionLeadId(leadId)
    setActionLeadName(leadName)
    setShowBlockModal(true)
  }

  async function blockContact() {
    if (!actionLeadId) return

    try {
      const response = await fetch(`/api/inbox/conversations/${actionLeadId}/block`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Error al bloquear contacto')
      
      // Remove from conversations
      setConversations(prev => prev.filter(conv => conv.id !== actionLeadId))
      
      // Clear selection if it was the selected conversation
      if (selectedConversationId === actionLeadId) {
        setSelectedConversationId(null)
        setMessages([])
      }
      
      toast.success('Contacto bloqueado correctamente')
      setShowBlockModal(false)
      setActionLeadId(null)
    } catch (err) {
      console.error('Error blocking contact:', err)
      toast.error('Error al bloquear el contacto')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    
    if (!messageInput.trim() && !selectedFile) return
    if (!selectedConversationId) return

    const selectedConversation = conversations.find(c => c.id === selectedConversationId)
    if (!selectedConversation) return

    // Determine channel from conversation
    let channel = selectedConversation.lastMessageChannel
    if (selectedConversation.channel === 'both') {
      // Use last message channel or default to whatsapp
      channel = channel || 'whatsapp'
    } else {
      channel = selectedConversation.channel
    }

    setIsSending(true)

    try {
      let endpoint = ''
      let body: any = {
        leadId: selectedConversationId,
        message: messageInput || (selectedFile ? `[${selectedFile.type.startsWith('image/') ? 'Imagen' : 'Archivo'}: ${selectedFile.name}]` : ''),
        workspaceId: workspaceId
      }

      // Handle file upload
      if (selectedFile) {
        // Convert file to base64 for sending
        const base64 = await fileToBase64(selectedFile)
        body.media = {
          base64: base64,
          filename: selectedFile.name,
          mimetype: selectedFile.type,
          caption: messageInput || undefined
        }
        // If only file is sent without caption, use the file as the message
        if (!messageInput.trim()) {
          body.message = `[${selectedFile.type.startsWith('image/') ? 'Imagen' : 'Archivo'}: ${selectedFile.name}]`
        }
      }

      if (channel === 'whatsapp') {
        endpoint = '/api/whatsapp/send'
      } else if (channel === 'email') {
        endpoint = '/api/email/send'
        body.subject = `Re: Conversación con ${selectedConversation.lead.businessName || selectedConversation.lead.name}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al enviar mensaje')
      }

      // Clear input
      setMessageInput('')
      setSelectedFile(null)
      setFilePreview(null)

      // Refresh messages
      await fetchMessages(selectedConversationId)
      await fetchConversations()

    } catch (err: any) {
      console.error('Error sending message:', err)
      toast.error(err.message || 'Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  // Helper function to convert file to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:mimetype;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  function handleEmojiSelect(emoji: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = messageInput
    const before = text.substring(0, start)
    const after = text.substring(end)
    
    setMessageInput(before + emoji + after)
    
    // Set cursor position after emoji
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }

  function handleFileSelect(file: File, preview?: string) {
    setSelectedFile(file)
    if (preview) {
      setFilePreview(preview)
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setFilePreview(null)
  }

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Channel filter is already handled by API
      return true
    })
  }, [conversations])

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  const getChannelIcon = (channel: string) => {
    if (channel === 'whatsapp') {
      return <MessageCircle className="w-4 h-4" />
    }
    return <Mail className="w-4 h-4" />
  }

  const getMessageStatus = (message: Message) => {
    if (message.type === 'inbound') return null
    
    if (message.failedAt) {
      return <span className="text-xs text-red-400">Error</span>
    }
    if (message.readAt) {
      return <CheckCheck className="w-4 h-4 text-brand-400" />
    }
    if (message.deliveredAt) {
      return <CheckCheck className="w-4 h-4 text-dark-muted" />
    }
    if (message.sentAt) {
      return <Check className="w-4 h-4 text-dark-muted" />
    }
    return <Clock className="w-4 h-4 text-dark-muted" />
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <Inbox className="w-7 h-7" />
            Inbox
          </h1>
          <p className="text-dark-muted mt-1">
            {filteredConversations.length} conversaciones
            {filteredConversations.filter(c => !c.isRead).length > 0 && (
              <span className="text-brand-400 ml-1">
                · {filteredConversations.filter(c => !c.isRead).length} sin leer
              </span>
            )}
          </p>
        </div>
        
        <Button
          onClick={() => fetchConversations()}
          variant="ghost"
          size="sm"
          disabled={isLoadingConversations}
        >
          <RefreshCw className={cn("w-4 h-4", isLoadingConversations && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Conversations List */}
        <Card className="col-span-4 flex flex-col p-0 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-dark-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setChannelFilter('all')}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  channelFilter === 'all'
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "bg-dark-hover text-dark-muted hover:text-dark-text"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5",
                  channelFilter === 'whatsapp'
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-dark-hover text-dark-muted hover:text-dark-text"
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => setChannelFilter('email')}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5",
                  channelFilter === 'email'
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "bg-dark-hover text-dark-muted hover:text-dark-text"
                )}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-dark-muted" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Inbox className="w-12 h-12 text-dark-muted mb-3" />
                <p className="text-dark-muted text-sm">No hay conversaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-border">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-dark-hover transition-colors",
                      selectedConversationId === conversation.id && "bg-dark-hover border-l-2 border-brand-500",
                      !conversation.isRead && "bg-brand-500/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                        {conversation.lead.avatar ? (
                          <img
                            src={conversation.lead.avatar}
                            alt={conversation.lead.businessName || conversation.lead.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-dark-muted" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={cn(
                            "text-sm truncate",
                            !conversation.isRead ? "font-semibold text-dark-text" : "text-dark-text"
                          )}>
                            {conversation.lead.businessName || conversation.lead.name}
                          </h3>
                          <span className="text-xs text-dark-muted flex-shrink-0">
                            {formatRelativeTime(new Date(conversation.lastMessageAt))}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1",
                            conversation.lastMessageChannel === 'whatsapp' ? "text-emerald-400" : "text-brand-400"
                          )}>
                            {getChannelIcon(conversation.lastMessageChannel)}
                          </div>
                          <p className={cn(
                            "text-sm truncate flex-1",
                            !conversation.isRead ? "font-medium text-dark-text" : "text-dark-muted"
                          )}>
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="brand" className="flex-shrink-0">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Messages Area */}
        <Card className="col-span-8 flex flex-col p-0 overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="lg:hidden p-2 hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-10 h-10 rounded-full bg-dark-border flex items-center justify-center">
                    {selectedConversation.lead.avatar ? (
                      <img
                        src={selectedConversation.lead.avatar}
                        alt={selectedConversation.lead.businessName || selectedConversation.lead.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-dark-muted" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-dark-text">
                      {selectedConversation.lead.businessName || selectedConversation.lead.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-dark-muted">
                      {selectedConversation.lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedConversation.lead.phone}
                        </span>
                      )}
                      {selectedConversation.lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {selectedConversation.lead.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ConversationMenu
                  leadId={selectedConversation.id}
                  leadName={selectedConversation.lead.businessName || selectedConversation.lead.name}
                  onArchive={() => confirmArchive(selectedConversation.id, selectedConversation.lead.businessName || selectedConversation.lead.name)}
                  onDelete={() => confirmDelete(selectedConversation.id, selectedConversation.lead.businessName || selectedConversation.lead.name)}
                  onBlock={() => confirmBlock(selectedConversation.id, selectedConversation.lead.businessName || selectedConversation.lead.name)}
                />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-dark-muted" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-dark-muted text-sm">No hay mensajes</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const isOutbound = message.type === 'outbound'
                      const showDate = index === 0 || 
                        new Date(messages[index - 1].timestamp).toDateString() !== 
                        new Date(message.timestamp).toDateString()

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-xs text-dark-muted bg-dark-hover px-3 py-1 rounded-full">
                                {new Date(message.timestamp).toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}

                          <div className={cn(
                            "flex gap-2",
                            isOutbound ? "justify-end" : "justify-start"
                          )}>
                            <div className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              isOutbound 
                                ? "bg-brand-500 text-white" 
                                : "bg-dark-hover text-dark-text"
                            )}>
                              {message.subject && (
                                <p className="font-semibold text-sm mb-1">
                                  {message.subject}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <div className={cn(
                                "flex items-center justify-end gap-1 mt-1",
                                isOutbound ? "text-white/70" : "text-dark-muted"
                              )}>
                                <span className="text-xs">
                                  {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {isOutbound && getMessageStatus(message)}
                              </div>
                              {message.errorMessage && (
                                <p className="text-xs text-red-200 mt-1">
                                  Error: {message.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-border">
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    <FileUploader
                      onFileSelect={handleFileSelect}
                      onRemoveFile={handleRemoveFile}
                      selectedFile={selectedFile}
                      preview={filePreview}
                    />
                  </div>

                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="w-full px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none min-h-[40px] max-h-[120px]"
                      rows={1}
                      disabled={isSending}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSending || (!messageInput.trim() && !selectedFile)}
                    size="sm"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  Presiona Enter para enviar, Shift + Enter para nueva línea
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="w-16 h-16 text-dark-muted mb-4" />
              <h3 className="text-lg font-semibold text-dark-text mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-dark-muted text-sm max-w-sm">
                Elige una conversación de la lista para ver los mensajes y responder
              </p>
            </div>
          )}
        </Card>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar conversación"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-dark-text font-medium">
                ¿Estás seguro de eliminar esta conversación?
              </p>
              <p className="text-sm text-dark-muted mt-1">
                Se eliminará permanentemente la conversación con <strong>{actionLeadName}</strong>.
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={deleteConversation}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archivar conversación"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Archive className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-dark-text font-medium">
                ¿Archivar conversación con {actionLeadName}?
              </p>
              <p className="text-sm text-dark-muted mt-1">
                La conversación se ocultará de tu inbox. Podés restaurarla desde la sección de archivados.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowArchiveModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={archiveConversation}
              leftIcon={<Archive className="w-4 h-4" />}
            >
              Archivar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="Bloquear contacto"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-dark-text font-medium">
                ¿Bloquear a {actionLeadName}?
              </p>
              <p className="text-sm text-dark-muted mt-1">
                No podrás recibir más mensajes de este contacto hasta que lo desbloquees.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowBlockModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={blockContact}
              leftIcon={<Ban className="w-4 h-4" />}
            >
              Bloquear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
