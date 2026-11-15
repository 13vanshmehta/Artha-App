import {
  decimalInputToPaiseMinor,
  paiseMinorToDecimal,
  formatPaise,
  formatDecimalCurrency,
  comparePaise,
  addPaise,
  subPaise,
} from '../src/utils/money';

describe('Centralized Money Utilities', () => {
  describe('decimalInputToPaiseMinor', () => {
    it('converts integer decimal input to paise minor string', () => {
      expect(decimalInputToPaiseMinor('500')).toBe('50000');
      expect(decimalInputToPaiseMinor(500)).toBe('50000');
      expect(decimalInputToPaiseMinor('0')).toBe('0');
    });

    it('converts two-decimal input without floating point rounding errors', () => {
      expect(decimalInputToPaiseMinor('500.25')).toBe('50025');
      expect(decimalInputToPaiseMinor('0.05')).toBe('5');
      expect(decimalInputToPaiseMinor('1240.99')).toBe('124099');
    });

    it('handles single decimal fractional input', () => {
      expect(decimalInputToPaiseMinor('500.2')).toBe('50020');
      expect(decimalInputToPaiseMinor('1.5')).toBe('150');
    });

    it('rounds sub-paise amounts safely', () => {
      expect(decimalInputToPaiseMinor('500.254')).toBe('50025');
      expect(decimalInputToPaiseMinor('500.256')).toBe('50026');
    });

    it('strips currency symbols and commas cleanly', () => {
      expect(decimalInputToPaiseMinor('₹1,240.50')).toBe('124050');
      expect(decimalInputToPaiseMinor('$500.00')).toBe('50000');
    });

    it('handles negative inputs', () => {
      expect(decimalInputToPaiseMinor('-500.25')).toBe('-50025');
      expect(decimalInputToPaiseMinor('-100')).toBe('-10000');
    });

    it('handles edge cases safely', () => {
      expect(decimalInputToPaiseMinor('')).toBe('0');
      expect(decimalInputToPaiseMinor(null)).toBe('0');
      expect(decimalInputToPaiseMinor(undefined)).toBe('0');
    });
  });

  describe('paiseMinorToDecimal', () => {
    it('converts string paise to decimal number', () => {
      expect(paiseMinorToDecimal('50025')).toBe(500.25);
      expect(paiseMinorToDecimal('50000')).toBe(500);
      expect(paiseMinorToDecimal('0')).toBe(0);
      expect(paiseMinorToDecimal(null)).toBe(0);
    });
  });

  describe('formatPaise', () => {
    it('formats paise into Indian currency notation', () => {
      expect(formatPaise('50025')).toBe('₹500.25');
      expect(formatPaise('50000')).toBe('₹500');
      expect(formatPaise('50000', { showDecimalsIfZero: true })).toBe('₹500.00');
      expect(formatPaise('12500000')).toBe('₹1,25,000');
      expect(formatPaise('124050')).toBe('₹1,240.50');
    });

    it('supports positive and negative sign options', () => {
      expect(formatPaise('-50025')).toBe('-₹500.25');
      expect(formatPaise('50025', { showSign: true })).toBe('+₹500.25');
    });

    it('formats zero correctly', () => {
      expect(formatPaise('0')).toBe('₹0');
      expect(formatPaise(null)).toBe('₹0');
    });
  });

  describe('comparePaise, addPaise, and subPaise', () => {
    it('compares amounts safely', () => {
      expect(comparePaise('50025', '50020')).toBe(1);
      expect(comparePaise('50020', '50025')).toBe(-1);
      expect(comparePaise('50025', '50025')).toBe(0);
    });

    it('adds multiple paise amounts safely', () => {
      expect(addPaise('10050', '20025', '5025')).toBe('35100');
    });

    it('subtracts paise amounts safely', () => {
      expect(subPaise('50000', '15025')).toBe('34975');
    });
  });
});
