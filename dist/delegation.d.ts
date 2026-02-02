/**
 * Delegation Token - Proof that a human/org authorized an agent
 */
export interface DelegationToken {
    type: 'DelegationToken';
    id: string;
    delegator: {
        id: string;
        proof?: string;
    };
    delegate: {
        id: string;
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
    notBefore?: string;
    notAfter?: string;
    maxUses?: number;
    maxUsesPerHour?: number;
    requireMFA?: boolean;
    allowSubdelegation?: boolean;
    ipAllowlist?: string[];
    timeWindows?: TimeWindow[];
}
export interface TimeWindow {
    days?: string[];
    hours?: string;
    tz?: string;
}
export interface DelegationProof {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
}
/**
 * Create a delegation token
 * (Simplified version - full implementation would include signing)
 */
export declare function createDelegation(options: CreateDelegationOptions): DelegationToken;
export interface CreateDelegationOptions {
    delegatorDID: string;
    delegateDID: string;
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
export declare function verifyDelegation(delegation: DelegationToken): Promise<boolean>;
