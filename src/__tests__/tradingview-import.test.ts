import { describe, it, expect } from 'vitest';
import { parseCSVData, autoDetectColumnMapping, normalizeRow } from '../lib/import/csv-detector';

describe('TradingView Paper Trading Import', () => {
  const sampleBalanceHistoryCSV = `Time,Balance before,Balance after,Realized PnL (value),Realized PnL (currency),Action
2026-09-01 14:03:22,1396.10,1360.89,-35.21,USD,"Close long position for symbol FX:USDJPY at price 160.196 for 120000 units. Position AVG Price was 160.243000, currency: JPY, rate: 0.006242, point value: 1.000000"
2026-08-31 20:20:50,1410.00,1311.06,-98.94,USD,"Close short position for symbol FX:EURUSD at price 1.16233 for 97000 units. Position AVG Price was 1.161310, currency: USD, rate: 1.000000, point value: 1.000000"
2026-08-31 08:04:09,1344.13,1344.30,0.17,USD,"Close long position for symbol BINANCE:BTCUSDT at price 78506.70 for 0.003 units. Position AVG Price was 78449.560000, currency: USDT, rate: 0.999650, point value: 1.000000"`;

  it('automatically unpacks balance history into clean columns', () => {
    const { headers, rows } = parseCSVData(sampleBalanceHistoryCSV);
    expect(headers).toContain('Date');
    expect(headers).toContain('Symbol');
    expect(headers).toContain('Realized PnL');
    expect(rows.length).toBe(3);

    expect(rows[0]['Symbol']).toBe('USDJPY');
    expect(rows[0]['Direction']).toBe('LONG');
    expect(rows[0]['Entry Price']).toBe(160.243);
    expect(rows[0]['Exit Price']).toBe(160.196);
    expect(rows[0]['Position Size']).toBe(120000);
    expect(rows[0]['Realized PnL']).toBe(-35.21);

    expect(rows[1]['Symbol']).toBe('EURUSD');
    expect(rows[1]['Direction']).toBe('SHORT');

    expect(rows[2]['Symbol']).toBe('BTCUSDT');
  });

  it('maps auto-detected columns with high confidence and normalizes correctly', () => {
    const { headers, rows } = parseCSVData(sampleBalanceHistoryCSV);
    const mappings = autoDetectColumnMapping(headers);

    const { trade } = normalizeRow(rows[0], mappings);
    expect(trade.symbol).toBe('USDJPY');
    expect(trade.direction).toBe('LONG');
    expect(trade.entry_price).toBe(160.243);
    expect(trade.exit_price).toBe(160.196);
    expect(trade.position_size).toBe(120000);
    expect(trade.pnl).toBe(-35.21);
    expect(trade.date).toBe('2026-09-01');
  });

  it('correctly auto-detects and parses user custom TradingView format', () => {
    const userCSV = `Date/Time,Symbol,Action,Quantity,Avg Price,Close Price,Profit/Loss,Balance,Currency
2026-09-02 09:24:53,FX:USDJPY,Close Long,104000,159.709000,159.384,-212.07,887.83,JPY
2026-09-02 08:35:14,FX:EURUSD,Close Long,96000,1.158150,1.15797,-17.28,"1,099.89",USD
2026-09-01 13:25:47,FX:USDJPY,Close Long,120000,160.085000,160.205,+89.88,"1,396.10",JPY
2026-08-31 20:20:50,FX:EURUSD,Close Short,97000,1.161310,1.16233,-98.94,"1,311.07",USD
2026-08-28 05:55:09,OANDA:XAUUSD,Close Long,10,4602.150000,4607.190,+50.40,"1,212.27",USD`;

    const { headers, rows } = parseCSVData(userCSV);
    const mappings = autoDetectColumnMapping(headers);

    // Verify mappings
    const mapFor = (col: string) => mappings.find((m) => m.csvColumn === col);
    expect(mapFor('Date/Time')?.targetField).toBe('date');
    expect(mapFor('Symbol')?.targetField).toBe('symbol');
    expect(mapFor('Action')?.targetField).toBe('direction');
    expect(mapFor('Quantity')?.targetField).toBe('position_size');
    expect(mapFor('Avg Price')?.targetField).toBe('entry_price');
    expect(mapFor('Close Price')?.targetField).toBe('exit_price');
    expect(mapFor('Profit/Loss')?.targetField).toBe('pnl');

    // Normalize Row 0 (USDJPY Loss)
    const { trade: t0 } = normalizeRow(rows[0], mappings);
    expect(t0.date).toBe('2026-09-02');
    expect(t0.exit_time).toBe('09:24');
    expect(t0.symbol).toBe('USDJPY');
    expect(t0.direction).toBe('LONG');
    expect(t0.position_size).toBe(104000);
    expect(t0.entry_price).toBe(159.709);
    expect(t0.exit_price).toBe(159.384);
    expect(t0.pnl).toBe(-212.07);

    // Normalize Row 2 (USDJPY Win with positive prefix +89.88)
    const { trade: t2 } = normalizeRow(rows[2], mappings);
    expect(t2.symbol).toBe('USDJPY');
    expect(t2.direction).toBe('LONG');
    expect(t2.pnl).toBe(89.88);

    // Normalize Row 3 (EURUSD Short)
    const { trade: t3 } = normalizeRow(rows[3], mappings);
    expect(t3.symbol).toBe('EURUSD');
    expect(t3.direction).toBe('SHORT');
    expect(t3.pnl).toBe(-98.94);

    // Normalize Row 4 (XAUUSD Gold with OANDA: prefix)
    const { trade: t4 } = normalizeRow(rows[4], mappings);
    expect(t4.symbol).toBe('XAUUSD');
    expect(t4.direction).toBe('LONG');
    expect(t4.position_size).toBe(10);
    expect(t4.entry_price).toBe(4602.15);
    expect(t4.exit_price).toBe(4607.19);
    expect(t4.pnl).toBe(50.4);
  });
});

