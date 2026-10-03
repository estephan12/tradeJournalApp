import { SupabaseClient } from '@supabase/supabase-js';
import { Trade, Account, Setup, Strategy } from '../types/trade';
import { isValidUUID } from '../lib/trades/trade-validation';
import { parseSupabaseTrade, tradeToSupabasePayload } from '../lib/trades/trade-mappers';

export class TradeRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getTrades(
    userId: string,
    accounts: Account[] = [],
    setups: Setup[] = [],
    strategies: Strategy[] = []
  ): Promise<Trade[]> {
    if (!this.supabase || !userId) return [];

    const { data, error } = await this.supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => parseSupabaseTrade(row, accounts, setups, strategies));
  }

  async createTrade(
    tradeData: Partial<Trade>,
    userId: string,
    accounts: Account[] = [],
    setups: Setup[] = [],
    strategies: Strategy[] = []
  ): Promise<Trade> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const payload = tradeToSupabasePayload(tradeData, userId);

    const { data, error } = await this.supabase.from('trades').insert([payload]).select().single();
    if (error) {
      throw error;
    }

    return parseSupabaseTrade(data, accounts, setups, strategies);
  }

  async updateTrade(
    id: string,
    tradeData: Partial<Trade>,
    userId: string,
    accounts: Account[] = [],
    setups: Setup[] = [],
    strategies: Strategy[] = []
  ): Promise<Trade> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    if (!isValidUUID(id)) {
      throw new Error('Valid UUID is required for cloud trade update');
    }

    const payload = tradeToSupabasePayload(tradeData, userId);
    // Remove user_id and id from update payload if not needed to overwrite
    delete (payload as Record<string, unknown>).id;

    const { data, error } = await this.supabase
      .from('trades')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return parseSupabaseTrade(data, accounts, setups, strategies);
  }

  async deleteTrade(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    // Cloud deletion must ONLY use canonical cloud UUID
    if (!isValidUUID(id)) {
      return;
    }

    const { error } = await this.supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  async deleteTrades(ids: string[]): Promise<void> {
    if (!this.supabase || ids.length === 0) return;
    const validIds = ids.filter(isValidUUID);
    if (validIds.length === 0) return;

    const { error } = await this.supabase
      .from('trades')
      .delete()
      .in('id', validIds);

    if (error) {
      throw error;
    }
  }

  async deleteAllTrades(userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('trades')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  async bulkCreateTrades(
    trades: Partial<Trade>[],
    userId: string,
    accounts: Account[] = [],
    setups: Setup[] = [],
    strategies: Strategy[] = []
  ): Promise<Trade[]> {
    if (!this.supabase || !userId || trades.length === 0) return [];

    const payloads = trades.map((t) => tradeToSupabasePayload(t, userId));

    const { data, error } = await this.supabase.from('trades').insert(payloads).select();
    if (error) {
      throw error;
    }

    return (data || []).map((row) => parseSupabaseTrade(row, accounts, setups, strategies));
  }
}
