import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Trade, Account, Setup, Strategy, Tag } from '../types/trade';
import { isValidUUID, isDemoTrade } from '../context/trade-context';

export interface SyncServiceState {
  trades: Trade[];
  accounts: Account[];
  setups: Setup[];
  strategies: Strategy[];
  tags: Tag[];
}

export class SyncService {
  private static instance: SyncService;
  private activeChannel: RealtimeChannel | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isMutatingLocally = false;

  private constructor() {}

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Sets local mutation lock to prevent Realtime from re-fetching own changes in a feedback loop.
   */
  public setLocalMutationLock(active: boolean, durationMs = 1000) {
    this.isMutatingLocally = active;
    if (active && durationMs > 0) {
      setTimeout(() => {
        this.isMutatingLocally = false;
      }, durationMs);
    }
  }

  public getIsMutatingLocally(): boolean {
    return this.isMutatingLocally;
  }

  /**
   * Subscribes to Realtime Postgres changes strictly for the given userId.
   * Returns a cleanup function that safely destroys the channel and timers.
   */
  public subscribeToUserTrades(
    supabase: SupabaseClient | null,
    userId: string,
    onRemoteChange: () => void,
    debounceMs = 600
  ): () => void {
    if (!supabase || !userId) {
      return () => {};
    }

    this.unsubscribe();

    try {
      this.activeChannel = supabase
        .channel(`public:trades:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (this.isMutatingLocally) {
              return;
            }

            if (this.debounceTimer) {
              clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
              if (!this.isMutatingLocally) {
                onRemoteChange();
              }
            }, debounceMs);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      this.unsubscribe(supabase);
    };
  }

  /**
   * Safely destroys active Realtime channels and pending timers.
   */
  public unsubscribe(supabase?: SupabaseClient | null) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.activeChannel) {
      try {
        if (supabase) {
          supabase.removeChannel(this.activeChannel);
        } else {
          this.activeChannel.unsubscribe();
        }
      } catch (err) {
        console.warn('Channel unsubscribe warning:', err);
      }
      this.activeChannel = null;
    }
  }

  /**
   * Deduplicates trade collections by both primary UUID and execution signature.
   * Ensures no duplicates are ever displayed or persisted.
   */
  public deduplicateTrades(trades: Trade[]): Trade[] {
    const unique: Trade[] = [];
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();

    for (const t of trades) {
      if (!t || isDemoTrade(t)) {
        continue;
      }

      const sig = `${(t.symbol || '').toUpperCase()}|${t.direction}|${t.date}|${t.entry_time || ''}|${t.entry_price}|${t.exit_price ?? ''}|${t.pnl ?? ''}`;

      if (t.id && isValidUUID(t.id)) {
        if (seenIds.has(t.id) || seenSignatures.has(sig)) {
          continue;
        }
        seenIds.add(t.id);
        seenSignatures.add(sig);
        unique.push(t);
      } else {
        if (seenSignatures.has(sig)) {
          continue;
        }
        seenSignatures.add(sig);
        unique.push(t);
      }
    }

    return unique.sort(
      (a, b) =>
        new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() -
        new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime()
    );
  }

  /**
   * Ensures strict cross-user isolation: checks if a record matches current session user.
   */
  public isRecordOwner(recordUserId: string | null | undefined, currentUserId: string | null | undefined): boolean {
    if (!currentUserId || !recordUserId) return false;
    return recordUserId === currentUserId;
  }
}

export const syncService = SyncService.getInstance();
