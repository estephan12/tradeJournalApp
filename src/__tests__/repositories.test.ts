import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeRepository } from '../repositories/trade.repository';
import { AccountRepository } from '../repositories/account.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { SetupRepository } from '../repositories/setup.repository';
import { TagRepository } from '../repositories/tag.repository';
import { AuthRepository } from '../repositories/auth.repository';

import { SupabaseClient } from '@supabase/supabase-js';

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
}

describe('Repository Layer Unit Tests', () => {
  let mockSupabase: MockSupabase;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
    };
    mockClient = mockSupabase as unknown as SupabaseClient;
  });

  describe('TradeRepository', () => {
    it('returns empty array if supabase or userId is missing', async () => {
      const repoWithoutClient = new TradeRepository(null);
      const trades = await repoWithoutClient.getTrades('user-1');
      expect(trades).toEqual([]);

      const repoWithClient = new TradeRepository(mockClient);
      const emptyUserTrades = await repoWithClient.getTrades('');
      expect(emptyUserTrades).toEqual([]);
    });

    it('fetches and parses trades correctly from supabase query', async () => {
      const mockRawRows = [
        {
          id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
          user_id: 'user-1',
          symbol: 'BTCUSDT',
          direction: 'LONG',
          date: '2026-09-01',
          entry_price: '50000',
          position_size: '1',
          pnl: '500',
          confidence: 8,
          discipline: 9,
          notes: {},
          created_at: '2026-09-01T12:00:00Z',
          updated_at: '2026-09-01T12:00:00Z',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRawRows, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValue({ select: selectMock });

      const repo = new TradeRepository(mockClient);
      const trades = await repo.getTrades('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('trades');
      expect(trades.length).toBe(1);
      expect(trades[0].symbol).toBe('BTCUSDT');
      expect(trades[0].entry_price).toBe(50000);
      expect(trades[0].pnl).toBe(500);
    });

    it('creates trade via Supabase and returns parsed trade', async () => {
      const insertedRow = {
        id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
        user_id: 'user-1',
        symbol: 'ETHUSDT',
        direction: 'SHORT',
        date: '2026-09-02',
        entry_price: 2500,
        position_size: 2,
        created_at: '2026-09-02T12:00:00Z',
        updated_at: '2026-09-02T12:00:00Z',
      };

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const repo = new TradeRepository(mockClient);
      const created = await repo.createTrade(
        { symbol: 'ETHUSDT', direction: 'SHORT', entry_price: 2500, position_size: 2 },
        'user-1'
      );

      expect(created.id).toBe('da8fa828-991a-46a9-913f-0a4773f7d06a');
      expect(created.symbol).toBe('ETHUSDT');
    });

    it('deletes trade with exact userId and tradeId constraints', async () => {
      const deleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
      const deleteEqIdMock = vi.fn().mockReturnValue({ eq: deleteEqUserMock });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: deleteEqIdMock }),
      });

      const repo = new TradeRepository(mockClient);
      await repo.deleteTrade('da8fa828-991a-46a9-913f-0a4773f7d06a', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('trades');
      expect(deleteEqIdMock).toHaveBeenCalledWith('id', 'da8fa828-991a-46a9-913f-0a4773f7d06a');
      expect(deleteEqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('strictly ignores non-UUID trade deletions to prevent destructive database operations', async () => {
      const repo = new TradeRepository(mockClient);
      await repo.deleteTrade('trade-temp-12345', 'user-1');
      await repo.deleteTrade('invalid-id', 'user-1');

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('deletes multiple trades filtering strictly for valid UUIDs', async () => {
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ in: deleteInMock }),
      });

      const repo = new TradeRepository(mockClient);
      await repo.deleteTrades(
        [
          'da8fa828-991a-46a9-913f-0a4773f7d06a',
          'trade-non-uuid',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ],
        'user-1'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('trades');
      expect(deleteInMock).toHaveBeenCalledWith('id', [
        'da8fa828-991a-46a9-913f-0a4773f7d06a',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]);
      expect(deleteEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('deletes all trades for a given user', async () => {
      const deleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: deleteEqUserMock }),
      });

      const repo = new TradeRepository(mockClient);
      await repo.deleteAllTrades('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('trades');
      expect(deleteEqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('throws error when createTrade fails in Supabase', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Connection Timeout') }),
          }),
        }),
      });

      const repo = new TradeRepository(mockClient);
      await expect(
        repo.createTrade({ symbol: 'BTCUSDT' }, 'user-1')
      ).rejects.toThrow('DB Connection Timeout');
    });

    it('throws error when updateTrade fails in Supabase', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('RLS Violation') }),
              }),
            }),
          }),
        }),
      });

      const repo = new TradeRepository(mockClient);
      await expect(
        repo.updateTrade('da8fa828-991a-46a9-913f-0a4773f7d06a', { symbol: 'BTCUSDT' }, 'user-1')
      ).rejects.toThrow('RLS Violation');
    });

    it('throws error when bulkCreateTrades fails in Supabase', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: new Error('Bulk insert failed') }),
        }),
      });

      const repo = new TradeRepository(mockClient);
      await expect(
        repo.bulkCreateTrades([{ symbol: 'BTCUSDT' }], 'user-1')
      ).rejects.toThrow('Bulk insert failed');
    });
  });

  describe('AccountRepository', () => {
    it('fetches accounts and maps initial balance to number', async () => {
      const mockAccounts = [
        {
          id: 'acc-uuid-1',
          user_id: 'user-1',
          name: 'Main Prop',
          initial_balance: '50000.00',
          currency: 'USD',
          is_default: true,
          created_at: '2026-01-01',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
          }),
        }),
      });

      const repo = new AccountRepository(mockClient);
      const accounts = await repo.getAccounts('user-1');

      expect(accounts.length).toBe(1);
      expect(accounts[0].initial_balance).toBe(50000);
      expect(accounts[0].is_default).toBe(true);
    });

    it('creates new account and parses result', async () => {
      const createdAccount = {
        id: 'acc-uuid-2',
        user_id: 'user-1',
        name: 'Futures 100k',
        initial_balance: 100000,
        currency: 'USD',
        is_default: false,
        created_at: '2026-01-02',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdAccount, error: null }),
          }),
        }),
      });

      const repo = new AccountRepository(mockClient);
      const res = await repo.createAccount(
        { name: 'Futures 100k', initial_balance: 100000, currency: 'USD' },
        'user-1'
      );

      expect(res.name).toBe('Futures 100k');
      expect(res.initial_balance).toBe(100000);
    });
  });

  describe('Strategy, Setup & Tag Repositories', () => {
    it('creates strategies, setups, and tags correctly', async () => {
      const stratRepo = new StrategyRepository(mockClient);
      const setupRepo = new SetupRepository(mockClient);
      const tagRepo = new TagRepository(mockClient);

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          }),
        }),
      });

      const strat = await stratRepo.createStrategy('ICT', 'Smart Money', 'user-1');
      expect(strat.id).toBe('test-id');

      const setup = await setupRepo.createSetup('Breakout', 'Range Break', 'user-1');
      expect(setup.id).toBe('test-id');

      const tag = await tagRepo.createTag('A+ Setup', '#22C55E', 'user-1');
      expect(tag.id).toBe('test-id');
    });
  });

  describe('AuthRepository', () => {
    it('gets session and user from Supabase auth', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'trader@example.com' } },
        error: null,
      });

      const authRepo = new AuthRepository(mockClient);
      const session = await authRepo.getSession();
      const user = await authRepo.getCurrentUser();

      expect(session?.access_token).toBe('token-123');
      expect(user?.email).toBe('trader@example.com');
    });
  });

  describe('Architectural Dependency Direction', () => {
    it('verifies that no repositories or services import from trade-context', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const dirsToAudit = [
        path.resolve(process.cwd(), 'src/repositories'),
        path.resolve(process.cwd(), 'src/services'),
      ];

      for (const dir of dirsToAudit) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          expect(content).not.toContain('trade-context');
        }
      }
    });
  });
});
