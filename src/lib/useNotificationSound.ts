'use client'

import { useRef, useCallback, useEffect } from 'react'

interface UseNotificationSoundOptions {
  volume?: number // 0-1
  enabled?: boolean
}

// Create a pleasant notification sound using Web Audio API
function createNotificationSound(volume: number = 0.5): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported')
      return
    }
    
    const audioContext = new AudioContextClass()
    
    // Create a pleasant two-tone notification
    const frequencies = [880, 1100] // A5 and C#6 - pleasant chime
    const duration = 0.15
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      const startTime = audioContext.currentTime + (index * 0.1)
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration + 0.1)
    })
    
    console.log('🔔 Notification sound played!')
  } catch (e) {
    console.warn('Failed to play notification sound:', e)
  }
}

export function useNotificationSound(options: UseNotificationSoundOptions = {}) {
  const { volume = 0.5, enabled = true } = options
  const lastPlayedRef = useRef<number>(0)
  const enabledRef = useRef(enabled)

  // Keep enabled ref in sync
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const play = useCallback(() => {
    if (!enabledRef.current) {
      console.log('Sound disabled, not playing')
      return
    }

    // Debounce: don't play if played within last 500ms
    const now = Date.now()
    if (now - lastPlayedRef.current < 500) {
      console.log('Sound debounced')
      return
    }
    lastPlayedRef.current = now

    createNotificationSound(volume)
  }, [volume])

  const enableSound = useCallback(() => {
    // Resume audio context if suspended (needed for some browsers)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        const ctx = new AudioContextClass()
        if (ctx.state === 'suspended') {
          ctx.resume()
        }
        ctx.close()
      }
    } catch (e) {
      // Ignore
    }
  }, [])

  return { play, enableSound, isReady: true }
}
