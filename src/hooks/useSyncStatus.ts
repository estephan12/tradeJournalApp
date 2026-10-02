import { useTrades as useTradeContext } from '../context/trade-context';

export function useSyncStatus() {
  const context = useTradeContext();
  return {
    syncStatus: context.syncStatus,
    syncError: context.syncError,
    syncWithCloud: context.syncWithCloud,
    exportTradesToJson: context.exportTradesToJson,
    importTradesFromJson: context.importTradesFromJson,
  };
}
