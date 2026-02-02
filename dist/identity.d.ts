/**
 * AgentAuth Identity - Decentralized identity for autonomous agents
 */
export declare class AgentIdentity {
    readonly privateKey: Uint8Array;
    readonly publicKey: Uint8Array;
    readonly did: string;
    readonly metadata?: AgentMetadata | undefined;
    private constructor();
    /**
     * Create a new agent identity with Ed25519 keypair
     */
    static create(options?: CreateIdentityOptions): Promise<AgentIdentity>;
    /**
     * Load identity from stored private key
     */
    static fromPrivateKey(privateKeyHex: string, metadata?: AgentMetadata): Promise<AgentIdentity>;
    /**
     * Convert public key to DID
     * Format: did:agentauth:ed25519:<base58-multibase-public-key>
     */
    private static publicKeyToDID;
    /**
     * Extract public key from DID
     */
    static didToPublicKey(did: string): Uint8Array;
    /**
     * Sign data with private key
     */
    sign(data: Uint8Array): Promise<Uint8Array>;
    /**
     * Verify signature
     */
    static verify(signature: Uint8Array, message: Uint8Array, did: string): Promise<boolean>;
    /**
     * Export private key (hex format)
     */
    exportPrivateKey(): string;
    /**
     * Export as JSON (for storage)
     */
    toJSON(): IdentityJSON;
    /**
     * Load from JSON
     */
    static fromJSON(json: IdentityJSON): Promise<AgentIdentity>;
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
