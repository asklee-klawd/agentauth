import { AgentIdentity } from './identity';
import { DelegationToken } from './delegation';
/**
 * AgentAuth Token (AAT) - JWT-like token for agent authentication
 */
export declare class AATToken {
    readonly header: TokenHeader;
    readonly payload: TokenPayload;
    readonly delegationChain: DelegationToken[];
    readonly signature: Uint8Array;
    constructor(header: TokenHeader, payload: TokenPayload, delegationChain: DelegationToken[], signature: Uint8Array);
    /**
     * Create and sign a new AAT token
     */
    static create(options: CreateTokenOptions): Promise<string>;
    /**
     * Parse and verify an AAT token
     */
    static verify(token: string, options?: VerifyOptions): Promise<AATToken>;
    /**
     * Get delegator DID from token
     */
    getDelegator(): string;
    /**
     * Get agent DID from token
     */
    getAgent(): string;
    /**
     * Get scopes from token
     */
    getScopes(): string[];
    /**
     * Check if token has specific scope
     */
    hasScope(scope: string): boolean;
}
export interface TokenHeader {
    alg: 'EdDSA';
    typ: 'AAT';
    kid: string;
}
export interface TokenPayload {
    iss: string;
    sub: string;
    aud: string;
    iat: number;
    exp: number;
    nonce: string;
    scope: string[];
    act: {
        sub: string;
    };
}
export interface CreateTokenOptions {
    identity: AgentIdentity;
    delegator: string;
    audience: string;
    scopes: string[];
    delegationChain?: DelegationToken[];
    expiresIn?: string;
}
export interface VerifyOptions {
    audience?: string;
    requiredScopes?: string[];
}
