import { SupabaseClient } from '@supabase/supabase-js';
import { Trade, Account, Setup, Strategy } from '../types/trade';
import { isValidUUID, sanitizeIntScale1to10, parseSupabaseTrade } from '../context/trade-context';

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

  async createTrade(tradeData: Partial<Trade>, userId: string): Promise<Trade> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const payload = {
      user_id: userId,
      account_id: isValidUUID(tradeData.account_id) ? tradeData.account_id : null,
      symbol: (tradeData.symbol || 'BTCUSDT').toUpperCase().trim(),
      direction: tradeData.direction || 'LONG',
      date: tradeData.date || new Date().toISOString().split('T')[0],
      entry_time: tradeData.entry_time || null,
      exit_time: tradeData.exit_time || null,
      timeframe: tradeData.timeframe || '15m',
      session: tradeData.session || 'New York',
      entry_price: Number(tradeData.entry_price) || 0,
      exit_price: tradeData.exit_price !== undefined && tradeData.exit_price !== null ? Number(tradeData.exit_price) : null,
      stop_loss: tradeData.stop_loss !== undefined && tradeData.stop_loss !== null ? Number(tradeData.stop_loss) : null,
      take_profit: tradeData.take_profit !== undefined && tradeData.take_profit !== null ? Number(tradeData.take_profit) : null,
      position_size: Number(tradeData.position_size) || 1,
      risk_amount: tradeData.risk_amount !== undefined && tradeData.risk_amount !== null ? Number(tradeData.risk_amount) : null,
      risk_percent: tradeData.risk_percent !== undefined && tradeData.risk_percent !== null ? Number(tradeData.risk_percent) : null,
      commission: Number(tradeData.commission) || 0,
      swap: Number(tradeData.swap) || 0,
      pnl: tradeData.pnl !== undefined && tradeData.pnl !== null ? Number(tradeData.pnl) : null,
      pnl_percent: tradeData.pnl_percent !== undefined && tradeData.pnl_percent !== null ? Number(tradeData.pnl_percent) : null,
      r_multiple: tradeData.r_multiple !== undefined && tradeData.r_multiple !== null ? Number(tradeData.r_multiple) : null,
      result: tradeData.result || null,
      strategy_id: isValidUUID(tradeData.strategy_id) ? tradeData.strategy_id : null,
      setup_id: isValidUUID(tradeData.setup_id) ? tradeData.setup_id : null,
      emotion: tradeData.emotion || 'Calm',
      confidence: sanitizeIntScale1to10(tradeData.confidence, 7),
      discipline: sanitizeIntScale1to10(tradeData.discipline, 8),
      mistake: tradeData.mistake || 'None',
      notes: {
        ...(tradeData.notes || {}),
        tags: tradeData.tags || [],
        account_name: tradeData.account_name,
        strategy_name: tradeData.strategy_name,
        setup_name: tradeData.setup_name,
      },
    };

    const { data, error } = await this.supabase.from('trades').insert([payload]).select().single();
    if (error) {
      throw error;
    }

    return parseSupabaseTrade(data);
  }

  async updateTrade(id: string, tradeData: Partial<Trade>, userId: string): Promise<Trade> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const payload = {
      symbol: (tradeData.symbol || '').toUpperCase().trim(),
      direction: tradeData.direction,
      date: tradeData.date,
      entry_time: tradeData.entry_time || null,
      exit_time: tradeData.exit_time || null,
      timeframe: tradeData.timeframe || null,
      session: tradeData.session || null,
      entry_price: Number(tradeData.entry_price) || 0,
      exit_price: tradeData.exit_price !== undefined && tradeData.exit_price !== null ? Number(tradeData.exit_price) : null,
      stop_loss: tradeData.stop_loss !== undefined && tradeData.stop_loss !== null ? Number(tradeData.stop_loss) : null,
      take_profit: tradeData.take_profit !== undefined && tradeData.take_profit !== null ? Number(tradeData.take_profit) : null,
      position_size: Number(tradeData.position_size) || 1,
      risk_amount: tradeData.risk_amount !== undefined && tradeData.risk_amount !== null ? Number(tradeData.risk_amount) : null,
      risk_percent: tradeData.risk_percent !== undefined && tradeData.risk_percent !== null ? Number(tradeData.risk_percent) : null,
      commission: Number(tradeData.commission) || 0,
      swap: Number(tradeData.swap) || 0,
      pnl: tradeData.pnl !== undefined && tradeData.pnl !== null ? Number(tradeData.pnl) : null,
      pnl_percent: tradeData.pnl_percent !== undefined && tradeData.pnl_percent !== null ? Number(tradeData.pnl_percent) : null,
      r_multiple: tradeData.r_multiple !== undefined && tradeData.r_multiple !== null ? Number(tradeData.r_multiple) : null,
      result: tradeData.result || null,
      account_id: isValidUUID(tradeData.account_id) ? tradeData.account_id : null,
      strategy_id: isValidUUID(tradeData.strategy_id) ? tradeData.strategy_id : null,
      setup_id: isValidUUID(tradeData.setup_id) ? tradeData.setup_id : null,
      emotion: tradeData.emotion,
      confidence: sanitizeIntScale1to10(tradeData.confidence, 7),
      discipline: sanitizeIntScale1to10(tradeData.discipline, 8),
      mistake: tradeData.mistake,
      notes: {
        ...(tradeData.notes || {}),
        tags: tradeData.tags || [],
        account_name: tradeData.account_name,
        strategy_name: tradeData.strategy_name,
        setup_name: tradeData.setup_name,
      },
      updated_at: new Date().toISOString(),
    };

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

    return parseSupabaseTrade(data);
  }

  async deleteTrade(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

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

  async bulkCreateTrades(trades: Partial<Trade>[], userId: string): Promise<Trade[]> {
    if (!this.supabase || !userId || trades.length === 0) return [];

    const payloads = trades.map((t) => ({
      user_id: userId,
      account_id: isValidUUID(t.account_id) ? t.account_id : null,
      symbol: (t.symbol || 'BTCUSDT').toUpperCase().trim(),
      direction: t.direction || 'LONG',
      date: t.date || new Date().toISOString().split('T')[0],
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
      commission: Number(t.commission) || 0,
      swap: Number(t.swap) || 0,
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

    const { data, error } = await this.supabase.from('trades').insert(payloads).select();
    if (error) {
      throw error;
    }

    return (data || []).map((row) => parseSupabaseTrade(row));
  }
}
