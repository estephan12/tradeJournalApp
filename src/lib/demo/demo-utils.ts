import { Trade } from '../../types/trade';

/**
 * Structural isolation check for demo mock trades.
 * Does NOT inspect text/thesis/notes strings, ensuring real user notes
 * containing similar phrases are never classified as demo data.
 */
export function isDemoTrade(trade: Partial<Trade>): boolean {
  if (!trade) return false;
  if (trade.is_demo === true) return true;
  if (trade.user_id === 'demo-user') return true;
  if (trade.account_id === 'acc-demo-1' || trade.account_id === 'acc-demo-2') return true;
  const id = trade.id || '';
  if (
    id.startsWith('trade-demo-') ||
    id.startsWith('trade-0') ||
    id.startsWith('trade-btc-') ||
    id.startsWith('trade-eur-') ||
    id.startsWith('trade-gbp-') ||
    id.startsWith('trade-jpy-') ||
    id.startsWith('trade-usdjpy-') ||
    id.startsWith('trade-xau-')
  ) {
    return true;
  }

  return false;
}
