"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIdentity = void 0;
const ed = __importStar(require("@noble/ed25519"));
// Use crypto for hashing (Node.js built-in)
const crypto = require('crypto');
// Type cast for ed25519
const ed25519 = ed;
/**
 * AgentAuth Identity - Decentralized identity for autonomous agents
 */
class AgentIdentity {
    constructor(privateKey, publicKey, did, metadata) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.did = did;
        this.metadata = metadata;
    }
    /**
     * Create a new agent identity with Ed25519 keypair
     */
    static async create(options = {}) {
        const privateKey = ed25519.utils?.randomPrivateKey ? ed25519.utils.randomPrivateKey() : crypto.randomBytes(32);
        const publicKey = await ed25519.getPublicKey(privateKey);
        // Generate DID from public key
        const did = AgentIdentity.publicKeyToDID(publicKey);
        return new AgentIdentity(privateKey, publicKey, did, options.metadata);
    }
    /**
     * Load identity from stored private key
     */
    static async fromPrivateKey(privateKeyHex, metadata) {
        const privateKey = Buffer.from(privateKeyHex, 'hex');
        const publicKey = await ed25519.getPublicKey(privateKey);
        const did = AgentIdentity.publicKeyToDID(publicKey);
        return new AgentIdentity(privateKey, publicKey, did, metadata);
    }
    /**
     * Convert public key to DID
     * Format: did:agentauth:ed25519:<base58-multibase-public-key>
     */
    static publicKeyToDID(publicKey) {
        // Simple base64url encoding for MVP (should be multibase in production)
        const base64url = Buffer.from(publicKey).toString('base64url');
        return `did:agentauth:ed25519:${base64url}`;
    }
    /**
     * Extract public key from DID
     */
    static didToPublicKey(did) {
        const parts = did.split(':');
        if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'agentauth' || parts[2] !== 'ed25519') {
            throw new Error('Invalid AgentAuth DID format');
        }
        return Buffer.from(parts[3], 'base64url');
    }
    /**
     * Sign data with private key
     */
    async sign(data) {
        return await ed25519.sign(data, this.privateKey);
    }
    /**
     * Verify signature
     */
    static async verify(signature, message, did) {
        const publicKey = AgentIdentity.didToPublicKey(did);
        return await ed25519.verify(signature, message, publicKey);
    }
    /**
     * Export private key (hex format)
     */
    exportPrivateKey() {
        return Buffer.from(this.privateKey).toString('hex');
    }
    /**
     * Export as JSON (for storage)
     */
    toJSON() {
        return {
            did: this.did,
            privateKey: this.exportPrivateKey(),
            publicKey: Buffer.from(this.publicKey).toString('hex'),
            metadata: this.metadata,
            created: new Date().toISOString(),
        };
    }
    /**
     * Load from JSON
     */
    static async fromJSON(json) {
        return AgentIdentity.fromPrivateKey(json.privateKey, json.metadata);
    }
}
exports.AgentIdentity = AgentIdentity;
