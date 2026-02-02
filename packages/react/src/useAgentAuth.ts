import { useState, useCallback } from 'react';
import { DelegationToken, AATToken } from '@agentauth/core';
import { DelegationPreset, DelegationConstraints } from './DelegationRequestModal';

export interface AgentAuthRequest {
  agentDID: string;
  scopes: string[];
  preset?: DelegationPreset;
  customConstraints?: DelegationConstraints;
}

export interface UseAgentAuthOptions {
  delegatorDID: string;
  onDelegationCreated?: (delegation: DelegationToken) => void;
  signerCallback?: (delegation: DelegationToken) => Promise<DelegationToken>;
}

export interface UseAgentAuthReturn {
  isRequestPending: boolean;
  currentRequest: AgentAuthRequest | null;
  requestDelegation: (request: AgentAuthRequest) => void;
  approveDelegation: (delegation: DelegationToken) => void;
  denyDelegation: () => void;
  activeDelegations: DelegationToken[];
  revokeDelegation: (delegationId: string) => void;
}

export function useAgentAuth(options: UseAgentAuthOptions): UseAgentAuthReturn {
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<AgentAuthRequest | null>(null);
  const [activeDelegations, setActiveDelegations] = useState<DelegationToken[]>([]);

  const requestDelegation = useCallback((request: AgentAuthRequest) => {
    setCurrentRequest(request);
    setIsRequestPending(true);
  }, []);

  const approveDelegation = useCallback((delegation: DelegationToken) => {
    setActiveDelegations(prev => [...prev, delegation]);
    setIsRequestPending(false);
    setCurrentRequest(null);
    options.onDelegationCreated?.(delegation);
  }, [options]);

  const denyDelegation = useCallback(() => {
    setIsRequestPending(false);
    setCurrentRequest(null);
  }, []);

  const revokeDelegation = useCallback((delegationId: string) => {
    setActiveDelegations(prev => prev.filter(d => d.id !== delegationId));
    // TODO: Call revocation endpoint if configured
  }, []);

  return {
    isRequestPending,
    currentRequest,
    requestDelegation,
    approveDelegation,
    denyDelegation,
    activeDelegations,
    revokeDelegation
  };
}

/**
 * Helper hook for managing AAT tokens
 */
export function useAATToken() {
  const [tokens, setTokens] = useState<Map<string, string>>(new Map());

  const createToken = useCallback(async (
    identity: any,
    delegation: DelegationToken,
    audience: string,
    scopes: string[]
  ): Promise<string> => {
    const token = await AATToken.create({
      identity,
      delegator: delegation.delegatorDID,
      audience,
      scopes,
      delegationChain: [delegation],
      expiresIn: '1h'
    });

    setTokens(prev => new Map(prev).set(audience, token));
    return token;
  }, []);

  const getToken = useCallback((audience: string): string | undefined => {
    return tokens.get(audience);
  }, [tokens]);

  const clearToken = useCallback((audience: string) => {
    setTokens(prev => {
      const next = new Map(prev);
      next.delete(audience);
      return next;
    });
  }, []);

  return {
    createToken,
    getToken,
    clearToken,
    tokens
  };
}
