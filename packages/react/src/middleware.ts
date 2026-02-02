import { AATToken, DelegationToken } from '@agentauth/core';

export interface VerifyAgentOptions {
  audience: string;
  requiredScopes: string[];
  enforceConstraints?: boolean;
}

export interface VerifiedAgent {
  agentDID: string;
  delegatorDID: string;
  scopes: string[];
  delegation: DelegationToken;
  token: AATToken;
}

/**
 * Verify agent AAT token and delegation chain
 */
export async function verifyAgent(
  token: string,
  options: VerifyAgentOptions
): Promise<VerifiedAgent> {
  // 1. Verify AAT token
  const verified = await AATToken.verify(token, {
    audience: options.audience,
    requiredScopes: options.requiredScopes
  });

  // 2. Get first delegation in chain (human → agent)
  const delegation = verified.delegationChain[0];
  if (!delegation) {
    throw new Error('No delegation in token');
  }

  // 3. Verify delegation constraints
  if (options.enforceConstraints !== false) {
    await enforceConstraints(delegation, verified);
  }

  return {
    agentDID: verified.getAgent(),
    delegatorDID: verified.getDelegator(),
    scopes: verified.getScopes(),
    delegation,
    token: verified
  };
}

/**
 * Enforce delegation constraints
 */
async function enforceConstraints(
  delegation: DelegationToken,
  token: AATToken
): Promise<void> {
  const constraints = delegation.constraints || {};
  const now = Date.now();

  // Check expiry
  if (delegation.expiresAt && delegation.expiresAt < now) {
    throw new Error('Delegation expired');
  }

  // Check not yet valid
  if (delegation.notBefore && delegation.notBefore > now) {
    throw new Error('Delegation not yet valid');
  }

  // Check maxUses
  if (constraints.maxUses !== undefined) {
    // TODO: Track usage count (requires state/database)
    // For now, just validate the constraint exists
  }

  // Check maxUsesPerHour
  if (constraints.maxUsesPerHour !== undefined) {
    // TODO: Track hourly usage (requires state/database)
  }

  // Check MFA requirement
  if (constraints.requireMFA) {
    // TODO: Verify MFA proof in token
    throw new Error('MFA required but not provided');
  }

  // Check subdelegation
  if (constraints.allowSubdelegation === false && token.delegationChain.length > 1) {
    throw new Error('Subdelegation not allowed');
  }

  // Check IP allowlist
  if (constraints.ipAllowlist && constraints.ipAllowlist.length > 0) {
    // TODO: Check request IP against allowlist
  }

  // Check time windows
  if (constraints.timeWindows && constraints.timeWindows.length > 0) {
    const currentTime = new Date().toTimeString().slice(0, 5);
    const isInWindow = constraints.timeWindows.some(window => {
      return currentTime >= window.start && currentTime <= window.end;
    });
    if (!isInWindow) {
      throw new Error('Action outside allowed time window');
    }
  }
}

/**
 * Express middleware for agent authentication
 */
export function requireAgent(options: VerifyAgentOptions) {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.slice(7);
      const verified = await verifyAgent(token, options);

      // Attach to request
      req.agent = verified;
      next();
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }
  };
}

/**
 * Next.js API route helper
 */
export async function withAgent(
  handler: (req: any, res: any, agent: VerifiedAgent) => Promise<void>,
  options: VerifyAgentOptions
) {
  return async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.slice(7);
      const agent = await verifyAgent(token, options);

      return handler(req, res, agent);
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }
  };
}

/**
 * Check if action is allowed by delegation constraints
 */
export function checkConstraint(
  delegation: DelegationToken,
  constraint: 'maxUses' | 'maxUsesPerHour' | 'maxValuePerUse',
  currentValue?: number
): boolean {
  const constraints = delegation.constraints || {};
  const limit = constraints[constraint];

  if (limit === undefined) {
    return true; // No constraint set
  }

  if (currentValue === undefined) {
    return true; // Can't check without current value
  }

  return currentValue <= limit;
}
