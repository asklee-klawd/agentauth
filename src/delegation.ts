/**
 * Delegation Token - Proof that a human/org authorized an agent
 */
export interface DelegationToken {
  type: 'DelegationToken';
  id: string; // urn:uuid:...
  delegator: {
    id: string; // DID
    proof?: string;
  };
  delegate: {
    id: string; // Agent DID
    platform?: string;
    name?: string;
  };
  scope: {
    include: string[];
    exclude?: string[];
    audiences?: string[];
  };
  constraints: DelegationConstraints;
  revocation?: {
    endpoint: string;
    method?: 'GET' | 'POST';
    cacheTTL?: number;
  };
  proof: DelegationProof;
}

export interface DelegationConstraints {
  notBefore?: string; // ISO 8601
  notAfter?: string; // ISO 8601
  maxUses?: number;
  maxUsesPerHour?: number;
  requireMFA?: boolean;
  allowSubdelegation?: boolean;
  ipAllowlist?: string[];
  timeWindows?: TimeWindow[];
}

export interface TimeWindow {
  days?: string[]; // ['mon', 'tue', ...]
  hours?: string; // '09:00-17:00'
  tz?: string; // 'America/New_York'
}

export interface DelegationProof {
  type: string; // 'Ed25519Signature2020'
  created: string; // ISO 8601
  verificationMethod: string; // DID#key-id
  proofPurpose: string; // 'assertionMethod'
  proofValue: string; // base64url signature
}

/**
 * Create a delegation token
 * (Simplified version - full implementation would include signing)
 */
export function createDelegation(options: CreateDelegationOptions): DelegationToken {
  return {
    type: 'DelegationToken',
    id: `urn:uuid:${crypto.randomUUID()}`,
    delegator: {
      id: options.delegatorDID,
    },
    delegate: {
      id: options.delegateDID,
      platform: options.platform,
      name: options.agentName,
    },
    scope: {
      include: options.scopes,
      audiences: options.audiences,
    },
    constraints: options.constraints || {},
    revocation: options.revocation,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${options.delegatorDID}#keys-1`,
      proofPurpose: 'assertionMethod',
      proofValue: 'TODO_IMPLEMENT_SIGNING', // Would sign in production
    },
  };
}

export interface CreateDelegationOptions {
  delegatorDID: string; // Human/org DID
  delegateDID: string; // Agent DID
  scopes: string[];
  audiences?: string[];
  platform?: string;
  agentName?: string;
  constraints?: DelegationConstraints;
  revocation?: {
    endpoint: string;
    method?: 'GET' | 'POST';
    cacheTTL?: number;
  };
}

/**
 * Verify delegation token (simplified)
 */
export async function verifyDelegation(delegation: DelegationToken): Promise<boolean> {
  // Check expiry
  if (delegation.constraints.notAfter) {
    const expiry = new Date(delegation.constraints.notAfter);
    if (expiry < new Date()) {
      return false;
    }
  }

  // Check not-before
  if (delegation.constraints.notBefore) {
    const notBefore = new Date(delegation.constraints.notBefore);
    if (notBefore > new Date()) {
      return false;
    }
  }

  // TODO: Verify signature in delegation.proof
  // TODO: Check revocation status

  return true;
}
