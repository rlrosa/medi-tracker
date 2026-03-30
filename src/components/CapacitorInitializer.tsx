'use client'
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'

export function CapacitorInitializer() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.hide()
        } catch (e) {
          console.error('Failed to hide status bar:', e)
        }
      }
    }
    initCapacitor()
  }, [])

  return null
}
