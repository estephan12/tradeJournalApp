'use client';

import React from 'react';
import Link from 'next/link';
import { useTrades } from '@/context/trade-context';
import { calculateTradeStatistics } from '@/lib/calculations';
import { formatCurrency, formatPercent, formatR } from '@/lib/utils';
import { DateSelector } from '@/components/dashboard/date-selector';
import { KPICard } from '@/components/dashboard/kpi-card';
import { PerformanceSummary } from '@/components/dashboard/performance-summary';
import { StrengthsWeaknesses } from '@/components/dashboard/strengths-weaknesses';
import { EquityCurveChart } from '@/components/dashboard/equity-curve-chart';
import {
  DollarSign,
  Percent,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { filteredTrades, setSelectedTradeForDetail, isDemoMode, resetToDemoData } = useTrades();

  const stats = React.useMemo(() => {
    return calculateTradeStatistics(filteredTrades);
  }, [filteredTrades]);

  // Recent 5 trades
  const recentTrades = filteredTrades.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Date Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#26313D]">
          <div>
            <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
              PERFORMANCE DASHBOARD
            </h1>
            <p className="text-xs text-[#8B98A8]">
              High-fidelity statistical analysis • Strictly chart-free terminal metrics
            </p>
          </div>
          {isDemoMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDemoData}
                className="px-2.5 py-1 rounded bg-[#0B0F14] border border-[#26313D] text-[11px] font-mono text-[#8B98A8] hover:text-[#F5F7FA] hover:border-[#38BDF8] transition-colors"
              >
                Reset Demo Dataset
              </button>
            </div>
          )}
        </div>

        <DateSelector />
      </div>

      {/* Main Metrics KPI Grid */}
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-[#8B98A8] mb-2.5">
          CORE PERFORMANCE KPIS
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Net P&L */}
          <KPICard
            label="Net P&L"
            value={formatCurrency(stats.netPnL)}
            subValue={`Gross Win: ${formatCurrency(stats.grossProfit)} | Loss: ${formatCurrency(stats.grossLoss)}`}
            variant={stats.netPnL > 0 ? 'positive' : stats.netPnL < 0 ? 'negative' : 'default'}
            icon={DollarSign}
          />

          {/* Win Rate */}
          <KPICard
            label="Win Rate"
            value={formatPercent(stats.winRate)}
            subValue={`${stats.wins} Won / ${stats.losses} Lost / ${stats.breakevens} BE`}
            variant={stats.winRate >= 50 ? 'positive' : 'negative'}
            icon={Percent}
            sampleSize={stats.totalTrades}
          />

          {/* Profit Factor */}
          <KPICard
            label="Profit Factor"
            value={stats.profitFactor.toFixed(2)}
            subValue="Gross Profit / Gross Loss"
            variant={stats.profitFactor >= 1.5 ? 'positive' : stats.profitFactor < 1.0 ? 'negative' : 'default'}
            icon={TrendingUp}
          />

          {/* Expectancy */}
          <KPICard
            label="Expectancy"
            value={formatCurrency(stats.expectancy)}
            subValue="Expected return per trade"
            variant={stats.expectancy > 0 ? 'positive' : stats.expectancy < 0 ? 'negative' : 'default'}
            icon={Target}
          />

          {/* Average R */}
          <KPICard
            label="Average R"
            value={formatR(stats.averageR)}
            subValue="Realized multiple of risk"
            variant={stats.averageR > 0 ? 'positive' : stats.averageR < 0 ? 'negative' : 'default'}
            icon={BarChart3}
          />

          {/* Total Trades */}
          <KPICard
            label="Total Closed"
            value={stats.totalTrades}
            subValue={`Current Streak: ${stats.currentStreak.count} ${stats.currentStreak.type}`}
            icon={Clock}
          />

          {/* Average Win */}
          <KPICard
            label="Average Win"
            value={formatCurrency(stats.averageWin)}
            subValue={`Max Win Streak: ${stats.maxWinStreak}`}
            variant="positive"
            icon={ArrowUpRight}
          />

          {/* Average Loss */}
          <KPICard
            label="Average Loss"
            value={formatCurrency(stats.averageLoss)}
            subValue={`Max Loss Streak: ${stats.maxLossStreak}`}
            variant="negative"
            icon={ArrowDownRight}
          />

          {/* Max Drawdown */}
          <KPICard
            label="Max Drawdown"
            value={formatCurrency(stats.maxDrawdownAmount)}
            subValue={`${stats.maxDrawdownPercent}% from peak equity`}
            variant="negative"
            icon={ShieldAlert}
          />

          {/* Win/Loss Ratio */}
          <KPICard
            label="Win / Loss Ratio"
            value={stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : stats.wins > 0 ? 'Inf' : '0.00'}
            subValue={`Avg Win/Loss: ${stats.averageLoss > 0 ? (stats.averageWin / stats.averageLoss).toFixed(2) : '-'}`}
            variant="accent"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Interactive Equity Curve & Drawdown Visualizer */}
      <EquityCurveChart trades={filteredTrades} />

      {/* Performance Summary (Best/Worst breakdowns) */}
      <PerformanceSummary trades={filteredTrades} />

      {/* Strengths & Weaknesses (Rule-engine with sample size guards) */}
      <StrengthsWeaknesses trades={filteredTrades} />

      {/* Recent Trades Ledger Strip */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#26313D]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
              RECENT LOGGED TRADES
            </h3>
            <span className="text-[10px] font-mono text-[#8B98A8]">
              (Latest {recentTrades.length} entries)
            </span>
          </div>
          <Link
            href="/journal"
            className="flex items-center gap-1 text-xs font-mono text-[#38BDF8] hover:underline"
          >
            <span>View Full Journal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8B98A8]">
            No trades in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[#8B98A8] border-b border-[#26313D]/60 pb-2">
                  <th className="py-2">Date</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Direction</th>
                  <th className="py-2">Setup</th>
                  <th className="py-2 text-right">Entry</th>
                  <th className="py-2 text-right">Exit</th>
                  <th className="py-2 text-right">P&L</th>
                  <th className="py-2 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26313D]/40">
                {recentTrades.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTradeForDetail(t)}
                    className="hover:bg-[#16202B] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 text-[#8B98A8]">{t.date}</td>
                    <td className="py-2.5 font-bold text-[#F5F7FA]">{t.symbol}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          t.direction === 'LONG'
                            ? 'text-[#22C55E] bg-[#22C55E]/10'
                            : 'text-[#EF4444] bg-[#EF4444]/10'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#8B98A8] truncate max-w-[120px]">
                      {t.setup_name || '-'}
                    </td>
                    <td className="py-2.5 text-right text-[#F5F7FA]">{t.entry_price}</td>
                    <td className="py-2.5 text-right text-[#8B98A8]">{t.exit_price ?? 'Open'}</td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        t.pnl && t.pnl > 0
                          ? 'text-[#22C55E]'
                          : t.pnl && t.pnl < 0
                          ? 'text-[#EF4444]'
                          : 'text-[#8B98A8]'
                      }`}
                    >
                      {formatCurrency(t.pnl)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.result === 'WIN'
                            ? 'bg-[#22C55E]/15 text-[#22C55E]'
                            : t.result === 'LOSS'
                            ? 'bg-[#EF4444]/15 text-[#EF4444]'
                            : 'bg-[#26313D] text-[#8B98A8]'
                        }`}
                      >
                        {t.result || 'OPEN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
