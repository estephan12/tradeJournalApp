'use client';

import React from 'react';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { useTrades } from '@/context/trade-context';
import { TradeDirection, TradeResult } from '@/types/trade';

export function JournalFilters() {
  const { filters, setFilters, resetFilters, accounts, setups, strategies, trades } = useTrades();

  // Extract unique symbols, sessions, timeframes, emotions, mistakes from current trades
  const uniqueSymbols = Array.from(new Set(trades.map((t) => t.symbol))).filter((s): s is string => Boolean(s));
  const uniqueSessions = Array.from(new Set(trades.map((t) => t.session))).filter((s): s is string => Boolean(s));
  const uniqueTimeframes = Array.from(new Set(trades.map((t) => t.timeframe))).filter((s): s is string => Boolean(s));
  const uniqueEmotions = Array.from(new Set(trades.map((t) => t.emotion))).filter((s): s is string => Boolean(s));
  const uniqueMistakes = Array.from(new Set(trades.map((t) => t.mistake))).filter((s): s is string => Boolean(s));

  const hasActiveFilters = Boolean(
    (filters.dateRangePreset && filters.dateRangePreset !== 'all') ||
    filters.symbol ||
    (filters.direction && filters.direction !== 'ALL') ||
    (filters.result && filters.result !== 'ALL') ||
    filters.setup ||
    filters.strategy ||
    filters.session ||
    filters.timeframe ||
    filters.emotion ||
    filters.mistake
  );

  return (
    <div className="bg-[#111820] border border-[#26313D] rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-[#F5F7FA]">
          <Filter className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>FILTER JOURNAL</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] text-[#8B98A8] hover:text-[#38BDF8] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
        {/* Date Preset */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Period</label>
          <select
            value={filters.dateRangePreset || 'all'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateRangePreset: e.target.value as 'all' | 'today' | 'week' | 'month' | 'last_month' | 'year',
              }))
            }
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Symbol */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Symbol</label>
          <select
            value={filters.symbol || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, symbol: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Assets</option>
            {uniqueSymbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Direction</label>
          <select
            value={filters.direction || 'ALL'}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, direction: e.target.value as TradeDirection | 'ALL' }))
            }
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="ALL">All Directions</option>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </div>

        {/* Result */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Result</label>
          <select
            value={filters.result || 'ALL'}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, result: e.target.value as TradeResult | 'ALL' }))
            }
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="ALL">All Results</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
            <option value="BREAKEVEN">Breakeven</option>
          </select>
        </div>

        {/* Setup */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Setup</label>
          <select
            value={filters.setup || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, setup: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Setups</option>
            {setups.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Strategy</label>
          <select
            value={filters.strategy || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, strategy: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Strategies</option>
            {strategies.map((str) => (
              <option key={str.id} value={str.name}>
                {str.name}
              </option>
            ))}
          </select>
        </div>

        {/* Session */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Session</label>
          <select
            value={filters.session || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, session: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Sessions</option>
            {uniqueSessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Timeframe</label>
          <select
            value={filters.timeframe || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, timeframe: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Timeframes</option>
            {uniqueTimeframes.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>

        {/* Emotion */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Emotion</label>
          <select
            value={filters.emotion || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, emotion: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Emotions</option>
            {uniqueEmotions.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </div>

        {/* Mistake */}
        <div>
          <label className="block text-[10px] text-[#8B98A8] uppercase tracking-wider mb-1">Mistake</label>
          <select
            value={filters.mistake || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, mistake: e.target.value || undefined }))}
            className="w-full h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="">All Mistakes</option>
            {uniqueMistakes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
