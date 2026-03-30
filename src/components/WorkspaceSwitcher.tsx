'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true;

    // Fetch user's workspaces and current session info
    Promise.all([
      fetch('/api/workspaces').then(res => res.json()),
      fetch('/api/auth/me').then(res => res.json())
    ]).then(([workspacesData, meData]) => {
      if (!isMounted) return;
      if (!workspacesData.error) {
        setWorkspaces(workspacesData)
      }
      if (meData?.account?.id) {
        setCurrentWorkspaceId(meData.account.id)
      }
    }).catch(err => console.error('Error fetching workspaces', err))

    return () => { isMounted = false; }
  }, [])

  const switchWorkspace = async (accountId: string) => {
    if (accountId === currentWorkspaceId) {
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })

      if (res.ok) {
        setCurrentWorkspaceId(accountId)
        setIsOpen(false)
        // Hard refresh to reload all data in the context of the new workspace
        window.location.href = '/'
      } else {
        console.error('Failed to switch workspace')
      }
    } catch (error) {
      console.error('Error switching workspace', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't show if they only have 1 workspace
  if (workspaces.length <= 1) return null

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          padding: '0.4rem 0.8rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 500
        }}
      >
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentWorkspace ? currentWorkspace.name : 'Loading...'}
        </span>
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          background: 'var(--bg-primary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '0.5rem',
          minWidth: '200px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
            Workspaces
          </div>
          {workspaces.map(workspace => (
            <button
              key={workspace.id}
              onClick={() => switchWorkspace(workspace.id)}
              disabled={loading}
              style={{
                background: workspace.id === currentWorkspaceId ? 'var(--accent-primary)' : 'transparent',
                color: workspace.id === currentWorkspaceId ? 'white' : 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '6px',
                textAlign: 'left',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (workspace.id !== currentWorkspaceId) e.currentTarget.style.background = 'var(--bg-secondary)'
              }}
              onMouseLeave={(e) => {
                if (workspace.id !== currentWorkspaceId) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontWeight: workspace.id === currentWorkspaceId ? 600 : 400 }}>{workspace.name}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                {workspace.role}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
