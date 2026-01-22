'use client'

import { useRef, useCallback, useEffect } from 'react'

// Base64 encoded notification sound (short pleasant chime)
// This is a simple, universally compatible notification sound
const NOTIFICATION_SOUND_BASE64 = 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQxBsAAADSAAAAAAAAANIAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU='

interface UseNotificationSoundOptions {
  volume?: number // 0-1
  enabled?: boolean
}

export function useNotificationSound(options: UseNotificationSoundOptions = {}) {
  const { volume = 0.5, enabled = true } = options
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayedRef = useRef<number>(0)

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create audio element with embedded sound
      const audio = new Audio(NOTIFICATION_SOUND_BASE64)
      audio.volume = volume
      audio.preload = 'auto'
      audioRef.current = audio

      // Try to load a custom sound if available
      const customAudio = new Audio('/sounds/notification.mp3')
      customAudio.addEventListener('canplaythrough', () => {
        audioRef.current = customAudio
        audioRef.current.volume = volume
      }, { once: true })
      customAudio.addEventListener('error', () => {
        // Fallback to embedded sound (already set)
      }, { once: true })
      customAudio.load()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [volume])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const play = useCallback(() => {
    if (!enabled || !audioRef.current) return

    // Debounce: don't play if played within last 500ms
    const now = Date.now()
    if (now - lastPlayedRef.current < 500) return
    lastPlayedRef.current = now

    try {
      // Reset to start and play
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented, this is normal on first load
          // The sound will play on subsequent user interactions
          console.debug('Notification sound auto-play prevented:', error.message)
        })
      }
    } catch (error) {
      console.debug('Error playing notification sound:', error)
    }
  }, [enabled])

  const enableSound = useCallback(() => {
    // This function should be called on user interaction to enable sound
    if (audioRef.current) {
      audioRef.current.volume = 0
      audioRef.current.play().then(() => {
        audioRef.current!.pause()
        audioRef.current!.volume = volume
        audioRef.current!.currentTime = 0
      }).catch(() => {
        // Ignore errors
      })
    }
  }, [volume])

  return { play, enableSound }
}
