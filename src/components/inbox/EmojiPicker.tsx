'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import dynamic from 'next/dynamic'

// Import emoji picker dynamically to avoid SSR issues
const Picker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
)

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleEmojiClick = (emojiData: any) => {
    onEmojiSelect(emojiData.emoji)
    setShowPicker(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
        title="Agregar emoji"
      >
        <Smile className="w-5 h-5 text-dark-muted" />
      </button>

      {showPicker && (
        <div className="absolute bottom-12 left-0 z-50">
          <Picker
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
          />
        </div>
      )}
    </div>
  )
}
