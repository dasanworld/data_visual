/**
 * Unit tests for formatters utility functions.
 *
 * As per test-plan.md: Only test pure utility functions in src/utils/*.ts
 * UI component tests are intentionally excluded (low ROI).
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from './formatters';

describe('formatCurrency', () => {
  it('should format positive numbers as Korean Won', () => {
    const result = formatCurrency(1000000);
    // Korean Won format: ₩1,000,000
    expect(result).toContain('1,000,000');
    expect(result).toMatch(/₩|원/); // Either ₩ or 원 depending on locale
  });

  it('should format zero as Korean Won', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should format negative numbers correctly', () => {
    const result = formatCurrency(-50000);
    expect(result).toContain('50,000');
    expect(result).toMatch(/-|−/); // Minus sign
  });

  it('should handle large numbers', () => {
    const result = formatCurrency(123456789012);
    expect(result).toContain('123,456,789,012');
  });

  it('should handle decimal numbers', () => {
    // Korean Won typically doesn't show decimals
    const result = formatCurrency(1234.56);
    // Result should be rounded or truncated
    expect(result).toBeDefined();
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(123456789)).toBe('123,456,789');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format negative numbers with thousand separators', () => {
    const result = formatNumber(-1000000);
    expect(result).toContain('1,000,000');
  });

  it('should handle small numbers without separators', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(999)).toBe('999');
  });

  it('should handle decimal numbers', () => {
    const result = formatNumber(1234.56);
    // Korean number format may round or show decimals
    expect(result).toBeDefined();
    expect(result).toContain('1,234');
  });
});

describe('formatPercent', () => {
  it('should format percentage with one decimal place', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(100)).toBe('100.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('should round to one decimal place', () => {
    expect(formatPercent(33.333)).toBe('33.3%');
    expect(formatPercent(66.666)).toBe('66.7%');
    expect(formatPercent(99.999)).toBe('100.0%');
  });

  it('should handle negative percentages', () => {
    expect(formatPercent(-25.5)).toBe('-25.5%');
  });

  it('should handle very small percentages', () => {
    expect(formatPercent(0.1)).toBe('0.1%');
    expect(formatPercent(0.05)).toBe('0.1%'); // Rounded up
    expect(formatPercent(0.04)).toBe('0.0%'); // Rounded down
  });

  it('should handle percentages over 100', () => {
    expect(formatPercent(150)).toBe('150.0%');
    expect(formatPercent(200.5)).toBe('200.5%');
  });
});
