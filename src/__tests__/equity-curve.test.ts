import { describe, it, expect } from 'vitest';
import { Trade } from '../types/trade';

describe('Equity Curve & Drawdown Series Calculation', () => {
  const mockTrades: Partial<Trade>[] = [
    {
      id: '1',
      date: '2026-08-20',
      entry_time: '10:00',
      pnl: 100,
      symbol: 'EURUSD',
      direction: 'LONG',
    },
    {
      id: '2',
      date: '2026-08-21',
      entry_time: '11:00',
      pnl: -50,
      symbol: 'GBPUSD',
      direction: 'SHORT',
    },
    {
      id: '3',
      date: '2026-08-22',
      entry_time: '09:00',
      pnl: 200,
      symbol: 'BTCUSDT',
      direction: 'LONG',
    },
    {
      id: '4',
      date: '2026-08-23',
      entry_time: '14:00',
      pnl: -80,
      symbol: 'USDJPY',
      direction: 'LONG',
    },
  ];

  it('correctly calculates cumulative PnL, peak equity and drawdowns', () => {
    let cumPnL = 0;
    let peak = 0;
    const initialBalance = 10000;

    const series = mockTrades.map((t) => {
      cumPnL += t.pnl || 0;
      peak = Math.max(peak, cumPnL);
      const ddDollars = Math.max(0, peak - cumPnL);
      const equity = initialBalance + cumPnL;
      const peakEquity = initialBalance + peak;
      const ddPercent = peakEquity > 0 ? (ddDollars / peakEquity) * 100 : 0;

      return {
        tradeId: t.id,
        cumPnL,
        equity,
        peak,
        ddDollars,
        ddPercent,
      };
    });

    // Trade 1: +100
    expect(series[0].cumPnL).toBe(100);
    expect(series[0].peak).toBe(100);
    expect(series[0].ddDollars).toBe(0);
    expect(series[0].ddPercent).toBe(0);
    expect(series[0].equity).toBe(10100);

    // Trade 2: -50 (cum: 50, peak: 100, dd: 50)
    expect(series[1].cumPnL).toBe(50);
    expect(series[1].peak).toBe(100);
    expect(series[1].ddDollars).toBe(50);
    expect(series[1].ddPercent).toBeCloseTo((50 / 10100) * 100, 2);
    expect(series[1].equity).toBe(10050);

    // Trade 3: +200 (cum: 250, peak: 250, dd: 0)
    expect(series[2].cumPnL).toBe(250);
    expect(series[2].peak).toBe(250);
    expect(series[2].ddDollars).toBe(0);
    expect(series[2].ddPercent).toBe(0);
    expect(series[2].equity).toBe(10250);

    // Trade 4: -80 (cum: 170, peak: 250, dd: 80)
    expect(series[3].cumPnL).toBe(170);
    expect(series[3].peak).toBe(250);
    expect(series[3].ddDollars).toBe(80);
    expect(series[3].equity).toBe(10170);
  });
});
