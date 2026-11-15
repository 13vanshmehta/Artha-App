/**
 * Date and Time utilities for Artha PET
 * Supports user timezone, midnight refresh, and Indian Financial Year calculations.
 */

export function formatCurrentHeaderDate(now: Date = new Date()): string {
  // Format: "Sun, 15 Nov 2026"
  const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
  const day = now.toLocaleDateString('en-IN', { day: 'numeric' });
  const month = now.toLocaleDateString('en-IN', { month: 'short' });
  const year = now.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

export function formatTransactionTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function formatTransactionDateGroup(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recent';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === 2) return '2 Days Ago';

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Returns Indian Financial Year string, e.g. "FY 2026-27"
 * In India, FY runs from 1 April to 31 March.
 */
export function getIndianFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: April is 3
  if (month >= 3) {
    const nextYearShort = (year + 1) % 100;
    return `FY ${year}-${nextYearShort}`;
  } else {
    const currentYearShort = year % 100;
    return `FY ${year - 1}-${currentYearShort}`;
  }
}
