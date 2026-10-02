import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeRepository } from '../repositories/trade.repository';
import { AccountRepository } from '../repositories/account.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { SetupRepository } from '../repositories/setup.repository';
import { TagRepository } from '../repositories/tag.repository';
import { AuthRepository } from '../repositories/auth.repository';

describe('Repository Layer Unit Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
    };
  });

  describe('TradeRepository', () => {
    it('returns empty array if supabase or userId is missing', async () => {
      const repoWithoutClient = new TradeRepository(null);
      const trades = await repoWithoutClient.getTrades('user-1');
      expect(trades).toEqual([]);

      const repoWithClient = new TradeRepository(mockSupabase);
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

      const repo = new TradeRepository(mockSupabase);
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

      const repo = new TradeRepository(mockSupabase);
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

      const repo = new TradeRepository(mockSupabase);
      await repo.deleteTrade('da8fa828-991a-46a9-913f-0a4773f7d06a', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('trades');
      expect(deleteEqIdMock).toHaveBeenCalledWith('id', 'da8fa828-991a-46a9-913f-0a4773f7d06a');
      expect(deleteEqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
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

      const repo = new AccountRepository(mockSupabase);
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

      const repo = new AccountRepository(mockSupabase);
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
      const stratRepo = new StrategyRepository(mockSupabase);
      const setupRepo = new SetupRepository(mockSupabase);
      const tagRepo = new TagRepository(mockSupabase);

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

      const authRepo = new AuthRepository(mockSupabase);
      const session = await authRepo.getSession();
      const user = await authRepo.getCurrentUser();

      expect(session?.access_token).toBe('token-123');
      expect(user?.email).toBe('trader@example.com');
    });
  });
});
