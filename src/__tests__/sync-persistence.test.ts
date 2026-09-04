import { describe, it, expect } from 'vitest';
import { isValidUUID, isDemoTrade, parseSupabaseTrade } from '../context/trade-context';

describe('Sync & Persistence Safeguards', () => {
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

    // Real user trades must return false
    expect(isDemoTrade({ id: 'da8fa828-991a-46a9-913f-0a4773f7d06a' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-1788560000000-xyz123' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-imp-1788560000000-xyz123' })).toBe(false);
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
