import { describe, it, expect } from 'vitest';
import { autoDetectColumnMapping, normalizeRow } from '../lib/import/csv-detector';

describe('Import & Duplicate Detection Engine', () => {
  it('correctly auto-detects column headers with high confidence', () => {
    const rawHeaders = ['Ticker', 'Side', 'Open Price', 'Close Price', 'Volume', 'Net Profit', 'Date'];
    const mappings = autoDetectColumnMapping(rawHeaders);

    const symbolMap = mappings.find((m) => m.csvColumn === 'Ticker');
    expect(symbolMap?.targetField).toBe('symbol');
    expect(symbolMap?.confidence).toBeGreaterThan(0.9);

    const dirMap = mappings.find((m) => m.csvColumn === 'Side');
    expect(dirMap?.targetField).toBe('direction');

    const entryMap = mappings.find((m) => m.csvColumn === 'Open Price');
    expect(entryMap?.targetField).toBe('entry_price');

    const exitMap = mappings.find((m) => m.csvColumn === 'Close Price');
    expect(exitMap?.targetField).toBe('exit_price');

    const pnlMap = mappings.find((m) => m.csvColumn === 'Net Profit');
    expect(pnlMap?.targetField).toBe('pnl');
  });

  it('normalizes raw row values into structured trade record', () => {
    const rawRow = {
      Ticker: 'BTCUSDT',
      Side: 'Buy',
      'Open Price': '55,000.50',
      'Close Price': '56,200.00',
      Volume: '1.5',
      'Net Profit': '1,799.25',
      Date: '2026-08-15',
    };

    const mappings = autoDetectColumnMapping(Object.keys(rawRow));
    const { trade, confidence } = normalizeRow(rawRow, mappings);

    expect(trade.symbol).toBe('BTCUSDT');
    expect(trade.direction).toBe('LONG');
    expect(trade.entry_price).toBe(55000.5);
    expect(trade.exit_price).toBe(56200);
    expect(trade.position_size).toBe(1.5);
    expect(trade.pnl).toBe(1799.25);
    expect(trade.date).toBe('2026-08-15');
    expect(confidence).toBeGreaterThan(0.9);
  });

  it('identifies duplicate trade keys accurately', () => {
    const existing = [
      {
        symbol: 'BTCUSDT',
        direction: 'LONG',
        date: '2026-08-15',
        entry_price: 55000,
        exit_price: 56000,
        pnl: 1000,
      },
    ];

    const generateKey = (t: {
      symbol: string;
      direction: string;
      date: string;
      entry_price: number;
      exit_price?: number | null;
      pnl?: number | null;
    }) => `${t.symbol.toUpperCase()}|${t.direction}|${t.date}|${t.entry_price}|${t.exit_price}|${t.pnl}`;

    const existingKeys = new Set(existing.map(generateKey));

    const candidate1 = {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      date: '2026-08-15',
      entry_price: 55000,
      exit_price: 56000,
      pnl: 1000,
    };

    const candidate2 = {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      date: '2026-08-16', // different date
      entry_price: 55000,
      exit_price: 56000,
      pnl: 1000,
    };

    expect(existingKeys.has(generateKey(candidate1))).toBe(true); // duplicate
    expect(existingKeys.has(generateKey(candidate2))).toBe(false); // unique
  });
});
