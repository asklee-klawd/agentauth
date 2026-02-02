/**
 * AgentAuth Basic Example
 * Demonstrates creating an agent identity and authentication token
 */

const { AgentIdentity, AATToken, createDelegation } = require('../dist');

async function main() {
  console.log('🤖 AgentAuth Example\n');

  // 1. Create agent identity
  console.log('1. Creating agent identity...');
  const identity = await AgentIdentity.create({
    metadata: {
      name: 'Email Assistant',
      platform: 'openclaw',
      capabilities: ['email', 'calendar']
    }
  });
  console.log('   Agent DID:', identity.did);
  console.log('   ✅ Identity created\n');

  // 2. Create delegation
  console.log('2. Creating delegation token...');
  const delegation = createDelegation({
    delegatorDID: 'did:web:alice.example.com',
    delegateDID: identity.did,
    scopes: ['mail.read', 'mail.send', 'calendar.read'],
    audiences: ['https://api.gmail.com'],
    constraints: {
      notAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsesPerHour: 100
    }
  });
  console.log('   Delegator:', delegation.delegator.id);
  console.log('   Delegate:', delegation.delegate.id);
  console.log('   Scopes:', delegation.scope.include);
  console.log('   ✅ Delegation created\n');

  // 3. Create AAT token
  console.log('3. Creating AAT token...');
  const token = await AATToken.create({
    identity: identity,
    delegator: 'did:web:alice.example.com',
    audience: 'https://api.gmail.com',
    scopes: ['mail.read'],
    delegationChain: [delegation],
    expiresIn: '1h'
  });
  console.log('   Token (truncated):', token.substring(0, 100) + '...');
  console.log('   ✅ Token created\n');

  // 4. Verify token
  console.log('4. Verifying token...');
  try {
    const verified = await AATToken.verify(token, {
      audience: 'https://api.gmail.com',
      requiredScopes: ['mail.read']
    });
    console.log('   Agent DID:', verified.getAgent());
    console.log('   Delegator DID:', verified.getDelegator());
    console.log('   Scopes:', verified.getScopes());
    console.log('   ✅ Token verified successfully\n');
  } catch (error) {
    console.error('   ❌ Verification failed:', error.message);
  }

  // 5. Export identity for storage
  console.log('5. Exporting identity...');
  const exported = identity.toJSON();
  console.log('   Private key (first 16 chars):', exported.privateKey.substring(0, 16) + '...');
  console.log('   Public key (first 16 chars):', exported.publicKey.substring(0, 16) + '...');
  console.log('   Metadata:', exported.metadata);
  console.log('   ✅ Identity exported\n');

  console.log('🎉 Example completed successfully!');
}

main().catch(console.error);
