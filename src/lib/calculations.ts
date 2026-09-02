import { Trade, TradeDirection, TradeResult } from '@/types/trade';

/**
 * Calculates net profit and loss from trade execution parameters.
 * Automatically deducts commission and swap.
 */
export function calculatePnL({
  direction,
  entryPrice,
  exitPrice,
  positionSize,
  commission = 0,
  swap = 0,
}: {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number | null;
  positionSize: number;
  commission?: number;
  swap?: number;
}): number | null {
  if (exitPrice === undefined || exitPrice === null || isNaN(exitPrice)) {
    return null;
  }

  let grossPnL = 0;
  if (direction === 'LONG') {
    grossPnL = (exitPrice - entryPrice) * positionSize;
  } else {
    grossPnL = (entryPrice - exitPrice) * positionSize;
  }

  const netPnL = grossPnL - (commission || 0) - (swap || 0);
  return Number(netPnL.toFixed(2));
}

/**
 * Calculates monetary risk based on entry price and stop loss.
 */
export function calculateRiskAmount({
  entryPrice,
  stopLoss,
  positionSize,
}: {
  entryPrice: number;
  stopLoss?: number | null;
  positionSize: number;
}): number | null {
  if (stopLoss === undefined || stopLoss === null || isNaN(stopLoss)) {
    return null;
  }
  const risk = Math.abs(entryPrice - stopLoss) * positionSize;
  return Number(risk.toFixed(2));
}

/**
 * Calculates risk percentage of account balance.
 */
export function calculateRiskPercent(riskAmount: number | null, accountBalance: number = 10000): number | null {
  if (!riskAmount || accountBalance <= 0) return null;
  return Number(((riskAmount / accountBalance) * 100).toFixed(2));
}

/**
 * Calculates R-multiple (reward-to-risk realization).
 */
export function calculateRMultiple(pnl: number | null, riskAmount: number | null): number | null {
  if (pnl === null || riskAmount === null || riskAmount <= 0) {
    return null;
  }
  return Number((pnl / riskAmount).toFixed(2));
}

/**
 * Determines outcome category: WIN, LOSS, or BREAKEVEN.
 */
export function calculateResult(pnl: number | null): TradeResult | null {
  if (pnl === null) return null;
  if (pnl > 0) return 'WIN';
  if (pnl < 0) return 'LOSS';
  return 'BREAKEVEN';
}

/**
 * Calculates aggregate performance statistics over a list of trades.
 * Strictly calculates derived values and guarantees no NaN or division-by-zero crashes.
 */
export function calculateTradeStatistics(trades: Trade[], initialBalance: number = 10000) {
  const closedTrades = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      winRate: 0,
      lossRate: 0,
      netPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      expectancy: 0,
      averageR: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      currentStreak: { type: 'NONE' as 'WIN' | 'LOSS' | 'NONE', count: 0 },
    };
  }

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let sumR = 0;
  let countR = 0;

  for (const t of closedTrades) {
    const p = t.pnl || 0;
    if (p > 0) {
      wins++;
      grossProfit += p;
    } else if (p < 0) {
      losses++;
      grossLoss += Math.abs(p);
    } else {
      breakevens++;
    }

    if (t.r_multiple !== null && t.r_multiple !== undefined && !isNaN(t.r_multiple)) {
      sumR += t.r_multiple;
      countR++;
    }
  }

  const winRate = Number(((wins / totalTrades) * 100).toFixed(1));
  const lossRate = Number(((losses / totalTrades) * 100).toFixed(1));
  const netPnL = Number((grossProfit - grossLoss).toFixed(2));
  
  // Profit factor calculation
  let profitFactor = 0;
  if (grossLoss === 0) {
    profitFactor = grossProfit > 0 ? 99.99 : 0;
  } else {
    profitFactor = Number((grossProfit / grossLoss).toFixed(2));
  }

  const averageWin = wins > 0 ? Number((grossProfit / wins).toFixed(2)) : 0;
  const averageLoss = losses > 0 ? Number((grossLoss / losses).toFixed(2)) : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const expectancy = Number(((winRate / 100) * averageWin - (lossRate / 100) * averageLoss).toFixed(2));
  const averageR = countR > 0 ? Number((sumR / countR).toFixed(2)) : 0;

  // Drawdown & Streaks calculation requires chronological order (oldest first)
  const sortedChronological = [...closedTrades].sort((a, b) => {
    const timeA = new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime();
    const timeB = new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime();
    return timeA - timeB;
  });

  let runningEquity = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  for (const t of sortedChronological) {
    const pnl = t.pnl || 0;
    runningEquity += pnl;

    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }

    const currentDrawdown = peakEquity - runningEquity;
    if (currentDrawdown > maxDrawdownAmount) {
      maxDrawdownAmount = currentDrawdown;
      maxDrawdownPercent = peakEquity > 0 ? (currentDrawdown / peakEquity) * 100 : 0;
    }

    // Streaks
    if (pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    } else {
      // breakeven doesn't break win streak or loss streak
    }
  }

  const lastTrade = sortedChronological[sortedChronological.length - 1];
  const lastPnL = lastTrade ? (lastTrade.pnl || 0) : 0;
  const currentStreak = {
    type: lastPnL > 0 ? ('WIN' as const) : lastPnL < 0 ? ('LOSS' as const) : ('NONE' as const),
    count: lastPnL > 0 ? currentWinStreak : lastPnL < 0 ? currentLossStreak : 0,
  };

  return {
    totalTrades,
    wins,
    losses,
    breakevens,
    winRate,
    lossRate,
    netPnL,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    profitFactor,
    averageWin,
    averageLoss,
    expectancy,
    averageR,
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
    maxWinStreak,
    maxLossStreak,
    currentStreak,
  };
}
