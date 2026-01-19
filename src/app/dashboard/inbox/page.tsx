'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Inbox,
  MessageCircle,
  Mail,
  Search,
  Filter,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Send,
  Paperclip,
  Image,
  Smile,
  Phone,
  User,
  Clock,
  Check,
  CheckCheck,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Conversation, Lead, InboundMessage, OutboundMessage } from '@/types'

type ChannelFilter = 'all' | 'whatsapp' | 'email'

// Demo conversations
const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    lead: {
      id: '1',
      name: 'La Parrilla de Juan',
      phone: '+54 11 4567-8901',
      email: 'contacto@laparrilladejuan.com',
      category: 'Restaurante',
      status: 'active',
      workspaceId: 'demo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    channel: 'whatsapp',
    lastMessage: '¡Hola! Sí, me interesa saber más sobre el servicio de diseño web.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    isRead: false,
    messageCount: 8,
  },
  {
    id: '2',
    lead: {
      id: '2',
      name: 'Peluquería Style',
      phone: '+54 11 5555-1234',
      email: 'info@peluqueriastyle.com',
      category: 'Peluquería',
      status: 'active',
      workspaceId: 'demo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    channel: 'email',
    lastMessage: 'Gracias por la información. ¿Podríamos coordinar una llamada?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: true,
    messageCount: 5,
  },
  {
    id: '3',
    lead: {
      id: '3',
      name: 'Gimnasio Power Fit',
      phone: '+54 11 4444-5678',
      email: 'info@powerfit.com',
      category: 'Gimnasio',
      status: 'active',
      workspaceId: 'demo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    channel: 'whatsapp',
    lastMessage: 'Perfecto, mañana a las 10 me viene bien para la llamada.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
    messageCount: 12,
  },
  {
    id: '4',
    lead: {
      id: '4',
      name: 'Veterinaria San Roque',
      phone: '+54 11 6666-7890',
      email: 'consultas@vetsanroque.com',
      category: 'Veterinaria',
      status: 'active',
      workspaceId: 'demo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    channel: 'email',
    lastMessage: 'Les envío el presupuesto adjunto.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    isRead: true,
    messageCount: 3,
  },
]

// Demo messages for selected conversation
const DEMO_MESSAGES = [
  {
    id: '1',
    type: 'outbound',
    content: '¡Hola! Somos de una agencia de desarrollo web. Encontramos La Parrilla de Juan en Google Maps y notamos que no tienen sitio web. ¿Les interesaría tener presencia online?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    status: 'read',
  },
  {
    id: '2',
    type: 'inbound',
    content: '¡Hola! Sí, es algo que venimos pensando hace rato pero no sabemos por dónde empezar.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30),
  },
  {
    id: '3',
    type: 'outbound',
    content: '¡Genial! Podemos ayudarlos. Un sitio web les permitiría mostrar su menú, tomar reservas online y aparecer mejor en búsquedas de Google. ¿Les gustaría que les cuente más?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: 'read',
  },
  {
    id: '4',
    type: 'inbound',
    content: '¡Hola! Sí, me interesa saber más sobre el servicio de diseño web.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
]

export default function InboxPage() {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return DEMO_CONVERSATIONS.filter((conv) => {
      // Channel filter
      if (channelFilter !== 'all' && conv.channel !== channelFilter) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          conv.lead.name.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      return true
    })
  }, [channelFilter, searchQuery])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConversation])

  const unreadCount = DEMO_CONVERSATIONS.filter((c) => !c.isRead).length

  return (
    <div className="flex h-[calc(100vh-8rem)] -mt-6 -mx-6">
      {/* Conversation list */}
      <div
        className={cn(
          'w-full md:w-96 border-r border-dark-border flex flex-col bg-dark-card',
          selectedConversation && 'hidden md:flex'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-dark-text">Inbox</h1>
            {unreadCount > 0 && (
              <Badge variant="brand">{unreadCount} nuevos</Badge>
            )}
          </div>

          {/* Search */}
          <SearchInput
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />

          {/* Channel filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setChannelFilter('all')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                channelFilter === 'all'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-hover text-dark-muted hover:text-dark-text'
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1',
                channelFilter === 'whatsapp'
                  ? 'bg-green-500 text-white'
                  : 'bg-dark-hover text-dark-muted hover:text-dark-text'
              )}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => setChannelFilter('email')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1',
                channelFilter === 'email'
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-hover text-dark-muted hover:text-dark-text'
              )}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-12 h-12 text-dark-muted mx-auto mb-4" />
              <p className="text-dark-muted">No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation detail */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-dark-bg',
          !selectedConversation && 'hidden md:flex'
        )}
      >
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="p-4 border-b border-dark-border bg-dark-card flex items-center gap-4">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 rounded-lg hover:bg-dark-hover"
              >
                <ArrowLeft className="w-5 h-5 text-dark-muted" />
              </button>

              <div className="w-10 h-10 rounded-full bg-dark-hover flex items-center justify-center">
                <User className="w-5 h-5 text-dark-muted" />
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/leads/${selectedConversation.lead.id}`}
                  className="font-medium text-dark-text hover:text-brand-400"
                >
                  {selectedConversation.lead.name}
                </Link>
                <p className="text-sm text-dark-muted flex items-center gap-2">
                  {selectedConversation.channel === 'whatsapp' ? (
                    <>
                      <MessageCircle className="w-3 h-3" />
                      {selectedConversation.lead.phone}
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3" />
                      {selectedConversation.lead.email}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={selectedConversation.channel === 'whatsapp' ? 'success' : 'brand'}
                >
                  {selectedConversation.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </Badge>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {DEMO_MESSAGES.map((message, index) => (
                <MessageBubble key={message.id} message={message} index={index} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-dark-border bg-dark-card">
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg hover:bg-dark-hover text-dark-muted hover:text-dark-text transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-dark-hover text-dark-muted hover:text-dark-text transition-colors">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-dark-hover text-dark-muted hover:text-dark-text transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 resize-none rounded-lg bg-dark-bg border border-dark-border p-3 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 max-h-32"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      // Send message
                    }
                  }}
                />

                <Button
                  variant="primary"
                  className="h-11"
                  disabled={!messageInput.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-16 h-16 text-dark-muted mx-auto mb-4" />
              <h2 className="text-xl font-medium text-dark-text mb-2">
                Seleccioná una conversación
              </h2>
              <p className="text-dark-muted">
                Elegí una conversación de la lista para ver los mensajes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Conversation item component
function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 flex items-start gap-3 hover:bg-dark-hover transition-colors text-left',
        isSelected && 'bg-dark-hover',
        !conversation.isRead && 'bg-brand-500/5'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-dark-hover flex items-center justify-center">
          <User className="w-6 h-6 text-dark-muted" />
        </div>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
            conversation.channel === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'
          )}
        >
          {conversation.channel === 'whatsapp' ? (
            <MessageCircle className="w-3 h-3 text-white" />
          ) : (
            <Mail className="w-3 h-3 text-white" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'font-medium truncate',
              !conversation.isRead ? 'text-dark-text' : 'text-dark-muted'
            )}
          >
            {conversation.lead.name}
          </span>
          <span className="text-xs text-dark-muted flex-shrink-0">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>

        <p
          className={cn(
            'text-sm truncate mt-1',
            !conversation.isRead ? 'text-dark-text font-medium' : 'text-dark-muted'
          )}
        >
          {conversation.lastMessage}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <Badge variant="neutral" className="text-xs">
            {conversation.lead.category}
          </Badge>
          {!conversation.isRead && (
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-dark-muted flex-shrink-0 mt-1" />
    </button>
  )
}

// Message bubble component
function MessageBubble({
  message,
  index,
}: {
  message: {
    id: string
    type: string
    content: string
    timestamp: Date
    status?: string
  }
  index: number
}) {
  const isOutbound = message.type === 'outbound'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOutbound
            ? 'bg-brand-500 text-white rounded-tr-md'
            : 'bg-dark-card border border-dark-border text-dark-text rounded-tl-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1',
            isOutbound ? 'text-white/60' : 'text-dark-muted'
          )}
        >
          <span className="text-xs">
            {message.timestamp.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOutbound && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
