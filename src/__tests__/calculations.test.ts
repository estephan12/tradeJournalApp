import { describe, it, expect } from 'vitest';
import {
  calculatePnL,
  calculateRiskAmount,
  calculateRMultiple,
  calculateResult,
  calculateTradeStatistics,
} from '../lib/calculations';
import { Trade } from '../types/trade';

describe('TradeLab Calculation Engine', () => {
  describe('calculatePnL', () => {
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

    it('returns null if exit price is missing', () => {
      const pnl = calculatePnL({
        direction: 'LONG',
        entryPrice: 50000,
        positionSize: 1,
      });
      expect(pnl).toBeNull();
    });
  });

  describe('calculateRiskAmount & calculateRMultiple', () => {
    it('calculates risk amount from stop loss distance', () => {
      const risk = calculateRiskAmount({
        entryPrice: 100,
        stopLoss: 95,
        positionSize: 10,
      });
      // 5 * 10 = 50
      expect(risk).toBe(50);
    });

    it('calculates positive and negative R-multiples', () => {
      expect(calculateRMultiple(150, 50)).toBe(3.00);
      expect(calculateRMultiple(-50, 50)).toBe(-1.00);
      expect(calculateRMultiple(null, 50)).toBeNull();
      expect(calculateRMultiple(100, 0)).toBeNull();
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
      // Profit factor = 800 / 300 = 2.67
      expect(stats.profitFactor).toBe(2.67);
      expect(stats.averageWin).toBe(400); // 800 / 2
      expect(stats.averageLoss).toBe(150); // 300 / 2
      // Expectancy = (0.5 * 400) - (0.5 * 150) = 200 - 75 = 125
      expect(stats.expectancy).toBe(125);
      expect(stats.maxWinStreak).toBe(2);
      expect(stats.maxLossStreak).toBe(2);
      // Max drawdown: peaked at 10800, then dropped to 10600 (drawdown 200), then to 10500 (drawdown 300)
      expect(stats.maxDrawdownAmount).toBe(300);
    });
  });
});
