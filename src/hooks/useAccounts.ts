import { useTrades as useTradeContext } from '../context/trade-context';

export function useAccounts() {
  const context = useTradeContext();
  return {
    accounts: context.accounts,
    activeAccountId: context.activeAccountId,
    setActiveAccountId: context.setActiveAccountId,
    addAccount: context.addAccount,
    deleteAccount: context.deleteAccount,
    setDefaultAccount: context.setDefaultAccount,
  };
}
