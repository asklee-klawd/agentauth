import * as ed from '@noble/ed25519';

// Use crypto for hashing (Node.js built-in)
const crypto = require('crypto');

// Type cast for ed25519
const ed25519 = ed as any;

/**
 * AgentAuth Identity - Decentralized identity for autonomous agents
 */
export class AgentIdentity {
  private constructor(
    public readonly privateKey: Uint8Array,
    public readonly publicKey: Uint8Array,
    public readonly did: string,
    public readonly metadata?: AgentMetadata
  ) {}

  /**
   * Create a new agent identity with Ed25519 keypair
   */
  static async create(options: CreateIdentityOptions = {}): Promise<AgentIdentity> {
    const privateKey = ed25519.utils?.randomPrivateKey ? ed25519.utils.randomPrivateKey() : crypto.randomBytes(32);
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    // Generate DID from public key
    const did = AgentIdentity.publicKeyToDID(publicKey);
    
    return new AgentIdentity(privateKey, publicKey, did, options.metadata);
  }

  /**
   * Load identity from stored private key
   */
  static async fromPrivateKey(privateKeyHex: string, metadata?: AgentMetadata): Promise<AgentIdentity> {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const publicKey = await ed25519.getPublicKey(privateKey);
    const did = AgentIdentity.publicKeyToDID(publicKey);
    
    return new AgentIdentity(privateKey, publicKey, did, metadata);
  }

  /**
   * Convert public key to DID
   * Format: did:agentauth:ed25519:<base58-multibase-public-key>
   */
  private static publicKeyToDID(publicKey: Uint8Array): string {
    // Simple base64url encoding for MVP (should be multibase in production)
    const base64url = Buffer.from(publicKey).toString('base64url');
    return `did:agentauth:ed25519:${base64url}`;
  }

  /**
   * Extract public key from DID
   */
  static didToPublicKey(did: string): Uint8Array {
    const parts = did.split(':');
    if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'agentauth' || parts[2] !== 'ed25519') {
      throw new Error('Invalid AgentAuth DID format');
    }
    
    return Buffer.from(parts[3], 'base64url');
  }

  /**
   * Sign data with private key
   */
  async sign(data: Uint8Array): Promise<Uint8Array> {
    return await ed25519.sign(data, this.privateKey);
  }

  /**
   * Verify signature
   */
  static async verify(signature: Uint8Array, message: Uint8Array, did: string): Promise<boolean> {
    const publicKey = AgentIdentity.didToPublicKey(did);
    return await ed25519.verify(signature, message, publicKey);
  }

  /**
   * Export private key (hex format)
   */
  exportPrivateKey(): string {
    return Buffer.from(this.privateKey).toString('hex');
  }

  /**
   * Export as JSON (for storage)
   */
  toJSON(): IdentityJSON {
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
  static async fromJSON(json: IdentityJSON): Promise<AgentIdentity> {
    return AgentIdentity.fromPrivateKey(json.privateKey, json.metadata);
  }
}

export interface CreateIdentityOptions {
  metadata?: AgentMetadata;
}

export interface AgentMetadata {
  name?: string;
  platform?: string;
  capabilities?: string[];
  [key: string]: any;
}

export interface IdentityJSON {
  did: string;
  privateKey: string;
  publicKey: string;
  metadata?: AgentMetadata;
  created: string;
}
