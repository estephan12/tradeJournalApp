import { describe, it, expect } from 'vitest';
import { isValidUUID, isDemoTrade, parseSupabaseTrade, sanitizeIntScale1to10 } from '../context/trade-context';

describe('Sync & Persistence Safeguards', () => {
  it('sanitizes confidence and discipline into valid 1-10 integers for PostgreSQL', () => {
    // Floats from CSV mapping / AI extraction (e.g. 0.98 or 0.85) must be scaled to 1-10 integer
    expect(sanitizeIntScale1to10(0.98)).toBe(10);
    expect(sanitizeIntScale1to10('0.98')).toBe(10);
    expect(sanitizeIntScale1to10(0.85)).toBe(9);
    expect(sanitizeIntScale1to10(0.5)).toBe(5);

    // Standard integers 1-10 must pass through
    expect(sanitizeIntScale1to10(7)).toBe(7);
    expect(sanitizeIntScale1to10('8')).toBe(8);
    expect(sanitizeIntScale1to10(1)).toBe(1);
    expect(sanitizeIntScale1to10(10)).toBe(10);

    // Out of bounds clamped
    expect(sanitizeIntScale1to10(15)).toBe(10);
    expect(sanitizeIntScale1to10(-3)).toBe(1);

    // Null/undefined/NaN fallback
    expect(sanitizeIntScale1to10(null, 7)).toBe(7);
    expect(sanitizeIntScale1to10(undefined, 8)).toBe(8);
    expect(sanitizeIntScale1to10('invalid', 7)).toBe(7);
  });
  it('validates UUIDs correctly to prevent PostgreSQL 22P02 crashes', () => {
    // Demo and temporary frontend IDs must NOT be treated as valid UUIDs
    expect(isValidUUID('acc-demo-1')).toBe(false);
    expect(isValidUUID('setup-1')).toBe(false);
    expect(isValidUUID('strat-2')).toBe(false);
    expect(isValidUUID('trade-1741234567-abc')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);

    // True UUIDs must pass
    expect(isValidUUID('da8fa828-991a-46a9-913f-0a4773f7d06a')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('correctly isolates demo mock trades from real user trades', () => {
    expect(isDemoTrade({ id: 'trade-demo-1' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-01' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-036' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-btc-5' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-eur-12' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-gbp-3' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-usdjpy-2' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-xau-8' })).toBe(true);
    expect(isDemoTrade({ user_id: 'demo-user' })).toBe(true);
    expect(isDemoTrade({ account_id: 'acc-demo-1' })).toBe(true);

    // Real user trades must return false
    expect(isDemoTrade({ id: 'da8fa828-991a-46a9-913f-0a4773f7d06a' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-1788560000000-xyz123' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-imp-1788560000000-xyz123' })).toBe(false);

    // Accidental demo trades uploaded to Supabase with real UUIDs must be recognized by thesis/lesson
    expect(
      isDemoTrade({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        notes: { tradeThesis: 'Clean daily breakout with rising volume during New York open.' },
      })
    ).toBe(true);
    expect(
      isDemoTrade({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        notes: { tradeThesis: 'London open liquidity run targeting previous day high/low.' },
      })
    ).toBe(true);
    expect(
      isDemoTrade({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        notes: { lesson: 'Gold moves with violent expansion during NY morning. Respect initial stops.' },
      })
    ).toBe(true);
  });

  it('parses Supabase trade row preserving notes, tags, and classification names', () => {
    const mockRow = {
      id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
      user_id: 'user-123',
      account_id: 'acc-uuid-1',
      date: '2026-09-04',
      entry_time: '14:30',
      exit_time: '15:45',
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entry_price: '2800.50',
      exit_price: '2950.00',
      position_size: '2',
      pnl: '299.00',
      pnl_percent: '5.34',
      r_multiple: '2.50',
      risk_amount: '120.00',
      result: 'WIN',
      confidence: 8,
      discipline: 9,
      notes: {
        tags: ['Scalp', 'Breakout'],
        account_name: 'Crypto Prop',
        strategy_name: 'Order Flow',
        setup_name: 'Liquidity Grab',
        tradeThesis: 'Clean higher low sweep',
      },
      created_at: '2026-09-04T14:30:00Z',
      updated_at: '2026-09-04T15:45:00Z',
    };

    const parsed = parseSupabaseTrade(mockRow);

    expect(parsed.id).toBe('da8fa828-991a-46a9-913f-0a4773f7d06a');
    expect(parsed.symbol).toBe('ETHUSDT');
    expect(parsed.entry_price).toBe(2800.5);
    expect(parsed.exit_price).toBe(2950);
    expect(parsed.pnl).toBe(299);
    expect(parsed.tags).toEqual(['Scalp', 'Breakout']);
    expect(parsed.account_name).toBe('Crypto Prop');
    expect(parsed.strategy_name).toBe('Order Flow');
    expect(parsed.setup_name).toBe('Liquidity Grab');
    expect(parsed.notes?.tradeThesis).toBe('Clean higher low sweep');
  });
});
