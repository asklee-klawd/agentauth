import React, { useState } from 'react';
import { createDelegation, DelegationToken } from '@agentauth/core';

export interface DelegationRequestProps {
  agentDID: string;
  scopes: string[];
  onApprove: (delegation: DelegationToken) => void;
  onDeny: () => void;
  preset?: DelegationPreset;
  customConstraints?: DelegationConstraints;
  delegatorDID: string;
  signerCallback?: (delegation: DelegationToken) => Promise<DelegationToken>;
}

export type DelegationPreset = 'per-action' | '1-hour' | '24-hours' | '7-days' | '30-days' | 'permanent' | 'custom';

export interface DelegationConstraints {
  maxUses?: number;
  maxUsesPerHour?: number;
  maxValuePerUse?: number;
  requireMFA?: boolean;
  allowSubdelegation?: boolean;
  ipAllowlist?: string[];
  timeWindows?: Array<{ start: string; end: string }>;
}

const PRESET_CONFIG: Record<DelegationPreset, { duration?: number; constraints: DelegationConstraints; label: string }> = {
  'per-action': {
    duration: 5 * 60 * 1000, // 5 minutes
    constraints: { maxUses: 1 },
    label: 'Single Action (approve each time)'
  },
  '1-hour': {
    duration: 60 * 60 * 1000,
    constraints: { maxUsesPerHour: 100 },
    label: '1 Hour'
  },
  '24-hours': {
    duration: 24 * 60 * 60 * 1000,
    constraints: { maxUsesPerHour: 50 },
    label: '24 Hours'
  },
  '7-days': {
    duration: 7 * 24 * 60 * 60 * 1000,
    constraints: { maxUses: 500, maxUsesPerHour: 20 },
    label: '7 Days'
  },
  '30-days': {
    duration: 30 * 24 * 60 * 60 * 1000,
    constraints: { maxUses: 2000, maxUsesPerHour: 20 },
    label: '30 Days'
  },
  'permanent': {
    constraints: { maxUsesPerHour: 10 },
    label: 'Permanent (with rate limit)'
  },
  'custom': {
    constraints: {},
    label: 'Custom'
  }
};

export const DelegationRequestModal: React.FC<DelegationRequestProps> = ({
  agentDID,
  scopes,
  onApprove,
  onDeny,
  preset = '24-hours',
  customConstraints,
  delegatorDID,
  signerCallback
}) => {
  const [selectedPreset, setSelectedPreset] = useState<DelegationPreset>(preset);
  const [constraints, setConstraints] = useState<DelegationConstraints>(
    customConstraints || PRESET_CONFIG[preset].constraints
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    
    try {
      const config = PRESET_CONFIG[selectedPreset];
      const expiresAt = config.duration ? Date.now() + config.duration : undefined;

      let delegation = createDelegation({
        delegatorDID,
        delegateDID: agentDID,
        scopes,
        expiresAt,
        constraints: { ...config.constraints, ...constraints }
      });

      // If custom signer provided (e.g., wallet signature)
      if (signerCallback) {
        delegation = await signerCallback(delegation);
      }

      onApprove(delegation);
    } catch (error) {
      console.error('Failed to create delegation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>🤖 Agent Authorization Request</h2>
        
        <div style={styles.section}>
          <label style={styles.label}>Agent Identity</label>
          <code style={styles.code}>{agentDID}</code>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Requested Permissions</label>
          <div style={styles.scopesList}>
            {scopes.map((scope, i) => (
              <span key={i} style={styles.scope}>{scope}</span>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Duration</label>
          <select 
            value={selectedPreset} 
            onChange={(e) => {
              const newPreset = e.target.value as DelegationPreset;
              setSelectedPreset(newPreset);
              setConstraints(PRESET_CONFIG[newPreset].constraints);
            }}
            style={styles.select}
          >
            {Object.entries(PRESET_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Constraints</label>
          <div style={styles.constraintsList}>
            {constraints.maxUses && (
              <div style={styles.constraint}>
                <span>Max Total Uses:</span>
                <strong>{constraints.maxUses}</strong>
              </div>
            )}
            {constraints.maxUsesPerHour && (
              <div style={styles.constraint}>
                <span>Max Uses/Hour:</span>
                <strong>{constraints.maxUsesPerHour}</strong>
              </div>
            )}
            {constraints.maxValuePerUse && (
              <div style={styles.constraint}>
                <span>Max Value/Use:</span>
                <strong>{constraints.maxValuePerUse}</strong>
              </div>
            )}
            {constraints.requireMFA && (
              <div style={styles.constraint}>
                <span>Requires MFA:</span>
                <strong>Yes</strong>
              </div>
            )}
          </div>
        </div>

        <div style={styles.warning}>
          ⚠️ This grants the agent permission to act on your behalf within the specified constraints.
        </div>

        <div style={styles.actions}>
          <button 
            onClick={onDeny} 
            style={styles.denyButton}
            disabled={isProcessing}
          >
            Deny
          </button>
          <button 
            onClick={handleApprove} 
            style={styles.approveButton}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Approve & Sign'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
  },
  title: {
    color: '#667eea',
    marginBottom: '1.5rem',
    fontSize: '1.5rem'
  },
  section: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    color: '#b0b0b0',
    fontSize: '0.9rem',
    marginBottom: '0.5rem'
  },
  code: {
    display: 'block',
    backgroundColor: '#0f0f1e',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#9cdcfe',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  scopesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  scope: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#0f0f1e',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '1rem'
  },
  constraintsList: {
    backgroundColor: '#0f0f1e',
    padding: '1rem',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  constraint: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#e0e0e0',
    fontSize: '0.9rem'
  },
  warning: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    color: '#fde047',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  denyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  approveButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};
