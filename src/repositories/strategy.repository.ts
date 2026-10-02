import { SupabaseClient } from '@supabase/supabase-js';
import { Strategy } from '../types/trade';

export class StrategyRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getStrategies(userId: string): Promise<Strategy[]> {
    if (!this.supabase || !userId) return [];

    const { data, error } = await this.supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createStrategy(name: string, description: string | undefined, userId: string): Promise<Strategy> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const { data, error } = await this.supabase
      .from('strategies')
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          description: description || '',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStrategy(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
