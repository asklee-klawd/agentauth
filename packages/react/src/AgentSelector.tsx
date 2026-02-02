import React, { useState } from 'react';

export interface Agent {
  did: string;
  name?: string;
  description?: string;
  capabilities?: string[];
  reputation?: {
    rating: number;
    reviewCount: number;
  };
  verified?: boolean;
  avatar?: string;
}

export interface AgentSelectorProps {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  onCancel?: () => void;
  allowCustomDID?: boolean;
  title?: string;
  description?: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  onSelect,
  onCancel,
  allowCustomDID = true,
  title = '🤖 Select Agent',
  description = 'Choose which agent to authorize'
}) => {
  const [customDID, setCustomDID] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomSubmit = () => {
    if (customDID.startsWith('did:')) {
      onSelect({
        did: customDID,
        name: 'Custom Agent'
      });
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{title}</h2>
        {description && <p style={styles.description}>{description}</p>}

        <div style={styles.agentList}>
          {agents.map((agent, index) => (
            <div 
              key={index} 
              style={styles.agentCard}
              onClick={() => onSelect(agent)}
            >
              <div style={styles.agentHeader}>
                <div style={styles.agentAvatar}>
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} style={styles.avatarImage} />
                  ) : (
                    <span style={styles.avatarFallback}>🤖</span>
                  )}
                </div>
                <div style={styles.agentInfo}>
                  <div style={styles.agentName}>
                    {agent.name || 'Agent'}
                    {agent.verified && (
                      <span style={styles.verified}>✓</span>
                    )}
                  </div>
                  <code style={styles.agentDID}>{agent.did}</code>
                </div>
              </div>

              {agent.description && (
                <p style={styles.agentDescription}>{agent.description}</p>
              )}

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div style={styles.capabilities}>
                  {agent.capabilities.map((cap, i) => (
                    <span key={i} style={styles.capability}>{cap}</span>
                  ))}
                </div>
              )}

              {agent.reputation && (
                <div style={styles.reputation}>
                  <span style={styles.rating}>
                    {'⭐'.repeat(Math.floor(agent.reputation.rating))}
                  </span>
                  <span style={styles.reviews}>
                    ({agent.reputation.reviewCount} reviews)
                  </span>
                </div>
              )}

              <button style={styles.selectButton}>
                Select Agent
              </button>
            </div>
          ))}
        </div>

        {allowCustomDID && (
          <div style={styles.customSection}>
            {!showCustomInput ? (
              <button 
                onClick={() => setShowCustomInput(true)}
                style={styles.customToggle}
              >
                + Use Custom Agent DID
              </button>
            ) : (
              <div style={styles.customInput}>
                <input
                  type="text"
                  placeholder="did:key:z6Mk..."
                  value={customDID}
                  onChange={(e) => setCustomDID(e.target.value)}
                  style={styles.input}
                />
                <button 
                  onClick={handleCustomSubmit}
                  disabled={!customDID.startsWith('did:')}
                  style={styles.submitButton}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {onCancel && (
          <button onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
        )}
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
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
  },
  title: {
    color: '#667eea',
    marginBottom: '0.5rem',
    fontSize: '1.8rem'
  },
  description: {
    color: '#b0b0b0',
    marginBottom: '1.5rem'
  },
  agentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  agentCard: {
    backgroundColor: '#0f0f1e',
    padding: '1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent'
  },
  agentHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  agentAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  avatarFallback: {
    fontSize: '2rem'
  },
  agentInfo: {
    flex: 1,
    minWidth: 0
  },
  agentName: {
    color: '#e0e0e0',
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  verified: {
    backgroundColor: '#22c55e',
    color: 'white',
    fontSize: '0.8rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '12px'
  },
  agentDID: {
    fontSize: '0.75rem',
    color: '#9cdcfe',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  agentDescription: {
    color: '#b0b0b0',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    lineHeight: 1.5
  },
  capabilities: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  capability: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem'
  },
  reputation: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  rating: {
    color: '#fbbf24'
  },
  reviews: {
    color: '#b0b0b0'
  },
  selectButton: {
    width: '100%',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  customSection: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #333'
  },
  customToggle: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'transparent',
    border: '2px dashed #667eea',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  customInput: {
    display: 'flex',
    gap: '0.5rem'
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#0f0f1e',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '0.9rem',
    fontFamily: 'monospace'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  cancelButton: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: 'transparent',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
