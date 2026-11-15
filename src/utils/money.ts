/**
 * Centralized financial money utilities for Artha.
 *
 * Implements strict minor-unit (paise) integer string arithmetic matching
 * backend/docs/API_CONTRACT.md §Money.
 *
 * All money on the wire is represented as base-10 strings of integer minor units
 * (e.g., "50025" for ₹500.25) to prevent IEEE-754 floating-point rounding errors.
 */

const CLEAN_INPUT_REGEX = /[^\d.-]/g;

/**
 * Converts user-entered decimal currency input (e.g. "500.25", "1,240.50", "450")
 * into an integer paise string (e.g. "50025", "124050", "45000").
 *
 * Uses strict string splitting instead of floating-point math to avoid precision loss.
 */
export function decimalInputToPaiseMinor(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '0';

  const str = String(input).replace(CLEAN_INPUT_REGEX, '').trim();
  if (!str || str === '-' || str === '.') return '0';

  const isNegative = str.startsWith('-');
  const unsignedStr = isNegative ? str.slice(1) : str;

  const parts = unsignedStr.split('.');
  const wholePart = parts[0] || '0';
  const fracPart = parts[1] || '';

  let paiseBigInt = BigInt(wholePart) * 100n;

  if (fracPart.length === 1) {
    paiseBigInt += BigInt(fracPart) * 10n;
  } else if (fracPart.length === 2) {
    paiseBigInt += BigInt(fracPart);
  } else if (fracPart.length > 2) {
    // Round to nearest minor unit
    const twoDigits = fracPart.slice(0, 2);
    const thirdDigit = parseInt(fracPart[2], 10);
    let val = BigInt(twoDigits);
    if (thirdDigit >= 5) {
      val += 1n;
    }
    paiseBigInt += val;
  }

  const result = paiseBigInt.toString();
  return isNegative && result !== '0' ? `-${result}` : result;
}

/**
 * Converts integer paise minor units (e.g. "50025") into a floating-point decimal (500.25).
 * Used only where IEEE-754 numbers are strictly required by visualization APIs (e.g., charts).
 */
export function paiseMinorToDecimal(paiseMinor: string | number | bigint | undefined | null): number {
  if (paiseMinor === undefined || paiseMinor === null) return 0;
  if (typeof paiseMinor === 'number') {
    // If already small float passed by mistake, return as-is or convert
    return Number.isInteger(paiseMinor) ? paiseMinor / 100 : paiseMinor;
  }
  const parsed = BigInt(String(paiseMinor).trim() || '0');
  return Number(parsed) / 100;
}

export interface FormatPaiseOptions {
  currencySymbol?: string;
  showSign?: boolean;
  showDecimalsIfZero?: boolean;
  locale?: string;
}

/**
 * Formats integer paise minor units (e.g. "50025") for user display.
 * Uses Indian numbering format by default (e.g. "₹500.25", "₹1,24,000").
 */
export function formatPaise(
  paiseMinor: string | number | bigint | undefined | null,
  options: FormatPaiseOptions = {},
): string {
  const {
    currencySymbol = '₹',
    showSign = false,
    showDecimalsIfZero = false,
    locale = 'en-IN',
  } = options;

  if (paiseMinor === undefined || paiseMinor === null) {
    return `${currencySymbol}0`;
  }

  const big = typeof paiseMinor === 'bigint' ? paiseMinor : BigInt(String(paiseMinor).trim() || '0');
  const isNegative = big < 0n;
  const absBig = isNegative ? -big : big;

  const whole = absBig / 100n;
  const frac = absBig % 100n;

  const formattedWhole = Number(whole).toLocaleString(locale);

  let formattedValue: string;
  if (frac === 0n && !showDecimalsIfZero) {
    formattedValue = formattedWhole;
  } else {
    const fracStr = frac.toString().padStart(2, '0');
    formattedValue = `${formattedWhole}.${fracStr}`;
  }

  let sign = '';
  if (isNegative) {
    sign = '-';
  } else if (showSign && big > 0n) {
    sign = '+';
  }

  return `${sign}${currencySymbol}${formattedValue}`;
}

/**
 * Formats a decimal number (e.g. 500.25) into currency display using formatPaise.
 */
export function formatDecimalCurrency(
  amount: number,
  options: FormatPaiseOptions = {},
): string {
  const paise = decimalInputToPaiseMinor(amount);
  return formatPaise(paise, options);
}

/**
 * Safely compares two paise minor amounts using BigInt.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function comparePaise(a: string | number | bigint, b: string | number | bigint): number {
  const bigA = typeof a === 'bigint' ? a : BigInt(String(a).trim() || '0');
  const bigB = typeof b === 'bigint' ? b : BigInt(String(b).trim() || '0');

  if (bigA < bigB) return -1;
  if (bigA > bigB) return 1;
  return 0;
}

/**
 * Sums multiple paise minor units safely without IEEE-754 precision issues.
 */
export function addPaise(...amounts: (string | number | bigint)[]): string {
  const total = amounts.reduce<bigint>((sum, val) => {
    const b = typeof val === 'bigint' ? val : BigInt(String(val).trim() || '0');
    return sum + b;
  }, 0n);
  return total.toString();
}

/**
 * Subtracts `b` from `a` safely in minor paise units.
 */
export function subPaise(a: string | number | bigint, b: string | number | bigint): string {
  const bigA = typeof a === 'bigint' ? a : BigInt(String(a).trim() || '0');
  const bigB = typeof b === 'bigint' ? b : BigInt(String(b).trim() || '0');
  return (bigA - bigB).toString();
}
