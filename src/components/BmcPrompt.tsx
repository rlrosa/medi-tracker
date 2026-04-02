'use client'

import { useEffect, useState } from 'react'

export function BmcPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const bmcUrl = process.env.NEXT_PUBLIC_BMC_URL

  useEffect(() => {
    // Only check if we actually have a BMC URL configured
    if (!bmcUrl) return

    const checkPromptEligibility = () => {
      // Has the prompt been permanently dismissed?
      const dismissed = localStorage.getItem('bmcPromptDismissed')
      if (dismissed === 'true') return

      // When did the user first start using the app?
      const firstUsedStr = localStorage.getItem('appFirstUsed')
      const now = Date.now()

      if (!firstUsedStr) {
        // Record the current time as their first use
        localStorage.setItem('appFirstUsed', now.toString())
        return
      }

      const firstUsedTime = parseInt(firstUsedStr, 10)
      const msInTwoDays = 2 * 24 * 60 * 60 * 1000

      // If it has been more than 2 days since their first use
      if (now - firstUsedTime >= msInTwoDays) {
        // Double check they haven't dismissed it in another tab or window
        if (localStorage.getItem('bmcPromptDismissed') !== 'true') {
          setShowPrompt(true)
        }
      }
    }

    // Delay the check slightly so it doesn't interrupt immediate page load
    const timerId = setTimeout(checkPromptEligibility, 2000)

    return () => clearTimeout(timerId)
  }, [bmcUrl])

  const handleDismiss = () => {
    localStorage.setItem('bmcPromptDismissed', 'true')
    setShowPrompt(false)
  }

  const handleRemindLater = () => {
    // Reset their first use time to now, effectively postponing for 2 days
    localStorage.setItem('appFirstUsed', Date.now().toString())
    setShowPrompt(false)
  }

  const handleSupportClick = () => {
    // Also dismiss the prompt if they actually clicked the support link
    handleDismiss()
  }

  if (!showPrompt || !bmcUrl) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 10000,
      maxWidth: '320px'
    }}>
      <div className="glass-panel" style={{
        padding: '1.5rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            lineHeight: 1,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px'
          }}
          aria-label="Dismiss"
        >
          ×
        </button>

        <div style={{ paddingRight: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Enjoying MediTracker?
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            If you find this app helpful for managing medications, consider supporting its development!
          </p>
        </div>

        <a
          href={bmcUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleSupportClick}
          className="btn"
          style={{
            padding: '0.75rem',
            background: '#FFDD00',
            color: '#000000',
            textAlign: 'center',
            display: 'block',
            fontWeight: 'bold',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}
        >
          ☕ Buy Me a Coffee
        </a>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <button
            onClick={handleRemindLater}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Remind me in 2 days
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
