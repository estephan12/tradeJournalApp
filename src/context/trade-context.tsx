'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Trade,
  Account,
  Setup,
  Strategy,
  Tag,
  TradeFilterOptions,
} from '@/types/trade';
import {
  DEMO_ACCOUNTS,
  DEMO_SETUPS,
  DEMO_STRATEGIES,
  DEMO_TAGS,
  DEMO_TRADES,
} from '@/lib/demo-data';
import {
  calculatePnL,
  calculateRiskAmount,
  calculateRiskPercent,
  calculateRMultiple,
  calculateResult,
} from '@/lib/calculations';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
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
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tradelab_trades_data_v1';

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
    resetToDemoData();
  };

  const loadLocalInitialState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hasCustomData || (Array.isArray(parsed.trades) && parsed.trades.length > 0)) {
          setTrades(parsed.trades || []);
          if (parsed.accounts) setAccounts(parsed.accounts);
          if (parsed.setups) setSetups(parsed.setups);
          if (parsed.strategies) setStrategies(parsed.strategies);
          if (parsed.tags) setTags(parsed.tags);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // ignore parse error
    }

    setTrades(DEMO_TRADES);
    setIsLoading(false);
  };

  const loadSupabaseData = async (userId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data: dbTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (dbTrades && dbTrades.length > 0) {
        setTrades(dbTrades);
        persistState(dbTrades);
      } else {
        // If Supabase table is empty or unpopulated, do not erase local trades
        loadLocalInitialState();
      }

      const { data: dbAccounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
      if (dbAccounts && dbAccounts.length > 0) setAccounts(dbAccounts);

      const { data: dbSetups } = await supabase.from('setups').select('*').eq('user_id', userId);
      if (dbSetups && dbSetups.length > 0) setSetups(dbSetups);

      const { data: dbStrats } = await supabase.from('strategies').select('*').eq('user_id', userId);
      if (dbStrats && dbStrats.length > 0) setStrategies(dbStrats);

      const { data: dbTags } = await supabase.from('tags').select('*').eq('user_id', userId);
      if (dbTags && dbTags.length > 0) setTags(dbTags);
    } catch (err) {
      console.error('Supabase fetch error, retaining local state:', err);
      loadLocalInitialState();
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize data & check session
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      loadLocalInitialState();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        loadSupabaseData(session.user.id);
      } else {
        loadLocalInitialState();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        // Only trigger DB load on initial sign in or explicit user sign in, NEVER on background TOKEN_REFRESHED!
        if (event === 'SIGNED_IN') {
          loadSupabaseData(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsDemoMode(true);
        loadLocalInitialState();
      }
    });

    return () => {
      subscription.unsubscribe();
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

  const resetToDemoData = () => {
    setTrades(DEMO_TRADES);
    setAccounts(DEMO_ACCOUNTS);
    setSetups(DEMO_SETUPS);
    setStrategies(DEMO_STRATEGIES);
    setTags(DEMO_TAGS);
    persistState(DEMO_TRADES, DEMO_ACCOUNTS, DEMO_SETUPS, DEMO_STRATEGIES, DEMO_TAGS);
  };

  const clearAllTrades = () => {
    setTrades([]);
    persistState([]);
    setSelectedTradeForDetail(null);
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
      user_id: 'user-default',
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
      confidence: computed.confidence || 7,
      discipline: computed.discipline || 8,
      mistake: computed.mistake || 'None',
      notes: computed.notes || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase && user) {
      try {
        const payload = {
          user_id: user.id,
          account_id: computed.account_id || null,
          symbol: (computed.symbol || 'BTCUSDT').toUpperCase().trim(),
          direction: computed.direction || 'LONG',
          date: computed.date || new Date().toISOString().split('T')[0],
          entry_time: computed.entry_time || null,
          exit_time: computed.exit_time || null,
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
          strategy_id: computed.strategy_id || null,
          setup_id: computed.setup_id || null,
          emotion: computed.emotion || 'Calm',
          confidence: computed.confidence || 7,
          discipline: computed.discipline || 8,
          mistake: computed.mistake || 'None',
          notes: computed.notes || {},
        };
        const { data: inserted, error: insertError } = await supabase.from('trades').insert([payload]).select().single();
        if (!insertError && inserted) {
          newTrade.id = inserted.id;
        }
      } catch (err) {
        console.error('Failed to insert trade into Supabase:', err);
      }
    }

    const nextTrades = [newTrade, ...trades].sort(
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
    if (supabase && user) {
      try {
        await supabase.from('trades').update({
          symbol: updatedTrade.symbol,
          direction: updatedTrade.direction,
          date: updatedTrade.date,
          entry_price: updatedTrade.entry_price,
          exit_price: updatedTrade.exit_price,
          stop_loss: updatedTrade.stop_loss,
          take_profit: updatedTrade.take_profit,
          position_size: updatedTrade.position_size,
          pnl: updatedTrade.pnl,
          r_multiple: updatedTrade.r_multiple,
          result: updatedTrade.result,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
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
    const supabase = createClient();
    if (supabase && user) {
      try {
        await supabase.from('trades').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete trade in Supabase:', err);
      }
    }
    const nextTrades = trades.filter((t) => t.id !== id);
    setTrades(nextTrades);
    persistState(nextTrades);
    if (selectedTradeForDetail?.id === id) {
      setSelectedTradeForDetail(null);
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
        user_id: 'user-default',
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
    const isOnlyDemoTrades = trades.length > 0 && trades.every((t) => t.id.startsWith('trade-demo-') || t.id.startsWith('trade-0'));
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
        const payloads = added.map((t) => ({
          user_id: user.id,
          account_id: t.account_id || null,
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
          strategy_id: t.strategy_id || null,
          setup_id: t.setup_id || null,
          emotion: t.emotion || 'Calm',
          confidence: t.confidence || 7,
          discipline: t.discipline || 7,
          mistake: t.mistake || 'None',
          notes: t.notes || {},
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
          persistState(nextTrades);
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
