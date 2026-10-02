import { useTrades as useTradeContext } from '../context/trade-context';

export function useAuth() {
  const context = useTradeContext();
  return {
    user: context.user,
    signOut: context.signOut,
    isLoading: context.isLoading,
  };
}
