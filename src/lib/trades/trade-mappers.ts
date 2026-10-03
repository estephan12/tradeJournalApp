import { Trade, Account, Setup, Strategy } from '../../types/trade';
import { sanitizeIntScale1to10, isValidUUID, normalizeAssetClass } from './trade-validation';

/**
 * Transforms a Supabase database row into a canonical Trade entity.
 * Supports multi-asset attributes from direct columns or fallback notes DTO.
 */
export function parseSupabaseTrade(
  row: Record<string, unknown>,
  userAccounts: Account[] = [],
  userSetups: Setup[] = [],
  userStrats: Strategy[] = []
): Trade {
  const notes = (row.notes && typeof row.notes === 'object') ? (row.notes as Record<string, unknown>) : {};
  const rawTags = (row.tags as unknown[]) || (notes.tags as unknown[]) || [];
  const tags = Array.isArray(rawTags) ? rawTags.map(String) : [];
  const accountName = String(notes.account_name || userAccounts.find((a) => a.id === row.account_id)?.name || 'Main Account');
  const strategyName = notes.strategy_name ? String(notes.strategy_name) : userStrats.find((s) => s.id === row.strategy_id)?.name || undefined;
  const setupName = notes.setup_name ? String(notes.setup_name) : userSetups.find((s) => s.id === row.setup_id)?.name || undefined;

  // Multi-asset persistence compatibility (direct column if exists, otherwise notes DTO)
  const rawAssetClass = (row.asset_class as string) || (notes.asset_class as string) || null;
  const assetClass = rawAssetClass ? normalizeAssetClass(rawAssetClass) : null;
  const contractMultiplier = row.contract_multiplier !== undefined && row.contract_multiplier !== null
    ? Number(row.contract_multiplier)
    : notes.contract_multiplier !== undefined && notes.contract_multiplier !== null
    ? Number(notes.contract_multiplier)
    : 1;
  const tickSize = row.tick_size !== undefined && row.tick_size !== null
    ? Number(row.tick_size)
    : notes.tick_size !== undefined && notes.tick_size !== null
    ? Number(notes.tick_size)
    : null;
  const tickValue = row.tick_value !== undefined && row.tick_value !== null
    ? Number(row.tick_value)
    : notes.tick_value !== undefined && notes.tick_value !== null
    ? Number(notes.tick_value)
    : null;

  return {
    id: String(row.id || ''),
    user_id: String(row.user_id || ''),
    account_id: row.account_id ? String(row.account_id) : null,
    account_name: accountName,
    date: String(row.date || new Date().toISOString().split('T')[0]),
    entry_time: row.entry_time ? String(row.entry_time) : null,
    exit_time: row.exit_time ? String(row.exit_time) : null,
    symbol: String(row.symbol || 'BTCUSDT').toUpperCase().trim(),
    direction: (row.direction as 'LONG' | 'SHORT') || 'LONG',
    timeframe: row.timeframe ? String(row.timeframe) : null,
    session: row.session ? String(row.session) : null,
    strategy_id: row.strategy_id ? String(row.strategy_id) : null,
    strategy_name: strategyName,
    setup_id: row.setup_id ? String(row.setup_id) : null,
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
    result: (row.result as Trade['result']) || null,
    commission: Number(row.commission || 0),
    swap: Number(row.swap || 0),
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : 7,
    discipline: row.discipline !== null && row.discipline !== undefined ? Number(row.discipline) : 8,
    emotion: row.emotion ? String(row.emotion) : 'Calm',
    mistake: row.mistake ? String(row.mistake) : 'None',
    asset_class: assetClass,
    contract_multiplier: contractMultiplier,
    tick_size: tickSize,
    tick_value: tickValue,
    notes,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

/**
 * Prepares a database payload from a partial or complete Trade object.
 * Bundles multi-asset attributes into notes JSONB to guarantee persistence
 * even before Phase 6 database column migrations are run.
 */
export function tradeToSupabasePayload(trade: Partial<Trade>, userId: string): Record<string, unknown> {
  const notes = (trade.notes && typeof trade.notes === 'object') ? trade.notes : {};

  return {
    user_id: userId,
    account_id: isValidUUID(trade.account_id) ? trade.account_id : null,
    symbol: (trade.symbol || 'BTCUSDT').toUpperCase().trim(),
    direction: trade.direction || 'LONG',
    date: trade.date || new Date().toISOString().split('T')[0],
    entry_time: trade.entry_time || null,
    exit_time: trade.exit_time || null,
    timeframe: trade.timeframe || '15m',
    session: trade.session || 'New York',
    entry_price: Number(trade.entry_price) || 0,
    exit_price: trade.exit_price !== undefined && trade.exit_price !== null ? Number(trade.exit_price) : null,
    stop_loss: trade.stop_loss !== undefined && trade.stop_loss !== null ? Number(trade.stop_loss) : null,
    take_profit: trade.take_profit !== undefined && trade.take_profit !== null ? Number(trade.take_profit) : null,
    position_size: Number(trade.position_size) || 1,
    risk_amount: trade.risk_amount !== undefined && trade.risk_amount !== null ? Number(trade.risk_amount) : null,
    risk_percent: trade.risk_percent !== undefined && trade.risk_percent !== null ? Number(trade.risk_percent) : null,
    commission: Number(trade.commission) || 0,
    swap: Number(trade.swap) || 0,
    pnl: trade.pnl !== undefined && trade.pnl !== null ? Number(trade.pnl) : null,
    pnl_percent: trade.pnl_percent !== undefined && trade.pnl_percent !== null ? Number(trade.pnl_percent) : null,
    r_multiple: trade.r_multiple !== undefined && trade.r_multiple !== null ? Number(trade.r_multiple) : null,
    result: trade.result || null,
    strategy_id: isValidUUID(trade.strategy_id) ? trade.strategy_id : null,
    setup_id: isValidUUID(trade.setup_id) ? trade.setup_id : null,
    emotion: trade.emotion || 'Calm',
    confidence: sanitizeIntScale1to10(trade.confidence, 7),
    discipline: sanitizeIntScale1to10(trade.discipline, 8),
    mistake: trade.mistake || 'None',
    notes: {
      ...notes,
      tags: trade.tags || [],
      account_name: trade.account_name,
      strategy_name: trade.strategy_name,
      setup_name: trade.setup_name,
      asset_class: trade.asset_class ? normalizeAssetClass(trade.asset_class) : null,
      contract_multiplier: trade.contract_multiplier ?? 1,
      tick_size: trade.tick_size ?? null,
      tick_value: trade.tick_value ?? null,
    },
  };
}
