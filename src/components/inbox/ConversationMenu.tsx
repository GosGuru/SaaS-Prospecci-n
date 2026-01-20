'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Archive, Trash2, Ban, UserCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ConversationMenuProps {
  leadId: string
  leadName: string
  onArchive?: () => void
  onDelete?: () => void
  onBlock?: () => void
}

export function ConversationMenu({ 
  leadId, 
  leadName,
  onArchive,
  onDelete,
  onBlock
}: ConversationMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleViewProfile = () => {
    router.push(`/dashboard/leads/${leadId}`)
    setIsOpen(false)
  }

  const handleArchive = () => {
    if (window.confirm(`¿Archivar conversación con ${leadName}?`)) {
      onArchive?.()
    }
    setIsOpen(false)
  }

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar conversación con ${leadName}? Esta acción no se puede deshacer.`)) {
      onDelete?.()
    }
    setIsOpen(false)
  }

  const handleBlock = () => {
    if (window.confirm(`¿Bloquear a ${leadName}? No podrás recibir más mensajes de este contacto.`)) {
      onBlock?.()
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
        title="Más opciones"
      >
        <MoreVertical className="w-5 h-5 text-dark-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 bg-dark-card border border-dark-border rounded-lg shadow-lg py-1 min-w-[200px] z-50">
          <button
            onClick={handleViewProfile}
            className="w-full px-4 py-2 text-left text-sm text-dark-text hover:bg-dark-hover transition-colors flex items-center gap-2"
          >
            <UserCircle className="w-4 h-4" />
            Ver perfil del lead
          </button>
          
          <button
            onClick={handleArchive}
            className="w-full px-4 py-2 text-left text-sm text-dark-text hover:bg-dark-hover transition-colors flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Archivar conversación
          </button>
          
          <div className="border-t border-dark-border my-1" />
          
          <button
            onClick={handleBlock}
            className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-dark-hover transition-colors flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Bloquear contacto
          </button>
          
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-hover transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar conversación
          </button>
        </div>
      )}
    </div>
  )
}
