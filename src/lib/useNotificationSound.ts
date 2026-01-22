'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

interface UseNotificationSoundOptions {
  volume?: number // 0-1
  enabled?: boolean
}

export function useNotificationSound(options: UseNotificationSoundOptions = {}) {
  const { volume = 0.5, enabled = true } = options
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayedRef = useRef<number>(0)
  const [isReady, setIsReady] = useState(false)

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Try WAV first (better compatibility), then MP3
    const audio = new Audio()
    audio.volume = volume
    audio.preload = 'auto'
    
    const handleCanPlay = () => {
      setIsReady(true)
      console.log('Notification sound loaded and ready')
    }
    
    const handleError = (e: Event) => {
      console.warn('Failed to load notification sound:', e)
      // Still mark as ready to use fallback
      setIsReady(true)
    }
    
    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.addEventListener('error', handleError)
    
    // Try WAV first, fallback to MP3
    audio.src = '/sounds/notification.wav'
    audio.load()
    
    audioRef.current = audio

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.removeEventListener('error', handleError)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Fallback beep using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      
      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // Hz
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      console.debug('Web Audio API fallback failed:', e)
    }
  }, [volume])

  const play = useCallback(() => {
    if (!enabled) return

    // Debounce: don't play if played within last 1000ms
    const now = Date.now()
    if (now - lastPlayedRef.current < 1000) return
    lastPlayedRef.current = now

    try {
      if (audioRef.current && audioRef.current.readyState >= 2) {
        // Audio is ready, play it
        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Notification sound played')
            })
            .catch((error) => {
              console.debug('Audio play prevented, using beep fallback:', error.message)
              playBeep()
            })
        }
      } else {
        // Audio not ready, use beep fallback
        console.debug('Audio not ready, using beep fallback')
        playBeep()
      }
    } catch (error) {
      console.debug('Error playing notification sound:', error)
      playBeep()
    }
  }, [enabled, playBeep])

  const enableSound = useCallback(() => {
    // This function should be called on user interaction to enable sound
    // It "unlocks" audio playback on mobile browsers
    if (audioRef.current) {
      const originalVolume = audioRef.current.volume
      audioRef.current.volume = 0
      audioRef.current.play()
        .then(() => {
          audioRef.current!.pause()
          audioRef.current!.volume = originalVolume
          audioRef.current!.currentTime = 0
          console.log('Audio unlocked for future playback')
        })
        .catch(() => {
          // Ignore - will try again on next interaction
        })
    }
  }, [])

  return { play, enableSound, isReady }
}
