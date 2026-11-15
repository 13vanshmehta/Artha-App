/**
 * Client-side RFC4122 v4 UUID generator for request idempotency.
 * Used for clientTransactionId per transaction submission attempt.
 */
export function generateClientTransactionId(): string {
  // Use crypto.randomUUID if available, else standard fallback
  const globalCrypto =
    typeof globalThis !== 'undefined'
      ? (globalThis as Record<string, any>).crypto
      : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    try {
      return globalCrypto.randomUUID();
    } catch {}
  }

  // Fallback RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
