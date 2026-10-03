'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  Trade,
  Account,
  Setup,
  Strategy,
  Tag,
  TradeFilterOptions,
} from '../types/trade';
import {
  DEMO_ACCOUNTS,
  DEMO_SETUPS,
  DEMO_STRATEGIES,
  DEMO_TAGS,
  DEMO_TRADES,
} from '../lib/demo-data';
import {
  calculatePnL,
  calculateRiskAmount,
  calculateRiskPercent,
  calculateRMultiple,
  calculateResult,
} from '../lib/calculations';
import { createClient } from '../lib/supabase/client';
import { syncService } from '../services/sync.service';
import { TradeRepository } from '../repositories/trade.repository';
import { AccountRepository } from '../repositories/account.repository';
import { SetupRepository } from '../repositories/setup.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { TagRepository } from '../repositories/tag.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { isValidUUID, sanitizeIntScale1to10, normalizeAssetClass } from '../lib/trades/trade-validation';
import { isDemoTrade } from '../lib/demo/demo-utils';
import { parseSupabaseTrade } from '../lib/trades/trade-mappers';
import type { User } from '@supabase/supabase-js';

// Re-export helpers for backwards compatibility
export { isValidUUID, sanitizeIntScale1to10, normalizeAssetClass, isDemoTrade, parseSupabaseTrade };

interface TradeContextType {
  trades: Trade[];
  accounts: Account[];
  setups: Setup[];
  strategies: Strategy[];
  tags: Tag[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  filters: TradeFilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<TradeFilterOptions>>;
  resetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredTrades: Trade[];
  addTrade: (tradeData: Partial<Trade>) => Promise<Trade>;
  updateTrade: (id: string, tradeData: Partial<Trade>) => Promise<Trade>;
  deleteTrade: (id: string) => Promise<void>;
  importTrades: (newTrades: Partial<Trade>[]) => Promise<{ imported: number; duplicates: number }>;
  addAccount: (accountData: { name: string; initial_balance: number; currency?: string }) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  setDefaultAccount: (id: string) => Promise<void>;
  addSetup: (name: string, description?: string) => Promise<Setup>;
  addStrategy: (name: string, description?: string) => Promise<Strategy>;
  addTag: (name: string, color?: string) => Promise<Tag>;
  selectedTradeForDetail: Trade | null;
  setSelectedTradeForDetail: (trade: Trade | null) => void;
  isAddTradeModalOpen: boolean;
  setIsAddTradeModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  resetToDemoData: () => void;
  clearAllTrades: () => void;
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  syncError: string | null;
  syncWithCloud: () => Promise<void>;
  exportTradesToJson: () => void;
  importTradesFromJson: (jsonString: string) => Promise<{ imported: number; error?: string }>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tradelab_trades_data_v1';

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const tradeRepo = useMemo(() => new TradeRepository(supabase), [supabase]);
  const accountRepo = useMemo(() => new AccountRepository(supabase), [supabase]);
  const setupRepo = useMemo(() => new SetupRepository(supabase), [supabase]);
  const strategyRepo = useMemo(() => new StrategyRepository(supabase), [supabase]);
  const tagRepo = useMemo(() => new TagRepository(supabase), [supabase]);
  const authRepo = useMemo(() => new AuthRepository(supabase), [supabase]);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [setups, setSetups] = useState<Setup[]>(DEMO_SETUPS);
  const [strategies, setStrategies] = useState<Strategy[]>(DEMO_STRATEGIES);
  const [tags, setTags] = useState<Tag[]>(DEMO_TAGS);
  const [activeAccountId, setActiveAccountId] = useState<string>('all');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Modals & Drawers
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<TradeFilterOptions>({
    dateRangePreset: 'all',
    direction: 'ALL',
    result: 'ALL',
  });

  const signOut = async () => {
    try {
      await authRepo.signOut();
    } catch (err) {
      console.warn('Auth signOut error:', err);
    }
    syncService.unsubscribe(supabase);
    setUser(null);
    setIsDemoMode(true);
    setSyncStatus('offline');
    setSyncError(null);
    // User switching isolation: clear User A's data from in-memory state and localStorage
    setTrades(DEMO_TRADES);
    setAccounts(DEMO_ACCOUNTS);
    setSetups(DEMO_SETUPS);
    setStrategies(DEMO_STRATEGIES);
    setTags(DEMO_TAGS);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  };

  // Persist locally for immediate offline reactivity
  const persistState = (
    newTrades: Trade[],
    newAccounts = accounts,
    newSetups = setups,
    newStrats = strategies,
    newTags = tags
  ) => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          trades: newTrades,
          accounts: newAccounts,
          setups: newSetups,
          strategies: newStrats,
          tags: newTags,
          hasCustomData: true,
        })
      );
    } catch {
      // quota or private mode fallback
    }
  };

  const loadLocalInitialState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hasCustomData || Array.isArray(parsed.trades)) {
          const loadedTrades = parsed.trades || [];
          setTrades(loadedTrades);
          if (parsed.accounts && parsed.accounts.length > 0) setAccounts(parsed.accounts);
          if (parsed.setups && parsed.setups.length > 0) setSetups(parsed.setups);
          if (parsed.strategies && parsed.strategies.length > 0) setStrategies(parsed.strategies);
          if (parsed.tags && parsed.tags.length > 0) setTags(parsed.tags);
          setIsLoading(false);
          setIsDemoMode(loadedTrades.length > 0 && loadedTrades.every((t: Trade) => isDemoTrade(t)));
          return;
        }
      }
    } catch {
      // ignore parse error
    }

    setTrades(DEMO_TRADES);
    setIsLoading(false);
    setIsDemoMode(true);
  };

  const loadSupabaseData = async (userId: string, isInitialLogin: boolean = false) => {
    if (!supabase) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    setIsLoading(true);
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      // 1. Fetch or create user accounts via AccountRepository
      let currentAccounts = accounts;
      try {
        const dbAccounts = await accountRepo.getAccounts(userId);
        if (dbAccounts && dbAccounts.length > 0) {
          currentAccounts = dbAccounts;
          setAccounts(dbAccounts);
        } else {
          // Create initial default account so foreign key inserts succeed with valid UUID
          const newAcc = await accountRepo.createAccount(
            {
              name: 'Main Account',
              initial_balance: 10000.0,
              currency: 'USD',
              is_default: true,
            },
            userId
          );
          if (newAcc) {
            currentAccounts = [newAcc];
            setAccounts([newAcc]);
          }
        }
      } catch (accErr) {
        console.warn('AccountRepo getAccounts warning:', accErr);
      }

      // 2. Fetch Setups, Strategies, Tags via Repositories
      let currentSetups = setups;
      try {
        const dbSetups = await setupRepo.getSetups(userId);
        if (dbSetups && dbSetups.length > 0) {
          currentSetups = dbSetups;
          setSetups(dbSetups);
        }
      } catch (setupErr) {
        console.warn('SetupRepo getSetups warning:', setupErr);
      }

      let currentStrats = strategies;
      try {
        const dbStrats = await strategyRepo.getStrategies(userId);
        if (dbStrats && dbStrats.length > 0) {
          currentStrats = dbStrats;
          setStrategies(dbStrats);
        }
      } catch (stratErr) {
        console.warn('StrategyRepo getStrategies warning:', stratErr);
      }

      try {
        const dbTags = await tagRepo.getTags(userId);
        if (dbTags && dbTags.length > 0) setTags(dbTags);
      } catch (tagErr) {
        console.warn('TagRepo getTags warning:', tagErr);
      }

      // 3. Fetch Trades via TradeRepository
      let parsedDbTrades: Trade[] = [];
      try {
        parsedDbTrades = await tradeRepo.getTrades(userId, currentAccounts, currentSetups, currentStrats);
      } catch (dbTradesError: unknown) {
        console.error('TradeRepo getTrades error:', dbTradesError);
        const errMsg = dbTradesError instanceof Error ? dbTradesError.message : 'Error fetching trades';
        setSyncStatus('error');
        setSyncError(errMsg);
        loadLocalInitialState();
        return;
      }

      // Clean out any demo trades that were previously accidentally uploaded to Supabase
      const demoTradeIds = parsedDbTrades.filter((t) => isDemoTrade(t)).map((t) => t.id).filter(isValidUUID);
      if (demoTradeIds.length > 0) {
        try {
          await tradeRepo.deleteTrades(demoTradeIds, userId);
          console.log(`Purged ${demoTradeIds.length} accidental demo trades from Supabase`);
        } catch (e) {
          console.warn('Error purging demo trades:', e);
        }
      }

      const realDbTrades = parsedDbTrades.filter((t) => !isDemoTrade(t));

      // Deduplicate DB trades by UUID and signature to heal any historical duplicated rows
      const uniqueDbTrades = syncService.deduplicateTrades(realDbTrades);

      // 4. One-time initial migration ONLY when user first logs in AND Supabase is completely empty
      if (isInitialLogin && uniqueDbTrades.length === 0) {
        let localTrades: Trade[] = [];
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.trades)) {
              localTrades = parsed.trades.filter((t: Trade) => !isDemoTrade(t));
            }
          }
        } catch {
          // ignore
        }

        if (localTrades.length > 0) {
          const defaultAccountId = currentAccounts.find((a) => isValidUUID(a.id))?.id || null;
          const sanitizedLocal = localTrades.map((t) => ({
            ...t,
            account_id: isValidUUID(t.account_id) ? t.account_id : defaultAccountId,
          }));

          const newlyUploaded = await tradeRepo.bulkCreateTrades(
            sanitizedLocal,
            userId,
            currentAccounts,
            currentSetups,
            currentStrats
          );
          if (newlyUploaded && newlyUploaded.length > 0) {
            uniqueDbTrades.push(...newlyUploaded);
          }
        }
      }

      uniqueDbTrades.sort(
        (a, b) =>
          new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() -
          new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
      );

      setTrades(uniqueDbTrades);
      persistState(uniqueDbTrades, currentAccounts, currentSetups, currentStrats, tags);
      setIsDemoMode(false);
      setSyncStatus('synced');
    } catch (err: unknown) {
      console.error('Supabase fetch error, retaining local state:', err);
      const errMsg = err instanceof Error ? err.message : 'Error de conexión';
      setSyncStatus('error');
      setSyncError(errMsg);
      if (trades.length === 0) {
        loadLocalInitialState();
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 300);
    }
  };

  // Force manual cloud sync
  const syncWithCloud = async () => {
    if (!supabase) {
      setSyncStatus('offline');
      return;
    }
    const authUser = await authRepo.getCurrentUser();
    const activeUser = user || authUser;
    if (!activeUser) {
      setSyncStatus('offline');
      return;
    }
    await loadSupabaseData(activeUser.id, false);
  };

  // Export & Import backup functions
  const exportTradesToJson = () => {
    const nonDemoTrades = trades.filter((t) => !isDemoTrade(t));
    const dataToExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trades: nonDemoTrades.length > 0 ? nonDemoTrades : trades,
      accounts: accounts.filter((a) => !a.id.startsWith('acc-demo-')),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradelab-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importTradesFromJson = async (jsonString: string): Promise<{ imported: number; error?: string }> => {
    try {
      const parsed = JSON.parse(jsonString);
      const rawTrades = Array.isArray(parsed) ? parsed : parsed.trades;
      if (!Array.isArray(rawTrades)) {
        return { imported: 0, error: 'Formato inválido: falta la lista de trades' };
      }
      const res = await importTrades(rawTrades);
      return { imported: res.imported };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al procesar el archivo JSON';
      return { imported: 0, error: errMsg };
    }
  };

  // Initialize data, check session & setup Realtime listener
  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      queueMicrotask(() => {
        if (isMounted) {
          loadLocalInitialState();
          setSyncStatus('offline');
        }
      });
      return () => {
        isMounted = false;
      };
    }

    authRepo.getSession().then((session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        setSyncStatus('synced');
        loadSupabaseData(session.user.id, true);
        syncService.subscribeToUserTrades(supabase, session.user.id, () => {
          loadSupabaseData(session.user.id, false);
        });
      } else {
        loadLocalInitialState();
        setSyncStatus('offline');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        setSyncStatus('synced');
        if (event === 'SIGNED_IN') {
          loadSupabaseData(session.user.id, true);
          syncService.subscribeToUserTrades(supabase, session.user.id, () => {
            loadSupabaseData(session.user.id, false);
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsDemoMode(true);
        setSyncStatus('offline');
        syncService.unsubscribe(supabase);
        loadLocalInitialState();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      syncService.unsubscribe(supabase);
    };
  }, []);

  const resetToDemoData = () => {
    setIsDemoMode(true);
    setTrades(DEMO_TRADES);
    setAccounts(DEMO_ACCOUNTS);
    setSetups(DEMO_SETUPS);
    setStrategies(DEMO_STRATEGIES);
    setTags(DEMO_TAGS);
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          trades: DEMO_TRADES,
          accounts: DEMO_ACCOUNTS,
          setups: DEMO_SETUPS,
          strategies: DEMO_STRATEGIES,
          tags: DEMO_TAGS,
          hasCustomData: false,
        })
      );
    } catch {}
  };

  const clearAllTrades = async () => {
    if (user) {
      setSyncStatus('syncing');
      try {
        await syncService.withLocalMutation(() => tradeRepo.deleteAllTrades(user.id));
        // Confirmed cloud deletion succeeded: now safely clear application and cache state
        setIsDemoMode(false);
        setTrades([]);
        setSelectedTradeForDetail(null);
        persistState([]);
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error al vaciar trades en la nube';
        console.error('Error clearing trades in Supabase via repository:', err);
        setSyncStatus('error');
        setSyncError(errorMsg);
        // Do NOT wipe local state or localStorage on failure
        throw err;
      }
    } else {
      // Unauthenticated / demo mode: clear application state & cache
      setIsDemoMode(false);
      setTrades([]);
      setSelectedTradeForDetail(null);
      persistState([]);
    }
  };

  const resetFilters = () => {
    setFilters({
      dateRangePreset: 'all',
      direction: 'ALL',
      result: 'ALL',
    });
    setSearchQuery('');
  };

  const getAccountBalanceForTrade = (accountId?: string | null): number | null => {
    if (accountId) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc && acc.initial_balance > 0) {
        return acc.initial_balance;
      }
    }
    const defaultAcc = accounts.find((a) => a.is_default) || accounts[0];
    if (defaultAcc && defaultAcc.initial_balance > 0) {
      return defaultAcc.initial_balance;
    }
    return null;
  };

  /**
   * Helper to compute derived financial fields.
   *
   * ARCHITECTURE NOTE / BALANCE SEMANTICS:
   * Currently, risk_percent and pnl_percent are calculated using `initial_balance`
   * of the resolved account (or default account if unspecified).
   * It is NOT an exact historical balance or current dynamic balance.
   *
   * TODO (Phase 6+): Distinguish between:
   * 1. initial_balance: The opening balance configured for the account.
   * 2. current_balance: The realized cash balance accounting for all closed trades & deposits/withdrawals.
   * 3. equity_before_trade: The exact point-in-time account equity immediately before this trade was opened,
   *    necessary for precise historical risk % and R-multiple calculations.
   *
   * If an account cannot be resolved or has no balance > 0, risk_percent and pnl_percent
   * evaluate to null (no silent $10,000 fallback).
   */
  const computeDerivedFields = (data: Partial<Trade>, explicitBalance?: number | null): Partial<Trade> => {
    const balance =
      explicitBalance !== undefined && explicitBalance !== null && explicitBalance > 0
        ? explicitBalance
        : getAccountBalanceForTrade(data.account_id);
    const direction = data.direction || 'LONG';
    const entryPrice = Number(data.entry_price) || 0;
    const exitPrice = data.exit_price !== undefined && data.exit_price !== null ? Number(data.exit_price) : null;
    const positionSize = Number(data.position_size) || 1;
    const contractMultiplier = Number(data.contract_multiplier) || 1;
    const stopLoss = data.stop_loss !== undefined && data.stop_loss !== null ? Number(data.stop_loss) : null;
    const commission = Number(data.commission) || 0;
    const swap = Number(data.swap) || 0;

    const hasPnl = data.pnl !== undefined && data.pnl !== null && !isNaN(Number(data.pnl));
    const pnl = hasPnl
      ? Number(Number(data.pnl).toFixed(2))
      : calculatePnL({
          direction,
          entryPrice,
          exitPrice,
          positionSize,
          contractMultiplier,
          commission,
          swap,
        });

    const riskAmount = calculateRiskAmount({
      entryPrice,
      stopLoss,
      positionSize,
      contractMultiplier,
    });

    const riskPercent = balance !== null && balance > 0 ? calculateRiskPercent(riskAmount, balance) : null;
    const rMultiple = calculateRMultiple(pnl, riskAmount);
    const result = calculateResult(pnl);

    const pnlPercent =
      pnl !== null && balance !== null && balance > 0
        ? Number(((pnl / balance) * 100).toFixed(2))
        : null;

    return {
      ...data,
      pnl,
      pnl_percent: pnlPercent,
      risk_amount: riskAmount,
      risk_percent: riskPercent,
      r_multiple: rMultiple,
      result,
    };
  };

  // Add Single Trade
  const addTrade = async (tradeData: Partial<Trade>): Promise<Trade> => {
    const accountBalance = getAccountBalanceForTrade(tradeData.account_id);
    const computed = computeDerivedFields(tradeData, accountBalance);
    let newTrade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: user?.id || 'user-default',
      account_id: computed.account_id || accounts[0]?.id,
      account_name: accounts.find((a) => a.id === computed.account_id)?.name || accounts[0]?.name || 'Main Account',
      date: computed.date || new Date().toISOString().split('T')[0],
      entry_time: computed.entry_time || '09:30',
      exit_time: computed.exit_time || null,
      symbol: (computed.symbol || 'BTCUSDT').toUpperCase().trim(),
      direction: computed.direction || 'LONG',
      timeframe: computed.timeframe || '15m',
      session: computed.session || 'New York',
      entry_price: Number(computed.entry_price) || 0,
      exit_price: computed.exit_price !== undefined && computed.exit_price !== null ? Number(computed.exit_price) : null,
      stop_loss: computed.stop_loss !== undefined && computed.stop_loss !== null ? Number(computed.stop_loss) : null,
      take_profit: computed.take_profit !== undefined && computed.take_profit !== null ? Number(computed.take_profit) : null,
      position_size: Number(computed.position_size) || 1,
      contract_multiplier: Number(computed.contract_multiplier) || 1,
      asset_class: normalizeAssetClass(computed.asset_class || 'crypto'),
      tick_size: computed.tick_size,
      tick_value: computed.tick_value,
      risk_amount: computed.risk_amount,
      risk_percent: computed.risk_percent,
      commission: computed.commission || 0,
      swap: computed.swap || 0,
      pnl: computed.pnl,
      pnl_percent: computed.pnl_percent,
      r_multiple: computed.r_multiple,
      result: computed.result,
      strategy_id: computed.strategy_id,
      strategy_name: strategies.find((s) => s.id === computed.strategy_id)?.name,
      setup_id: computed.setup_id,
      setup_name: setups.find((s) => s.id === computed.setup_id)?.name,
      tags: computed.tags || [],
      emotion: computed.emotion || 'Calm',
      confidence: sanitizeIntScale1to10(computed.confidence, 7),
      discipline: sanitizeIntScale1to10(computed.discipline, 8),
      mistake: computed.mistake || 'None',
      notes: computed.notes || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        const persisted = await syncService.withLocalMutation(() =>
          tradeRepo.createTrade(
            newTrade,
            user.id,
            accounts,
            setups,
            strategies
          )
        );
        newTrade = persisted;
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: unknown) {
        console.error('Failed to create trade via TradeRepository:', err);
        const errorMsg = err instanceof Error ? err.message : 'Error al guardar trade';
        setSyncStatus('error');
        setSyncError(errorMsg);
        throw err;
      }
    }

    // If currently only demo trades exist, replace with user's real trades
    const isOnlyDemoTrades = trades.length > 0 && trades.every((t) => isDemoTrade(t));
    const baseTrades = isOnlyDemoTrades ? [] : trades;

    const nextTrades = [newTrade, ...baseTrades].sort(
      (a, b) => new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
    );

    setTrades(nextTrades);
    persistState(nextTrades);
    return newTrade;
  };

  // Update Trade
  const updateTrade = async (id: string, tradeData: Partial<Trade>): Promise<Trade> => {
    const existing = trades.find((t) => t.id === id);
    if (!existing) throw new Error('Trade not found');

    const merged = { ...existing, ...tradeData };
    const accountBalance = getAccountBalanceForTrade(merged.account_id);
    const computed = computeDerivedFields(merged, accountBalance);

    let updatedTrade: Trade = {
      ...merged,
      ...computed,
      asset_class: merged.asset_class ? normalizeAssetClass(merged.asset_class) : undefined,
      strategy_name: strategies.find((s) => s.id === computed.strategy_id)?.name || merged.strategy_name,
      setup_name: setups.find((s) => s.id === computed.setup_id)?.name || merged.setup_name,
      account_name: accounts.find((a) => a.id === computed.account_id)?.name || merged.account_name,
      updated_at: new Date().toISOString(),
    } as Trade;

    if (supabase && user && isValidUUID(id)) {
      try {
        const persisted = await syncService.withLocalMutation(() =>
          tradeRepo.updateTrade(
            id,
            updatedTrade,
            user.id,
            accounts,
            setups,
            strategies
          )
        );
        updatedTrade = persisted;
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: unknown) {
        console.error('Failed to update trade via TradeRepository:', err);
        const errorMsg = err instanceof Error ? err.message : 'Error al actualizar trade';
        setSyncStatus('error');
        setSyncError(errorMsg);
        throw err;
      }
    }

    const nextTrades = trades
      .map((t) => (t.id === id ? updatedTrade : t))
      .sort(
        (a, b) => new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
      );

    setTrades(nextTrades);
    persistState(nextTrades);

    if (selectedTradeForDetail?.id === id) {
      setSelectedTradeForDetail(updatedTrade);
    }
    return updatedTrade;
  };

  // Delete Trade
  const deleteTrade = async (id: string): Promise<void> => {
    const target = trades.find((t) => t.id === id);
    if (!target) return;

    if (user && isValidUUID(id)) {
      // Optimistic delete with rollback on error
      const previousTrades = [...trades];
      const previousSelected = selectedTradeForDetail;

      const nextTrades = trades.filter((t) => t.id !== id);
      setTrades(nextTrades);
      persistState(nextTrades);
      if (selectedTradeForDetail?.id === id) {
        setSelectedTradeForDetail(null);
      }

      try {
        await syncService.withLocalMutation(() => tradeRepo.deleteTrade(id, user.id));
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: unknown) {
        // Rollback state on error
        setTrades(previousTrades);
        setSelectedTradeForDetail(previousSelected);
        persistState(previousTrades);
        const errorMsg = err instanceof Error ? err.message : 'Error al eliminar trade en la nube';
        console.error('Failed to delete trade via TradeRepository:', err);
        setSyncStatus('error');
        setSyncError(errorMsg);
        throw err;
      }
    } else {
      // Local-only trade (e.g. temporary ID or demo): delete locally only.
      // NEVER perform approximate database deletes.
      const nextTrades = trades.filter((t) => t.id !== id);
      setTrades(nextTrades);
      persistState(nextTrades);
      if (selectedTradeForDetail?.id === id) {
        setSelectedTradeForDetail(null);
      }
    }
  };

  // Import Bulk Trades with duplicate detection
  const importTrades = async (newTrades: Partial<Trade>[]): Promise<{ imported: number; duplicates: number }> => {
    let duplicateCount = 0;
    const added: Trade[] = [];

    // Duplicate detection key: symbol + direction + date + entry_price + exit_price + pnl
    const existingKeys = new Set(
      trades.map(
        (t) =>
          `${t.symbol.toUpperCase()}|${t.direction}|${t.date}|${t.entry_price}|${t.exit_price}|${t.pnl}`
      )
    );

    for (const raw of newTrades) {
      const accountBalance = getAccountBalanceForTrade(raw.account_id);
      const computed = computeDerivedFields(raw, accountBalance);
      const symbol = (computed.symbol || '').toUpperCase().trim();
      const key = `${symbol}|${computed.direction}|${computed.date}|${computed.entry_price}|${computed.exit_price}|${computed.pnl}`;

      if (existingKeys.has(key)) {
        duplicateCount++;
        continue;
      }
      existingKeys.add(key);

      const trade: Trade = {
        id: `trade-imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        user_id: user?.id || 'user-default',
        account_id: computed.account_id || accounts[0]?.id,
        account_name: accounts.find((a) => a.id === computed.account_id)?.name || 'Main Account',
        date: computed.date || new Date().toISOString().split('T')[0],
        entry_time: computed.entry_time || '10:00',
        exit_time: computed.exit_time || null,
        symbol: symbol || 'UNKNOWN',
        direction: (computed.direction as 'LONG' | 'SHORT') || 'LONG',
        timeframe: computed.timeframe || '15m',
        session: computed.session || 'London',
        entry_price: Number(computed.entry_price) || 0,
        exit_price: computed.exit_price,
        stop_loss: computed.stop_loss,
        take_profit: computed.take_profit,
        position_size: Number(computed.position_size) || 1,
        contract_multiplier: Number(computed.contract_multiplier) || 1,
        asset_class: normalizeAssetClass(computed.asset_class || 'crypto'),
        tick_size: computed.tick_size,
        tick_value: computed.tick_value,
        risk_amount: computed.risk_amount,
        risk_percent: computed.risk_percent,
        commission: computed.commission || 0,
        swap: computed.swap || 0,
        pnl: computed.pnl,
        pnl_percent: computed.pnl_percent,
        r_multiple: computed.r_multiple,
        result: computed.result,
        strategy_id: computed.strategy_id || null,
        strategy_name: strategies.find((s) => s.id === computed.strategy_id)?.name,
        setup_id: computed.setup_id || null,
        setup_name: setups.find((s) => s.id === computed.setup_id)?.name,
        tags: computed.tags || ['Imported'],
        emotion: computed.emotion || 'Calm',
        confidence: computed.confidence || 7,
        discipline: computed.discipline || 7,
        mistake: computed.mistake || 'None',
        notes: computed.notes || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      added.push(trade);
    }

    // If currently only demo trades exist, replace them with user's real imported trades
    const isOnlyDemoTrades = trades.length > 0 && trades.every((t) => isDemoTrade(t));
    const baseTrades = isOnlyDemoTrades ? [] : trades;

    let finalAdded = added;

    if (supabase && user && added.length > 0) {
      try {
        const persistedTrades = await syncService.withLocalMutation(() =>
          tradeRepo.bulkCreateTrades(
            added,
            user.id,
            accounts,
            setups,
            strategies
          )
        );
        if (persistedTrades.length > 0) {
          finalAdded = persistedTrades;
          setSyncStatus('synced');
          setSyncError(null);
        }
      } catch (err: unknown) {
        console.error('Failed to bulk create trades via TradeRepository:', err);
        const errorMsg = err instanceof Error ? err.message : 'Error al importar trades';
        setSyncStatus('error');
        setSyncError(errorMsg);
        throw err;
      }
    }

    const nextTrades = [...finalAdded, ...baseTrades].sort(
      (a, b) => new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
    );

    setTrades(nextTrades);
    persistState(nextTrades);

    return { imported: finalAdded.length, duplicates: duplicateCount };
  };

  // Add custom Account
  const addAccount = async ({
    name,
    initial_balance,
    currency = 'USD',
  }: {
    name: string;
    initial_balance: number;
    currency?: string;
  }): Promise<Account> => {
    const isFirstAccount = accounts.length === 0;
    let newAccount: Account = {
      id: `acc-${Date.now()}`,
      user_id: user?.id || 'user-default',
      name: name.trim(),
      initial_balance: Number(initial_balance) || 0,
      currency,
      is_default: isFirstAccount,
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        newAccount = await accountRepo.createAccount(
          {
            name: newAccount.name,
            initial_balance: newAccount.initial_balance,
            currency: newAccount.currency,
            is_default: newAccount.is_default,
          },
          user.id
        );
      } catch (err) {
        console.error('Failed to create account via AccountRepository:', err);
      }
    }

    const nextAccounts = [...accounts, newAccount];
    setAccounts(nextAccounts);
    persistState(trades, nextAccounts, setups, strategies, tags);
    return newAccount;
  };

  // Delete Account
  const deleteAccount = async (id: string): Promise<void> => {
    if (supabase && user && isValidUUID(id)) {
      try {
        await accountRepo.deleteAccount(id, user.id);
      } catch (err) {
        console.error('Failed to delete account via AccountRepository:', err);
      }
    }

    const nextAccounts = accounts.filter((a) => a.id !== id);
    if (nextAccounts.length > 0 && !nextAccounts.some((a) => a.is_default)) {
      nextAccounts[0].is_default = true;
    }
    setAccounts(nextAccounts);
    persistState(trades, nextAccounts, setups, strategies, tags);
  };

  // Set Default Account
  const setDefaultAccount = async (id: string): Promise<void> => {
    const nextAccounts = accounts.map((a) => ({
      ...a,
      is_default: a.id === id,
    }));

    if (supabase && user && isValidUUID(id)) {
      try {
        await accountRepo.setDefaultAccount(id, user.id);
      } catch (err) {
        console.error('Failed to set default account via AccountRepository:', err);
      }
    }

    setAccounts(nextAccounts);
    persistState(trades, nextAccounts, setups, strategies, tags);
  };

  // Add custom Setup
  const addSetup = async (name: string, description?: string): Promise<Setup> => {
    let newSetup: Setup = {
      id: `setup-${Date.now()}`,
      user_id: user?.id || 'user-default',
      name: name.trim(),
      description: description || '',
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        newSetup = await setupRepo.createSetup(name, description, user.id);
      } catch (err) {
        console.error('Failed to create setup via SetupRepository:', err);
      }
    }

    const nextSetups = [...setups, newSetup];
    setSetups(nextSetups);
    persistState(trades, accounts, nextSetups, strategies, tags);
    return newSetup;
  };

  // Add custom Strategy
  const addStrategy = async (name: string, description?: string): Promise<Strategy> => {
    let newStrat: Strategy = {
      id: `strat-${Date.now()}`,
      user_id: user?.id || 'user-default',
      name: name.trim(),
      description: description || '',
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        newStrat = await strategyRepo.createStrategy(name, description, user.id);
      } catch (err) {
        console.error('Failed to create strategy via StrategyRepository:', err);
      }
    }

    const nextStrats = [...strategies, newStrat];
    setStrategies(nextStrats);
    persistState(trades, accounts, setups, nextStrats, tags);
    return newStrat;
  };

  // Add custom Tag
  const addTag = async (name: string, color: string = '#38BDF8'): Promise<Tag> => {
    let newTag: Tag = {
      id: `tag-${Date.now()}`,
      user_id: user?.id || 'user-default',
      name: name.trim(),
      color,
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        newTag = await tagRepo.createTag(name, color, user.id);
      } catch (err) {
        console.error('Failed to create tag via TagRepository:', err);
      }
    }

    const nextTags = [...tags, newTag];
    setTags(nextTags);
    persistState(trades, accounts, setups, strategies, nextTags);
    return newTag;
  };

  // Filtered trades calculation
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Account filter
      if (activeAccountId !== 'all' && t.account_id && t.account_id !== activeAccountId) {
        return false;
      }

      // Search Query filter (Symbol, Notes, Setup, Strategy, Tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const symbolMatch = t.symbol.toLowerCase().includes(q);
        const setupMatch = (t.setup_name || '').toLowerCase().includes(q);
        const stratMatch = (t.strategy_name || '').toLowerCase().includes(q);
        const tagMatch = t.tags?.some((tg) => tg.toLowerCase().includes(q));
        const notesMatch = Object.values(t.notes || {}).some((v) =>
          typeof v === 'string' && v.toLowerCase().includes(q)
        );

        if (!symbolMatch && !setupMatch && !stratMatch && !tagMatch && !notesMatch) {
          return false;
        }
      }

      // Date Range filter
      if (filters.dateRangePreset && filters.dateRangePreset !== 'all') {
        const tradeDate = new Date(t.date);
        const now = new Date();

        if (filters.dateRangePreset === 'today') {
          const todayStr = now.toISOString().split('T')[0];
          if (t.date !== todayStr) return false;
        } else if (filters.dateRangePreset === 'week') {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (tradeDate < sevenDaysAgo) return false;
        } else if (filters.dateRangePreset === 'month') {
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (tradeDate < thirtyDaysAgo) return false;
        } else if (filters.dateRangePreset === 'last_month') {
          const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          if (tradeDate < startLastMonth || tradeDate > endLastMonth) return false;
        } else if (filters.dateRangePreset === 'year') {
          const startYear = new Date(now.getFullYear(), 0, 1);
          if (tradeDate < startYear) return false;
        }
      }

      if (filters.startDate && t.date < filters.startDate) return false;
      if (filters.endDate && t.date > filters.endDate) return false;

      // Symbol
      if (filters.symbol && t.symbol !== filters.symbol) return false;

      // Direction
      if (filters.direction && filters.direction !== 'ALL' && t.direction !== filters.direction) {
        return false;
      }

      // Result
      if (filters.result && filters.result !== 'ALL' && t.result !== filters.result) {
        return false;
      }

      // Setup
      if (filters.setup && t.setup_id !== filters.setup && t.setup_name !== filters.setup) {
        return false;
      }

      // Strategy
      if (filters.strategy && t.strategy_id !== filters.strategy && t.strategy_name !== filters.strategy) {
        return false;
      }

      // Session
      if (filters.session && t.session !== filters.session) return false;

      // Timeframe
      if (filters.timeframe && t.timeframe !== filters.timeframe) return false;

      // Emotion
      if (filters.emotion && t.emotion !== filters.emotion) return false;

      // Mistake
      if (filters.mistake && t.mistake !== filters.mistake) return false;

      // Tag
      if (filters.tag && !t.tags?.includes(filters.tag)) return false;

      return true;
    });
  }, [trades, activeAccountId, searchQuery, filters]);

  return (
    <TradeContext.Provider
      value={{
        trades,
        accounts,
        setups,
        strategies,
        tags,
        activeAccountId,
        setActiveAccountId,
        filters,
        setFilters,
        resetFilters,
        searchQuery,
        setSearchQuery,
        filteredTrades,
        addTrade,
        updateTrade,
        deleteTrade,
        importTrades,
        addAccount,
        deleteAccount,
        setDefaultAccount,
        addSetup,
        addStrategy,
        addTag,
        selectedTradeForDetail,
        setSelectedTradeForDetail,
        isAddTradeModalOpen,
        setIsAddTradeModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        isDemoMode,
        setIsDemoMode,
        resetToDemoData,
        clearAllTrades,
        user,
        signOut,
        isLoading,
        syncStatus,
        syncError,
        syncWithCloud,
        exportTradesToJson,
        importTradesFromJson,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
}
