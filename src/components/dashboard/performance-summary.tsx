'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Award, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PerformanceSummaryProps {
  trades: Trade[];
}

interface GroupStat {
  name: string;
  tradesCount: number;
  netPnL: number;
  winRate: number;
  profitFactor: number;
}

export function PerformanceSummary({ trades }: PerformanceSummaryProps) {
  const summary = useMemo(() => {
    const closed = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
    if (closed.length === 0) return null;

    const groupStats = (keyFn: (t: Trade) => string | null | undefined): GroupStat[] => {
      const map = new Map<string, { trades: number; wins: number; pnl: number; grossProfit: number; grossLoss: number }>();

      for (const t of closed) {
        const k = keyFn(t);
        if (!k) continue;
        const current = map.get(k) || { trades: 0, wins: 0, pnl: 0, grossProfit: 0, grossLoss: 0 };
        current.trades++;
        const p = t.pnl || 0;
        current.pnl += p;
        if (p > 0) {
          current.wins++;
          current.grossProfit += p;
        } else if (p < 0) {
          current.grossLoss += Math.abs(p);
        }
        map.set(k, current);
      }

      return Array.from(map.entries()).map(([name, data]) => ({
        name,
        tradesCount: data.trades,
        netPnL: Number(data.pnl.toFixed(2)),
        winRate: Number(((data.wins / data.trades) * 100).toFixed(1)),
        profitFactor: data.grossLoss > 0 ? Number((data.grossProfit / data.grossLoss).toFixed(2)) : data.grossProfit > 0 ? 99.9 : 0,
      }));
    };

    const assets = groupStats((t) => t.symbol);
    const setups = groupStats((t) => t.setup_name);
    const sessions = groupStats((t) => t.session);
    const directions = groupStats((t) => t.direction);

    const getBestAndWorst = (list: GroupStat[]) => {
      if (list.length === 0) return { best: null, worst: null };
      const sortedByPnL = [...list].sort((a, b) => b.netPnL - a.netPnL);
      return {
        best: sortedByPnL[0] || null,
        worst: sortedByPnL[sortedByPnL.length - 1] || null,
      };
    };

    return {
      asset: getBestAndWorst(assets),
      setup: getBestAndWorst(setups),
      session: getBestAndWorst(sessions),
      direction: getBestAndWorst(directions),
    };
  }, [trades]);

  if (!summary) return null;

  const renderCard = (
    title: string,
    best: GroupStat | null,
    worst: GroupStat | null
  ) => {
    return (
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4 flex flex-col justify-between">
        <div className="text-xs font-mono uppercase tracking-wider text-[#38BDF8] mb-3 pb-1 border-b border-[#26313D]">
          {title}
        </div>

        {/* Best */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1 text-[#22C55E] font-medium font-mono">
              <Award className="w-3.5 h-3.5" /> BEST
            </span>
            {best && (
              <span className="text-[10px] text-[#8B98A8] font-mono">
                {best.tradesCount} trades
              </span>
            )}
          </div>
          {best ? (
            <div className="flex items-baseline justify-between bg-[#0B0F14] px-2.5 py-1.5 rounded border border-[#26313D]">
              <span className="font-bold text-xs text-[#F5F7FA] font-mono">{best.name}</span>
              <div className="text-right font-mono">
                <span className="text-xs text-[#22C55E] font-semibold">
                  {formatCurrency(best.netPnL)}
                </span>
                <span className="text-[10px] text-[#8B98A8] ml-2">
                  {formatPercent(best.winRate)} WR
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#8B98A8] italic">No data</div>
          )}
        </div>

        {/* Worst */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1 text-[#EF4444] font-medium font-mono">
              <AlertTriangle className="w-3.5 h-3.5" /> WORST
            </span>
            {worst && (
              <span className="text-[10px] text-[#8B98A8] font-mono">
                {worst.tradesCount} trades
              </span>
            )}
          </div>
          {worst ? (
            <div className="flex items-baseline justify-between bg-[#0B0F14] px-2.5 py-1.5 rounded border border-[#26313D]">
              <span className="font-bold text-xs text-[#F5F7FA] font-mono">{worst.name}</span>
              <div className="text-right font-mono">
                <span
                  className={`text-xs font-semibold ${
                    worst.netPnL < 0 ? 'text-[#EF4444]' : 'text-[#8B98A8]'
                  }`}
                >
                  {formatCurrency(worst.netPnL)}
                </span>
                <span className="text-[10px] text-[#8B98A8] ml-2">
                  {formatPercent(worst.winRate)} WR
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#8B98A8] italic">No data</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono uppercase tracking-wider text-[#8B98A8]">
        PERFORMANCE SUMMARY
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {renderCard('Asset Breakdown', summary.asset.best, summary.asset.worst)}
        {renderCard('Setup Breakdown', summary.setup.best, summary.setup.worst)}
        {renderCard('Session Breakdown', summary.session.best, summary.session.worst)}
        {renderCard('Direction Breakdown', summary.direction.best, summary.direction.worst)}
      </div>
    </div>
  );
}
