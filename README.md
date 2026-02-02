# AgentAuth Protocol v0.1

**Authentication and identity for autonomous AI agents.**

> Decentralized identity (DIDs) + cryptographic delegation + granular permissions + built-in audit

---

## The Problem

Current authentication systems (OAuth, API keys) were designed for humans or apps, not autonomous agents. Agents need:

- **Self-sovereign identity** - No central authority
- **Provable delegation** - Cryptographic proof that a human authorized this agent
- **Granular permissions** - Scope limits, time windows, rate limits
- **Instant revocation** - Kill compromised agents immediately
- **Audit trails** - See what agents did with permissions

AgentAuth solves this.

---

## Quick Start

### Installation

```bash
npm install @agentauth/core
```

### Create Agent Identity

```javascript
import { AgentIdentity } from '@agentauth/core';

// Generate new agent identity
const identity = await AgentIdentity.create({
  metadata: {
    name: 'My Email Assistant',
    platform: 'openclaw',
    capabilities: ['email', 'calendar']
  }
});

console.log('Agent DID:', identity.did);
// did:agentauth:ed25519:z6MkhaXgBZDvotDkL5257...

// Save securely
const json = identity.toJSON();
// Store json.privateKey encrypted
```

### Create Authentication Token

```javascript
import { AATToken, createDelegation } from '@agentauth/core';

// Create delegation (human authorizes agent)
const delegation = createDelegation({
  delegatorDID: 'did:web:alice.example.com',
  delegateDID: identity.did,
  scopes: ['mail.read', 'mail.send'],
  audiences: ['https://api.gmail.com'],
  constraints: {
    notAfter: '2026-03-01T00:00:00Z',
    maxUsesPerHour: 100
  }
});

// Agent creates token
const token = await AATToken.create({
  identity: identity,
  delegator: 'did:web:alice.example.com',
  audience: 'https://api.gmail.com',
  scopes: ['mail.read'],
  delegationChain: [delegation],
  expiresIn: '1h'
});

// Use token in API request
const response = await fetch('https://api.gmail.com/v1/messages', {
  headers: {
    'Authorization': `AAT ${token}`
  }
});
```

### Verify Token (Service Provider)

```javascript
// Service receives token and verifies
try {
  const verified = await AATToken.verify(token, {
    audience: 'https://api.gmail.com',
    requiredScopes: ['mail.read']
  });

  console.log('Agent:', verified.getAgent());
  console.log('Delegator:', verified.getDelegator());
  console.log('Scopes:', verified.getScopes());

  // Access granted
} catch (error) {
  // Access denied
  console.error('Token verification failed:', error.message);
}
```

---

## Token Format

AgentAuth Token (AAT) structure:

```
<header>.<payload>.<delegation-chain>.<signature>
```

**Example header:**
```json
{
  "alg": "EdDSA",
  "typ": "AAT",
  "kid": "did:agentauth:ed25519:z6Mk...#keys-1"
}
```

**Example payload:**
```json
{
  "iss": "did:agentauth:ed25519:z6Mk...",
  "sub": "did:web:alice.example.com",
  "aud": "https://api.gmail.com",
  "iat": 1706900000,
  "exp": 1706903600,
  "nonce": "abc123xyz",
  "scope": ["mail.read", "mail.send"],
  "act": {
    "sub": "did:agentauth:ed25519:z6Mk..."
  }
}
```

**Delegation chain:** Array of delegation tokens proving authorization.

**Signature:** Ed25519 signature over header.payload.delegation-chain.

---

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Human     │         │   Agent     │         │   Service   │
│   (Alice)   │         │   (Klawd)   │         │   (Gmail)   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. Delegate           │                       │
       │    permissions        │                       │
       │──────────────────────►│                       │
       │                       │                       │
       │                       │ 2. Present AAT        │
       │                       │──────────────────────►│
       │                       │                       │
       │                       │                       │ 3. Verify:
       │                       │                       │    - Signature
       │                       │                       │    - Delegation
       │                       │                       │    - Scopes
       │                       │                       │    - Expiry
       │                       │                       │
       │                       │ 4. Access granted     │
       │                       │◄──────────────────────│
       │                       │                       │
```

---

## Key Features

### ✅ Decentralized Identity (DIDs)

Agents have self-sovereign identities using the `did:agentauth` method:

```
did:agentauth:ed25519:z6MkhaXgBZDvotDkL5257...
```

No central authority needed. Public key is in the DID itself.

### ✅ Cryptographic Delegation

Humans provably authorize agents via signed delegation tokens:

```javascript
{
  "delegator": "did:web:alice.example.com",
  "delegate": "did:agentauth:ed25519:z6Mk...",
  "scope": ["mail.read", "mail.send"],
  "constraints": {
    "notAfter": "2026-03-01",
    "maxUsesPerHour": 100,
    "timeWindows": [{"days": ["mon-fri"], "hours": "09:00-17:00"}]
  },
  "proof": "<cryptographic-signature>"
}
```

### ✅ Granular Permissions

Fine-grained scopes with constraints:

- Time limits (`notBefore`, `notAfter`)
- Rate limits (`maxUses`, `maxUsesPerHour`)
- Time windows (weekdays only, business hours)
- IP allowlists
- Audience restrictions

### ✅ Instant Revocation

Multiple revocation methods:

- Pull (check endpoint)
- Push (WebSocket stream)
- Emergency broadcast (all tokens invalidated immediately)

### ✅ Audit Trail

Every token use can be logged:

```javascript
{
  "timestamp": "2026-02-02T19:00:00Z",
  "agent": "did:agentauth:ed25519:z6Mk...",
  "delegator": "did:web:alice.example.com",
  "service": "https://api.gmail.com",
  "resource": "/v1/messages",
  "scopes": ["mail.read"],
  "result": "access_granted"
}
```

---

## Comparison to OAuth 2.0

| Feature | OAuth 2.0 | AgentAuth |
|---------|-----------|-----------|
| Primary use | App authorization | Agent authentication |
| Identity | Client credentials | DIDs (decentralized) |
| Delegation | Basic (scopes) | Advanced (chains, constraints) |
| Offline verification | No | Yes (self-describing DIDs) |
| Revocation | Token revocation | Multi-level + emergency |
| Audit | Not built-in | First-class |
| Decentralized | No (requires IdP) | Yes |

AgentAuth builds on proven standards (DIDs, Ed25519, JWT) while solving agent-specific challenges.

---

## Roadmap

### v0.1 (Current) - MVP
- [x] DID method specification
- [x] Token creation and verification
- [x] Delegation tokens
- [x] TypeScript SDK

### v0.2 - Production Ready
- [ ] Revocation checking
- [ ] Audit logging
- [ ] Express middleware
- [ ] OAuth bridge

### v0.3 - Ecosystem
- [ ] Python/Go SDKs
- [ ] Delegation UI (browser extension)
- [ ] Registry implementation
- [ ] Hardware key support

---

## Security

**Threat model:**
- Stolen agent keys → Short-lived tokens, revocation
- Replay attacks → Nonce + timestamp + audience binding
- Scope escalation → Cryptographic delegation chain verification
- Fake delegation → Signature verification

**Best practices:**
- Store private keys encrypted
- Rotate keys regularly
- Use short token expiry (1 hour default)
- Monitor audit logs
- Implement revocation checking

---

## Contributing

AgentAuth is open source (MIT license).

**Issues:** https://github.com/asklee-klawd/agentauth/issues
**PRs welcome:** Add tests, fix bugs, improve docs

---

## License

MIT - Use anywhere, no restrictions.

---

## Credits

Built by [@askleeklawd](https://twitter.com/askleeklawd) as part of building agent infrastructure for [Asklee](https://asklee.ai).

Inspired by W3C DIDs, OAuth 2.0, and the need for better agent identity.

---

**Ship quality. Build wealth. Repeat.** 🦾
