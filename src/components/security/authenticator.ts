import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse } from '../../services/ApiResponse';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';

export interface AuthenticatorStatus {
  enabled: boolean;
  enrolledAt: string | null;
  backupCodesRemaining: number;
  lockedUntil: string | null;
}

/** Thrown when the server answers 403 AUTHENTICATOR_REQUIRED: the member must set up the app first. */
export class AuthenticatorRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticatorRequired';
  }
}

/**
 * Thrown when the server answers 403 AUTHENTICATOR_CODE_REQUIRED (Security plan Phase 3,
 * part 2): the member has the app, and this action (email, phone, password) needs its code.
 */
export class AuthenticatorCodeNeeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticatorCodeNeeded';
  }
}

/** handleApiResponse, but a 403 AUTHENTICATOR_CODE_REQUIRED becomes AuthenticatorCodeNeeded. */
export function unwrapWithCode(response: ApiResponse) {
  if (response.body?.code === 'AUTHENTICATOR_CODE_REQUIRED') {
    throw new AuthenticatorCodeNeeded(response.body?.message || 'Tapez le code de votre application d’authentification.');
  }
  return handleApiResponse(response);
}

/** handleApiResponse, but a 403 AUTHENTICATOR_REQUIRED becomes AuthenticatorRequired. */
export function unwrap(response: ApiResponse) {
  if (response.body?.code === 'AUTHENTICATOR_REQUIRED') {
    throw new AuthenticatorRequired(response.body?.message || 'Configurez d’abord l’application d’authentification.');
  }
  return handleApiResponse(response);
}

/** The member's authenticator status, read when `active` turns true. `null` while loading. */
export function useAuthenticatorStatus(active: boolean) {
  const [status, setStatus] = useState<AuthenticatorStatus | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = handleApiResponse(await sbcApiService.getAuthenticatorStatus());
      setStatus({
        enabled: !!data?.enabled,
        enrolledAt: data?.enrolledAt ?? null,
        backupCodesRemaining: Number(data?.backupCodesRemaining ?? 0),
        lockedUntil: data?.lockedUntil ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le statut de sécurité n’a pas pu être lu.');
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setStatus(null);
    void refresh();
  }, [active, refresh]);

  return { status, error, refresh };
}
