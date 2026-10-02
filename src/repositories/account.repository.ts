import { SupabaseClient } from '@supabase/supabase-js';
import { Account } from '../types/trade';

export class AccountRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getAccounts(userId: string): Promise<Account[]> {
    if (!this.supabase || !userId) return [];

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      initial_balance: Number(row.initial_balance) || 0,
      currency: row.currency || 'USD',
      is_default: Boolean(row.is_default),
      created_at: row.created_at,
    }));
  }

  async createAccount(
    account: { name: string; initial_balance: number; currency?: string; is_default?: boolean },
    userId: string
  ): Promise<Account> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const { data, error } = await this.supabase
      .from('accounts')
      .insert([
        {
          user_id: userId,
          name: account.name.trim(),
          initial_balance: Number(account.initial_balance) || 0,
          currency: account.currency || 'USD',
          is_default: Boolean(account.is_default),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      initial_balance: Number(data.initial_balance) || 0,
      currency: data.currency || 'USD',
      is_default: Boolean(data.is_default),
      created_at: data.created_at,
    };
  }

  async deleteAccount(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  async setDefaultAccount(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    await this.supabase.from('accounts').update({ is_default: false }).eq('user_id', userId);
    const { error } = await this.supabase.from('accounts').update({ is_default: true }).eq('id', id).eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
