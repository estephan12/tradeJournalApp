import { AssetClass } from '@/types/trade';

/**
 * Utility functions for validating trade identifiers and database fields.
 * Independent of React and context.
 */

export const CANONICAL_ASSET_CLASSES: readonly AssetClass[] = [
  'stocks',
  'crypto',
  'forex',
  'futures',
  'options',
  'indices',
  'cfd',
  'other',
] as const;

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function sanitizeIntScale1to10(val: unknown, fallback: number = 7): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  // If float strictly between 0 and 1 (such as AI/CSV confidence 0.98), scale to 1-10 integer
  if (num > 0 && num < 1) {
    return Math.min(10, Math.max(1, Math.round(num * 10)));
  }
  return Math.min(10, Math.max(1, Math.round(num)));
}

/**
 * Normalizes any asset class representation (case, plurality, synonyms) into canonical AssetClass.
 */
export function normalizeAssetClass(val: unknown): AssetClass {
  if (typeof val !== 'string') return 'other';
  const clean = val.trim().toLowerCase();
  if (!clean) return 'other';

  if (
    clean === 'stocks' ||
    clean === 'stock' ||
    clean === 'equity' ||
    clean === 'equities' ||
    clean === 'shares'
  ) {
    return 'stocks';
  }

  if (
    clean === 'crypto' ||
    clean === 'cryptocurrency' ||
    clean === 'cryptos' ||
    clean === 'crypto futures' ||
    clean === 'cryptofutures'
  ) {
    return 'crypto';
  }

  if (
    clean === 'forex' ||
    clean === 'fx' ||
    clean === 'currency' ||
    clean === 'currencies'
  ) {
    return 'forex';
  }

  if (
    clean === 'futures' ||
    clean === 'future' ||
    clean === 'futs'
  ) {
    return 'futures';
  }

  if (
    clean === 'options' ||
    clean === 'option' ||
    clean === 'opts'
  ) {
    return 'options';
  }

  if (
    clean === 'indices' ||
    clean === 'index' ||
    clean === 'indicies'
  ) {
    return 'indices';
  }

  if (
    clean === 'cfd' ||
    clean === 'cfds'
  ) {
    return 'cfd';
  }

  if (clean === 'other') {
    return 'other';
  }

  return 'other';
}

