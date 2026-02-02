"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AATToken = void 0;
const identity_1 = require("./identity");
/**
 * AgentAuth Token (AAT) - JWT-like token for agent authentication
 */
class AATToken {
    constructor(header, payload, delegationChain, signature) {
        this.header = header;
        this.payload = payload;
        this.delegationChain = delegationChain;
        this.signature = signature;
    }
    /**
     * Create and sign a new AAT token
     */
    static async create(options) {
        const { identity, delegator, audience, scopes, delegationChain = [], expiresIn = '1h' } = options;
        const now = Math.floor(Date.now() / 1000);
        const exp = now + parseExpiry(expiresIn);
        const header = {
            alg: 'EdDSA',
            typ: 'AAT',
            kid: `${identity.did}#keys-1`,
        };
        const payload = {
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
    static async verify(token, options = {}) {
        const parts = token.split('.');
        if (parts.length !== 4) {
            throw new Error('Invalid AAT token format (expected 4 parts)');
        }
        const [headerB64, payloadB64, delegationB64, signatureB64] = parts;
        // Decode parts
        const header = JSON.parse(base64urlDecode(headerB64));
        const payload = JSON.parse(base64urlDecode(payloadB64));
        const delegationChain = JSON.parse(base64urlDecode(delegationB64));
        const signature = Buffer.from(base64urlDecode(signatureB64), 'utf8');
        // Verify signature
        const signingInput = `${headerB64}.${payloadB64}.${delegationB64}`;
        const isValid = await identity_1.AgentIdentity.verify(signature, Buffer.from(signingInput, 'utf8'), payload.iss);
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
    getDelegator() {
        return this.payload.sub;
    }
    /**
     * Get agent DID from token
     */
    getAgent() {
        return this.payload.iss;
    }
    /**
     * Get scopes from token
     */
    getScopes() {
        return this.payload.scope;
    }
    /**
     * Check if token has specific scope
     */
    hasScope(scope) {
        return this.payload.scope.includes(scope);
    }
}
exports.AATToken = AATToken;
// Helper functions
function base64urlEncode(str) {
    return Buffer.from(str, 'utf8').toString('base64url');
}
function base64urlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
}
function generateNonce() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
}
function parseExpiry(expiry) {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error('Invalid expiry format (use: 1h, 24h, 7d, etc.)');
    }
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };
    return value * multipliers[unit];
}
