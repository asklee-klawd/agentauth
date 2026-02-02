import { describe, it, expect, beforeAll } from '@jest/globals';
import { AgentIdentity } from './identity';

describe('AgentIdentity', () => {
  let testIdentity: AgentIdentity;
  let testIdentity2: AgentIdentity;

  beforeAll(async () => {
    testIdentity = await AgentIdentity.create({ metadata: { name: 'TestAgent' } });
    testIdentity2 = await AgentIdentity.create();
  });

  describe('create()', () => {
    it('should create a new identity with DID', async () => {
      const identity = await AgentIdentity.create();
      
      expect(identity.did).toBeDefined();
      expect(identity.did).toMatch(/^did:agentauth:ed25519:.+$/);
      expect(identity.privateKey).toBeInstanceOf(Uint8Array);
      expect(identity.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('should create identity with metadata', async () => {
      const metadata = { name: 'MyAgent', platform: 'OpenClaw', capabilities: ['chat', 'code'] };
      const identity = await AgentIdentity.create({ metadata });
      
      expect(identity.metadata).toEqual(metadata);
      expect(identity.metadata?.name).toBe('MyAgent');
      expect(identity.metadata?.platform).toBe('OpenClaw');
    });

    it('should generate unique DIDs for each identity', async () => {
      const id1 = await AgentIdentity.create();
      const id2 = await AgentIdentity.create();
      
      expect(id1.did).not.toBe(id2.did);
    });

    it('should generate 32-byte private keys', async () => {
      const identity = await AgentIdentity.create();
      expect(identity.privateKey.length).toBe(32);
    });

    it('should generate 32-byte public keys', async () => {
      const identity = await AgentIdentity.create();
      expect(identity.publicKey.length).toBe(32);
    });
  });

  describe('fromPrivateKey()', () => {
    it('should load identity from hex private key', async () => {
      const privateKeyHex = testIdentity.exportPrivateKey();
      const loaded = await AgentIdentity.fromPrivateKey(privateKeyHex);
      
      expect(loaded.did).toBe(testIdentity.did);
      expect(Buffer.from(loaded.publicKey).toString('hex'))
        .toBe(Buffer.from(testIdentity.publicKey).toString('hex'));
    });

    it('should load identity with metadata', async () => {
      const privateKeyHex = testIdentity.exportPrivateKey();
      const metadata = { name: 'LoadedAgent' };
      const loaded = await AgentIdentity.fromPrivateKey(privateKeyHex, metadata);
      
      expect(loaded.metadata).toEqual(metadata);
    });

    it('should reject invalid hex keys', async () => {
      await expect(AgentIdentity.fromPrivateKey('invalid'))
        .rejects.toThrow();
    });

    it('should reject short keys', async () => {
      await expect(AgentIdentity.fromPrivateKey('abcd'))
        .rejects.toThrow();
    });
  });

  describe('DID format', () => {
    it('should generate valid DID format', () => {
      expect(testIdentity.did).toMatch(/^did:agentauth:ed25519:[A-Za-z0-9_-]+$/);
    });

    it('should encode public key in DID', () => {
      const publicKey = AgentIdentity.didToPublicKey(testIdentity.did);
      expect(Buffer.from(publicKey).toString('hex'))
        .toBe(Buffer.from(testIdentity.publicKey).toString('hex'));
    });
  });

  describe('didToPublicKey()', () => {
    it('should extract public key from DID', () => {
      const publicKey = AgentIdentity.didToPublicKey(testIdentity.did);
      expect(publicKey).toBeInstanceOf(Uint8Array);
      expect(publicKey.length).toBe(32);
    });

    it('should throw on invalid DID format', () => {
      expect(() => AgentIdentity.didToPublicKey('invalid'))
        .toThrow('Invalid AgentAuth DID format');
    });

    it('should throw on wrong method', () => {
      expect(() => AgentIdentity.didToPublicKey('did:other:ed25519:abc'))
        .toThrow('Invalid AgentAuth DID format');
    });

    it('should throw on missing parts', () => {
      expect(() => AgentIdentity.didToPublicKey('did:agentauth'))
        .toThrow('Invalid AgentAuth DID format');
    });
  });

  describe('sign() and verify()', () => {
    it('should sign and verify data', async () => {
      const message = Buffer.from('Hello AgentAuth', 'utf8');
      const signature = await testIdentity.sign(message);
      
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
      
      const isValid = await AgentIdentity.verify(signature, message, testIdentity.did);
      expect(isValid).toBe(true);
    });

    it('should reject tampered messages', async () => {
      const message = Buffer.from('Original message', 'utf8');
      const signature = await testIdentity.sign(message);
      
      const tampered = Buffer.from('Tampered message', 'utf8');
      const isValid = await AgentIdentity.verify(signature, tampered, testIdentity.did);
      
      expect(isValid).toBe(false);
    });

    it('should reject signatures from wrong identity', async () => {
      const message = Buffer.from('Test message', 'utf8');
      const signature = await testIdentity.sign(message);
      
      const isValid = await AgentIdentity.verify(signature, message, testIdentity2.did);
      expect(isValid).toBe(false);
    });

    it('should handle empty messages', async () => {
      const message = Buffer.from('', 'utf8');
      const signature = await testIdentity.sign(message);
      const isValid = await AgentIdentity.verify(signature, message, testIdentity.did);
      
      expect(isValid).toBe(true);
    });

    it('should handle large messages', async () => {
      const message = Buffer.from('a'.repeat(10000), 'utf8');
      const signature = await testIdentity.sign(message);
      const isValid = await AgentIdentity.verify(signature, message, testIdentity.did);
      
      expect(isValid).toBe(true);
    });

    it('should generate different signatures for different messages', async () => {
      const msg1 = Buffer.from('Message 1', 'utf8');
      const msg2 = Buffer.from('Message 2', 'utf8');
      
      const sig1 = await testIdentity.sign(msg1);
      const sig2 = await testIdentity.sign(msg2);
      
      expect(Buffer.from(sig1).toString('hex'))
        .not.toBe(Buffer.from(sig2).toString('hex'));
    });
  });

  describe('exportPrivateKey()', () => {
    it('should export private key as hex', () => {
      const exported = testIdentity.exportPrivateKey();
      expect(exported).toMatch(/^[0-9a-f]+$/);
      expect(exported.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should export consistent key', () => {
      const export1 = testIdentity.exportPrivateKey();
      const export2 = testIdentity.exportPrivateKey();
      expect(export1).toBe(export2);
    });
  });

  describe('toJSON() and fromJSON()', () => {
    it('should serialize to JSON', () => {
      const json = testIdentity.toJSON();
      
      expect(json.did).toBe(testIdentity.did);
      expect(json.privateKey).toBeDefined();
      expect(json.publicKey).toBeDefined();
      expect(json.metadata).toEqual(testIdentity.metadata);
      expect(json.created).toBeDefined();
    });

    it('should deserialize from JSON', async () => {
      const json = testIdentity.toJSON();
      const loaded = await AgentIdentity.fromJSON(json);
      
      expect(loaded.did).toBe(testIdentity.did);
      expect(loaded.metadata).toEqual(testIdentity.metadata);
    });

    it('should preserve metadata through serialization', async () => {
      const metadata = { name: 'Agent', custom: { foo: 'bar' } };
      const identity = await AgentIdentity.create({ metadata });
      
      const json = identity.toJSON();
      const loaded = await AgentIdentity.fromJSON(json);
      
      expect(loaded.metadata).toEqual(metadata);
    });

    it('should round-trip signing capability', async () => {
      const message = Buffer.from('Test', 'utf8');
      const signature = await testIdentity.sign(message);
      
      const json = testIdentity.toJSON();
      const loaded = await AgentIdentity.fromJSON(json);
      const newSignature = await loaded.sign(message);
      
      const isValid = await AgentIdentity.verify(newSignature, message, loaded.did);
      expect(isValid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle identity without metadata', async () => {
      const identity = await AgentIdentity.create();
      expect(identity.metadata).toBeUndefined();
    });

    it('should handle metadata with special characters', async () => {
      const metadata = { name: 'Agent!@#$%^&*()' };
      const identity = await AgentIdentity.create({ metadata });
      expect(identity.metadata?.name).toBe('Agent!@#$%^&*()');
    });

    it('should handle metadata with unicode', async () => {
      const metadata = { name: '🤖 Agent 日本語' };
      const identity = await AgentIdentity.create({ metadata });
      expect(identity.metadata?.name).toBe('🤖 Agent 日本語');
    });

    it('should handle deep metadata objects', async () => {
      const metadata = {
        name: 'Agent',
        nested: {
          deep: {
            value: 'test'
          }
        }
      };
      const identity = await AgentIdentity.create({ metadata });
      expect(identity.metadata?.nested.deep.value).toBe('test');
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple parallel creations', async () => {
      const identities = await Promise.all([
        AgentIdentity.create(),
        AgentIdentity.create(),
        AgentIdentity.create(),
        AgentIdentity.create(),
        AgentIdentity.create(),
      ]);

      const dids = identities.map(i => i.did);
      const uniqueDids = new Set(dids);
      expect(uniqueDids.size).toBe(5);
    });

    it('should handle parallel signing', async () => {
      const message = Buffer.from('Test', 'utf8');
      const signatures = await Promise.all([
        testIdentity.sign(message),
        testIdentity.sign(message),
        testIdentity.sign(message),
      ]);

      for (const sig of signatures) {
        const isValid = await AgentIdentity.verify(sig, message, testIdentity.did);
        expect(isValid).toBe(true);
      }
    });
  });
});
