import { describe, it, expect } from '@jest/globals';
import { createDelegation, verifyDelegation, DelegationToken } from './delegation';

describe('Delegation', () => {
  const delegatorDID = 'did:web:example.com';
  const delegateDID = 'did:agentauth:ed25519:test123';
  const scopes = ['read', 'write'];

  describe('createDelegation()', () => {
    it('should create a delegation token', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
      });

      expect(delegation.type).toBe('DelegationToken');
      expect(delegation.id).toMatch(/^urn:uuid:.+$/);
      expect(delegation.delegator.id).toBe(delegatorDID);
      expect(delegation.delegate.id).toBe(delegateDID);
      expect(delegation.scope.include).toEqual(scopes);
    });

    it('should include optional platform', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        platform: 'OpenClaw',
      });

      expect(delegation.delegate.platform).toBe('OpenClaw');
    });

    it('should include optional agent name', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        agentName: 'MyAgent',
      });

      expect(delegation.delegate.name).toBe('MyAgent');
    });

    it('should include audiences', () => {
      const audiences = ['https://api1.com', 'https://api2.com'];
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        audiences,
      });

      expect(delegation.scope.audiences).toEqual(audiences);
    });

    it('should include constraints', () => {
      const constraints = {
        maxUses: 100,
        maxUsesPerHour: 10,
        requireMFA: true,
      };

      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints,
      });

      expect(delegation.constraints).toEqual(constraints);
    });

    it('should include revocation endpoint', () => {
      const revocation = {
        endpoint: 'https://example.com/revoke',
        method: 'POST' as const,
        cacheTTL: 3600,
      };

      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        revocation,
      });

      expect(delegation.revocation).toEqual(revocation);
    });

    it('should generate unique IDs', () => {
      const del1 = createDelegation({ delegatorDID, delegateDID, scopes });
      const del2 = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(del1.id).not.toBe(del2.id);
    });

    it('should include timestamp in proof', () => {
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(delegation.proof.created).toBeDefined();
      expect(new Date(delegation.proof.created)).toBeInstanceOf(Date);
    });

    it('should set correct proof type', () => {
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(delegation.proof.type).toBe('Ed25519Signature2020');
      expect(delegation.proof.proofPurpose).toBe('assertionMethod');
    });

    it('should handle empty scopes', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes: [],
      });

      expect(delegation.scope.include).toEqual([]);
    });

    it('should handle many scopes', () => {
      const manyScopes = Array.from({ length: 50 }, (_, i) => `scope${i}`);
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes: manyScopes,
      });

      expect(delegation.scope.include).toEqual(manyScopes);
    });
  });

  describe('verifyDelegation()', () => {
    it('should verify valid delegation', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(true);
    });

    it('should reject expired delegation', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {
          notAfter: new Date(Date.now() - 1000).toISOString(),
        },
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(false);
    });

    it('should accept delegation with future expiry', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {
          notAfter: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(true);
    });

    it('should reject delegation not yet valid', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {
          notBefore: new Date(Date.now() + 1000).toISOString(),
        },
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(false);
    });

    it('should accept delegation that is now valid', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {
          notBefore: new Date(Date.now() - 1000).toISOString(),
        },
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(true);
    });

    it('should handle delegation with both time constraints', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {
          notBefore: new Date(Date.now() - 1000).toISOString(),
          notAfter: new Date(Date.now() + 1000).toISOString(),
        },
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(true);
    });

    it('should handle delegation without time constraints', async () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {},
      });

      const isValid = await verifyDelegation(delegation);
      expect(isValid).toBe(true);
    });
  });

  describe('Constraints', () => {
    it('should handle maxUses constraint', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { maxUses: 50 },
      });

      expect(delegation.constraints.maxUses).toBe(50);
    });

    it('should handle maxUsesPerHour constraint', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { maxUsesPerHour: 10 },
      });

      expect(delegation.constraints.maxUsesPerHour).toBe(10);
    });

    it('should handle requireMFA constraint', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { requireMFA: true },
      });

      expect(delegation.constraints.requireMFA).toBe(true);
    });

    it('should handle allowSubdelegation constraint', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { allowSubdelegation: false },
      });

      expect(delegation.constraints.allowSubdelegation).toBe(false);
    });

    it('should handle IP allowlist', () => {
      const ipAllowlist = ['192.168.1.1', '10.0.0.0/8'];
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { ipAllowlist },
      });

      expect(delegation.constraints.ipAllowlist).toEqual(ipAllowlist);
    });

    it('should handle time windows', () => {
      const timeWindows = [
        { days: ['mon', 'tue', 'wed'], hours: '09:00-17:00', tz: 'America/New_York' },
        { days: ['sat', 'sun'], hours: '00:00-23:59', tz: 'UTC' },
      ];

      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: { timeWindows },
      });

      expect(delegation.constraints.timeWindows).toEqual(timeWindows);
    });

    it('should handle all constraints together', () => {
      const constraints = {
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 100,
        maxUsesPerHour: 10,
        requireMFA: true,
        allowSubdelegation: false,
        ipAllowlist: ['192.168.1.0/24'],
        timeWindows: [{ days: ['mon', 'fri'], hours: '09:00-17:00' }],
      };

      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints,
      });

      expect(delegation.constraints).toEqual(constraints);
    });
  });

  describe('Scopes', () => {
    it('should handle wildcard scopes', () => {
      const scopes = ['read:*', 'write:*'];
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(delegation.scope.include).toEqual(scopes);
    });

    it('should handle hierarchical scopes', () => {
      const scopes = ['api:read:users', 'api:write:posts', 'admin:root'];
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(delegation.scope.include).toEqual(scopes);
    });

    it('should handle special characters in scopes', () => {
      const scopes = ['read/write', 'admin@root', 'user:email+profile'];
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      expect(delegation.scope.include).toEqual(scopes);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long delegator DID', () => {
      const longDID = 'did:web:' + 'a'.repeat(1000) + '.com';
      const delegation = createDelegation({
        delegatorDID: longDID,
        delegateDID,
        scopes,
      });

      expect(delegation.delegator.id).toBe(longDID);
    });

    it('should handle special characters in agent name', () => {
      const name = 'Agent 🤖 with émojis & spëcial çhars';
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        agentName: name,
      });

      expect(delegation.delegate.name).toBe(name);
    });

    it('should handle long revocation URLs', () => {
      const revocation = {
        endpoint: 'https://example.com/revoke?' + 'x'.repeat(1000),
        method: 'GET' as const,
      };

      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        revocation,
      });

      expect(delegation.revocation?.endpoint).toBe(revocation.endpoint);
    });

    it('should handle empty constraints object', () => {
      const delegation = createDelegation({
        delegatorDID,
        delegateDID,
        scopes,
        constraints: {},
      });

      expect(delegation.constraints).toEqual({});
    });
  });

  describe('Concurrent operations', () => {
    it('should handle parallel delegation creation', () => {
      const delegations = Array.from({ length: 10 }, () =>
        createDelegation({ delegatorDID, delegateDID, scopes })
      );

      expect(delegations).toHaveLength(10);
      
      const ids = delegations.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle parallel verification', async () => {
      const delegation = createDelegation({ delegatorDID, delegateDID, scopes });

      const results = await Promise.all([
        verifyDelegation(delegation),
        verifyDelegation(delegation),
        verifyDelegation(delegation),
      ]);

      results.forEach(result => expect(result).toBe(true));
    });
  });
});
