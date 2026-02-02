import { describe, it, expect, beforeAll } from '@jest/globals';
import { AATToken } from './token';
import { AgentIdentity } from './identity';
import { createDelegation } from './delegation';

describe('AATToken', () => {
  let agentIdentity: AgentIdentity;
  let delegatorDID: string;
  let audience: string;
  let scopes: string[];

  beforeAll(async () => {
    agentIdentity = await AgentIdentity.create({ metadata: { name: 'TestAgent' } });
    delegatorDID = 'did:web:example.com';
    audience = 'https://api.example.com';
    scopes = ['read', 'write'];
  });

  describe('create()', () => {
    it('should create a valid AAT token', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(4);
    });

    it('should encode header correctly', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));

      expect(header.alg).toBe('EdDSA');
      expect(header.typ).toBe('AAT');
      expect(header.kid).toBe(`${agentIdentity.did}#keys-1`);
    });

    it('should encode payload correctly', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.iss).toBe(agentIdentity.did);
      expect(payload.sub).toBe(delegatorDID);
      expect(payload.aud).toBe(audience);
      expect(payload.scope).toEqual(scopes);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.nonce).toBeDefined();
    });

    it('should handle 1 hour expiry', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '1h',
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.exp - payload.iat).toBe(3600);
    });

    it('should handle 24 hour expiry', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '24h',
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.exp - payload.iat).toBe(86400);
    });

    it('should handle 7 day expiry', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '7d',
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.exp - payload.iat).toBe(604800);
    });

    it('should include delegation chain', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID: agentIdentity.did,
        scopes,
      });

      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        delegationChain: [delegation],
      });

      const [, , delegationB64] = token.split('.');
      const chain = JSON.parse(Buffer.from(delegationB64, 'base64url').toString('utf8'));

      expect(chain).toHaveLength(1);
      expect(chain[0].type).toBe('DelegationToken');
    });

    it('should generate unique nonces', async () => {
      const token1 = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const token2 = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const [, payload1B64] = token1.split('.');
      const [, payload2B64] = token2.split('.');
      
      const payload1 = JSON.parse(Buffer.from(payload1B64, 'base64url').toString('utf8'));
      const payload2 = JSON.parse(Buffer.from(payload2B64, 'base64url').toString('utf8'));

      expect(payload1.nonce).not.toBe(payload2.nonce);
    });

    it('should handle empty scopes', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: [],
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.scope).toEqual([]);
    });

    it('should handle many scopes', async () => {
      const manyScopes = Array.from({ length: 50 }, (_, i) => `scope${i}`);
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: manyScopes,
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.scope).toEqual(manyScopes);
    });
  });

  describe('verify()', () => {
    it('should verify valid token', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '1h',
      });

      const verified = await AATToken.verify(token);

      expect(verified).toBeInstanceOf(AATToken);
      expect(verified.getAgent()).toBe(agentIdentity.did);
      expect(verified.getDelegator()).toBe(delegatorDID);
    });

    it('should reject token with invalid signature', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const parts = token.split('.');
      // Create a 64-byte invalid signature (Ed25519 signature size)
      const invalidSig = Buffer.alloc(64, 0xff);
      parts[3] = invalidSig.toString('base64url');
      const tamperedToken = parts.join('.');

      await expect(AATToken.verify(tamperedToken))
        .rejects.toThrow('Invalid token signature');
    });

    it('should reject expired token', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '1s',
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await expect(AATToken.verify(token))
        .rejects.toThrow('Token expired');
    });

    it('should verify audience', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      await expect(AATToken.verify(token, { audience: 'https://wrong.com' }))
        .rejects.toThrow('Invalid audience');
    });

    it('should verify required scopes', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: ['read'],
      });

      await expect(AATToken.verify(token, { requiredScopes: ['write'] }))
        .rejects.toThrow('Missing required scopes');
    });

    it('should accept token with all required scopes', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: ['read', 'write', 'delete'],
      });

      const verified = await AATToken.verify(token, { requiredScopes: ['read', 'write'] });
      expect(verified).toBeInstanceOf(AATToken);
    });

    it('should reject malformed token', async () => {
      await expect(AATToken.verify('invalid'))
        .rejects.toThrow('Invalid AAT token format');
    });

    it('should reject token with missing parts', async () => {
      await expect(AATToken.verify('a.b.c'))
        .rejects.toThrow('Invalid AAT token format');
    });

    it('should reject token with tampered payload', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      payload.scope = ['admin'];
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = parts.join('.');

      await expect(AATToken.verify(tamperedToken))
        .rejects.toThrow();
    });
  });

  describe('Token methods', () => {
    let verified: AATToken;

    beforeAll(async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });
      verified = await AATToken.verify(token);
    });

    it('getAgent() returns agent DID', () => {
      expect(verified.getAgent()).toBe(agentIdentity.did);
    });

    it('getDelegator() returns delegator DID', () => {
      expect(verified.getDelegator()).toBe(delegatorDID);
    });

    it('getScopes() returns scopes array', () => {
      expect(verified.getScopes()).toEqual(scopes);
    });

    it('hasScope() checks scope existence', () => {
      expect(verified.hasScope('read')).toBe(true);
      expect(verified.hasScope('write')).toBe(true);
      expect(verified.hasScope('delete')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in audience', async () => {
      const specialAudience = 'https://example.com/api?key=value&foo=bar';
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience: specialAudience,
        scopes,
      });

      const verified = await AATToken.verify(token);
      expect(verified.payload.aud).toBe(specialAudience);
    });

    it('should handle special characters in scopes', async () => {
      const specialScopes = ['read:all', 'write:*', 'admin/root'];
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: specialScopes,
      });

      const verified = await AATToken.verify(token);
      expect(verified.getScopes()).toEqual(specialScopes);
    });

    it('should handle very long tokens', async () => {
      const longScopes = Array.from({ length: 100 }, (_, i) => `scope_${i}_${'x'.repeat(50)}`);
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes: longScopes,
      });

      const verified = await AATToken.verify(token);
      expect(verified.getScopes()).toEqual(longScopes);
    });

    it('should handle minimum expiry (1 second)', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '1s',
      });

      const verified = await AATToken.verify(token);
      expect(verified).toBeInstanceOf(AATToken);
    });

    it('should handle maximum expiry (365 days)', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: '365d',
      });

      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      expect(payload.exp - payload.iat).toBe(31536000);
    });

    it('should reject invalid expiry format', async () => {
      await expect(AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
        expiresIn: 'invalid',
      })).rejects.toThrow('Invalid expiry format');
    });
  });

  describe('Concurrent operations', () => {
    it('should handle parallel token creation', async () => {
      const tokens = await Promise.all([
        AATToken.create({ identity: agentIdentity, delegator: delegatorDID, audience, scopes }),
        AATToken.create({ identity: agentIdentity, delegator: delegatorDID, audience, scopes }),
        AATToken.create({ identity: agentIdentity, delegator: delegatorDID, audience, scopes }),
      ]);

      expect(tokens).toHaveLength(3);
      for (const token of tokens) {
        const verified = await AATToken.verify(token);
        expect(verified).toBeInstanceOf(AATToken);
      }
    });

    it('should handle parallel token verification', async () => {
      const token = await AATToken.create({
        identity: agentIdentity,
        delegator: delegatorDID,
        audience,
        scopes,
      });

      const verified = await Promise.all([
        AATToken.verify(token),
        AATToken.verify(token),
        AATToken.verify(token),
      ]);

      expect(verified).toHaveLength(3);
      verified.forEach(v => expect(v).toBeInstanceOf(AATToken));
    });
  });
});
