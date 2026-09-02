'use client';

import React, { useState, useMemo } from 'react';
import { useTrades } from '@/context/trade-context';
import { generateInsights, InsightItem, SampleReliability } from '@/lib/insights-engine';
import { formatCurrency, formatPercent, formatR } from '@/lib/utils';
import {
  Sparkles,
  TrendingUp,
  AlertOctagon,
  Brain,
  ShieldAlert,
  Zap,
  Info,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function InsightsPage() {
  const { filteredTrades } = useTrades();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const insights = useMemo(() => {
    return generateInsights(filteredTrades);
  }, [filteredTrades]);

  const displayedInsights = useMemo(() => {
    if (filterCategory === 'all') return insights;
    return insights.filter((i) => i.category === filterCategory);
  }, [insights, filterCategory]);

  const renderBadge = (reliability: SampleReliability, n: number) => {
    if (reliability === 'reliable') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {n} trades — Reliable Pattern
        </span>
      );
    }
    if (reliability === 'early_signal') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {n} trades — Early Signal
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-[#8B98A8]">
        {n} trades — Insufficient Sample
      </span>
    );
  };

  const getCategoryBadge = (category: InsightItem['category']) => {
    switch (category) {
      case 'top_performer':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
            Top Performer
          </span>
        );
      case 'bottom_performer':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
            Bottom Performer
          </span>
        );
      case 'pattern':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
            Statistical Pattern
          </span>
        );
      case 'risk_problem':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
            Risk Asymmetry
          </span>
        );
      case 'behavioral_problem':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Behavioral Friction
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-[#26313D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
              INSIGHTS ENGINE
            </h1>
          </div>
          <p className="text-xs text-[#8B98A8]">
            Automated empirical pattern discovery with strict sample size thresholds
          </p>
        </div>

        {/* Methodology notice */}
        <div className="p-2 px-3 rounded bg-[#111820] border border-[#26313D] text-[11px] text-[#8B98A8] flex items-center gap-2 font-mono">
          <Info className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Rule Guard: Minimum 10 trades required for pattern declarations</span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
            filterCategory === 'all'
              ? 'bg-[#38BDF8] text-[#0B0F14] font-bold'
              : 'bg-[#111820] border border-[#26313D] text-[#8B98A8] hover:text-[#F5F7FA]'
          }`}
        >
          All Insights ({insights.length})
        </button>
        <button
          onClick={() => setFilterCategory('top_performer')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
            filterCategory === 'top_performer'
              ? 'bg-[#22C55E] text-[#0B0F14] font-bold'
              : 'bg-[#111820] border border-[#26313D] text-[#8B98A8] hover:text-[#F5F7FA]'
          }`}
        >
          Top Performers
        </button>
        <button
          onClick={() => setFilterCategory('bottom_performer')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
            filterCategory === 'bottom_performer'
              ? 'bg-[#EF4444] text-[#0B0F14] font-bold'
              : 'bg-[#111820] border border-[#26313D] text-[#8B98A8] hover:text-[#F5F7FA]'
          }`}
        >
          Underperformers
        </button>
        <button
          onClick={() => setFilterCategory('behavioral_problem')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
            filterCategory === 'behavioral_problem'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-[#111820] border border-[#26313D] text-[#8B98A8] hover:text-[#F5F7FA]'
          }`}
        >
          Behavioral Friction
        </button>
        <button
          onClick={() => setFilterCategory('risk_problem')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
            filterCategory === 'risk_problem'
              ? 'bg-[#F59E0B] text-[#0B0F14] font-bold'
              : 'bg-[#111820] border border-[#26313D] text-[#8B98A8] hover:text-[#F5F7FA]'
          }`}
        >
          Risk & Outliers
        </button>
      </div>

      {/* Insights Cards Grid */}
      {displayedInsights.length === 0 ? (
        <div className="bg-[#111820] border border-[#26313D] rounded-lg p-12 text-center space-y-2">
          <Info className="w-8 h-8 text-[#8B98A8] mx-auto mb-2" />
          <h3 className="text-sm font-bold font-mono text-[#F5F7FA]">
            No insights meeting the sample size threshold
          </h3>
          <p className="text-xs text-[#8B98A8] max-w-md mx-auto">
            TradeLab enforces a strict 10-trade minimum to avoid false conclusions from small samples.
            Log more trades to generate statistical insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedInsights.map((item) => (
            <div
              key={item.id}
              className="bg-[#111820] border border-[#26313D] hover:border-[#38BDF8]/50 rounded-lg p-5 flex flex-col justify-between transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getCategoryBadge(item.category)}
                  {renderBadge(item.reliability, item.sampleSize)}
                </div>

                <h3 className="text-sm font-bold font-mono text-[#F5F7FA] mb-2 tracking-wide">
                  {item.title}
                </h3>

                <p className="text-xs text-[#8B98A8] leading-relaxed mb-4">
                  {item.narrative}
                </p>
              </div>

              {/* Data metrics table strip */}
              <div className="pt-3 border-t border-[#26313D] bg-[#0B0F14]/60 -mx-5 -mb-5 px-5 py-3 rounded-b-lg grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#8B98A8] block">Win Rate</span>
                  <span
                    className={`font-semibold ${
                      item.underlyingStats.winRate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {formatPercent(item.underlyingStats.winRate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8B98A8] block">Net P&L</span>
                  <span
                    className={`font-semibold ${
                      item.underlyingStats.netPnL > 0
                        ? 'text-[#22C55E]'
                        : item.underlyingStats.netPnL < 0
                        ? 'text-[#EF4444]'
                        : 'text-[#8B98A8]'
                    }`}
                  >
                    {formatCurrency(item.underlyingStats.netPnL)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8B98A8] block">Profit Factor</span>
                  <span className="text-[#F5F7FA] font-semibold">
                    {item.underlyingStats.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8B98A8] block">Expectancy</span>
                  <span
                    className={`font-semibold ${
                      item.underlyingStats.expectancy > 0
                        ? 'text-[#22C55E]'
                        : item.underlyingStats.expectancy < 0
                        ? 'text-[#EF4444]'
                        : 'text-[#8B98A8]'
                    }`}
                  >
                    {formatCurrency(item.underlyingStats.expectancy)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
