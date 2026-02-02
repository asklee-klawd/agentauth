"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDelegation = createDelegation;
exports.verifyDelegation = verifyDelegation;
/**
 * Create a delegation token
 * (Simplified version - full implementation would include signing)
 */
function createDelegation(options) {
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
/**
 * Verify delegation token (simplified)
 */
async function verifyDelegation(delegation) {
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
