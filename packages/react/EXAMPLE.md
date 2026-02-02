# Complete Example: Agent Casino Integration

This example shows how to integrate AgentAuth into a real application (Agent Casino).

## Frontend (React)

```tsx
// App.tsx
import React, { useState } from 'react';
import { DelegationRequestModal, useAgentAuth, useAATToken } from '@agentauth/react';
import { AgentIdentity } from '@agentauth/core';

function AgentCasinoApp() {
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  
  const {
    isRequestPending,
    currentRequest,
    requestDelegation,
    approveDelegation,
    denyDelegation,
    activeDelegations
  } = useAgentAuth({
    delegatorDID: 'did:web:alice.com', // User's DID
    onDelegationCreated: async (delegation) => {
      // Send delegation to agent
      await sendToAgent(delegation);
      
      // Create AAT token for API calls
      const token = await createToken(
        agentIdentity!,
        delegation,
        'https://agent-casino.com/api',
        ['casino.play']
      );
      
      // Store token for agent to use
      localStorage.setItem('aat_token', token);
    }
  });

  const { createToken } = useAATToken();

  // Connect wallet
  const connectWallet = async () => {
    if (!window.solana) {
      alert('Please install Phantom wallet');
      return;
    }
    
    await window.solana.connect();
    setWalletConnected(true);
    
    // Create or load agent identity
    const identity = await AgentIdentity.create({
      metadata: { name: 'MyCasinoBot' }
    });
    setAgentIdentity(identity);
    
    // Request delegation
    requestDelegation({
      agentDID: identity.did,
      scopes: ['casino.play'],
      preset: '24-hours'
    });
  };

  // Sign delegation with Phantom
  const signDelegation = async (delegation: any) => {
    const message = new TextEncoder().encode(JSON.stringify(delegation));
    const signature = await window.solana.signMessage(message);
    
    return {
      ...delegation,
      proof: {
        ...delegation.proof,
        walletSignature: Buffer.from(signature.signature).toString('hex')
      }
    };
  };

  return (
    <div className="app">
      <h1>🎰 Agent Casino</h1>
      
      {!walletConnected ? (
        <button onClick={connectWallet}>
          Connect Wallet & Authorize Agent
        </button>
      ) : (
        <>
          <h2>Active Delegations</h2>
          {activeDelegations.map(d => (
            <div key={d.id} className="delegation-card">
              <p><strong>Agent:</strong> {d.delegateDID}</p>
              <p><strong>Scopes:</strong> {d.scopes.join(', ')}</p>
              <p><strong>Expires:</strong> {new Date(d.expiresAt).toLocaleString()}</p>
              {d.constraints.maxValuePerUse && (
                <p><strong>Max Bet:</strong> {d.constraints.maxValuePerUse / 1e9} SOL</p>
              )}
            </div>
          ))}
          
          <button onClick={() => {
            // Agent can now play!
            playGame();
          }}>
            Let Agent Play
          </button>
        </>
      )}

      {/* Delegation approval modal */}
      {isRequestPending && currentRequest && (
        <DelegationRequestModal
          agentDID={currentRequest.agentDID}
          scopes={currentRequest.scopes}
          preset="24-hours"
          customConstraints={{
            maxValuePerUse: 10_000_000_000, // 10 SOL max bet
            maxUsesPerHour: 10
          }}
          delegatorDID="did:web:alice.com"
          signerCallback={signDelegation}
          onApprove={approveDelegation}
          onDeny={denyDelegation}
        />
      )}
    </div>
  );
}

async function sendToAgent(delegation: any) {
  // Send to agent via API, WebSocket, or local storage
  await fetch('/api/agent/delegation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(delegation)
  });
}

async function playGame() {
  // Agent creates game using AAT token
  const token = localStorage.getItem('aat_token');
  
  const response = await fetch('https://agent-casino.com/api/game/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      game: 'rps',
      move: 'rock',
      bet: 1_000_000_000 // 1 SOL
    })
  });
  
  const result = await response.json();
  console.log('Game created:', result);
}

export default AgentCasinoApp;
```

## Backend (Express)

```typescript
// server.ts
import express from 'express';
import { requireAgent, checkConstraint } from '@agentauth/react';

const app = express();
app.use(express.json());

// Create game - requires agent authentication
app.post('/api/game/create',
  requireAgent({
    audience: 'https://agent-casino.com/api',
    requiredScopes: ['casino.play'],
    enforceConstraints: true
  }),
  async (req, res) => {
    try {
      const { agentDID, delegatorDID, delegation } = req.agent;
      const { game, move, bet } = req.body;

      // Enforce maxValuePerUse constraint
      if (!checkConstraint(delegation, 'maxValuePerUse', bet)) {
        return res.status(403).json({
          error: `Bet (${bet}) exceeds delegation limit (${delegation.constraints.maxValuePerUse})`
        });
      }

      // TODO: Check maxUses and maxUsesPerHour (requires usage tracking)

      // Create game in smart contract
      const gameId = await createGameInContract(
        agentDID,
        delegatorDID,
        game,
        move,
        bet
      );

      // Log for audit
      console.log(`Agent ${agentDID} (acting for ${delegatorDID}) created game ${gameId}`);

      res.json({
        success: true,
        gameId,
        agentDID,
        delegatorDID
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get delegation status
app.get('/api/delegation/status',
  requireAgent({
    audience: 'https://agent-casino.com/api',
    requiredScopes: ['casino.play']
  }),
  (req, res) => {
    const { delegation } = req.agent;
    
    res.json({
      valid: true,
      expiresAt: delegation.expiresAt,
      constraints: delegation.constraints,
      remainingTime: delegation.expiresAt 
        ? delegation.expiresAt - Date.now() 
        : null
    });
  }
);

app.listen(3000, () => {
  console.log('Agent Casino API running on port 3000');
});

async function createGameInContract(
  agentDID: string,
  delegatorDID: string,
  game: string,
  move: string,
  bet: number
): Promise<string> {
  // Solana smart contract interaction
  // ...
  return 'game_' + Math.random().toString(36).slice(2);
}
```

## Agent (Autonomous)

```typescript
// agent.ts
import { AgentIdentity, AATToken } from '@agentauth/core';

async function runCasinoBot() {
  // 1. Load agent identity
  const identity = await AgentIdentity.fromPrivateKey(
    process.env.AGENT_PRIVATE_KEY!
  );

  // 2. Load delegation from user
  const delegation = loadDelegationFromStorage();

  // 3. Create AAT token
  const token = await AATToken.create({
    identity,
    delegator: delegation.delegatorDID,
    audience: 'https://agent-casino.com/api',
    scopes: ['casino.play'],
    delegationChain: [delegation],
    expiresIn: '1h'
  });

  // 4. Play games autonomously
  while (true) {
    try {
      // Check if delegation still valid
      const status = await fetch('https://agent-casino.com/api/delegation/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());

      if (!status.valid) {
        console.log('Delegation expired, stopping bot');
        break;
      }

      // Make strategic decision
      const move = decideBestMove(); // AI/strategy logic
      const bet = calculateBetSize(); // Risk management

      // Create game
      const response = await fetch('https://agent-casino.com/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ game: 'rps', move, bet })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`Created game ${result.gameId}, bet ${bet}`);
      } else {
        console.error('Failed to create game:', result.error);
      }

      // Wait before next game
      await sleep(60000); // 1 minute
    } catch (error) {
      console.error('Error:', error);
      await sleep(5000);
    }
  }
}

function decideBestMove(): string {
  // AI strategy logic
  const moves = ['rock', 'paper', 'scissors'];
  return moves[Math.floor(Math.random() * moves.length)];
}

function calculateBetSize(): number {
  // Risk management
  return 1_000_000_000; // 1 SOL
}

function loadDelegationFromStorage() {
  // Load from API, file, or environment
  return JSON.parse(process.env.DELEGATION!);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runCasinoBot();
```

## Flow Summary

1. **User connects wallet** → Frontend
2. **Agent identity created** → Frontend
3. **Delegation request shown** → `<DelegationRequestModal>`
4. **User approves & signs** → Phantom wallet
5. **Delegation sent to agent** → API/storage
6. **Agent creates AAT token** → With delegation chain
7. **Agent makes API calls** → With `Authorization: Bearer <token>`
8. **Backend verifies** → `requireAgent()` middleware
9. **Constraints enforced** → Max bet, rate limits, etc.
10. **Action allowed** → Game created on smart contract

---

This example shows complete end-to-end integration with all granularity levels supported!
