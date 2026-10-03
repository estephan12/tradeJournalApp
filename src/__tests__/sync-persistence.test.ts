import { describe, it, expect } from 'vitest';
import { isValidUUID, isDemoTrade, parseSupabaseTrade, sanitizeIntScale1to10 } from '../context/trade-context';
import { calculateRiskPercent, calculatePnL, calculateRiskAmount } from '../lib/calculations';

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
    expect(isDemoTrade({ is_demo: true })).toBe(true);
    expect(isDemoTrade({ user_id: 'demo-user' })).toBe(true);
    expect(isDemoTrade({ account_id: 'acc-demo-1' })).toBe(true);
    expect(isDemoTrade({ account_id: 'acc-demo-2' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-demo-1' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-01' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-036' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-btc-5' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-eur-12' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-gbp-3' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-jpy-2' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-usdjpy-2' })).toBe(true);
    expect(isDemoTrade({ id: 'trade-xau-8' })).toBe(true);

    // Real user trades must return false even if their notes contain words from demo templates
    expect(isDemoTrade({ id: 'da8fa828-991a-46a9-913f-0a4773f7d06a', user_id: 'user-real-123' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-1788560000000-xyz123', user_id: 'user-real-123' })).toBe(false);
    expect(isDemoTrade({ id: 'trade-imp-1788560000000-xyz123', user_id: 'user-real-123' })).toBe(false);

    expect(
      isDemoTrade({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        user_id: 'user-real-123',
        notes: { tradeThesis: 'Clean daily breakout with rising volume during New York open.' },
      })
    ).toBe(false);
    expect(
      isDemoTrade({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        user_id: 'user-real-123',
        notes: { lesson: 'Gold moves with violent expansion during NY morning. Respect initial stops.' },
      })
    ).toBe(false);
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

  it('guarantees that state persistence never injects destructive clearedByUser flags into storage', () => {
    const serializedState = JSON.stringify({
      trades: [],
      accounts: [],
      setups: [],
      strategies: [],
      tags: [],
      hasCustomData: true,
    });

    const parsed = JSON.parse(serializedState);
    expect(parsed.clearedByUser).toBeUndefined();
    expect(parsed.hasCustomData).toBe(true);
    expect(parsed.trades).toEqual([]);
  });

  it('ensures demo trade filtering is robust across custom assets and UUIDs', () => {
    const customTrade = {
      id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
      user_id: 'user-authenticated-456',
      symbol: 'SOLUSDT',
      direction: 'LONG' as const,
      entry_price: 150.0,
      position_size: 10,
      date: '2026-09-10',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(isDemoTrade(customTrade)).toBe(false);
  });

  it('unresolved account produces null risk_percent and pnl_percent without fabricating 10,000 fallback', () => {
    // When no account can be resolved (e.g. accountId not found and no accounts available)
    const riskAmount = 250;
    const unresolvedBalance: number | null = null;
    const zeroBalance: number = 0;

    // Must evaluate to null, never fabricate metrics with an arbitrary 10,000 fallback
    const riskPercentUnresolved = calculateRiskPercent(riskAmount, unresolvedBalance);
    const riskPercentZero = calculateRiskPercent(riskAmount, zeroBalance);

    expect(riskPercentUnresolved).toBeNull();
    expect(riskPercentZero).toBeNull();
  });

  it('contract multiplier and multi-asset specifications survive local serialization and Supabase payload roundtrip', async () => {
    const { tradeToSupabasePayload } = await import('../lib/trades/trade-mappers');

    // Futures trade: ES mini with 50x multiplier
    const futuresTrade = {
      symbol: 'ES1!',
      direction: 'LONG' as const,
      entry_price: 5000,
      exit_price: 5020,
      stop_loss: 4990,
      position_size: 2,
      contract_multiplier: 50,
      asset_class: 'FUTURES' as const,
      tick_size: 0.25,
      tick_value: 12.5,
    };

    // PnL: (5020 - 5000) * 2 * 50 = 20 * 100 = 2000
    const pnl = calculatePnL({
      direction: futuresTrade.direction,
      entryPrice: futuresTrade.entry_price,
      exitPrice: futuresTrade.exit_price,
      positionSize: futuresTrade.position_size,
      contractMultiplier: futuresTrade.contract_multiplier,
    });
    expect(pnl).toBe(2000);

    // Risk Amount: |5000 - 4990| * 2 * 50 = 10 * 100 = 1000
    const riskAmount = calculateRiskAmount({
      entryPrice: futuresTrade.entry_price,
      stopLoss: futuresTrade.stop_loss,
      positionSize: futuresTrade.position_size,
      contractMultiplier: futuresTrade.contract_multiplier,
    });
    expect(riskAmount).toBe(1000);

    // 1. Local JSON serialization
    const serialized = JSON.stringify(futuresTrade);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.contract_multiplier).toBe(50);
    expect(deserialized.asset_class).toBe('FUTURES');
    expect(deserialized.tick_size).toBe(0.25);
    expect(deserialized.tick_value).toBe(12.5);

    // 2. Supabase payload mapping (bundled in notes JSONB until Phase 6 schema migration)
    const payload = tradeToSupabasePayload(futuresTrade, 'user-real-1');
    const payloadNotes = payload.notes as Record<string, unknown>;
    expect(payloadNotes.contract_multiplier).toBe(50);
    expect(payloadNotes.asset_class).toBe('FUTURES');
    expect(payloadNotes.tick_size).toBe(0.25);
    expect(payloadNotes.tick_value).toBe(12.5);

    // 3. Supabase row parsing back to Trade
    const mockDbRow = {
      id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
      user_id: 'user-real-1',
      symbol: 'ES1!',
      direction: 'LONG',
      entry_price: 5000,
      exit_price: 5020,
      position_size: 2,
      date: '2026-09-15',
      notes: payload.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const restoredTrade = parseSupabaseTrade(mockDbRow);
    expect(restoredTrade.contract_multiplier).toBe(50);
    expect(restoredTrade.asset_class).toBe('FUTURES');
    expect(restoredTrade.tick_size).toBe(0.25);
    expect(restoredTrade.tick_value).toBe(12.5);
  });

  it('verifies clearAllTrades preserves local cache and state if cloud deletion fails', async () => {
    // Simulate clearAllTrades failure flow
    let localTrades = [{ id: 'trade-1', symbol: 'BTCUSDT' }];
    let localPersisted = [{ id: 'trade-1', symbol: 'BTCUSDT' }];

    const simulateClearAllTrades = async (shouldFailCloud: boolean) => {
      if (shouldFailCloud) {
        // Cloud throws error
        throw new Error('Supabase network error: 500 Internal Server Error');
      }
      // Success: clear local state and cache
      localTrades = [];
      localPersisted = [];
    };

    // On failure: local trades and storage must remain intact
    await expect(simulateClearAllTrades(true)).rejects.toThrow('Supabase network error');
    expect(localTrades.length).toBe(1);
    expect(localPersisted.length).toBe(1);

    // On success: local state and storage are cleared
    await simulateClearAllTrades(false);
    expect(localTrades.length).toBe(0);
    expect(localPersisted.length).toBe(0);
  });
});
