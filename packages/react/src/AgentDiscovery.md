# Agent Discovery & Selection

How users find and select agents to authorize.

## Discovery Models

### 1. Personal Agent (Own Agent)

User already has their own agent running.

```tsx
import { AgentSelector } from '@agentauth/react';

function MyApp() {
  // User's personal agent (from localStorage, config, etc.)
  const myAgent = {
    did: localStorage.getItem('myAgentDID'),
    name: 'My Personal Agent',
    description: 'My trusted assistant',
    verified: true
  };

  return (
    <AgentSelector
      agents={[myAgent]}
      onSelect={(agent) => {
        // Proceed to delegation request
        requestDelegation(agent);
      }}
    />
  );
}
```

### 2. Agent Marketplace

Browse available agents by capability.

```tsx
import { AgentSelector } from '@agentauth/react';

function CasinoApp() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    // Fetch from agent marketplace
    fetch('https://agent-marketplace.com/api/agents?capability=casino')
      .then(r => r.json())
      .then(setAgents);
  }, []);

  return (
    <AgentSelector
      agents={agents}
      title="🎰 Choose Casino Bot"
      description="Select an agent to play games on your behalf"
      onSelect={(agent) => {
        // Authorize selected agent
        authorizeAgent(agent);
      }}
      allowCustomDID={true}
    />
  );
}

// Example marketplace response:
[
  {
    did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    name: "CasinoBot Pro",
    description: "Advanced casino strategy bot with 52% win rate",
    capabilities: ["casino.play", "strategy.analyze"],
    reputation: {
      rating: 4.8,
      reviewCount: 127
    },
    verified: true,
    avatar: "https://example.com/casinobot.png"
  },
  {
    did: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH",
    name: "LuckyBot",
    description: "Simple casino bot for beginners",
    capabilities: ["casino.play"],
    reputation: {
      rating: 4.2,
      reviewCount: 43
    },
    verified: false
  }
]
```

### 3. Agent-Initiated Request

Agent contacts user requesting authorization.

```tsx
function App() {
  const [pendingRequest, setPendingRequest] = useState(null);

  useEffect(() => {
    // Listen for agent authorization requests
    socket.on('agent-request', (request) => {
      setPendingRequest(request);
    });
  }, []);

  if (pendingRequest) {
    return (
      <AgentSelector
        agents={[{
          did: pendingRequest.agentDID,
          name: pendingRequest.agentName,
          description: pendingRequest.reason,
          capabilities: pendingRequest.scopes
        }]}
        title="Authorization Request"
        description={`${pendingRequest.agentName} wants to act on your behalf`}
        onSelect={(agent) => {
          // Approve request
          approveRequest(pendingRequest.requestId, agent);
        }}
        onCancel={() => {
          // Deny request
          denyRequest(pendingRequest.requestId);
          setPendingRequest(null);
        }}
        allowCustomDID={false}
      />
    );
  }

  return <MainApp />;
}
```

### 4. QR Code / Deep Link

Agent provides scannable code or link.

```tsx
// Agent generates authorization link
const authLink = `agentauth://authorize?` + new URLSearchParams({
  did: agent.did,
  name: agent.name,
  scopes: 'casino.play',
  callback: 'https://agent.com/callback'
}).toString();

// Display QR code
<QRCode value={authLink} />

// User scans → App opens → Shows AgentSelector
function handleDeepLink(url: URL) {
  const params = new URLSearchParams(url.search);
  
  const agent = {
    did: params.get('did'),
    name: params.get('name'),
    capabilities: params.get('scopes').split(',')
  };

  return (
    <AgentSelector
      agents={[agent]}
      title="Authorize via QR Code"
      onSelect={(agent) => {
        // Authorize and callback
        const callbackUrl = params.get('callback');
        authorizeAndCallback(agent, callbackUrl);
      }}
    />
  );
}
```

### 5. DID Directory / Search

Look up agents by service or capability.

```tsx
import { AgentSelector } from '@agentauth/react';
import { useState } from 'react';

function AgentDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  const searchAgents = async () => {
    const response = await fetch(
      `https://agent-directory.com/search?q=${searchQuery}`
    );
    const agents = await response.json();
    setResults(agents);
  };

  return (
    <div>
      <input 
        placeholder="Search agents (e.g., 'email management')"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button onClick={searchAgents}>Search</button>

      {results.length > 0 && (
        <AgentSelector
          agents={results}
          onSelect={(agent) => {
            // Authorize selected agent
            authorizeAgent(agent);
          }}
        />
      )}
    </div>
  );
}
```

---

## Complete Integration Example

```tsx
import React, { useState } from 'react';
import { 
  AgentSelector, 
  DelegationRequestModal, 
  useAgentAuth 
} from '@agentauth/react';

function CasinoApp() {
  const [step, setStep] = useState<'select' | 'authorize' | 'authorized'>('select');
  const [selectedAgent, setSelectedAgent] = useState(null);

  const {
    requestDelegation,
    approveDelegation,
    denyDelegation,
    isRequestPending,
    currentRequest
  } = useAgentAuth({
    delegatorDID: 'did:web:alice.com',
    onDelegationCreated: (delegation) => {
      console.log('Delegation created:', delegation);
      setStep('authorized');
    }
  });

  // Step 1: Select Agent
  if (step === 'select') {
    return (
      <AgentSelector
        agents={[
          {
            did: 'did:key:z6Mk...personalAgent',
            name: 'My Personal Agent',
            description: 'Your trusted assistant',
            verified: true
          },
          {
            did: 'did:key:z6Mk...casinoPro',
            name: 'CasinoBot Pro',
            description: 'Advanced casino bot - 52% win rate',
            capabilities: ['casino.play', 'strategy.analyze'],
            reputation: { rating: 4.8, reviewCount: 127 },
            verified: true
          }
        ]}
        onSelect={(agent) => {
          setSelectedAgent(agent);
          setStep('authorize');
          
          // Trigger delegation request
          requestDelegation({
            agentDID: agent.did,
            scopes: ['casino.play'],
            preset: '24-hours'
          });
        }}
      />
    );
  }

  // Step 2: Authorize Agent
  if (step === 'authorize' && isRequestPending && currentRequest) {
    return (
      <DelegationRequestModal
        agentDID={currentRequest.agentDID}
        scopes={currentRequest.scopes}
        preset="24-hours"
        customConstraints={{
          maxValuePerUse: 10_000_000_000, // 10 SOL
          maxUsesPerHour: 10
        }}
        delegatorDID="did:web:alice.com"
        onApprove={approveDelegation}
        onDeny={() => {
          denyDelegation();
          setStep('select');
        }}
      />
    );
  }

  // Step 3: Agent Authorized
  if (step === 'authorized') {
    return (
      <div>
        <h2>✅ Agent Authorized!</h2>
        <p>{selectedAgent.name} can now play casino games on your behalf.</p>
        <button onClick={() => setStep('select')}>
          Authorize Another Agent
        </button>
      </div>
    );
  }

  return null;
}
```

---

## Agent Registry Format

Standard format for agent metadata:

```json
{
  "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "name": "CasinoBot Pro",
  "version": "1.2.0",
  "description": "Advanced casino strategy bot with proven win rate",
  "author": {
    "name": "BotDev Team",
    "did": "did:web:botdev.com",
    "verified": true
  },
  "capabilities": [
    "casino.play",
    "strategy.analyze",
    "risk.manage"
  ],
  "scopes": [
    "casino.play",
    "wallet.sign"
  ],
  "reputation": {
    "rating": 4.8,
    "reviewCount": 127,
    "totalGames": 5432,
    "winRate": 0.52,
    "profitability": 234.5
  },
  "verified": true,
  "verifiedBy": "did:web:agent-registry.com",
  "avatar": "https://cdn.example.com/casinobot.png",
  "website": "https://casinobot.pro",
  "documentation": "https://docs.casinobot.pro",
  "sourceCode": "https://github.com/botdev/casinobot",
  "license": "MIT",
  "pricing": {
    "model": "revenue-share",
    "percentage": 5
  },
  "trust": {
    "openSource": true,
    "audited": true,
    "auditReport": "https://audits.example.com/casinobot-2026.pdf"
  },
  "created": "2026-01-15T00:00:00Z",
  "updated": "2026-02-01T00:00:00Z"
}
```

---

## Best Practices

### 1. Always Show Agent Identity
```tsx
// Good: User sees who they're authorizing
<AgentSelector agents={[{ did: '...', name: 'CasinoBot' }]} />

// Bad: Just DID string
<input placeholder="Enter agent DID" />
```

### 2. Verify Agents When Possible
```tsx
// Check if agent is in trusted registry
const isVerified = await verifyAgent(agent.did);
```

### 3. Show Reputation/Reviews
```tsx
// Help users make informed decisions
reputation: { rating: 4.8, reviewCount: 127 }
```

### 4. Support Custom DIDs
```tsx
// Advanced users may want to use unlisted agents
<AgentSelector allowCustomDID={true} />
```

### 5. Explain Capabilities Clearly
```tsx
capabilities: ['casino.play'] // Not just 'play'
description: "Plays casino games using optimal strategy"
```
