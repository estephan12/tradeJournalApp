import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Trade, TradeDirection } from '@/types/trade';

export interface ColumnMapping {
  csvColumn: string;
  targetField: keyof Trade | 'ignore';
  confidence: number;
}

export const TARGET_FIELDS: { key: keyof Trade | 'ignore'; label: string }[] = [
  { key: 'ignore', label: '-- Ignore Column --' },
  { key: 'date', label: 'Trade Date (YYYY-MM-DD)' },
  { key: 'entry_time', label: 'Entry Time (HH:MM)' },
  { key: 'exit_time', label: 'Exit Time (HH:MM)' },
  { key: 'symbol', label: 'Symbol / Asset / Ticker' },
  { key: 'direction', label: 'Direction (LONG/SHORT or BUY/SELL)' },
  { key: 'entry_price', label: 'Entry Price' },
  { key: 'exit_price', label: 'Exit Price' },
  { key: 'stop_loss', label: 'Stop Loss' },
  { key: 'take_profit', label: 'Take Profit' },
  { key: 'position_size', label: 'Position Size / Lots / Qty' },
  { key: 'pnl', label: 'Net P&L ($)' },
  { key: 'commission', label: 'Commission ($)' },
  { key: 'swap', label: 'Swap ($)' },
  { key: 'setup_name', label: 'Setup' },
  { key: 'strategy_name', label: 'Strategy' },
  { key: 'session', label: 'Session' },
  { key: 'timeframe', label: 'Timeframe' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'mistake', label: 'Mistake' },
];

/**
 * Heuristics to automatically map common broker and journal column headers
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (/^(symbol|ticker|instrument|pair|asset|contract|market)$/.test(clean)) {
      return { csvColumn: header, targetField: 'symbol', confidence: 0.98 };
    }
    if (/^(date|datetime|dateandtime|tradedate|closedate|opendate|timeopen|closingtime|placingtime)$/.test(clean)) {
      return { csvColumn: header, targetField: 'date', confidence: 0.98 };
    }
    if (/^(opentime|entrytime|time|placingtime)$/.test(clean)) {
      return { csvColumn: header, targetField: 'entry_time', confidence: 0.9 };
    }
    if (/^(closetime|exittime|closingtime)$/.test(clean)) {
      return { csvColumn: header, targetField: 'exit_time', confidence: 0.9 };
    }
    if (/^(direction|type|side|action|buysell)$/.test(clean)) {
      return { csvColumn: header, targetField: 'direction', confidence: 0.98 };
    }
    if (/^(entry|entryprice|openprice|pricein|avgentryprice|avgprice|averageprice|fillprice)$/.test(clean)) {
      return { csvColumn: header, targetField: 'entry_price', confidence: 0.98 };
    }
    if (/^(exit|exitprice|closeprice|priceout|avgexitprice)$/.test(clean)) {
      return { csvColumn: header, targetField: 'exit_price', confidence: 0.98 };
    }
    if (/^(stoploss|sl|stopprice)$/.test(clean)) {
      return { csvColumn: header, targetField: 'stop_loss', confidence: 0.9 };
    }
    if (/^(takeprofit|tp|target|targetprice)$/.test(clean)) {
      return { csvColumn: header, targetField: 'take_profit', confidence: 0.9 };
    }
    if (/^(size|positionsize|qty|quantity|lots|volume|amount)$/.test(clean)) {
      return { csvColumn: header, targetField: 'position_size', confidence: 0.98 };
    }
    if (/^(pnl|profit|loss|netprofit|netpnl|realizedpnl|realizedpnlvalue|profitloss|profitandloss|net)$/.test(clean)) {
      return { csvColumn: header, targetField: 'pnl', confidence: 0.98 };
    }
    if (/^(commission|comm|fee|fees)$/.test(clean)) {
      return { csvColumn: header, targetField: 'commission', confidence: 0.88 };
    }
    if (/^(swap|rollover|financing)$/.test(clean)) {
      return { csvColumn: header, targetField: 'swap', confidence: 0.88 };
    }
    if (/^(setup|pattern|model)$/.test(clean)) {
      return { csvColumn: header, targetField: 'setup_name', confidence: 0.85 };
    }
    if (/^(strategy|system|playbook)$/.test(clean)) {
      return { csvColumn: header, targetField: 'strategy_name', confidence: 0.85 };
    }
    if (/^(session|marketphase)$/.test(clean)) {
      return { csvColumn: header, targetField: 'session', confidence: 0.85 };
    }
    if (/^(timeframe|tf)$/.test(clean)) {
      return { csvColumn: header, targetField: 'timeframe', confidence: 0.85 };
    }
    if (/^(emotion|mood|mentalstate)$/.test(clean)) {
      return { csvColumn: header, targetField: 'emotion', confidence: 0.8 };
    }
    if (/^(mistake|error|flaw)$/.test(clean)) {
      return { csvColumn: header, targetField: 'mistake', confidence: 0.8 };
    }

    return { csvColumn: header, targetField: 'ignore', confidence: 0 };
  });
}

/**
 * Normalizes tabular raw row into a Trade record based on mapped column definitions
 */
export function normalizeRow(
  rawRow: Record<string, unknown>,
  mappings: ColumnMapping[]
): { trade: Partial<Trade>; confidence: number } {
  const result: Partial<Trade> = {};
  let fieldConfidenceSum = 0;
  let fieldCount = 0;

  for (const m of mappings) {
    if (m.targetField === 'ignore') continue;
    const rawVal = rawRow[m.csvColumn];
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;

    fieldCount++;
    fieldConfidenceSum += m.confidence;

    const valStr = String(rawVal).trim();

    switch (m.targetField) {
      case 'symbol': {
        const symbolPart = valStr.includes(':') ? valStr.split(':').pop() || valStr : valStr;
        result.symbol = symbolPart.toUpperCase().replace(/[^A-Z0-9]/g, '');
        break;
      }

      case 'direction': {
        const lower = valStr.toLowerCase();
        if (lower.includes('buy') || lower.includes('long')) {
          result.direction = 'LONG';
        } else if (lower.includes('sell') || lower.includes('short')) {
          result.direction = 'SHORT';
        } else {
          result.direction = 'LONG';
        }
        break;
      }

      case 'date': {
        if (valStr.includes(' ') || valStr.includes('T')) {
          const parts = valStr.replace('T', ' ').split(' ');
          result.date = parts[0];
          const timeClean = parts[1]?.trim().substring(0, 5);
          if (timeClean) {
            if (!result.exit_time) result.exit_time = timeClean;
            if (!result.entry_time) result.entry_time = timeClean;
          }
        } else {
          const parsedDate = new Date(valStr);
          if (!isNaN(parsedDate.getTime())) {
            result.date = parsedDate.toISOString().split('T')[0];
          } else {
            result.date = valStr;
          }
        }
        break;
      }

      case 'entry_time':
        result.entry_time = valStr.substring(0, 5);
        break;

      case 'exit_time':
        result.exit_time = valStr.substring(0, 5);
        break;

      case 'entry_price': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.entry_price = parseFloat(cleanVal) || 0;
        break;
      }

      case 'exit_price': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.exit_price = parseFloat(cleanVal) || null;
        break;
      }

      case 'stop_loss': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.stop_loss = parseFloat(cleanVal) || null;
        break;
      }

      case 'take_profit': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.take_profit = parseFloat(cleanVal) || null;
        break;
      }

      case 'position_size': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.position_size = parseFloat(cleanVal) || 1;
        break;
      }

      case 'pnl': {
        const cleanVal = valStr.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        result.pnl = parseFloat(cleanVal) || 0;
        break;
      }

      case 'commission':
        result.commission = parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;
        break;

      case 'swap':
        result.swap = parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;
        break;

      case 'setup_name':
        result.setup_name = valStr;
        break;

      case 'strategy_name':
        result.strategy_name = valStr;
        break;

      case 'session':
        result.session = valStr;
        break;

      case 'timeframe':
        result.timeframe = valStr;
        break;

      case 'emotion':
        result.emotion = valStr;
        break;

      case 'mistake':
        result.mistake = valStr;
        break;
    }
  }

  // Row confidence calculation
  const overallConfidence = fieldCount > 0 ? fieldConfidenceSum / fieldCount : 0.5;

  return {
    trade: result,
    confidence: Number(overallConfidence.toFixed(2)),
  };
}

/**
 * Checks if CSV represents TradingView Paper Trading Balance History
 */
export function isTradingViewBalanceHistory(headers: string[]): boolean {
  const hasAction = headers.some((h) => /^action$/i.test(h.trim()));
  const hasPnL = headers.some((h) => /realized\s*pnl/i.test(h));
  return hasAction && hasPnL;
}

/**
 * Transforms TradingView balance history rows into structured trade rows
 */
export function parseTradingViewBalanceHistory(rows: Record<string, unknown>[]): {
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const transformedRows: Record<string, unknown>[] = [];

  for (const r of rows) {
    const timeStr = String(r['Time'] || '').trim();
    const [datePart, timePart] = timeStr.split(' ');
    const actionStr = String(r['Action'] || '');
    const pnlVal = parseFloat(String(r['Realized PnL (value)'] || '0').replace(/[^0-9.-]/g, '')) || 0;

    const match = actionStr.match(
      /Close\s+(long|short)\s+position\s+for\s+symbol\s+([A-Z0-9_:]+)\s+at\s+price\s+([\d.]+)\s+for\s+([\d.]+)\s+units.*?Position AVG Price was\s+([\d.]+)/i
    );

    if (match) {
      const direction = match[1].toLowerCase() === 'short' ? 'SHORT' : 'LONG';
      const rawSym = match[2];
      const symbol = rawSym.includes(':') ? rawSym.split(':').pop() || rawSym : rawSym;
      const exitPrice = parseFloat(match[3]) || 0;
      const size = parseFloat(match[4]) || 1;
      const entryPrice = parseFloat(match[5]) || 0;

      transformedRows.push({
        'Date': datePart || timeStr,
        'Exit Time': timePart ? timePart.substring(0, 5) : '',
        'Symbol': symbol.toUpperCase(),
        'Direction': direction,
        'Entry Price': entryPrice,
        'Exit Price': exitPrice,
        'Position Size': size,
        'Realized PnL': pnlVal,
      });
    }
  }

  const headers = [
    'Date',
    'Exit Time',
    'Symbol',
    'Direction',
    'Entry Price',
    'Exit Price',
    'Position Size',
    'Realized PnL',
  ];

  return { headers, rows: transformedRows };
}

/**
 * Parses CSV text using PapaParse
 */
export function parseCSVData(csvString: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const parsed = Papa.parse<Record<string, unknown>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  let headers = parsed.meta.fields || [];
  let rows = parsed.data;

  // Auto-unpack TradingView Paper Trading Balance History
  if (isTradingViewBalanceHistory(headers)) {
    const tvResult = parseTradingViewBalanceHistory(rows);
    headers = tvResult.headers;
    rows = tvResult.rows;
  }

  return { headers, rows };
}

/**
 * Parses Excel file buffer or array buffer using XLSX
 */
export function parseExcelData(data: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  let headers = json.length > 0 ? Object.keys(json[0]) : [];
  let rows = json;

  if (isTradingViewBalanceHistory(headers)) {
    const tvResult = parseTradingViewBalanceHistory(rows);
    headers = tvResult.headers;
    rows = tvResult.rows;
  }

  return { headers, rows };
}

