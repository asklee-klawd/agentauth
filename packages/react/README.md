# @agentauth/react

Ready-to-use React components and middleware for AgentAuth.

## Installation

```bash
npm install @agentauth/react @agentauth/core
```

## Quick Start

### Frontend: Delegation Request UI

```tsx
import { DelegationRequestModal, useAgentAuth } from '@agentauth/react';

function App() {
  const { isRequestPending, currentRequest, approveDelegation, denyDelegation } = 
    useAgentAuth({
      delegatorDID: 'did:web:alice.com',
      onDelegationCreated: (delegation) => {
        console.log('Delegation created:', delegation);
        // Send to agent or store
      }
    });

  return (
    <>
      {isRequestPending && currentRequest && (
        <DelegationRequestModal
          agentDID={currentRequest.agentDID}
          scopes={currentRequest.scopes}
          preset="24-hours"
          delegatorDID="did:web:alice.com"
          onApprove={approveDelegation}
          onDeny={denyDelegation}
        />
      )}
    </>
  );
}
```

### Backend: Verify Agent Rights

```typescript
import { requireAgent } from '@agentauth/react';
import express from 'express';

const app = express();

// Require agent authentication
app.post('/api/casino/create-game',
  requireAgent({
    audience: 'https://agent-casino.com',
    requiredScopes: ['casino.play']
  }),
  (req, res) => {
    // req.agent contains verified agent info
    const { agentDID, delegatorDID, scopes, delegation } = req.agent;
    
    // Check constraints
    const bet = req.body.bet;
    if (delegation.constraints.maxValuePerUse && bet > delegation.constraints.maxValuePerUse) {
      return res.status(403).json({ error: 'Bet exceeds delegation limit' });
    }
    
    // Create game...
    res.json({ gameId: '123', agentDID, delegatorDID });
  }
);
```

---

## Delegation Granularity

### 1. Per-Action (Most Secure)

User approves **every single action**.

```tsx
<DelegationRequestModal
  preset="per-action"
  // Creates: 5-minute expiry, maxUses: 1
/>
```

**Use when:**
- High-risk actions (large transfers)
- Compliance requirements
- User wants full control

### 2. Time-Based

Agent can act freely for a **fixed duration**.

```tsx
// 1 hour
<DelegationRequestModal preset="1-hour" />

// 24 hours
<DelegationRequestModal preset="24-hours" />

// 7 days
<DelegationRequestModal preset="7-days" />

// 30 days
<DelegationRequestModal preset="30-days" />
```

**Use when:**
- Trading bots (daily session)
- Gaming agents (tournament duration)
- Temporary automation

### 3. Usage-Based

Agent has a **quota of actions**.

```tsx
<DelegationRequestModal
  preset="custom"
  customConstraints={{
    maxUses: 100, // 100 total actions
    maxUsesPerHour: 10 // Rate limit
  }}
/>
```

**Use when:**
- Budget control (100 trades per month)
- Fair use policies
- Preventing runaway agents

### 4. Permanent (Standing Delegation)

Agent can act **indefinitely** with rate limits.

```tsx
<DelegationRequestModal
  preset="permanent"
  // Creates: No expiry, maxUsesPerHour: 10
/>
```

**Use when:**
- Personal assistant (check email daily)
- Long-term automation
- Trusted agents

### 5. Value-Limited

Limit **financial impact** per action.

```tsx
<DelegationRequestModal
  preset="custom"
  customConstraints={{
    maxValuePerUse: 10_000_000_000, // 10 SOL in lamports
    maxUses: 50
  }}
/>
```

**Use when:**
- Casino betting (max bet size)
- Trading (max order size)
- Spending limits

### 6. Time-Window Restricted

Agent can only act during **specific hours**.

```tsx
<DelegationRequestModal
  preset="custom"
  customConstraints={{
    timeWindows: [
      { start: '09:00', end: '17:00' } // Only 9am-5pm
    ]
  }}
/>
```

**Use when:**
- Business hours only
- Market hours (trading)
- Compliance requirements

### 7. Hybrid (Recommended)

Combine multiple constraints for **layered security**.

```tsx
<DelegationRequestModal
  preset="7-days"
  customConstraints={{
    maxUses: 100,
    maxUsesPerHour: 10,
    maxValuePerUse: 5_000_000_000, // 5 SOL
    requireMFA: true,
    allowSubdelegation: false,
    timeWindows: [
      { start: '06:00', end: '22:00' } // Only 6am-10pm
    ]
  }}
/>
```

**Example:** "Let my agent play casino games for next 7 days, max 100 games total, max 10 games/hour, max 5 SOL per bet, only between 6am-10pm."

---

## Available Presets

| Preset | Duration | Max Uses | Max Uses/Hour | Use Case |
|--------|----------|----------|---------------|----------|
| `per-action` | 5 minutes | 1 | - | Single action approval |
| `1-hour` | 1 hour | - | 100 | Short session |
| `24-hours` | 24 hours | - | 50 | Daily automation |
| `7-days` | 7 days | 500 | 20 | Weekly project |
| `30-days` | 30 days | 2000 | 20 | Monthly subscription |
| `permanent` | ∞ | - | 10 | Standing delegation |
| `custom` | Custom | Custom | Custom | Full control |

---

## Backend Verification

### Express Middleware

```typescript
import { requireAgent, checkConstraint } from '@agentauth/react';

app.post('/api/bet',
  requireAgent({
    audience: 'https://agent-casino.com',
    requiredScopes: ['casino.play'],
    enforceConstraints: true
  }),
  async (req, res) => {
    const { agentDID, delegation } = req.agent;
    const { amount } = req.body;

    // Additional constraint checking
    if (!checkConstraint(delegation, 'maxValuePerUse', amount)) {
      return res.status(403).json({ 
        error: 'Bet amount exceeds delegation limit' 
      });
    }

    // Process bet...
  }
);
```

### Next.js API Route

```typescript
import { withAgent } from '@agentauth/react';

export default withAgent(
  async (req, res, agent) => {
    // agent is verified and contains:
    // - agentDID
    // - delegatorDID
    // - scopes
    // - delegation
    // - token

    res.json({ 
      success: true, 
      agentDID: agent.agentDID 
    });
  },
  {
    audience: 'https://my-app.com',
    requiredScopes: ['read:data']
  }
);
```

### Manual Verification

```typescript
import { verifyAgent } from '@agentauth/react';

async function handleRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  
  try {
    const agent = await verifyAgent(token, {
      audience: 'https://my-app.com',
      requiredScopes: ['action:perform']
    });

    // Agent verified!
    return { success: true, agent };
  } catch (error) {
    return { error: 'Unauthorized' };
  }
}
```

---

## Custom Signer (Wallet Integration)

Connect with Phantom, MetaMask, or any wallet:

```tsx
import { DelegationRequestModal } from '@agentauth/react';

function App() {
  const signDelegation = async (delegation) => {
    // Sign with Phantom
    const signature = await window.solana.signMessage(
      new TextEncoder().encode(JSON.stringify(delegation))
    );

    // Attach signature to delegation
    return {
      ...delegation,
      proof: {
        ...delegation.proof,
        walletSignature: Buffer.from(signature.signature).toString('hex')
      }
    };
  };

  return (
    <DelegationRequestModal
      agentDID="did:key:z6Mk..."
      scopes={['casino.play']}
      delegatorDID="did:web:alice.com"
      signerCallback={signDelegation}
      onApprove={(delegation) => {
        // Delegation now includes wallet signature
        sendToAgent(delegation);
      }}
      onDeny={() => console.log('Denied')}
    />
  );
}
```

---

## Hooks

### useAgentAuth

Manage delegation requests and approvals.

```tsx
const {
  isRequestPending,      // Is there a pending request?
  currentRequest,        // Current request details
  requestDelegation,     // Trigger delegation request
  approveDelegation,     // User approved
  denyDelegation,        // User denied
  activeDelegations,     // All active delegations
  revokeDelegation       // Revoke by ID
} = useAgentAuth({
  delegatorDID: 'did:web:alice.com',
  onDelegationCreated: (delegation) => {
    // Send to agent
  }
});
```

### useAATToken

Manage AAT tokens for multiple services.

```tsx
const {
  createToken,  // Create new AAT token
  getToken,     // Get token for audience
  clearToken,   // Clear token
  tokens        // Map of all tokens
} = useAATToken();

// Create token
const token = await createToken(
  agentIdentity,
  delegation,
  'https://api.example.com',
  ['read', 'write']
);

// Use token
const existingToken = getToken('https://api.example.com');
```

---

## Best Practices

### 1. Start Restrictive
```tsx
// Start with per-action, upgrade if needed
<DelegationRequestModal preset="per-action" />
```

### 2. Use Hybrid Constraints
```tsx
// Multiple layers of protection
<DelegationRequestModal
  preset="7-days"
  customConstraints={{
    maxUses: 100,
    maxUsesPerHour: 10,
    maxValuePerUse: 1000000
  }}
/>
```

### 3. Enforce on Backend
```typescript
// Always verify constraints server-side
requireAgent({
  audience: 'https://my-app.com',
  requiredScopes: ['action'],
  enforceConstraints: true  // ← Important!
})
```

### 4. Log All Actions
```typescript
app.use((req, res, next) => {
  if (req.agent) {
    console.log(`Agent ${req.agent.agentDID} acting for ${req.agent.delegatorDID}`);
  }
  next();
});
```

### 5. Provide Revocation
```tsx
// Show users their active delegations
activeDelegations.map(d => (
  <div key={d.id}>
    <span>{d.delegateDID}</span>
    <button onClick={() => revokeDelegation(d.id)}>Revoke</button>
  </div>
))
```

---

## License

MIT
