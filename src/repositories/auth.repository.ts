import { SupabaseClient, Session, User } from '@supabase/supabase-js';

export class AuthRepository {
  constructor(private supabase: SupabaseClient | null) {}

  async getSession(): Promise<Session | null> {
    if (!this.supabase) return null;
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.supabase) return null;
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async signOut(): Promise<void> {
    if (!this.supabase) return;
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}
