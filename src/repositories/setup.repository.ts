import { SupabaseClient } from '@supabase/supabase-js';
import { Setup } from '../types/trade';

export class SetupRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getSetups(userId: string): Promise<Setup[]> {
    if (!this.supabase || !userId) return [];

    const { data, error } = await this.supabase
      .from('setups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createSetup(name: string, description: string | undefined, userId: string): Promise<Setup> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const { data, error } = await this.supabase
      .from('setups')
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

  async deleteSetup(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('setups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
