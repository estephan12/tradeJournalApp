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
import { isSupabaseConfigured, createClient } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

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

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isDemoTrade(trade: Partial<Trade>): boolean {
  if (!trade) return false;
  if (trade.user_id === 'demo-user') return true;
  if (trade.account_id === 'acc-demo-1' || trade.account_id === 'acc-demo-2') return true;
  const id = trade.id || '';
  if (
    id.startsWith('trade-demo-') ||
    id.startsWith('trade-0') ||
    id.startsWith('trade-btc-') ||
    id.startsWith('trade-eur-') ||
    id.startsWith('trade-gbp-') ||
    id.startsWith('trade-usdjpy-') ||
    id.startsWith('trade-xau-')
  ) {
    return true;
  }

  // Detect demo dataset trades that were uploaded to Supabase with generated UUIDs
  const notes = trade.notes as any;
  if (notes && typeof notes === 'object') {
    const thesis = typeof notes.tradeThesis === 'string' ? notes.tradeThesis : '';
    const lesson = typeof notes.lesson === 'string' ? notes.lesson : '';
    if (
      thesis.includes('Clean daily breakout with rising volume') ||
      thesis.includes('London open liquidity run targeting') ||
      thesis.includes('London session pullback trying to catch') ||
      thesis.includes('Asian and NY session liquidity sweep') ||
      thesis.includes('New York session impulse on Gold') ||
      lesson.includes('New York session momentum continues to provide clean follow-through on BTCUSDT') ||
      lesson.includes('EURUSD reversals around NY overlap') ||
      lesson.includes('Trading against daily trend on GBPUSD') ||
      lesson.includes('USDJPY respects Asian session') ||
      lesson.includes('Gold moves with violent expansion')
    ) {
      return true;
    }
  }

  return false;
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

export function parseSupabaseTrade(
  row: any,
  userAccounts: Account[] = [],
  userSetups: Setup[] = [],
  userStrats: Strategy[] = []
): Trade {
  const notes = row.notes || {};
  const tags = row.tags || notes.tags || [];
  const accountName = notes.account_name || userAccounts.find((a) => a.id === row.account_id)?.name || 'Main Account';
  const strategyName = notes.strategy_name || userStrats.find((s) => s.id === row.strategy_id)?.name || undefined;
  const setupName = notes.setup_name || userSetups.find((s) => s.id === row.setup_id)?.name || undefined;

  return {
    ...row,
    id: row.id,
    user_id: row.user_id,
    account_id: row.account_id,
    account_name: accountName,
    strategy_id: row.strategy_id,
    strategy_name: strategyName,
    setup_id: row.setup_id,
    setup_name: setupName,
    tags,
    entry_price: Number(row.entry_price) || 0,
    exit_price: row.exit_price !== null && row.exit_price !== undefined ? Number(row.exit_price) : null,
    stop_loss: row.stop_loss !== null && row.stop_loss !== undefined ? Number(row.stop_loss) : null,
    take_profit: row.take_profit !== null && row.take_profit !== undefined ? Number(row.take_profit) : null,
    position_size: Number(row.position_size) || 1,
    pnl: row.pnl !== null && row.pnl !== undefined ? Number(row.pnl) : null,
    pnl_percent: row.pnl_percent !== null && row.pnl_percent !== undefined ? Number(row.pnl_percent) : null,
    r_multiple: row.r_multiple !== null && row.r_multiple !== undefined ? Number(row.r_multiple) : null,
    risk_amount: row.risk_amount !== null && row.risk_amount !== undefined ? Number(row.risk_amount) : null,
    risk_percent: row.risk_percent !== null && row.risk_percent !== undefined ? Number(row.risk_percent) : null,
    commission: Number(row.commission || 0),
    swap: Number(row.swap || 0),
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : 7,
    discipline: row.discipline !== null && row.discipline !== undefined ? Number(row.discipline) : 8,
    notes,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export function TradeProvider({ children }: { children: React.ReactNode }) {
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
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsDemoMode(true);
    setSyncStatus('offline');
    setSyncError(null);
    loadLocalInitialState();
  };

  const loadLocalInitialState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.clearedByUser || parsed.hasCustomData || Array.isArray(parsed.trades)) {
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
    const supabase = createClient();
    if (!supabase) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    setIsLoading(true);
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      // 1. Fetch or create user accounts
      let currentAccounts = accounts;
      const { data: dbAccounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
      if (dbAccounts && dbAccounts.length > 0) {
        currentAccounts = dbAccounts;
        setAccounts(dbAccounts);
      } else {
        // Create initial default account in Supabase so foreign key inserts succeed with valid UUID
        const { data: newAcc, error: createAccErr } = await supabase
          .from('accounts')
          .insert([
            {
              user_id: userId,
              name: 'Main Account',
              initial_balance: 10000.0,
              currency: 'USD',
              is_default: true,
            },
          ])
          .select()
          .single();

        if (newAcc && !createAccErr) {
          currentAccounts = [newAcc];
          setAccounts([newAcc]);
        }
      }

      // 2. Fetch Setups, Strategies, Tags
      let currentSetups = setups;
      const { data: dbSetups } = await supabase.from('setups').select('*').eq('user_id', userId);
      if (dbSetups && dbSetups.length > 0) {
        currentSetups = dbSetups;
        setSetups(dbSetups);
      }

      let currentStrats = strategies;
      const { data: dbStrats } = await supabase.from('strategies').select('*').eq('user_id', userId);
      if (dbStrats && dbStrats.length > 0) {
        currentStrats = dbStrats;
        setStrategies(dbStrats);
      }

      const { data: dbTags } = await supabase.from('tags').select('*').eq('user_id', userId);
      if (dbTags && dbTags.length > 0) setTags(dbTags);

      // 3. Fetch Trades from Supabase
      const { data: rawDbTrades, error: dbTradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (dbTradesError) {
        console.error('Supabase fetch trades error:', dbTradesError);
        setSyncStatus('error');
        setSyncError(dbTradesError.message);
        loadLocalInitialState();
        return;
      }

      const parsedDbTrades: Trade[] = (rawDbTrades || []).map((row) =>
        parseSupabaseTrade(row, currentAccounts, currentSetups, currentStrats)
      );

      // Clean out any demo trades that were previously accidentally uploaded to Supabase
      const demoTradeIds = parsedDbTrades.filter((t) => isDemoTrade(t)).map((t) => t.id).filter(isValidUUID);
      if (demoTradeIds.length > 0) {
        try {
          await supabase.from('trades').delete().in('id', demoTradeIds);
          console.log(`Purged ${demoTradeIds.length} accidental demo trades from Supabase`);
        } catch (e) {
          console.warn('Error purging demo trades:', e);
        }
      }

      const realDbTrades = parsedDbTrades.filter((t) => !isDemoTrade(t));

      // Deduplicate DB trades by UUID and signature to heal any historical duplicated rows
      const uniqueDbTrades: Trade[] = [];
      const seenDbIds = new Set<string>();
      const seenSignatures = new Set<string>();

      for (const t of realDbTrades) {
        const sig = `${t.symbol.toUpperCase()}|${t.direction}|${t.date}|${t.entry_time || ''}|${t.entry_price}|${t.exit_price ?? ''}|${t.pnl ?? ''}`;
        if (!seenDbIds.has(t.id) && !seenSignatures.has(sig)) {
          seenDbIds.add(t.id);
          seenSignatures.add(sig);
          uniqueDbTrades.push(t);
        }
      }

      // Check if user has explicitly cleared trades
      let wasClearedByUser = false;
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.clearedByUser) wasClearedByUser = true;
        }
      } catch {}

      if (wasClearedByUser) {
        // The user explicitly cleared their trades: delete any leftover rows from Supabase and keep state empty
        if (uniqueDbTrades.length > 0) {
          const idsToClean = uniqueDbTrades.map((t) => t.id).filter(isValidUUID);
          if (idsToClean.length > 0) {
            try {
              await supabase.from('trades').delete().in('id', idsToClean);
            } catch (e) {
              console.warn('Error clearing leftover trades in Supabase:', e);
            }
          }
        }
        setTrades([]);
        persistState([], currentAccounts, currentSetups, currentStrats, tags);
        setIsDemoMode(false);
        setSyncStatus('synced');
        return;
      }

      // 4. One-time initial migration ONLY when user first logs in AND Supabase is completely empty
      if (isInitialLogin && uniqueDbTrades.length === 0 && !wasClearedByUser) {
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
          const uploadPayloads = localTrades.map((t) => ({
            user_id: userId,
            account_id: isValidUUID(t.account_id) ? t.account_id : defaultAccountId,
            symbol: (t.symbol || 'BTCUSDT').toUpperCase().trim(),
            direction: t.direction || 'LONG',
            date: t.date || new Date().toISOString().split('T')[0],
            entry_time: t.entry_time || null,
            exit_time: t.exit_time || null,
            timeframe: t.timeframe || '15m',
            session: t.session || 'New York',
            entry_price: Number(t.entry_price) || 0,
            exit_price: t.exit_price !== undefined && t.exit_price !== null ? Number(t.exit_price) : null,
            stop_loss: t.stop_loss !== undefined && t.stop_loss !== null ? Number(t.stop_loss) : null,
            take_profit: t.take_profit !== undefined && t.take_profit !== null ? Number(t.take_profit) : null,
            position_size: Number(t.position_size) || 1,
            risk_amount: t.risk_amount !== undefined && t.risk_amount !== null ? Number(t.risk_amount) : null,
            risk_percent: t.risk_percent !== undefined && t.risk_percent !== null ? Number(t.risk_percent) : null,
            commission: Number(t.commission) || 0,
            swap: Number(t.swap) || 0,
            pnl: t.pnl !== undefined && t.pnl !== null ? Number(t.pnl) : null,
            pnl_percent: t.pnl_percent !== undefined && t.pnl_percent !== null ? Number(t.pnl_percent) : null,
            r_multiple: t.r_multiple !== undefined && t.r_multiple !== null ? Number(t.r_multiple) : null,
            result: t.result || null,
            strategy_id: isValidUUID(t.strategy_id) ? t.strategy_id : null,
            setup_id: isValidUUID(t.setup_id) ? t.setup_id : null,
            emotion: t.emotion || 'Calm',
            confidence: sanitizeIntScale1to10(t.confidence, 7),
            discipline: sanitizeIntScale1to10(t.discipline, 8),
            mistake: t.mistake || 'None',
            notes: {
              ...(t.notes || {}),
              tags: t.tags || [],
              account_name: t.account_name,
              strategy_name: t.strategy_name,
              setup_name: t.setup_name,
            },
          }));

          const { data: newlyUploaded } = await supabase.from('trades').insert(uploadPayloads).select();
          if (newlyUploaded) {
            const parsedUploaded = newlyUploaded.map((row) =>
              parseSupabaseTrade(row, currentAccounts, currentSetups, currentStrats)
            );
            uniqueDbTrades.push(...parsedUploaded);
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
    } catch (err: any) {
      console.error('Supabase fetch error, retaining local state:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error de conexión');
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
    const supabase = createClient();
    if (!supabase) {
      setSyncStatus('offline');
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
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
    } catch (err: any) {
      return { imported: 0, error: err?.message || 'Error al procesar el archivo JSON' };
    }
  };

  // Initialize data, check session & setup Realtime listener
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      loadLocalInitialState();
      setSyncStatus('offline');
      return;
    }

    let realtimeChannel: any = null;
    let realtimeDebounce: any = null;

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      realtimeChannel = supabase
        .channel(`public:trades:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (isSyncingRef.current) return;
            if (realtimeDebounce) clearTimeout(realtimeDebounce);
            realtimeDebounce = setTimeout(() => {
              if (!isSyncingRef.current) {
                loadSupabaseData(userId, false);
              }
            }, 600);
          }
        )
        .subscribe();
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        setSyncStatus('synced');
        loadSupabaseData(session.user.id, true);
        setupRealtime(session.user.id);
      } else {
        loadLocalInitialState();
        setSyncStatus('offline');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        setSyncStatus('synced');
        if (event === 'SIGNED_IN') {
          loadSupabaseData(session.user.id, true);
          setupRealtime(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsDemoMode(true);
        setSyncStatus('offline');
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        loadLocalInitialState();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  // Persist locally for immediate offline reactivity
  const persistState = (
    newTrades: Trade[],
    newAccounts = accounts,
    newSetups = setups,
    newStrats = strategies,
    newTags = tags
  ) => {
    try {
      let clearedByUser = false;
      const prev = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (prev) {
        try {
          const parsed = JSON.parse(prev);
          if (parsed.clearedByUser && newTrades.length === 0) {
            clearedByUser = true;
          }
        } catch {}
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          trades: newTrades,
          accounts: newAccounts,
          setups: newSetups,
          strategies: newStrats,
          tags: newTags,
          hasCustomData: true,
          clearedByUser,
        })
      );
    } catch {
      // quota or private mode fallback
    }
  };

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
          clearedByUser: false,
        })
      );
    } catch {}
  };

  const clearAllTrades = async () => {
    isSyncingRef.current = true;
    setIsDemoMode(false);
    const prevTrades = [...trades];
    setTrades([]);
    setSelectedTradeForDetail(null);
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          trades: [],
          accounts,
          setups,
          strategies,
          tags,
          hasCustomData: true,
          clearedByUser: true,
        })
      );
    } catch {}

    const supabase = createClient();
    if (supabase) {
      try {
        setSyncStatus('syncing');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const effectiveUserId = user?.id || authUser?.id;

        // 1. Delete all currently tracked trades by their explicit UUIDs
        const idsToDelete = prevTrades.map((t) => t.id).filter(isValidUUID);
        if (idsToDelete.length > 0) {
          await supabase.from('trades').delete().in('id', idsToDelete);
        }

        // 2. Delete all trades belonging to user in Supabase
        if (effectiveUserId) {
          await supabase.from('trades').delete().eq('user_id', effectiveUserId);
        }

        setSyncStatus('synced');
      } catch (err: any) {
        console.error('Error clearing trades in Supabase:', err);
        setSyncError(err?.message || 'Error al vaciar trades');
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 1000);
      }
    } else {
      isSyncingRef.current = false;
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

  // Helper to compute derived financial fields automatically
  const computeDerivedFields = (data: Partial<Trade>, currentAccountBalance: number = 10000): Partial<Trade> => {
    const direction = data.direction || 'LONG';
    const entryPrice = Number(data.entry_price) || 0;
    const exitPrice = data.exit_price !== undefined && data.exit_price !== null ? Number(data.exit_price) : null;
    const positionSize = Number(data.position_size) || 1;
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
          commission,
          swap,
        });

    const riskAmount = calculateRiskAmount({
      entryPrice,
      stopLoss,
      positionSize,
    });

    const riskPercent = calculateRiskPercent(riskAmount, currentAccountBalance);
    const rMultiple = calculateRMultiple(pnl, riskAmount);
    const result = calculateResult(pnl);

    const pnlPercent = pnl !== null && currentAccountBalance > 0
      ? Number(((pnl / currentAccountBalance) * 100).toFixed(2))
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
    const computed = computeDerivedFields(tradeData);
    const newTrade: Trade = {
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
      exit_price: computed.exit_price,
      stop_loss: computed.stop_loss,
      take_profit: computed.take_profit,
      position_size: Number(computed.position_size) || 1,
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
      confidence: computed.confidence ?? 7,
      discipline: computed.discipline ?? 8,
      mistake: computed.mistake || 'None',
      notes: computed.notes || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase && user) {
      try {
        let validAccountId = isValidUUID(computed.account_id) ? computed.account_id : null;
        if (!validAccountId && accounts.length > 0) {
          const found = accounts.find((a) => isValidUUID(a.id));
          if (found) validAccountId = found.id;
        }

        const validStrategyId = isValidUUID(computed.strategy_id) ? computed.strategy_id : null;
        const validSetupId = isValidUUID(computed.setup_id) ? computed.setup_id : null;

        const payload = {
          user_id: user.id,
          account_id: validAccountId,
          symbol: (computed.symbol || 'BTCUSDT').toUpperCase().trim(),
          direction: computed.direction || 'LONG',
          date: computed.date || new Date().toISOString().split('T')[0],
          entry_time: computed.entry_time || null,
          exit_time: computed.exit_time || null,
          timeframe: computed.timeframe || '15m',
          session: computed.session || 'New York',
          entry_price: Number(computed.entry_price) || 0,
          exit_price: computed.exit_price !== undefined && computed.exit_price !== null ? Number(computed.exit_price) : null,
          stop_loss: computed.stop_loss !== undefined && computed.stop_loss !== null ? Number(computed.stop_loss) : null,
          take_profit: computed.take_profit !== undefined && computed.take_profit !== null ? Number(computed.take_profit) : null,
          position_size: Number(computed.position_size) || 1,
          risk_amount: computed.risk_amount !== undefined && computed.risk_amount !== null ? Number(computed.risk_amount) : null,
          risk_percent: computed.risk_percent !== undefined && computed.risk_percent !== null ? Number(computed.risk_percent) : null,
          commission: Number(computed.commission) || 0,
          swap: Number(computed.swap) || 0,
          pnl: computed.pnl !== undefined && computed.pnl !== null ? Number(computed.pnl) : null,
          pnl_percent: computed.pnl_percent !== undefined && computed.pnl_percent !== null ? Number(computed.pnl_percent) : null,
          r_multiple: computed.r_multiple !== undefined && computed.r_multiple !== null ? Number(computed.r_multiple) : null,
          result: computed.result || null,
          strategy_id: validStrategyId,
          setup_id: validSetupId,
          emotion: computed.emotion || 'Calm',
          confidence: sanitizeIntScale1to10(computed.confidence, 7),
          discipline: sanitizeIntScale1to10(computed.discipline, 8),
          mistake: computed.mistake || 'None',
          notes: {
            ...(computed.notes || {}),
            tags: computed.tags || [],
            account_name: newTrade.account_name,
            strategy_name: newTrade.strategy_name,
            setup_name: newTrade.setup_name,
          },
        };
        const { data: inserted, error: insertError } = await supabase.from('trades').insert([payload]).select().single();
        if (insertError) {
          console.error('Supabase trade insert error:', insertError);
          setSyncError(insertError.message);
        } else if (inserted) {
          newTrade.id = inserted.id;
          newTrade.user_id = user.id;
          setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Failed to insert trade into Supabase:', err);
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
    const computed = computeDerivedFields(merged);

    const updatedTrade: Trade = {
      ...merged,
      ...computed,
      updated_at: new Date().toISOString(),
    } as Trade;

    const supabase = createClient();
    if (supabase && user && isValidUUID(id)) {
      try {
        let validAccountId = isValidUUID(updatedTrade.account_id) ? updatedTrade.account_id : null;
        if (!validAccountId && accounts.length > 0) {
          const found = accounts.find((a) => isValidUUID(a.id));
          if (found) validAccountId = found.id;
        }

        const validStrategyId = isValidUUID(updatedTrade.strategy_id) ? updatedTrade.strategy_id : null;
        const validSetupId = isValidUUID(updatedTrade.setup_id) ? updatedTrade.setup_id : null;

        await supabase
          .from('trades')
          .update({
            symbol: (updatedTrade.symbol || '').toUpperCase().trim(),
            direction: updatedTrade.direction,
            date: updatedTrade.date,
            entry_time: updatedTrade.entry_time || null,
            exit_time: updatedTrade.exit_time || null,
            timeframe: updatedTrade.timeframe || null,
            session: updatedTrade.session || null,
            entry_price: Number(updatedTrade.entry_price) || 0,
            exit_price: updatedTrade.exit_price !== undefined && updatedTrade.exit_price !== null ? Number(updatedTrade.exit_price) : null,
            stop_loss: updatedTrade.stop_loss !== undefined && updatedTrade.stop_loss !== null ? Number(updatedTrade.stop_loss) : null,
            take_profit: updatedTrade.take_profit !== undefined && updatedTrade.take_profit !== null ? Number(updatedTrade.take_profit) : null,
            position_size: Number(updatedTrade.position_size) || 1,
            risk_amount: updatedTrade.risk_amount !== undefined && updatedTrade.risk_amount !== null ? Number(updatedTrade.risk_amount) : null,
            risk_percent: updatedTrade.risk_percent !== undefined && updatedTrade.risk_percent !== null ? Number(updatedTrade.risk_percent) : null,
            commission: Number(updatedTrade.commission) || 0,
            swap: Number(updatedTrade.swap) || 0,
            pnl: updatedTrade.pnl !== undefined && updatedTrade.pnl !== null ? Number(updatedTrade.pnl) : null,
            pnl_percent: updatedTrade.pnl_percent !== undefined && updatedTrade.pnl_percent !== null ? Number(updatedTrade.pnl_percent) : null,
            r_multiple: updatedTrade.r_multiple !== undefined && updatedTrade.r_multiple !== null ? Number(updatedTrade.r_multiple) : null,
            result: updatedTrade.result || null,
            account_id: validAccountId,
            strategy_id: validStrategyId,
            setup_id: validSetupId,
            emotion: updatedTrade.emotion,
            confidence: sanitizeIntScale1to10(updatedTrade.confidence, 7),
            discipline: sanitizeIntScale1to10(updatedTrade.discipline, 8),
            mistake: updatedTrade.mistake,
            notes: {
              ...(updatedTrade.notes || {}),
              tags: updatedTrade.tags || [],
              account_name: updatedTrade.account_name,
              strategy_name: updatedTrade.strategy_name,
              setup_name: updatedTrade.setup_name,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to update trade in Supabase:', err);
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
    isSyncingRef.current = true;
    const target = trades.find((t) => t.id === id);
    const nextTrades = trades.filter((t) => t.id !== id);
    setTrades(nextTrades);
    persistState(nextTrades);
    if (selectedTradeForDetail?.id === id) {
      setSelectedTradeForDetail(null);
    }

    const supabase = createClient();
    if (supabase) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const effectiveUserId = user?.id || authUser?.id;

        if (isValidUUID(id)) {
          if (effectiveUserId) {
            await supabase.from('trades').delete().eq('id', id).eq('user_id', effectiveUserId);
          } else {
            await supabase.from('trades').delete().eq('id', id);
          }
        } else if (target && effectiveUserId) {
          await supabase
            .from('trades')
            .delete()
            .eq('user_id', effectiveUserId)
            .eq('symbol', target.symbol)
            .eq('date', target.date)
            .eq('entry_price', target.entry_price);
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to delete trade in Supabase:', err);
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 800);
      }
    } else {
      isSyncingRef.current = false;
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
      const computed = computeDerivedFields(raw);
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
        risk_amount: computed.risk_amount,
        risk_percent: computed.risk_percent,
        commission: computed.commission || 0,
        swap: computed.swap || 0,
        pnl: computed.pnl,
        pnl_percent: computed.pnl_percent,
        r_multiple: computed.r_multiple,
        result: computed.result,
        strategy_id: computed.strategy_id || null,
        setup_id: computed.setup_id || null,
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

    const nextTrades = [...added, ...baseTrades].sort(
      (a, b) => new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
    );

    setTrades(nextTrades);
    persistState(nextTrades);

    // Sync to Supabase in background if user is authenticated
    const supabase = createClient();
    if (supabase && user && added.length > 0) {
      try {
        const defaultAccountId = accounts.find((a) => isValidUUID(a.id))?.id || null;
        const payloads = added.map((t) => ({
          user_id: user.id,
          account_id: isValidUUID(t.account_id) ? t.account_id : defaultAccountId,
          symbol: t.symbol,
          direction: t.direction,
          date: t.date,
          entry_time: t.entry_time || null,
          exit_time: t.exit_time || null,
          timeframe: t.timeframe || '15m',
          session: t.session || 'London',
          entry_price: Number(t.entry_price) || 0,
          exit_price: t.exit_price ?? null,
          stop_loss: t.stop_loss ?? null,
          take_profit: t.take_profit ?? null,
          position_size: Number(t.position_size) || 1,
          risk_amount: t.risk_amount ?? null,
          risk_percent: t.risk_percent ?? null,
          commission: t.commission || 0,
          swap: t.swap || 0,
          pnl: t.pnl ?? null,
          pnl_percent: t.pnl_percent ?? null,
          r_multiple: t.r_multiple ?? null,
          result: t.result ?? null,
          strategy_id: isValidUUID(t.strategy_id) ? t.strategy_id : null,
          setup_id: isValidUUID(t.setup_id) ? t.setup_id : null,
          emotion: t.emotion || 'Calm',
          confidence: sanitizeIntScale1to10(t.confidence, 7),
          discipline: sanitizeIntScale1to10(t.discipline, 8),
          mistake: t.mistake || 'None',
          notes: {
            ...(t.notes || {}),
            tags: t.tags || [],
            account_name: t.account_name,
            strategy_name: t.strategy_name,
            setup_name: t.setup_name,
          },
        }));

        const { data: insertedTrades, error: insertErr } = await supabase
          .from('trades')
          .insert(payloads)
          .select();

        if (insertErr) {
          console.warn('Supabase bulk insert warning:', insertErr.message);
        } else if (insertedTrades) {
          insertedTrades.forEach((it, idx) => {
            if (added[idx]) added[idx].id = it.id;
          });
          setTrades([...nextTrades]);
          persistState(nextTrades);
          setSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }
    }

    return { imported: added.length, duplicates: duplicateCount };
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
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      user_id: user?.id || 'user-default',
      name: name.trim(),
      initial_balance: Number(initial_balance) || 0,
      currency,
      is_default: isFirstAccount,
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase && user) {
      try {
        const { data: inserted, error } = await supabase
          .from('accounts')
          .insert([
            {
              user_id: user.id,
              name: newAccount.name,
              initial_balance: newAccount.initial_balance,
              currency: newAccount.currency,
              is_default: newAccount.is_default,
            },
          ])
          .select()
          .single();

        if (!error && inserted) {
          newAccount.id = inserted.id;
        }
      } catch (err) {
        console.error('Failed to create account in Supabase:', err);
      }
    }

    const nextAccounts = [...accounts, newAccount];
    setAccounts(nextAccounts);
    persistState(trades, nextAccounts, setups, strategies, tags);
    return newAccount;
  };

  // Delete Account
  const deleteAccount = async (id: string): Promise<void> => {
    const supabase = createClient();
    if (supabase && user) {
      try {
        await supabase.from('accounts').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete account in Supabase:', err);
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

    const supabase = createClient();
    if (supabase && user) {
      try {
        await supabase.from('accounts').update({ is_default: false }).eq('user_id', user.id);
        await supabase.from('accounts').update({ is_default: true }).eq('id', id);
      } catch (err) {
        console.error('Failed to set default account in Supabase:', err);
      }
    }

    setAccounts(nextAccounts);
    persistState(trades, nextAccounts, setups, strategies, tags);
  };

  // Add custom Setup
  const addSetup = async (name: string, description?: string): Promise<Setup> => {
    const newSetup: Setup = {
      id: `setup-${Date.now()}`,
      user_id: 'user-default',
      name: name.trim(),
      description: description || '',
      created_at: new Date().toISOString(),
    };
    const nextSetups = [...setups, newSetup];
    setSetups(nextSetups);
    persistState(trades, accounts, nextSetups, strategies, tags);
    return newSetup;
  };

  // Add custom Strategy
  const addStrategy = async (name: string, description?: string): Promise<Strategy> => {
    const newStrat: Strategy = {
      id: `strat-${Date.now()}`,
      user_id: 'user-default',
      name: name.trim(),
      description: description || '',
      created_at: new Date().toISOString(),
    };
    const nextStrats = [...strategies, newStrat];
    setStrategies(nextStrats);
    persistState(trades, accounts, setups, nextStrats, tags);
    return newStrat;
  };

  // Add custom Tag
  const addTag = async (name: string, color: string = '#38BDF8'): Promise<Tag> => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      user_id: 'user-default',
      name: name.trim(),
      color,
      created_at: new Date().toISOString(),
    };
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
