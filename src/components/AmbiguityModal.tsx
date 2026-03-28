import React from 'react';
import * as Icons from 'lucide-react';

export interface AmbiguityData {
  pastEvent?: { id: string; time: string | Date };
  futureEvent?: { id: string; time: string | Date };
  data?: any;
}

export interface AmbiguityModalProps {
  ambiguityData: AmbiguityData;
  onCancel: () => void;
  onResolve: (selectedEventId: string) => void;
}

export function AmbiguityModal({ ambiguityData, onCancel, onResolve }: AmbiguityModalProps) {
  if (!ambiguityData) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-content glass-panel" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
          <Icons.HelpCircle size={24} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Ambiguous Administration</h2>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This administration time falls right between two scheduled doses. Which dose does this correspond to?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {ambiguityData.pastEvent && (
            <button 
              className="btn hover-subtle" 
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              onClick={() => onResolve(ambiguityData.pastEvent!.id)}
            >
              <strong style={{ color: 'var(--text-primary)' }}>Prior Dose</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(ambiguityData.pastEvent.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </button>
          )}

          {ambiguityData.futureEvent && (
            <button 
              className="btn hover-subtle" 
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              onClick={() => onResolve(ambiguityData.futureEvent!.id)}
            >
              <strong style={{ color: 'var(--text-primary)' }}>Next Dose</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(ambiguityData.futureEvent.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
        
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
          Selecting the "Next Dose" will automatically mark any earlier pending doses as skipped.
        </p>
      </div>
    </div>
  );
}
