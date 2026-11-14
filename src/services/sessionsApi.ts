/**
 * Sessions API
 * Typed helpers for Active Sessions / Device Management endpoints.
 * All calls go through apiClient which handles auth, token refresh, and envelope unwrapping.
 */

import { apiClient } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionItem {
  id: string;
  deviceName: string;
  platform: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'web';
  operatingSystem?: string;
  approximateLocation?: string | null;
  /** Raw IP – never exposed directly in UI by default */
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SessionsListResponse {
  sessions: SessionItem[];
}

export interface RevokeSessionResponse {
  message: string;
  revokedSessionId: string;
  isSuspicious?: boolean;
  recommendedAction?: 'CHANGE_PASSWORD';
}

export interface RevokeOtherSessionsResponse {
  message: string;
  revokedCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string for a session's last-used timestamp.
 * e.g. "Active now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago"
 */
export function formatLastActive(lastUsedAt: string): string {
  const diffMs = Date.now() - new Date(lastUsedAt).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Active now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay} days ago`;
}

/**
 * Returns an icon name hint based on platform, deviceType, or deviceName.
 */
export function platformIcon(
  platform: string,
  deviceType?: string,
  deviceName?: string,
): 'phone' | 'laptop' | 'tablet' {
  const p = (platform || '').toLowerCase();
  const dt = (deviceType || '').toLowerCase();
  const dn = (deviceName || '').toLowerCase();

  if (dt === 'tablet' || p.includes('tablet') || p.includes('ipad') || dn.includes('ipad')) {
    return 'tablet';
  }
  if (
    dt === 'desktop' ||
    p.includes('mac') ||
    p.includes('win') ||
    p.includes('linux') ||
    p.includes('desktop') ||
    dn.includes('macbook') ||
    dn.includes('imac') ||
    dn.includes('pc')
  ) {
    return 'laptop';
  }
  return 'phone';
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/sessions
 * Returns all active, non-expired sessions for the authenticated user.
 * The backend marks `isCurrent: true` on the session matching the caller's JWT.
 */
export async function fetchActiveSessions(): Promise<SessionItem[]> {
  const result = await apiClient.request<SessionItem[] | { sessions: SessionItem[] }>(
    '/auth/sessions',
    { method: 'GET', authenticated: true },
  );

  if (Array.isArray(result)) return result;
  if (
    result &&
    typeof result === 'object' &&
    Array.isArray((result as SessionsListResponse).sessions)
  ) {
    return (result as SessionsListResponse).sessions;
  }
  return [];
}

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revokes a specific session securely on the backend.
 */
export async function revokeSession(
  sessionId: string,
  isSuspicious = false,
): Promise<RevokeSessionResponse> {
  return apiClient.request<RevokeSessionResponse>(
    `/auth/sessions/${sessionId}${isSuspicious ? '?isSuspicious=true' : ''}`,
    {
      method: 'DELETE',
      authenticated: true,
      body: isSuspicious ? { isSuspicious: true } : undefined,
    },
  );
}

/**
 * POST /api/v1/auth/sessions/:sessionId/report-suspicious
 * Reports an unfamiliar/unknown device, immediately revokes it,
 * records an UNKNOWN_DEVICE_REPORTED security event, and triggers security notifications.
 */
export async function reportSuspiciousSession(
  sessionId: string,
): Promise<RevokeSessionResponse> {
  return apiClient.request<RevokeSessionResponse>(
    `/auth/sessions/${sessionId}/report-suspicious`,
    { method: 'POST', authenticated: true },
  );
}

/**
 * POST /api/v1/auth/sessions/logout-others
 * Signs out all active sessions across other devices except the caller's current session.
 */
export async function revokeAllOtherSessions(): Promise<RevokeOtherSessionsResponse> {
  return apiClient.request<RevokeOtherSessionsResponse>(
    '/auth/sessions/logout-others',
    { method: 'POST', authenticated: true },
  );
}

export const logoutAllOtherSessions = revokeAllOtherSessions;
