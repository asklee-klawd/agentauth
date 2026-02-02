/**
 * AgentAuth Protocol v0.1
 * Authentication and identity for autonomous AI agents
 */

export { AgentIdentity, type AgentMetadata, type CreateIdentityOptions, type IdentityJSON } from './identity';
export { AATToken, type TokenHeader, type TokenPayload, type CreateTokenOptions, type VerifyOptions } from './token';
export {
  type DelegationToken,
  type DelegationConstraints,
  type TimeWindow,
  type DelegationProof,
  createDelegation,
  verifyDelegation,
  type CreateDelegationOptions,
} from './delegation';

// Version
export const VERSION = '0.1.0';
