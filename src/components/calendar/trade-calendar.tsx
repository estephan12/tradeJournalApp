'use client';

import React, { useState, useMemo } from 'react';
import { useTrades } from '@/context/trade-context';
import { Trade } from '@/types/trade';
import { formatCurrency, formatR } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export function TradeCalendar() {
  const { trades, setSelectedTradeForDetail } = useTrades();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: Trade[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Group trades by date (YYYY-MM-DD)
  const tradesByDay = useMemo(() => {
    const map = new Map<string, { trades: Trade[]; netPnL: number; count: number }>();

    for (const t of trades) {
      if (!t.date) continue;
      const cur = map.get(t.date) || { trades: [], netPnL: 0, count: 0 };
      cur.trades.push(t);
      cur.netPnL += t.pnl || 0;
      cur.count++;
      map.set(t.date, cur);
    }
    return map;
  }, [trades]);

  // Calendar grid math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayTrades(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayTrades(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayTrades(null);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Compute monthly stats
  const monthlyStats = useMemo(() => {
    let monthTrades = 0;
    let monthPnL = 0;
    let winCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = tradesByDay.get(dateKey);
      if (entry) {
        monthTrades += entry.count;
        monthPnL += entry.netPnL;
        winCount += entry.trades.filter((t) => (t.pnl || 0) > 0).length;
      }
    }

    return {
      trades: monthTrades,
      pnl: Number(monthPnL.toFixed(2)),
      winRate: monthTrades > 0 ? Number(((winCount / monthTrades) * 100).toFixed(1)) : 0,
    };
  }, [year, month, daysInMonth, tradesByDay]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Navigation & Month Summary Bar */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-[#F5F7FA] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-[#F5F7FA] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-bold font-mono text-[#F5F7FA] tracking-wide">
            {monthName} {year}
          </h2>

          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#8B98A8] hover:text-[#38BDF8]"
          >
            Today
          </button>
        </div>

        {/* Monthly quick metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[#8B98A8]">Month P&L: </span>
            <span
              className={`font-bold ${
                monthlyStats.pnl > 0
                  ? 'text-[#22C55E]'
                  : monthlyStats.pnl < 0
                  ? 'text-[#EF4444]'
                  : 'text-[#8B98A8]'
              }`}
            >
              {formatCurrency(monthlyStats.pnl)}
            </span>
          </div>
          <div>
            <span className="text-[#8B98A8]">Trades: </span>
            <span className="text-[#F5F7FA] font-bold">{monthlyStats.trades}</span>
          </div>
          <div>
            <span className="text-[#8B98A8]">Win Rate: </span>
            <span className="text-[#38BDF8] font-bold">{monthlyStats.winRate}%</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[#26313D] bg-[#0B0F14] text-center text-xs font-mono py-2 text-[#8B98A8]">
          {weekdays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#26313D]/60 bg-[#0B0F14]">
          {/* Empty cells preceding the 1st of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] bg-[#0B0F14]/40 p-2" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = tradesByDay.get(dateStr);
            const isToday =
              new Date().toISOString().split('T')[0] === dateStr;

            const isPos = dayData && dayData.netPnL > 0;
            const isNeg = dayData && dayData.netPnL < 0;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (dayData && dayData.trades.length > 0) {
                    setSelectedDayTrades({ date: dateStr, trades: dayData.trades });
                  }
                }}
                className={`min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                  dayData && dayData.trades.length > 0
                    ? 'cursor-pointer hover:bg-[#16202B]'
                    : 'bg-[#111820]/40'
                } ${isToday ? 'border-2 border-[#38BDF8]/60' : ''}`}
              >
                {/* Day number & today marker */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-medium ${
                      isToday ? 'text-[#38BDF8] font-bold' : 'text-[#8B98A8]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayData && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0B0F14] border border-[#26313D] text-[#8B98A8]">
                      {dayData.count} {dayData.count === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {/* Daily PnL summary */}
                {dayData ? (
                  <div className="mt-2 text-right">
                    <div
                      className={`text-xs sm:text-sm font-mono font-bold ${
                        isPos
                          ? 'text-[#22C55E]'
                          : isNeg
                          ? 'text-[#EF4444]'
                          : 'text-[#8B98A8]'
                      }`}
                    >
                      {formatCurrency(dayData.netPnL)}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-700 text-right">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Drilldown Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#111820] border border-[#26313D] rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#26313D] flex items-center justify-between bg-[#0B0F14]/50">
              <div>
                <h3 className="text-sm font-bold font-mono text-[#F5F7FA]">
                  TRADES ON {selectedDayTrades.date}
                </h3>
                <span className="text-xs text-[#8B98A8]">
                  {selectedDayTrades.trades.length} recorded positions
                </span>
              </div>
              <button
                onClick={() => setSelectedDayTrades(null)}
                className="p-1 rounded text-[#8B98A8] hover:text-[#F5F7FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {selectedDayTrades.trades.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTradeForDetail(t);
                  }}
                  className="p-3 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] cursor-pointer flex items-center justify-between text-xs font-mono transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'LONG'
                          ? 'text-[#22C55E] bg-[#22C55E]/10'
                          : 'text-[#EF4444] bg-[#EF4444]/10'
                      }`}
                    >
                      {t.direction}
                    </span>
                    <div>
                      <div className="font-bold text-[#F5F7FA]">{t.symbol}</div>
                      <div className="text-[10px] text-[#8B98A8]">
                        {t.entry_time || '--:--'} • {t.setup_name || 'No Setup'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        t.pnl && t.pnl > 0
                          ? 'text-[#22C55E]'
                          : t.pnl && t.pnl < 0
                          ? 'text-[#EF4444]'
                          : 'text-[#8B98A8]'
                      }`}
                    >
                      {formatCurrency(t.pnl)}
                    </div>
                    <div className="text-[10px] text-[#8B98A8]">{formatR(t.r_multiple)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
