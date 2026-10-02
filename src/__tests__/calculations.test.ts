import { describe, it, expect } from 'vitest';
import {
  calculatePnL,
  calculateRiskAmount,
  calculateRiskPercent,
  calculateRMultiple,
  calculateProfitFactor,
  calculateResult,
  calculateTradeStatistics,
} from '../lib/calculations';
import { formatProfitFactor } from '../lib/utils';
import { Trade } from '../types/trade';

describe('TradeLab Financial Calculation Engine', () => {
  describe('calculatePnL with Multi-Asset support', () => {
    it('calculates long trade profit correctly minus commission and swap', () => {
      const pnl = calculatePnL({
        direction: 'LONG',
        entryPrice: 60000,
        exitPrice: 62000,
        positionSize: 0.5,
        commission: 10,
        swap: 2,
      });
      // (62000 - 60000) * 0.5 = 1000 - 10 - 2 = 988
      expect(pnl).toBe(988);
    });

    it('calculates short trade profit correctly', () => {
      const pnl = calculatePnL({
        direction: 'SHORT',
        entryPrice: 1.1000,
        exitPrice: 1.0900,
        positionSize: 10000,
        commission: 5,
        swap: 0,
      });
      // (1.1000 - 1.0900) * 10000 = 100 - 5 = 95
      expect(pnl).toBe(95);
    });

    it('calculates multi-asset futures contract profit with multiplier', () => {
      // E-mini S&P (ES): 50 multiplier per point
      const pnl = calculatePnL({
        direction: 'LONG',
        entryPrice: 5000,
        exitPrice: 5010,
        positionSize: 2,
        contractMultiplier: 50,
        commission: 5,
      });
      // (5010 - 5000) * 2 * 50 = 1000 - 5 = 995
      expect(pnl).toBe(995);
    });

    it('returns null if exit price is missing', () => {
      const pnl = calculatePnL({
        direction: 'LONG',
        entryPrice: 50000,
        positionSize: 1,
      });
      expect(pnl).toBeNull();
    });
  });

  describe('calculateRiskAmount & Multiplier', () => {
    it('calculates risk amount from stop loss distance and multiplier', () => {
      const risk = calculateRiskAmount({
        entryPrice: 100,
        stopLoss: 95,
        positionSize: 10,
        contractMultiplier: 2,
      });
      // 5 * 10 * 2 = 100
      expect(risk).toBe(100);
    });

    it('calculates positive and negative R-multiples', () => {
      expect(calculateRMultiple(150, 50)).toBe(3.00);
      expect(calculateRMultiple(-50, 50)).toBe(-1.00);
      expect(calculateRMultiple(null, 50)).toBeNull();
      expect(calculateRMultiple(100, 0)).toBeNull();
    });
  });

  describe('calculateRiskPercent with dynamic account balance', () => {
    it('calculates risk percent based on the real selected account balance', () => {
      // $500 risk on a $50,000 account = 1.0%
      expect(calculateRiskPercent(500, 50000)).toBe(1.0);
      // $500 risk on a $100,000 account = 0.5%
      expect(calculateRiskPercent(500, 100000)).toBe(0.5);
      // $200 risk on a $5,000 account = 4.0%
      expect(calculateRiskPercent(200, 5000)).toBe(4.0);
    });

    it('returns null when account balance or risk is non-positive or undefined', () => {
      expect(calculateRiskPercent(null, 50000)).toBeNull();
      expect(calculateRiskPercent(500, 0)).toBeNull();
      expect(calculateRiskPercent(500, -10000)).toBeNull();
      expect(calculateRiskPercent(500, undefined)).toBeNull();
    });
  });

  describe('calculateProfitFactor & Zero-Loss Representation', () => {
    it('returns Infinity when gross loss is 0 and gross profit > 0', () => {
      expect(calculateProfitFactor(1500, 0)).toBe(Infinity);
    });

    it('returns null when there are no wins and no losses', () => {
      expect(calculateProfitFactor(0, 0)).toBeNull();
    });

    it('formats profit factor gracefully into UI symbols', () => {
      expect(formatProfitFactor(Infinity)).toBe('∞');
      expect(formatProfitFactor(null)).toBe('N/A');
      expect(formatProfitFactor(undefined)).toBe('N/A');
      expect(formatProfitFactor(2.666)).toBe('2.67');
      expect(formatProfitFactor(0.85)).toBe('0.85');
    });
  });

  describe('calculateResult', () => {
    it('classifies WIN, LOSS, and BREAKEVEN correctly', () => {
      expect(calculateResult(12.5)).toBe('WIN');
      expect(calculateResult(-0.01)).toBe('LOSS');
      expect(calculateResult(0)).toBe('BREAKEVEN');
      expect(calculateResult(null)).toBeNull();
    });
  });

  describe('calculateTradeStatistics', () => {
    const mockTrades: Trade[] = [
      {
        id: '1',
        user_id: 'u1',
        date: '2026-01-01',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        entry_price: 50000,
        position_size: 1,
        pnl: 500,
        r_multiple: 2.0,
        result: 'WIN',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'u1',
        date: '2026-01-02',
        symbol: 'BTCUSDT',
        direction: 'LONG',
        entry_price: 51000,
        position_size: 1,
        pnl: 300,
        r_multiple: 1.2,
        result: 'WIN',
        created_at: '2026-01-02T10:00:00Z',
        updated_at: '2026-01-02T10:00:00Z',
      },
      {
        id: '3',
        user_id: 'u1',
        date: '2026-01-03',
        symbol: 'EURUSD',
        direction: 'SHORT',
        entry_price: 1.08,
        position_size: 1000,
        pnl: -200,
        r_multiple: -1.0,
        result: 'LOSS',
        created_at: '2026-01-03T10:00:00Z',
        updated_at: '2026-01-03T10:00:00Z',
      },
      {
        id: '4',
        user_id: 'u1',
        date: '2026-01-04',
        symbol: 'XAUUSD',
        direction: 'LONG',
        entry_price: 2400,
        position_size: 1,
        pnl: -100,
        r_multiple: -0.5,
        result: 'LOSS',
        created_at: '2026-01-04T10:00:00Z',
        updated_at: '2026-01-04T10:00:00Z',
      },
    ];

    it('calculates win rate, net PnL, profit factor, expectancy and streaks', () => {
      const stats = calculateTradeStatistics(mockTrades, 10000);

      expect(stats.totalTrades).toBe(4);
      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(2);
      expect(stats.winRate).toBe(50.0);
      expect(stats.netPnL).toBe(500); // 500 + 300 - 200 - 100 = 500
      expect(stats.grossProfit).toBe(800);
      expect(stats.grossLoss).toBe(300);
      expect(stats.profitFactor).toBe(2.67);
      expect(stats.averageWin).toBe(400); // 800 / 2
      expect(stats.averageLoss).toBe(150); // 300 / 2
      expect(stats.expectancy).toBe(125);
      expect(stats.maxWinStreak).toBe(2);
      expect(stats.maxLossStreak).toBe(2);
      expect(stats.maxDrawdownAmount).toBe(300);
    });

    it('handles zero-loss streak without NaN or crashing', () => {
      const winningTradesOnly = mockTrades.slice(0, 2);
      const stats = calculateTradeStatistics(winningTradesOnly, 50000);

      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(0);
      expect(stats.winRate).toBe(100);
      expect(stats.profitFactor).toBe(Infinity);
      expect(stats.maxLossStreak).toBe(0);
    });
  });
});
