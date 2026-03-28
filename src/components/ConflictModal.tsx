import React from 'react';
import * as Icons from 'lucide-react';

export interface Violation {
  type: string;
  message: string;
  eventB?: {
    name: string;
    time: string | Date;
  };
}

export interface ConflictData {
  message: string;
  violations: Violation[];
  action?: string;
  data?: any;
}

export interface ConflictModalProps {
  conflictData: ConflictData;
  onCancel: () => void;
  onOverride: (action?: string, data?: any) => void;
}

export function ConflictModal({ conflictData, onCancel, onOverride }: ConflictModalProps) {
  if (!conflictData) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-content glass-panel" style={{ maxWidth: '400px', width: '100%', border: '1px solid #f59e0b44' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f59e0b' }}>
          <Icons.AlertTriangle size={24} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Timing Violation</h2>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {conflictData.message}
        </p>

        <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #f59e0b22' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b' }}>Conflicting Constraints:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {conflictData.violations.map((v: Violation, i: number) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{v.type}</strong>: {v.message}
                {v.eventB && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Affected by: {v.eventB.name} at {new Date(v.eventB.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: conflictData.action === 'ADMINISTER' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <button 
              className="btn" 
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}
              onClick={onCancel}
            >
              Cancel
            </button>
          <button 
            className="btn" 
            style={{ background: '#f59e0b', color: 'white' }}
            onClick={() => onOverride(conflictData.action, conflictData.data)}
          >
            {conflictData.action === 'ADMINISTER' ? 'Acknowledge Warning' : 'Override'}
          </button>
        </div>
        
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
          Overriding will log this as a "Warning" event in the history.
        </p>
      </div>
    </div>
  );
}
