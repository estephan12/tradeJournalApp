import { useMemo } from 'react';
import { useTrades as useTradeContext } from '../context/trade-context';
import { calculateTradeStatistics } from '../lib/calculations';

export function useAnalytics(initialBalance = 10000) {
  const { filteredTrades, trades, activeAccountId, accounts } = useTradeContext();

  const accountInitialBalance = useMemo(() => {
    if (activeAccountId !== 'all') {
      const acc = accounts.find((a) => a.id === activeAccountId);
      if (acc && acc.initial_balance > 0) return acc.initial_balance;
    }
    return initialBalance;
  }, [activeAccountId, accounts, initialBalance]);

  const stats = useMemo(() => {
    return calculateTradeStatistics(filteredTrades, accountInitialBalance);
  }, [filteredTrades, accountInitialBalance]);

  return {
    stats,
    tradesCount: filteredTrades.length,
    totalTradesCount: trades.length,
    activeAccountId,
    accountInitialBalance,
  };
}
