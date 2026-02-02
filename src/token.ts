import { AgentIdentity } from './identity';
import { DelegationToken } from './delegation';

/**
 * AgentAuth Token (AAT) - JWT-like token for agent authentication
 */
export class AATToken {
  constructor(
    public readonly header: TokenHeader,
    public readonly payload: TokenPayload,
    public readonly delegationChain: DelegationToken[],
    public readonly signature: Uint8Array
  ) {}

  /**
   * Create and sign a new AAT token
   */
  static async create(options: CreateTokenOptions): Promise<string> {
    const { identity, delegator, audience, scopes, delegationChain = [], expiresIn = '1h' } = options;
    
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseExpiry(expiresIn);
    
    const header: TokenHeader = {
      alg: 'EdDSA',
      typ: 'AAT',
      kid: `${identity.did}#keys-1`,
    };

    const payload: TokenPayload = {
      iss: identity.did,
      sub: delegator,
      aud: audience,
      iat: now,
      exp,
      nonce: generateNonce(),
      scope: scopes,
      act: {
        sub: identity.did,
      },
    };

    // Encode header and payload
    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(payload));
    const delegationB64 = base64urlEncode(JSON.stringify(delegationChain));

    // Sign: header.payload.delegation
    const signingInput = `${headerB64}.${payloadB64}.${delegationB64}`;
    const signature = await identity.sign(Buffer.from(signingInput, 'utf8'));
    const signatureB64 = Buffer.from(signature).toString('base64url');

    // Return: header.payload.delegation.signature
    return `${headerB64}.${payloadB64}.${delegationB64}.${signatureB64}`;
  }

  /**
   * Parse and verify an AAT token
   */
  static async verify(token: string, options: VerifyOptions = {}): Promise<AATToken> {
    const parts = token.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid AAT token format (expected 4 parts)');
    }

    const [headerB64, payloadB64, delegationB64, signatureB64] = parts;

    // Decode parts
    const header: TokenHeader = JSON.parse(base64urlDecode(headerB64));
    const payload: TokenPayload = JSON.parse(base64urlDecode(payloadB64));
    const delegationChain: DelegationToken[] = JSON.parse(base64urlDecode(delegationB64));
    const signature = Buffer.from(base64urlDecode(signatureB64), 'utf8');

    // Verify signature
    const signingInput = `${headerB64}.${payloadB64}.${delegationB64}`;
    const isValid = await AgentIdentity.verify(
      signature,
      Buffer.from(signingInput, 'utf8'),
      payload.iss
    );

    if (!isValid) {
      throw new Error('Invalid token signature');
    }

    // Verify expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }

    // Verify audience if specified
    if (options.audience && payload.aud !== options.audience) {
      throw new Error(`Invalid audience: expected ${options.audience}, got ${payload.aud}`);
    }

    // Verify scopes if specified
    if (options.requiredScopes) {
      const hasAll = options.requiredScopes.every(s => payload.scope.includes(s));
      if (!hasAll) {
        throw new Error('Missing required scopes');
      }
    }

    // TODO: Verify delegation chain signatures and constraints

    return new AATToken(header, payload, delegationChain, signature);
  }

  /**
   * Get delegator DID from token
   */
  getDelegator(): string {
    return this.payload.sub;
  }

  /**
   * Get agent DID from token
   */
  getAgent(): string {
    return this.payload.iss;
  }

  /**
   * Get scopes from token
   */
  getScopes(): string[] {
    return this.payload.scope;
  }

  /**
   * Check if token has specific scope
   */
  hasScope(scope: string): boolean {
    return this.payload.scope.includes(scope);
  }
}

export interface TokenHeader {
  alg: 'EdDSA';
  typ: 'AAT';
  kid: string; // DID#key-id
}

export interface TokenPayload {
  iss: string; // Agent DID
  sub: string; // Delegator DID
  aud: string; // Service URL
  iat: number; // Issued at
  exp: number; // Expires
  nonce: string; // Replay protection
  scope: string[]; // Permissions
  act: {
    sub: string; // Actor (agent DID)
  };
}

export interface CreateTokenOptions {
  identity: AgentIdentity;
  delegator: string; // DID of human/org
  audience: string; // Service URL
  scopes: string[];
  delegationChain?: DelegationToken[];
  expiresIn?: string; // e.g., '1h', '24h', '7d'
}

export interface VerifyOptions {
  audience?: string;
  requiredScopes?: string[];
}

// Helper functions
function base64urlEncode(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiry format (use: 1h, 24h, 7d, etc.)');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}
