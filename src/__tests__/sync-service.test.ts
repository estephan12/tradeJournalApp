import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService } from '../services/sync.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { Trade } from '../types/trade';

describe('SyncService & Realtime Architecture', () => {
  beforeEach(() => {
    syncService.unsubscribe();
    syncService.setLocalMutationLock(false);
  });

  it('deduplicates trades by both primary UUID and execution signature', () => {
    const rawTrades: Trade[] = [
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        user_id: 'user-1',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-09-01',
        entry_time: '14:30',
        entry_price: 60000,
        exit_price: 61000,
        position_size: 1,
        pnl: 1000,
        created_at: '2026-09-01T14:30:00Z',
        updated_at: '2026-09-01T15:30:00Z',
      },
      // Duplicate by exact UUID
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        user_id: 'user-1',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-09-01',
        entry_time: '14:30',
        entry_price: 60000,
        exit_price: 61000,
        position_size: 1,
        pnl: 1000,
        created_at: '2026-09-01T14:30:00Z',
        updated_at: '2026-09-01T15:30:00Z',
      },
      // Duplicate by signature but different generated local ID
      {
        id: 'trade-tmp-123',
        user_id: 'user-1',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-09-01',
        entry_time: '14:30',
        entry_price: 60000,
        exit_price: 61000,
        position_size: 1,
        pnl: 1000,
        created_at: '2026-09-01T14:30:00Z',
        updated_at: '2026-09-01T15:30:00Z',
      },
      // Distinct trade
      {
        id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
        user_id: 'user-1',
        symbol: 'ETHUSDT',
        direction: 'SHORT',
        date: '2026-09-02',
        entry_time: '10:00',
        entry_price: 2500,
        exit_price: 2400,
        position_size: 2,
        pnl: 200,
        created_at: '2026-09-02T10:00:00Z',
        updated_at: '2026-09-02T11:00:00Z',
      },
    ];

    const deduplicated = syncService.deduplicateTrades(rawTrades);
    expect(deduplicated.length).toBe(2);
    expect(deduplicated.map((t) => t.symbol)).toEqual(['ETHUSDT', 'BTCUSDT']);
  });

  it('filters out any demo mock trades from real sync collections', () => {
    const mixedTrades: Trade[] = [
      {
        id: 'trade-btc-1',
        user_id: 'demo-user',
        is_demo: true,
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-09-01',
        entry_price: 60000,
        position_size: 1,
        created_at: '2026-09-01T14:30:00Z',
        updated_at: '2026-09-01T15:30:00Z',
      },
      {
        id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
        user_id: 'user-real',
        symbol: 'SOLUSDT',
        direction: 'LONG',
        date: '2026-09-02',
        entry_price: 140,
        position_size: 10,
        created_at: '2026-09-02T10:00:00Z',
        updated_at: '2026-09-02T11:00:00Z',
      },
    ];

    const result = syncService.deduplicateTrades(mixedTrades);
    expect(result.length).toBe(1);
    expect(result[0].symbol).toBe('SOLUSDT');
  });

  it('manages local mutation locks to avoid realtime echo loops', () => {
    expect(syncService.getIsMutatingLocally()).toBe(false);

    syncService.setLocalMutationLock(true, 50);
    expect(syncService.getIsMutatingLocally()).toBe(true);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(syncService.getIsMutatingLocally()).toBe(false);
        resolve();
      }, 70);
    });
  });

  it('enforces multi-tenant ownership check to prevent cross-user contamination', () => {
    const userA = 'user-uuid-aaaa-1111';
    const userB = 'user-uuid-bbbb-2222';

    expect(syncService.isRecordOwner(userA, userA)).toBe(true);
    expect(syncService.isRecordOwner(userA, userB)).toBe(false);
    expect(syncService.isRecordOwner(null, userA)).toBe(false);
    expect(syncService.isRecordOwner(userA, null)).toBe(false);
  });

  it('correctly handles User A -> Logout -> User B session switching lifecycle', () => {
    // 1. User A is active
    let activeUser: string | null = 'user-a-1111';
    let currentTrades: Trade[] = [
      {
        id: 'trade-user-a-1',
        user_id: 'user-a-1111',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-09-01',
        entry_price: 60000,
        position_size: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    expect(currentTrades.every((t) => syncService.isRecordOwner(t.user_id, activeUser))).toBe(true);

    // 2. User A signs out: unsubscribe and wipe memory/cache
    syncService.unsubscribe();
    activeUser = null;
    currentTrades = [];

    expect(currentTrades.length).toBe(0);

    // 3. User B signs in: receives only User B data
    activeUser = 'user-b-2222';
    const userBTrades: Trade[] = [
      {
        id: 'trade-user-b-1',
        user_id: 'user-b-2222',
        symbol: 'EURUSD',
        direction: 'SHORT',
        date: '2026-09-03',
        entry_price: 1.09,
        position_size: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    currentTrades = userBTrades.filter((t) => syncService.isRecordOwner(t.user_id, activeUser));

    expect(currentTrades.length).toBe(1);
    expect(currentTrades[0].symbol).toBe('EURUSD');
    expect(currentTrades[0].user_id).toBe('user-b-2222');
  });

  it('suppresses reload loops during local create, update, and delete mutations, but triggers on remote change', async () => {
    let postgresChangeCallback: (() => void) | null = null;
    const mockChannel = {
      on: vi.fn((_event, _config, cb) => {
        postgresChangeCallback = cb;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };
    const mockClient = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient;

    const onRemoteChange = vi.fn();
    syncService.subscribeToUserTrades(mockClient, 'user-123', onRemoteChange, 20);

    expect(postgresChangeCallback).not.toBeNull();

    // 1. Local Create: set mutation lock -> realtime event triggered -> onRemoteChange must NOT be called
    syncService.setLocalMutationLock(true, 100);
    postgresChangeCallback!();
    await new Promise((r) => setTimeout(r, 35));
    expect(onRemoteChange).not.toHaveBeenCalled();

    // 2. Local Update: mutation lock active -> realtime event triggered -> onRemoteChange must NOT be called
    postgresChangeCallback!();
    await new Promise((r) => setTimeout(r, 35));
    expect(onRemoteChange).not.toHaveBeenCalled();

    // 3. Local Delete: mutation lock active -> realtime event triggered -> onRemoteChange must NOT be called
    postgresChangeCallback!();
    await new Promise((r) => setTimeout(r, 35));
    expect(onRemoteChange).not.toHaveBeenCalled();

    // 4. Remote Change: mutation lock expires -> remote change fires -> onRemoteChange IS called
    await new Promise((r) => setTimeout(r, 80)); // wait for lock expiry
    expect(syncService.getIsMutatingLocally()).toBe(false);

    postgresChangeCallback!();
    await new Promise((r) => setTimeout(r, 50)); // wait for debounce
    expect(onRemoteChange).toHaveBeenCalledTimes(1);
  });

  it('mutation lock remains active for the full duration of an async operation with withLocalMutation', async () => {
    expect(syncService.getIsMutatingLocally()).toBe(false);

    let insideOperationStatus = false;
    await syncService.withLocalMutation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      insideOperationStatus = syncService.getIsMutatingLocally();
    }, 0);

    expect(insideOperationStatus).toBe(true);
    expect(syncService.getIsMutatingLocally()).toBe(false);
  });
});
