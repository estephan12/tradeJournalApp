import { Trade, Account, Setup, Strategy, Tag } from '@/types/trade';

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'acc-demo-1',
    user_id: 'demo-user',
    name: 'Main Prop Account',
    initial_balance: 50000.00,
    currency: 'USD',
    is_default: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'acc-demo-2',
    user_id: 'demo-user',
    name: 'Crypto Futures',
    initial_balance: 10000.00,
    currency: 'USD',
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
  }
];

export const DEMO_SETUPS: Setup[] = [
  { id: 'setup-1', user_id: 'demo-user', name: 'Breakout', description: 'Range breakout with volume', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-2', user_id: 'demo-user', name: 'Breakout + Retest', description: 'Breakout followed by retest', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-3', user_id: 'demo-user', name: 'Liquidity Sweep', description: 'Sweep of highs/lows into key zone', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-4', user_id: 'demo-user', name: 'Momentum', description: 'Trend momentum impulse', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-5', user_id: 'demo-user', name: 'Pullback', description: 'Fibonacci / EMA pullback', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-6', user_id: 'demo-user', name: 'Trend Continuation', description: 'Continuation pattern', created_at: '2026-01-01T00:00:00Z' },
  { id: 'setup-7', user_id: 'demo-user', name: 'Reversal', description: 'Macro level mean reversion', created_at: '2026-01-01T00:00:00Z' },
];

export const DEMO_STRATEGIES: Strategy[] = [
  { id: 'strat-1', user_id: 'demo-user', name: 'ICT / Smart Money', description: 'Order blocks and liquidity', created_at: '2026-01-01T00:00:00Z' },
  { id: 'strat-2', user_id: 'demo-user', name: 'Price Action & Structure', description: 'Support/resistance and trend', created_at: '2026-01-01T00:00:00Z' },
  { id: 'strat-3', user_id: 'demo-user', name: 'Breakout Momentum', description: 'High volatility volume expansion', created_at: '2026-01-01T00:00:00Z' },
];

export const DEMO_TAGS: Tag[] = [
  { id: 'tag-1', user_id: 'demo-user', name: 'A+ Setup', color: '#22C55E', created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-2', user_id: 'demo-user', name: 'News Driver', color: '#F59E0B', created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-3', user_id: 'demo-user', name: 'Overnight', color: '#8B98A8', created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-4', user_id: 'demo-user', name: 'Scalp', color: '#38BDF8', created_at: '2026-01-01T00:00:00Z' },
];

// Generate comprehensive dataset reflecting the prompt specifications:
// - BTCUSDT: 36 trades, 68% win rate, PF ~3.06, high positive expectancy
// - EURUSD: Largest losses, mixed performance
// - GBPUSD: Negative expectancy, reversal issues
// - USDJPY & XAUUSD: balanced distribution
function generateDemoTrades(): Trade[] {
  const trades: Trade[] = [];

  // Helper for generating dates over the past 60 days
  const baseDate = new Date('2026-09-01T12:00:00Z');

  // 1. 36 trades for BTCUSDT (Strongest asset)
  for (let i = 1; i <= 36; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(i * 1.5));
    const isWin = i % 3 !== 0; // ~67% win rate
    const pnl = isWin ? +(120 + (i * 7) % 180).toFixed(2) : -+(80 + (i * 5) % 90).toFixed(2);
    const risk = 100;
    const rMultiple = +(pnl / risk).toFixed(2);
    const entryPrice = 58000 + (i * 240);
    const exitPrice = isWin ? entryPrice + (pnl * 20) : entryPrice - (Math.abs(pnl) * 20);

    trades.push({
      id: `trade-btc-${i}`,
      user_id: 'demo-user',
      account_id: 'acc-demo-2',
      account_name: 'Crypto Futures',
      date: d.toISOString().split('T')[0],
      entry_time: '14:30',
      exit_time: '16:45',
      symbol: 'BTCUSDT',
      direction: i % 4 === 0 ? 'SHORT' : 'LONG',
      timeframe: i % 2 === 0 ? '15m' : '1h',
      session: 'New York',
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: entryPrice - 500,
      take_profit: entryPrice + 1200,
      position_size: 0.25,
      risk_amount: risk,
      risk_percent: 1.0,
      commission: 2.50,
      swap: 0.00,
      pnl,
      pnl_percent: +(pnl / 500).toFixed(2),
      r_multiple: rMultiple,
      result: isWin ? 'WIN' : 'LOSS',
      setup_id: i % 2 === 0 ? 'setup-1' : 'setup-2',
      setup_name: i % 2 === 0 ? 'Breakout' : 'Breakout + Retest',
      strategy_id: 'strat-3',
      strategy_name: 'Breakout Momentum',
      tags: ['A+ Setup'],
      emotion: isWin ? 'Focused' : 'Calm',
      confidence: 8,
      discipline: 9,
      mistake: isWin ? 'None' : 'Late Entry',
      notes: {
        tradeThesis: 'Clean daily breakout with rising volume during New York open.',
        whatHappened: isWin ? 'Price quickly hit TP1 and trailed into TP2.' : 'Stalled near key resistance and retraced.',
        whatWentWell: 'Waited for 15m candle close before entry.',
        whatWentWrong: isWin ? 'Nothing, followed plan.' : 'Could have taken partials sooner.',
        lesson: 'New York session momentum continues to provide clean follow-through on BTCUSDT.'
      },
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }

  // 2. 24 trades for EURUSD (Largest losses on EURUSD)
  for (let i = 1; i <= 24; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(i * 2.2));
    const isWin = i % 2 === 0;
    const isBigLoss = i % 5 === 0;
    const pnl = isWin ? +(95 + (i * 8) % 110).toFixed(2) : isBigLoss ? -450.00 : -+(110 + (i * 4) % 60).toFixed(2);
    const risk = isBigLoss ? 300 : 120;
    const rMultiple = +(pnl / risk).toFixed(2);
    const entryPrice = 1.0850 + (i * 0.0008);
    const exitPrice = isWin ? entryPrice + 0.0030 : entryPrice - 0.0035;

    trades.push({
      id: `trade-eur-${i}`,
      user_id: 'demo-user',
      account_id: 'acc-demo-1',
      account_name: 'Main Prop Account',
      date: d.toISOString().split('T')[0],
      entry_time: '08:15',
      exit_time: '11:00',
      symbol: 'EURUSD',
      direction: i % 3 === 0 ? 'LONG' : 'SHORT',
      timeframe: '5m',
      session: 'London',
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: entryPrice + 0.0020,
      take_profit: entryPrice - 0.0040,
      position_size: 1.5,
      risk_amount: risk,
      risk_percent: 1.2,
      commission: 7.00,
      swap: -1.20,
      pnl,
      pnl_percent: +(pnl / 1200).toFixed(2),
      r_multiple: rMultiple,
      result: isWin ? 'WIN' : 'LOSS',
      setup_id: 'setup-3',
      setup_name: 'Liquidity Sweep',
      strategy_id: 'strat-1',
      strategy_name: 'ICT / Smart Money',
      tags: ['News Driver'],
      emotion: isBigLoss ? 'FOMO' : isWin ? 'Calm' : 'Impatient',
      confidence: isBigLoss ? 4 : 7,
      discipline: isBigLoss ? 3 : 7,
      mistake: isBigLoss ? 'Oversized Position' : isWin ? 'None' : 'Moved Stop',
      notes: {
        tradeThesis: 'London open liquidity run on Asian highs.',
        whatHappened: isBigLoss ? 'ECB announcement spiked spread and hit stop with heavy slippage.' : 'Normal range rotation.',
        whatWentWell: 'Patience before London bell.',
        whatWentWrong: isBigLoss ? 'Risked too much right before major red folder news.' : 'None.',
        lesson: 'Do not trade EURUSD within 15 minutes of major central bank releases.'
      },
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }

  // 3. 20 trades for GBPUSD (Negative expectancy & Reversal issues)
  for (let i = 1; i <= 20; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(i * 2.8));
    const isWin = i % 4 === 0; // ~25% win rate (negative expectancy)
    const pnl = isWin ? 140.00 : -115.00;
    const risk = 120;
    const rMultiple = +(pnl / risk).toFixed(2);
    const entryPrice = 1.2700 + (i * 0.0010);
    const exitPrice = isWin ? entryPrice + 0.0025 : entryPrice - 0.0020;

    trades.push({
      id: `trade-gbp-${i}`,
      user_id: 'demo-user',
      account_id: 'acc-demo-1',
      account_name: 'Main Prop Account',
      date: d.toISOString().split('T')[0],
      entry_time: '13:10',
      exit_time: '15:20',
      symbol: 'GBPUSD',
      direction: 'SHORT',
      timeframe: '15m',
      session: 'London/NY Overlap',
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: entryPrice + 0.0020,
      take_profit: entryPrice - 0.0040,
      position_size: 1.0,
      risk_amount: risk,
      risk_percent: 1.0,
      commission: 5.00,
      swap: 0.00,
      pnl,
      pnl_percent: +(pnl / 1000).toFixed(2),
      r_multiple: rMultiple,
      result: isWin ? 'WIN' : 'LOSS',
      setup_id: 'setup-7',
      setup_name: 'Reversal',
      strategy_id: 'strat-2',
      strategy_name: 'Price Action & Structure',
      tags: ['Scalp'],
      emotion: 'FOMO',
      confidence: 5,
      discipline: 4,
      mistake: 'Revenge Trade',
      notes: {
        tradeThesis: 'Attempting to fade the impulsive rally at session high.',
        whatHappened: 'Trend stayed strong and stopped me out repeatedly.',
        whatWentWell: 'Cut trade at stop loss without removing it.',
        whatWentWrong: 'Fighting the dominant trend on GBPUSD.',
        lesson: 'Reversal setups on GBPUSD during London/NY overlap have very low win rates.'
      },
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }

  // 4. 15 trades for USDJPY
  for (let i = 1; i <= 15; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(i * 3.5));
    const isWin = i % 2 !== 0;
    const pnl = isWin ? 180.00 : -100.00;
    const risk = 100;
    const rMultiple = +(pnl / risk).toFixed(2);
    const entryPrice = 154.20 + (i * 0.15);
    const exitPrice = isWin ? entryPrice + 0.45 : entryPrice - 0.25;

    trades.push({
      id: `trade-jpy-${i}`,
      user_id: 'demo-user',
      account_id: 'acc-demo-1',
      account_name: 'Main Prop Account',
      date: d.toISOString().split('T')[0],
      entry_time: '01:30',
      exit_time: '04:15',
      symbol: 'USDJPY',
      direction: 'LONG',
      timeframe: '1h',
      session: 'Asian',
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: entryPrice - 0.25,
      take_profit: entryPrice + 0.60,
      position_size: 0.8,
      risk_amount: risk,
      risk_percent: 0.8,
      commission: 4.00,
      swap: 2.10,
      pnl,
      pnl_percent: +(pnl / 800).toFixed(2),
      r_multiple: rMultiple,
      result: isWin ? 'WIN' : 'LOSS',
      setup_id: 'setup-4',
      setup_name: 'Momentum',
      strategy_id: 'strat-3',
      strategy_name: 'Breakout Momentum',
      tags: ['Overnight'],
      emotion: 'Calm',
      confidence: 7,
      discipline: 8,
      mistake: 'None',
      notes: {
        tradeThesis: 'Asian session trend continuation post-Tokyo fix.',
        whatHappened: 'Smooth directional expansion.',
        whatWentWell: 'Proper trailing stop along 1h 20 EMA.',
        whatWentWrong: 'None.',
        lesson: 'Asian session momentum on USDJPY respects technical levels reliably.'
      },
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }

  // 5. 18 trades for XAUUSD (Gold)
  for (let i = 1; i <= 18; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(i * 3));
    const isWin = i % 3 !== 0;
    const pnl = isWin ? 320.00 : -180.00;
    const risk = 180;
    const rMultiple = +(pnl / risk).toFixed(2);
    const entryPrice = 2480.00 + (i * 6.5);
    const exitPrice = isWin ? entryPrice + 16.00 : entryPrice - 9.00;

    trades.push({
      id: `trade-xau-${i}`,
      user_id: 'demo-user',
      account_id: 'acc-demo-1',
      account_name: 'Main Prop Account',
      date: d.toISOString().split('T')[0],
      entry_time: '15:00',
      exit_time: '17:30',
      symbol: 'XAUUSD',
      direction: i % 2 === 0 ? 'LONG' : 'SHORT',
      timeframe: '15m',
      session: 'New York',
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: entryPrice - 9.00,
      take_profit: entryPrice + 22.00,
      position_size: 0.5,
      risk_amount: risk,
      risk_percent: 1.5,
      commission: 8.00,
      swap: -2.50,
      pnl,
      pnl_percent: +(pnl / 1500).toFixed(2),
      r_multiple: rMultiple,
      result: isWin ? 'WIN' : 'LOSS',
      setup_id: 'setup-5',
      setup_name: 'Pullback',
      strategy_id: 'strat-1',
      strategy_name: 'ICT / Smart Money',
      tags: ['A+ Setup'],
      emotion: isWin ? 'Confident' : 'Uncertain',
      confidence: 8,
      discipline: 8,
      mistake: isWin ? 'None' : 'Early Exit',
      notes: {
        tradeThesis: 'Gold pullback into London session value area during NY afternoon.',
        whatHappened: 'Hit target cleanly after brief consolidation.',
        whatWentWell: 'Kept position size moderate to handle gold volatility.',
        whatWentWrong: isWin ? 'Could have trailed for runner.' : 'Exited slightly prematurely.',
        lesson: 'Gold requires wider breathing room on stops.'
      },
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }

  // Sort trades chronologically descending (newest first)
  return trades.sort((a, b) => new Date(b.date + 'T' + (b.entry_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.entry_time || '00:00')).getTime());
}

export const DEMO_TRADES = generateDemoTrades();
