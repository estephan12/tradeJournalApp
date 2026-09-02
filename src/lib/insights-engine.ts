import { Trade } from '@/types/trade';
import { formatCurrency, formatPercent, formatR } from './utils';

export type SampleReliability = 'insufficient' | 'early_signal' | 'reliable';

export interface InsightItem {
  id: string;
  category: 'top_performer' | 'bottom_performer' | 'pattern' | 'outlier' | 'risk_problem' | 'behavioral_problem';
  title: string;
  narrative: string;
  metricLabel: string;
  metricValue: string;
  sampleSize: number;
  reliability: SampleReliability;
  underlyingStats: {
    winRate: number;
    profitFactor: number;
    netPnL: number;
    expectancy: number;
    averageR: number;
  };
}

export function evaluateReliability(n: number): SampleReliability {
  if (n < 10) return 'insufficient';
  if (n <= 29) return 'early_signal';
  return 'reliable';
}

export function generateInsights(trades: Trade[]): InsightItem[] {
  const closed = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
  if (closed.length === 0) return [];

  const insights: InsightItem[] = [];

  const baselineWins = closed.filter((t) => (t.pnl || 0) > 0).length;
  const baselineWinRate = closed.length > 0 ? (baselineWins / closed.length) * 100 : 0;
  const baselineTotalPnL = closed.reduce((acc, c) => acc + (c.pnl || 0), 0);

  // Grouping helper
  const groupStats = (
    keyFn: (t: Trade) => string | null | undefined
  ) => {
    const map = new Map<string, Trade[]>();
    for (const t of closed) {
      const k = keyFn(t);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(t);
      map.set(k, arr);
    }
    return map;
  };

  // Helper for computing group metrics
  const computeMetrics = (groupTrades: Trade[]) => {
    const n = groupTrades.length;
    const wins = groupTrades.filter((t) => (t.pnl || 0) > 0);
    const losses = groupTrades.filter((t) => (t.pnl || 0) < 0);
    const winRate = Number(((wins.length / n) * 100).toFixed(1));
    const netPnL = Number(groupTrades.reduce((a, c) => a + (c.pnl || 0), 0).toFixed(2));
    const grossProfit = wins.reduce((a, c) => a + (c.pnl || 0), 0);
    const grossLoss = losses.reduce((a, c) => a + Math.abs(c.pnl || 0), 0);
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const expectancy = Number(((winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss).toFixed(2));
    const rTrades = groupTrades.filter((t) => t.r_multiple !== null && t.r_multiple !== undefined);
    const avgR = rTrades.length > 0 ? Number((rTrades.reduce((a, c) => a + (c.r_multiple || 0), 0) / rTrades.length).toFixed(2)) : 0;

    return { n, winRate, netPnL, profitFactor, expectancy, averageR: avgR, grossLoss };
  };

  // 1. ASSET ANALYSIS
  const assetGroups = groupStats((t) => t.symbol);
  for (const [symbol, list] of assetGroups.entries()) {
    const m = computeMetrics(list);
    const reliability = evaluateReliability(m.n);

    // Top Performer
    if (m.n >= 10 && m.profitFactor >= 2.0 && m.netPnL > 0) {
      insights.push({
        id: `top-asset-${symbol}`,
        category: 'top_performer',
        title: `${symbol} Demonstrates Primary Edge`,
        narrative: `Your historical data shows ${symbol} is your highest-performing instrument, generating ${formatCurrency(m.netPnL)} across ${m.n} trades with a ${m.profitFactor} Profit Factor.`,
        metricLabel: 'Net P&L',
        metricValue: formatCurrency(m.netPnL),
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }

    // Bottom Performer / Negative Expectancy
    if (m.n >= 10 && (m.expectancy < 0 || m.profitFactor < 0.9)) {
      insights.push({
        id: `bottom-asset-${symbol}`,
        category: 'bottom_performer',
        title: `${symbol} Displays Negative Expectancy`,
        narrative: `Your data shows ${symbol} currently has a negative statistical expectancy of ${formatCurrency(m.expectancy)} per trade over ${m.n} recorded executions.`,
        metricLabel: 'Expectancy',
        metricValue: formatCurrency(m.expectancy),
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }
  }

  // 2. SETUP & STRATEGY ANALYSIS
  const setupGroups = groupStats((t) => t.setup_name);
  for (const [setup, list] of setupGroups.entries()) {
    const m = computeMetrics(list);
    const reliability = evaluateReliability(m.n);

    if (m.n >= 10 && m.winRate >= 60 && m.profitFactor >= 1.8) {
      insights.push({
        id: `top-setup-${setup}`,
        category: 'pattern',
        title: `${setup} High-Probability Pattern`,
        narrative: `Your records indicate "${setup}" setups produce a ${formatPercent(m.winRate)} win rate and ${formatR(m.averageR)} average R over ${m.n} trades.`,
        metricLabel: 'Win Rate',
        metricValue: formatPercent(m.winRate),
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }

    if (m.n >= 10 && m.profitFactor < 1.0) {
      insights.push({
        id: `weak-setup-${setup}`,
        category: 'bottom_performer',
        title: `${setup} Setup Profit Factor Below 1.0`,
        narrative: `Your data indicates that "${setup}" setups currently lose more capital than they generate, with a ${m.profitFactor} profit factor across ${m.n} trades.`,
        metricLabel: 'Profit Factor',
        metricValue: m.profitFactor.toFixed(2),
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }
  }

  // 3. BEHAVIORAL & EMOTION ANALYSIS
  const emotionGroups = groupStats((t) => t.emotion);
  for (const [emotion, list] of emotionGroups.entries()) {
    const m = computeMetrics(list);
    const reliability = evaluateReliability(m.n);

    if (m.n >= 10 && ['FOMO', 'Revenge', 'Greed', 'Impatient'].includes(emotion)) {
      if (m.winRate < baselineWinRate - 10 || m.netPnL < 0) {
        insights.push({
          id: `behavior-${emotion}`,
          category: 'behavioral_problem',
          title: `Emotional Drag: ${emotion}`,
          narrative: `Your journal indicates trades tagged with "${emotion}" underperform your baseline win rate by ${(baselineWinRate - m.winRate).toFixed(1)} percentage points, costing ${formatCurrency(Math.abs(m.netPnL))}.`,
          metricLabel: 'Total Cost',
          metricValue: formatCurrency(m.netPnL),
          sampleSize: m.n,
          reliability,
          underlyingStats: m,
        });
      }
    }
  }

  // 4. MISTAKE AUDIT
  const mistakeGroups = groupStats((t) => t.mistake);
  for (const [mistake, list] of mistakeGroups.entries()) {
    if (mistake === 'None') continue;
    const m = computeMetrics(list);
    const reliability = evaluateReliability(m.n);

    if (m.grossLoss > 200 || m.n >= 5) {
      insights.push({
        id: `mistake-${mistake}`,
        category: 'behavioral_problem',
        title: `Costliest Error: ${mistake}`,
        narrative: `Your historical logs attribute ${formatCurrency(m.grossLoss)} in total gross losses across ${m.n} occurrences of the "${mistake}" mistake flag.`,
        metricLabel: 'Capital Lost',
        metricValue: `-${formatCurrency(m.grossLoss)}`,
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }
  }

  // 5. RISK OUTLIERS (Extremely large single losses)
  const sortedLosses = [...closed]
    .filter((t) => (t.pnl || 0) < 0)
    .sort((a, b) => (a.pnl || 0) - (b.pnl || 0)); // most negative first

  if (sortedLosses.length > 0) {
    const worst = sortedLosses[0];
    const avgLossAmount = closed
      .filter((t) => (t.pnl || 0) < 0)
      .reduce((a, c) => a + Math.abs(c.pnl || 0), 0) / (closed.filter((t) => (t.pnl || 0) < 0).length || 1);

    if (worst.pnl && Math.abs(worst.pnl) >= avgLossAmount * 2.5) {
      insights.push({
        id: `outlier-worst-loss`,
        category: 'risk_problem',
        title: 'Single-Trade Tail Risk Anomaly',
        narrative: `Your records show an outlier loss of ${formatCurrency(worst.pnl)} on ${worst.symbol} (${worst.date}), which was ${(Math.abs(worst.pnl) / avgLossAmount).toFixed(1)}x larger than your average loss.`,
        metricLabel: 'Outlier Loss',
        metricValue: formatCurrency(worst.pnl),
        sampleSize: 1,
        reliability: 'reliable',
        underlyingStats: {
          winRate: 0,
          profitFactor: 0,
          netPnL: worst.pnl,
          expectancy: worst.pnl,
          averageR: worst.r_multiple || 0,
        },
      });
    }
  }

  // 6. SESSION CORELATION
  const sessionGroups = groupStats((t) => t.session);
  for (const [sess, list] of sessionGroups.entries()) {
    const m = computeMetrics(list);
    const reliability = evaluateReliability(m.n);

    if (m.n >= 10 && m.expectancy > 0 && m.winRate >= 55) {
      insights.push({
        id: `session-edge-${sess}`,
        category: 'pattern',
        title: `${sess} Session Peak Efficiency`,
        narrative: `Your data shows the ${sess} session provides your highest consistency with ${formatCurrency(m.expectancy)} expectancy across ${m.n} trades.`,
        metricLabel: 'Session Expectancy',
        metricValue: formatCurrency(m.expectancy),
        sampleSize: m.n,
        reliability,
        underlyingStats: m,
      });
    }
  }

  return insights;
}
