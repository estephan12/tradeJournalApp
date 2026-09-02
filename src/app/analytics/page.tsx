'use client';

import React, { useState, useMemo } from 'react';
import { useTrades } from '@/context/trade-context';
import { Trade } from '@/types/trade';
import { formatCurrency, formatPercent, formatR } from '@/lib/utils';
import { calculateTradeStatistics } from '@/lib/calculations';
import {
  TrendingUp,
  Award,
  Layers,
  Clock,
  ArrowUpDown,
  Brain,
  AlertOctagon,
  Tag,
  Target,
  Plus,
} from 'lucide-react';

type AnalyticsSection =
  | 'overview'
  | 'assets'
  | 'strategies'
  | 'setups'
  | 'sessions'
  | 'directions'
  | 'timeframes'
  | 'psychology'
  | 'mistakes'
  | 'tags';

interface BreakdownMetric {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
  expectancy: number;
  averageR: number;
  grossLoss: number;
}

export default function AnalyticsPage() {
  const { filteredTrades, setups, addSetup } = useTrades();
  const [activeTab, setActiveTab] = useState<AnalyticsSection>('overview');
  const [newSetupName, setNewSetupName] = useState<string>('');
  const [showAddSetup, setShowAddSetup] = useState<boolean>(false);

  // Compute breakdown metrics for any grouping function
  const computeBreakdown = (
    keyFn: (t: Trade) => string | string[] | null | undefined
  ): BreakdownMetric[] => {
    const closed = filteredTrades.filter((t) => t.pnl !== null && t.pnl !== undefined);
    const map = new Map<
      string,
      {
        trades: number;
        wins: number;
        losses: number;
        breakevens: number;
        netPnL: number;
        grossProfit: number;
        grossLoss: number;
        sumR: number;
        countR: number;
      }
    >();

    for (const t of closed) {
      const keys = keyFn(t);
      if (!keys) continue;
      const keyList = Array.isArray(keys) ? keys : [keys];

      for (const k of keyList) {
        if (!k) continue;
        const cur = map.get(k) || {
          trades: 0,
          wins: 0,
          losses: 0,
          breakevens: 0,
          netPnL: 0,
          grossProfit: 0,
          grossLoss: 0,
          sumR: 0,
          countR: 0,
        };

        cur.trades++;
        const p = t.pnl || 0;
        cur.netPnL += p;

        if (p > 0) {
          cur.wins++;
          cur.grossProfit += p;
        } else if (p < 0) {
          cur.losses++;
          cur.grossLoss += Math.abs(p);
        } else {
          cur.breakevens++;
        }

        if (t.r_multiple !== null && t.r_multiple !== undefined && !isNaN(t.r_multiple)) {
          cur.sumR += t.r_multiple;
          cur.countR++;
        }

        map.set(k, cur);
      }
    }

    return Array.from(map.entries()).map(([name, data]) => {
      const winRate = Number(((data.wins / data.trades) * 100).toFixed(1));
      const lossRate = Number(((data.losses / data.trades) * 100).toFixed(1));
      const avgWin = data.wins > 0 ? data.grossProfit / data.wins : 0;
      const avgLoss = data.losses > 0 ? data.grossLoss / data.losses : 0;
      const expectancy = Number(((winRate / 100) * avgWin - (lossRate / 100) * avgLoss).toFixed(2));
      const pf =
        data.grossLoss === 0
          ? data.grossProfit > 0
            ? 99.99
            : 0
          : Number((data.grossProfit / data.grossLoss).toFixed(2));
      const avgR = data.countR > 0 ? Number((data.sumR / data.countR).toFixed(2)) : 0;

      return {
        name,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        breakevens: data.breakevens,
        winRate,
        netPnL: Number(data.netPnL.toFixed(2)),
        profitFactor: pf,
        expectancy,
        averageR: avgR,
        grossLoss: Number(data.grossLoss.toFixed(2)),
      };
    });
  };

  const assetMetrics = useMemo(() => computeBreakdown((t) => t.symbol), [filteredTrades]);
  const strategyMetrics = useMemo(() => computeBreakdown((t) => t.strategy_name), [filteredTrades]);
  const setupMetrics = useMemo(() => computeBreakdown((t) => t.setup_name), [filteredTrades]);
  const sessionMetrics = useMemo(() => computeBreakdown((t) => t.session), [filteredTrades]);
  const directionMetrics = useMemo(() => computeBreakdown((t) => t.direction), [filteredTrades]);
  const timeframeMetrics = useMemo(() => computeBreakdown((t) => t.timeframe), [filteredTrades]);
  const psychologyMetrics = useMemo(() => computeBreakdown((t) => t.emotion), [filteredTrades]);
  const mistakesMetrics = useMemo(() => {
    // Rank mistakes by money lost (grossLoss descending)
    const list = computeBreakdown((t) => t.mistake);
    return list.sort((a, b) => b.grossLoss - a.grossLoss);
  }, [filteredTrades]);
  const tagMetrics = useMemo(() => computeBreakdown((t) => t.tags), [filteredTrades]);

  const handleCreateSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetupName.trim()) return;
    await addSetup(newSetupName.trim());
    setNewSetupName('');
    setShowAddSetup(false);
  };

  const tabs: { id: AnalyticsSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'assets', label: 'Assets', icon: Award },
    { id: 'strategies', label: 'Strategies', icon: Target },
    { id: 'setups', label: 'Setups', icon: TrendingUp },
    { id: 'sessions', label: 'Sessions', icon: Clock },
    { id: 'directions', label: 'Directions', icon: ArrowUpDown },
    { id: 'timeframes', label: 'Timeframes', icon: Layers },
    { id: 'psychology', label: 'Psychology', icon: Brain },
    { id: 'mistakes', label: 'Mistakes', icon: AlertOctagon },
    { id: 'tags', label: 'Tags', icon: Tag },
  ];

  const renderTable = (items: BreakdownMetric[], emptyLabel: string = 'No trades recorded for this category.') => {
    if (items.length === 0) {
      return (
        <div className="bg-[#111820] border border-[#26313D] rounded-lg p-10 text-center text-xs text-[#8B98A8]">
          {emptyLabel}
        </div>
      );
    }

    return (
      <div className="bg-[#111820] border border-[#26313D] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#0B0F14] border-b border-[#26313D] text-[#8B98A8]">
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-3 text-right">Trades</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Net P&L</th>
                <th className="py-2.5 px-3 text-right">Profit Factor</th>
                <th className="py-2.5 px-3 text-right">Expectancy</th>
                <th className="py-2.5 px-3 text-right">Average R</th>
                <th className="py-2.5 px-4 text-center">Statistical Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26313D]/60">
              {items.map((m) => {
                const isPos = m.netPnL > 0;
                const isNeg = m.netPnL < 0;
                return (
                  <tr key={m.name} className="hover:bg-[#16202B] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F5F7FA]">{m.name}</td>
                    <td className="py-3 px-3 text-right text-[#8B98A8]">{m.trades}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.winRate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                        {formatPercent(m.winRate)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      <span className={isPos ? 'text-[#22C55E]' : isNeg ? 'text-[#EF4444]' : 'text-[#8B98A8]'}>
                        {formatCurrency(m.netPnL)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.profitFactor >= 1.5 ? 'text-[#22C55E]' : m.profitFactor < 1 ? 'text-[#EF4444]' : 'text-[#F5F7FA]'}>
                        {m.profitFactor.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.expectancy > 0 ? 'text-[#22C55E]' : m.expectancy < 0 ? 'text-[#EF4444]' : 'text-[#8B98A8]'}>
                        {formatCurrency(m.expectancy)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.averageR > 0 ? 'text-[#22C55E]' : m.averageR < 0 ? 'text-[#EF4444]' : 'text-[#8B98A8]'}>
                        {formatR(m.averageR)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.trades >= 30 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                          Reliable (30+)
                        </span>
                      ) : m.trades >= 10 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                          Early Signal (10-29)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-[#8B98A8]">
                          Insufficient (&lt;10)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#26313D]">
        <div>
          <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
            PERFORMANCE ANALYTICS
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Multi-dimensional statistical breakdowns across all variables
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'setups' && (
            <button
              onClick={() => setShowAddSetup(!showAddSetup)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#38BDF8] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Setup</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Custom Setup Inline Form */}
      {showAddSetup && (
        <form
          onSubmit={handleCreateSetup}
          className="p-3 bg-[#111820] border border-[#38BDF8]/40 rounded-lg flex items-center gap-3 animate-in fade-in"
        >
          <input
            type="text"
            required
            placeholder="Setup name (e.g. Orderblock Retest, Range Expansion)"
            value={newSetupName}
            onChange={(e) => setNewSetupName(e.target.value)}
            className="flex-1 h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            className="px-4 h-8 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
          >
            Save Setup
          </button>
          <button
            type="button"
            onClick={() => setShowAddSetup(false)}
            className="px-3 h-8 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#111820] p-1.5 rounded-lg border border-[#26313D]">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                active
                  ? 'bg-[#0B0F14] text-[#38BDF8] border border-[#26313D] font-bold shadow-inner'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Leaderboard */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-[#38BDF8]">
                  ASSETS BY NET P&L
                </div>
                {renderTable(assetMetrics.slice(0, 5))}
              </div>

              {/* Setups Leaderboard */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-[#38BDF8]">
                  SETUPS BY NET P&L
                </div>
                {renderTable(setupMetrics.slice(0, 5))}
              </div>
            </div>

            {/* Mistakes Ranked by Capital Lost */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#EF4444] flex items-center justify-between">
                <span>BEHAVIORAL MISTAKES (RANKED BY TOTAL MONEY LOST)</span>
                <span className="text-[10px] text-[#8B98A8]">Capital Impact Analysis</span>
              </div>
              {renderTable(mistakesMetrics)}
            </div>
          </div>
        )}

        {activeTab === 'assets' && renderTable(assetMetrics)}
        {activeTab === 'strategies' && renderTable(strategyMetrics)}
        {activeTab === 'setups' && renderTable(setupMetrics)}
        {activeTab === 'sessions' && renderTable(sessionMetrics)}
        {activeTab === 'directions' && renderTable(directionMetrics)}
        {activeTab === 'timeframes' && renderTable(timeframeMetrics)}
        {activeTab === 'psychology' && renderTable(psychologyMetrics)}
        {activeTab === 'mistakes' && renderTable(mistakesMetrics)}
        {activeTab === 'tags' && renderTable(tagMetrics)}
      </div>
    </div>
  );
}
