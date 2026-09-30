import { APP_CONFIG } from '../config/env';
import {
  secureStorage,
  StoredAuthSession,
  StoredUserSummary,
} from './secureStorage';

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: Record<string, unknown>;

  constructor(params: {
    statusCode: number;
    errorCode: string;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.errorCode = params.errorCode;
    this.details = params.details;
  }
}

export interface AuthSessionApiPayload {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  session: {
    id: string;
    deviceName: string;
    platform: string;
    expiresAt: string;
  };
  user: StoredUserSummary;
}

const NON_REFRESHABLE_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/email/verification/send',
  '/auth/email/verification/confirm',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/oauth/google',
  '/auth/oauth/apple',
  '/auth/token/refresh',
  '/auth/re-authenticate',
]);

const TERMINAL_SESSION_ERROR_CODES = new Set([
  'SESSION_REVOKED',
  'REFRESH_TOKEN_REUSED',
  'SESSION_EXPIRED_OR_REVOKED',
  'INVALID_REFRESH_TOKEN',
  'ACCOUNT_INACTIVE',
  'ACCOUNT_SUSPENDED_OR_DISABLED',
]);

type SessionInvalidatedListener = (reason: string) => void;
type SessionUpdatedListener = (session: StoredAuthSession) => void;

export class ArthaApiClient {
  private baseUrl: string = APP_CONFIG.API_BASE_URL;
  private inMemorySession: StoredAuthSession | null = null;
  private activeRefreshPromise: Promise<StoredAuthSession | null> | null = null;
  private onSessionInvalidated: SessionInvalidatedListener | null = null;
  private onSessionUpdated: SessionUpdatedListener | null = null;

  setSessionListeners(listeners: {
    onInvalidated?: SessionInvalidatedListener;
    onUpdated?: SessionUpdatedListener;
  }): void {
    this.onSessionInvalidated = listeners.onInvalidated ?? null;
    this.onSessionUpdated = listeners.onUpdated ?? null;
  }

  setInMemorySession(session: StoredAuthSession | null): void {
    this.inMemorySession = session;
  }

  getInMemorySession(): StoredAuthSession | null {
    return this.inMemorySession;
  }

  async persistSessionFromApi(
    payload: AuthSessionApiPayload,
  ): Promise<StoredAuthSession> {
    const stored: StoredAuthSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpiresAt: Date.now() + payload.expiresIn * 1000,
      sessionId: payload.session.id,
      user: payload.user,
    };
    this.inMemorySession = stored;
    await secureStorage.saveSession(stored);
    this.onSessionUpdated?.(stored);
    return stored;
  }

  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      body?: unknown;
      authenticated?: boolean;
      _retried?: boolean;
    } = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const authenticated = options.authenticated ?? true;

    let currentSession = this.inMemorySession;
    if (authenticated && !currentSession) {
      currentSession = await secureStorage.loadSession();
      this.inMemorySession = currentSession;
    }

    // Proactively refresh if access token is within 15s of expiry on an eligible endpoint
    if (
      authenticated &&
      currentSession &&
      !NON_REFRESHABLE_AUTH_PATHS.has(path) &&
      currentSession.accessTokenExpiresAt <= Date.now() + 15_000 &&
      !options._retried
    ) {
      const refreshed = await this.coordinateTokenRefresh();
      if (refreshed) {
        currentSession = refreshed;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (authenticated && currentSession?.accessToken) {
      headers.Authorization = `Bearer ${currentSession.accessToken}`;
    }

    const requestInit: RequestInit = {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    };

    let response: Response | null = null;
    try {
      response = await fetch(`${this.baseUrl}${path}`, requestInit);
    } catch (primaryErr) {
      const isJest = Boolean((globalThis as Record<string, unknown>).jest);
      if (typeof __DEV__ !== 'undefined' && __DEV__ && !isJest) {
        const fallbackBaseUrls = [
          APP_CONFIG.API_BASE_URL,
          'http://localhost:3000/api/v1',
          'http://10.0.2.2:3000/api/v1',
        ].filter((candidate) => candidate !== this.baseUrl);

        for (const fallbackUrl of fallbackBaseUrls) {
          try {
            const fallbackResp = await fetch(
              `${fallbackUrl}${path}`,
              requestInit,
            );
            this.baseUrl = fallbackUrl;
            response = fallbackResp;
            break;
          } catch {
            // Try next fallback candidate
          }
        }
      }

      if (!response) {
        if (typeof __DEV__ !== 'undefined' && __DEV__ && !isJest) {
          console.warn(
            `[Artha ApiClient] Network request failed for ${method} ${this.baseUrl}${path}:`,
            primaryErr,
          );
        }
        throw new ApiError({
          statusCode: 0,
          errorCode: 'NETWORK_ERROR',
          message:
            'Unable to reach Artha servers. Check your internet connection and try again.',
        });
      }
    }

    let parsedBody: Record<string, unknown> = {};
    try {
      const text = await response.text();
      parsedBody = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      parsedBody = {};
    }

    if (response.ok) {
      return parsedBody as T;
    }

    const errorCode =
      typeof parsedBody.errorCode === 'string'
        ? parsedBody.errorCode
        : 'REQUEST_FAILED';
    const rawMsg = parsedBody.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(' ')
      : typeof rawMsg === 'string'
        ? rawMsg
        : 'Request could not be completed.';
    const details =
      parsedBody.details && typeof parsedBody.details === 'object'
        ? (parsedBody.details as Record<string, unknown>)
        : undefined;

    // Coordinate single-flight refresh only when 401 is due to TOKEN_EXPIRED on an eligible authenticated route
    if (
      response.status === 401 &&
      authenticated &&
      !options._retried &&
      !NON_REFRESHABLE_AUTH_PATHS.has(path) &&
      errorCode === 'TOKEN_EXPIRED'
    ) {
      const refreshedSession = await this.coordinateTokenRefresh();
      if (refreshedSession) {
        return this.request<T>(path, {
          ...options,
          _retried: true,
        });
      }
    }

    if (
      response.status === 401 &&
      authenticated &&
      TERMINAL_SESSION_ERROR_CODES.has(errorCode)
    ) {
      await this.invalidateLocalSession(errorCode);
    }

    throw new ApiError({
      statusCode: response.status,
      errorCode,
      message,
      details,
    });
  }

  async coordinateTokenRefresh(): Promise<StoredAuthSession | null> {
    if (this.activeRefreshPromise) {
      return this.activeRefreshPromise;
    }

    this.activeRefreshPromise = this.performRefreshInternal().finally(() => {
      this.activeRefreshPromise = null;
    });

    return this.activeRefreshPromise;
  }

  private async performRefreshInternal(): Promise<StoredAuthSession | null> {
    const current =
      this.inMemorySession ?? (await secureStorage.loadSession());
    if (!current?.refreshToken) {
      await this.invalidateLocalSession('MISSING_REFRESH_TOKEN');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });

      if (!response.ok) {
        await this.invalidateLocalSession('REFRESH_REJECTED');
        return null;
      }

      const payload = (await response.json()) as AuthSessionApiPayload;
      return await this.persistSessionFromApi(payload);
    } catch {
      // Transient network error during refresh: do not wipe stored credentials, return null for now
      return null;
    }
  }

  async invalidateLocalSession(reason: string): Promise<void> {
    this.inMemorySession = null;
    await secureStorage.clearSession();
    this.onSessionInvalidated?.(reason);
  }
}

export const apiClient = new ArthaApiClient();
