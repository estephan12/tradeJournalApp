import { useTrades as useTradeContext } from '../context/trade-context';

export function useTrades() {
  const context = useTradeContext();
  return {
    trades: context.trades,
    filteredTrades: context.filteredTrades,
    selectedTradeForDetail: context.selectedTradeForDetail,
    setSelectedTradeForDetail: context.setSelectedTradeForDetail,
    addTrade: context.addTrade,
    updateTrade: context.updateTrade,
    deleteTrade: context.deleteTrade,
    clearAllTrades: context.clearAllTrades,
    importTrades: context.importTrades,
    filters: context.filters,
    setFilters: context.setFilters,
    resetFilters: context.resetFilters,
    searchQuery: context.searchQuery,
    setSearchQuery: context.setSearchQuery,
    isAddTradeModalOpen: context.isAddTradeModalOpen,
    setIsAddTradeModalOpen: context.setIsAddTradeModalOpen,
    isImportModalOpen: context.isImportModalOpen,
    setIsImportModalOpen: context.setIsImportModalOpen,
    isDemoMode: context.isDemoMode,
    setIsDemoMode: context.setIsDemoMode,
    resetToDemoData: context.resetToDemoData,
  };
}
