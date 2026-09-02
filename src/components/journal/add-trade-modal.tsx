'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calculator, Sparkles, AlertCircle } from 'lucide-react';
import { useTrades } from '@/context/trade-context';
import { TradeDirection, TradeEmotion, TradeMistake, TradingSession } from '@/types/trade';
import { calculatePnL, calculateRiskAmount, calculateRMultiple, calculateResult } from '@/lib/calculations';
import { formatCurrency, formatR } from '@/lib/utils';

const EMOTIONS: TradeEmotion[] = [
  'Calm',
  'Focused',
  'Confident',
  'Fear',
  'Greed',
  'FOMO',
  'Revenge',
  'Impatient',
  'Uncertain',
  'Overconfident',
];

const MISTAKES: TradeMistake[] = [
  'None',
  'FOMO',
  'Late Entry',
  'Early Exit',
  'Moved Stop',
  'Oversized Position',
  'Revenge Trade',
  'Ignored Setup',
  'Ignored Stop Loss',
  'No Confirmation',
  'Overtrading',
  'Chased Price',
];

const SESSIONS: TradingSession[] = [
  'Asian',
  'London',
  'New York',
  'London/NY Overlap',
  'Custom',
];

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', 'Daily', 'Weekly'];

export function AddTradeModal() {
  const { isAddTradeModalOpen, setIsAddTradeModalOpen, addTrade, accounts, setups, strategies, tags } = useTrades();

  // Form state
  const [accountId, setAccountId] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = useState<string>('09:30');
  const [exitTime, setExitTime] = useState<string>('11:00');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [session, setSession] = useState<string>('New York');

  // Execution
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [positionSize, setPositionSize] = useState<string>('1');
  const [commission, setCommission] = useState<string>('0');
  const [swap, setSwap] = useState<string>('0');

  // Classification
  const [strategyId, setStrategyId] = useState<string>('');
  const [setupId, setSetupId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Psychology
  const [emotion, setEmotion] = useState<TradeEmotion>('Calm');
  const [confidence, setConfidence] = useState<number>(7);
  const [discipline, setDiscipline] = useState<number>(8);
  const [mistake, setMistake] = useState<TradeMistake>('None');

  // Notes
  const [tradeThesis, setTradeThesis] = useState<string>('');
  const [whatHappened, setWhatHappened] = useState<string>('');
  const [whatWentWell, setWhatWentWell] = useState<string>('');
  const [whatWentWrong, setWhatWentWrong] = useState<string>('');
  const [lesson, setLesson] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize account and setup when opened
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
    if (setups.length > 0 && !setupId) {
      setSetupId(setups[0].id);
    }
    if (strategies.length > 0 && !strategyId) {
      setStrategyId(strategies[0].id);
    }
  }, [accounts, setups, strategies, accountId, setupId, strategyId]);

  // Live Automatic Calculations Preview
  const liveCalc = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const exit = exitPrice ? parseFloat(exitPrice) : null;
    const sl = stopLoss ? parseFloat(stopLoss) : null;
    const size = parseFloat(positionSize) || 1;
    const comm = parseFloat(commission) || 0;
    const sw = parseFloat(swap) || 0;

    if (isNaN(entry)) return null;

    const pnl = calculatePnL({
      direction,
      entryPrice: entry,
      exitPrice: exit,
      positionSize: size,
      commission: comm,
      swap: sw,
    });

    const risk = calculateRiskAmount({
      entryPrice: entry,
      stopLoss: sl,
      positionSize: size,
    });

    const r = calculateRMultiple(pnl, risk);
    const res = calculateResult(pnl);

    return { pnl, risk, r, result: res };
  }, [direction, entryPrice, exitPrice, stopLoss, positionSize, commission, swap]);

  if (!isAddTradeModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const entry = parseFloat(entryPrice);
    if (isNaN(entry) || entry <= 0) {
      setErrorMsg('Please provide a valid entry price.');
      return;
    }

    const size = parseFloat(positionSize);
    if (isNaN(size) || size <= 0) {
      setErrorMsg('Please provide a valid position size.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addTrade({
        account_id: accountId,
        symbol: symbol.toUpperCase().trim(),
        direction,
        date,
        entry_time: entryTime || null,
        exit_time: exitTime || null,
        timeframe,
        session,
        entry_price: entry,
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        position_size: size,
        commission: parseFloat(commission) || 0,
        swap: parseFloat(swap) || 0,
        strategy_id: strategyId || null,
        setup_id: setupId || null,
        tags: selectedTags,
        emotion,
        confidence,
        discipline,
        mistake,
        notes: {
          tradeThesis,
          whatHappened,
          whatWentWell,
          whatWentWrong,
          lesson,
        },
      });

      setIsAddTradeModalOpen(false);
      // Reset form
      setEntryPrice('');
      setExitPrice('');
      setStopLoss('');
      setTakeProfit('');
      setTradeThesis('');
      setWhatHappened('');
      setWhatWentWell('');
      setWhatWentWrong('');
      setLesson('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#111820] border border-[#26313D] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#26313D] flex items-center justify-between bg-[#0B0F14]/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#F5F7FA] font-mono tracking-wide">
              ADD TRADE RECORD
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B0F14] border border-[#26313D] text-[#8B98A8]">
              Terminal Input
            </span>
          </div>
          <button
            onClick={() => setIsAddTradeModalOpen(false)}
            className="p-1 rounded text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Calculation Banner */}
        {liveCalc && (
          <div className="px-5 py-2.5 bg-[#0B0F14] border-b border-[#26313D] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#8B98A8]">
              <Calculator className="w-4 h-4 text-[#38BDF8]" />
              <span>LIVE DERIVED VALUES:</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[#8B98A8] mr-1.5">Net P&L:</span>
                <span
                  className={
                    liveCalc.pnl && liveCalc.pnl > 0
                      ? 'text-[#22C55E] font-bold'
                      : liveCalc.pnl && liveCalc.pnl < 0
                      ? 'text-[#EF4444] font-bold'
                      : 'text-[#8B98A8]'
                  }
                >
                  {formatCurrency(liveCalc.pnl)}
                </span>
              </div>
              <div>
                <span className="text-[#8B98A8] mr-1.5">Risk:</span>
                <span className="text-[#F5F7FA] font-medium">
                  {formatCurrency(liveCalc.risk)}
                </span>
              </div>
              <div>
                <span className="text-[#8B98A8] mr-1.5">R-Multiple:</span>
                <span
                  className={
                    liveCalc.r && liveCalc.r > 0
                      ? 'text-[#22C55E]'
                      : liveCalc.r && liveCalc.r < 0
                      ? 'text-[#EF4444]'
                      : 'text-[#8B98A8]'
                  }
                >
                  {formatR(liveCalc.r)}
                </span>
              </div>
              {liveCalc.result && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                    liveCalc.result === 'WIN'
                      ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                      : liveCalc.result === 'LOSS'
                      ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                      : 'bg-zinc-800 text-[#8B98A8]'
                  }`}
                >
                  {liveCalc.result}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center gap-2 text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. GENERAL SECTION */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D] flex items-center justify-between">
              <span>01. GENERAL</span>
              <span className="text-[#8B98A8] text-[10px]">Context & Timing</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Symbol *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BTCUSDT, EURUSD"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono uppercase text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-1 h-8">
                  <button
                    type="button"
                    onClick={() => setDirection('LONG')}
                    className={`rounded text-xs font-semibold tracking-wider font-mono transition-colors ${
                      direction === 'LONG'
                        ? 'bg-[#22C55E] text-[#0B0F14]'
                        : 'bg-[#0B0F14] text-[#8B98A8] border border-[#26313D] hover:text-[#F5F7FA]'
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SHORT')}
                    className={`rounded text-xs font-semibold tracking-wider font-mono transition-colors ${
                      direction === 'SHORT'
                        ? 'bg-[#EF4444] text-[#0B0F14]'
                        : 'bg-[#0B0F14] text-[#8B98A8] border border-[#26313D] hover:text-[#F5F7FA]'
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Entry Time</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Exit Time</label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. EXECUTION SECTION */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D] flex items-center justify-between">
              <span>02. EXECUTION</span>
              <span className="text-[#8B98A8] text-[10px]">Prices & Sizing</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Entry Price *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Leave blank if open"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Position Size *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="1"
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Commission ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Swap ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={swap}
                  onChange={(e) => setSwap(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>
          </div>

          {/* 3. CLASSIFICATION SECTION */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D] flex items-center justify-between">
              <span>03. CLASSIFICATION</span>
              <span className="text-[#8B98A8] text-[10px]">Setup & Model</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Strategy</label>
                <select
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="">None Selected</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Setup</label>
                <select
                  value={setupId}
                  onChange={(e) => setSetupId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="">None Selected</option>
                  {setups.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags Selection */}
            <div>
              <label className="block text-[11px] text-[#8B98A8] mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const selected = selectedTags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.name)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selected
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50'
                          : 'bg-[#0B0F14] text-[#8B98A8] border border-[#26313D] hover:text-[#F5F7FA]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1" />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. PSYCHOLOGY SECTION */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D] flex items-center justify-between">
              <span>04. PSYCHOLOGY</span>
              <span className="text-[#8B98A8] text-[10px]">Behavior & Discipline</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value as TradeEmotion)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  {EMOTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Mistake Flag</label>
                <select
                  value={mistake}
                  onChange={(e) => setMistake(e.target.value as TradeMistake)}
                  className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                >
                  {MISTAKES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-[#8B98A8]">Confidence</label>
                  <span className="text-xs font-mono text-[#38BDF8]">{confidence}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full accent-[#38BDF8] h-2 bg-[#0B0F14] rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-[#8B98A8]">Discipline</label>
                  <span className="text-xs font-mono text-[#38BDF8]">{discipline}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={discipline}
                  onChange={(e) => setDiscipline(parseInt(e.target.value))}
                  className="w-full accent-[#38BDF8] h-2 bg-[#0B0F14] rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. NOTES SECTION */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D] flex items-center justify-between">
              <span>05. NOTES</span>
              <span className="text-[#8B98A8] text-[10px]">Review & Lessons</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#8B98A8] mb-1">Trade Thesis</label>
                <textarea
                  rows={2}
                  placeholder="Why did you take this trade? What was the setup catalyst?"
                  value={tradeThesis}
                  onChange={(e) => setTradeThesis(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#8B98A8] mb-1">What happened?</label>
                  <textarea
                    rows={2}
                    placeholder="Execution narrative..."
                    value={whatHappened}
                    onChange={(e) => setWhatHappened(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8B98A8] mb-1">What did I do well?</label>
                  <textarea
                    rows={2}
                    placeholder="Disciplined rules followed..."
                    value={whatWentWell}
                    onChange={(e) => setWhatWentWell(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#8B98A8] mb-1">What did I do wrong?</label>
                  <textarea
                    rows={2}
                    placeholder="Mistakes, hesitation, early exit..."
                    value={whatWentWrong}
                    onChange={(e) => setWhatWentWrong(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8B98A8] mb-1">Lesson</label>
                  <textarea
                    rows={2}
                    placeholder="Rule takeaway for next time..."
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#26313D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddTradeModalOpen(false)}
              className="px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0284C7] font-semibold text-xs tracking-wide shadow transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Recording...' : 'Record Trade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
