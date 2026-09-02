export type TradeDirection = 'LONG' | 'SHORT';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN';

export type TradingSession = 
  | 'Asian' 
  | 'London' 
  | 'New York' 
  | 'London/NY Overlap' 
  | 'Custom';

export type TradeEmotion = 
  | 'Calm'
  | 'Focused'
  | 'Confident'
  | 'Fear'
  | 'Greed'
  | 'FOMO'
  | 'Revenge'
  | 'Impatient'
  | 'Uncertain'
  | 'Overconfident';

export type TradeMistake = 
  | 'FOMO'
  | 'Late Entry'
  | 'Early Exit'
  | 'Moved Stop'
  | 'Oversized Position'
  | 'Revenge Trade'
  | 'Ignored Setup'
  | 'Ignored Stop Loss'
  | 'No Confirmation'
  | 'Overtrading'
  | 'Chased Price'
  | 'None';

export interface TradeNotes {
  tradeThesis?: string;
  whatHappened?: string;
  whatWentWell?: string;
  whatWentWrong?: string;
  lesson?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id?: string | null;
  account_name?: string | null;
  
  // Date & Times
  date: string; // YYYY-MM-DD
  entry_time?: string | null; // HH:mm:ss or HH:mm
  exit_time?: string | null;

  // Market
  symbol: string;
  direction: TradeDirection;
  timeframe?: string | null;
  session?: TradingSession | string | null;

  // Execution
  entry_price: number;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  position_size: number;

  // Costs & Risk
  risk_amount?: number | null;
  risk_percent?: number | null;
  commission?: number;
  swap?: number;

  // Performance
  pnl?: number | null;
  pnl_percent?: number | null;
  r_multiple?: number | null;
  result?: TradeResult | null;

  // Classification
  strategy_id?: string | null;
  strategy_name?: string | null;
  setup_id?: string | null;
  setup_name?: string | null;
  tags?: string[];

  // Psychology
  emotion?: TradeEmotion | string | null;
  confidence?: number | null; // 1-10
  discipline?: number | null; // 1-10
  mistake?: TradeMistake | string | null;

  // Notes
  notes?: TradeNotes;

  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  currency: string;
  is_default: boolean;
  created_at: string;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Setup {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  created_at: string;
}

export interface TradeFilterOptions {
  startDate?: string;
  endDate?: string;
  dateRangePreset?: 'today' | 'week' | 'month' | 'last_month' | 'year' | 'custom' | 'all';
  symbol?: string;
  direction?: TradeDirection | 'ALL';
  result?: TradeResult | 'ALL';
  setup?: string;
  strategy?: string;
  session?: string;
  timeframe?: string;
  emotion?: string;
  mistake?: string;
  account?: string;
  tag?: string;
  search?: string;
}

export interface ImportRecord {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  status: 'processing' | 'completed' | 'failed';
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  created_at: string;
}

export interface ImportRow {
  id: string;
  import_id: string;
  raw_data: Record<string, unknown>;
  parsed_data: Partial<Trade>;
  confidence: number;
  status: 'valid' | 'duplicate' | 'error' | 'imported';
  error_message?: string | null;
  created_at: string;
}
