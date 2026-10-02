import { SupabaseClient } from '@supabase/supabase-js';
import { Tag } from '../types/trade';

export class TagRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getTags(userId: string): Promise<Tag[]> {
    if (!this.supabase || !userId) return [];

    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createTag(name: string, color: string | undefined, userId: string): Promise<Tag> {
    if (!this.supabase || !userId) {
      throw new Error('Supabase client or authenticated user is missing');
    }

    const { data, error } = await this.supabase
      .from('tags')
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          color: color || '#38BDF8',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    if (!this.supabase || !userId) return;

    const { error } = await this.supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
