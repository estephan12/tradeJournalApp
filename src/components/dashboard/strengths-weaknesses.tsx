'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TrendingUp, AlertOctagon, CheckCircle, Info } from 'lucide-react';

interface StrengthsWeaknessesProps {
  trades: Trade[];
}

interface StatisticalFinding {
  title: string;
  statement: string;
  sampleSize: number;
  sampleConfidence: 'insufficient' | 'early_signal' | 'reliable';
  stats: string;
}

export function StrengthsWeaknesses({ trades }: StrengthsWeaknessesProps) {
  const { strengths, weaknesses } = useMemo(() => {
    const closed = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
    const strengthsList: StatisticalFinding[] = [];
    const weaknessesList: StatisticalFinding[] = [];

    if (closed.length < 5) {
      return { strengths: [], weaknesses: [] };
    }

    const baselineWins = closed.filter((t) => (t.pnl || 0) > 0).length;
    const baselineWinRate = (baselineWins / closed.length) * 100;

    const getConfidence = (n: number): 'insufficient' | 'early_signal' | 'reliable' => {
      if (n < 10) return 'insufficient';
      if (n <= 29) return 'early_signal';
      return 'reliable';
    };

    // Helper to evaluate groups
    const analyzeCategory = (
      namePrefix: string,
      keyFn: (t: Trade) => string | null | undefined
    ) => {
      const groups = new Map<string, Trade[]>();
      for (const t of closed) {
        const k = keyFn(t);
        if (!k) continue;
        const arr = groups.get(k) || [];
        arr.push(t);
        groups.set(k, arr);
      }

      for (const [key, groupTrades] of groups.entries()) {
        const n = groupTrades.length;
        const wins = groupTrades.filter((t) => (t.pnl || 0) > 0);
        const losses = groupTrades.filter((t) => (t.pnl || 0) < 0);
        const winRate = (wins.length / n) * 100;
        const netPnL = groupTrades.reduce((acc, cur) => acc + (cur.pnl || 0), 0);
        const grossProfit = wins.reduce((acc, cur) => acc + (cur.pnl || 0), 0);
        const grossLoss = losses.reduce((acc, cur) => acc + Math.abs(cur.pnl || 0), 0);
        const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
        const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
        const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
        const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

        const conf = getConfidence(n);

        // Strength criteria
        if (n >= 10 && pf >= 1.75 && netPnL > 0 && winRate >= 50) {
          strengthsList.push({
            title: `${key}`,
            statement: `${key} demonstrates high statistical edge with a ${pf.toFixed(2)} Profit Factor.`,
            sampleSize: n,
            sampleConfidence: conf,
            stats: `Win Rate: ${winRate.toFixed(1)}% | Net: ${formatCurrency(netPnL)} | Expectancy: ${formatCurrency(expectancy)}`,
          });
        }

        // Weakness criteria
        if (n >= 10 && (expectancy < 0 || pf < 1.0 || netPnL < 0)) {
          weaknessesList.push({
            title: `${key}`,
            statement: `${key} currently displays negative expectancy and sub-1.0 Profit Factor.`,
            sampleSize: n,
            sampleConfidence: conf,
            stats: `Win Rate: ${winRate.toFixed(1)}% | Net: ${formatCurrency(netPnL)} | PF: ${pf.toFixed(2)}`,
          });
        }
      }
    };

    // Analyze Assets
    analyzeCategory('Asset', (t) => t.symbol);

    // Analyze Setups
    analyzeCategory('Setup', (t) => t.setup_name);

    // Analyze Sessions
    analyzeCategory('Session', (t) => t.session);

    // Analyze Emotions
    analyzeCategory('Emotion', (t) => t.emotion);

    // Long vs Short directional comparison
    const longs = closed.filter((t) => t.direction === 'LONG');
    const shorts = closed.filter((t) => t.direction === 'SHORT');
    if (longs.length >= 10 && shorts.length >= 10) {
      const longPnL = longs.reduce((a, c) => a + (c.pnl || 0), 0);
      const shortPnL = shorts.reduce((a, c) => a + (c.pnl || 0), 0);
      if (longPnL > shortPnL && longPnL > 0) {
        strengthsList.push({
          title: 'Long Bias Outperformance',
          statement: 'Your long trades significantly outperform your short trades in net profitability.',
          sampleSize: longs.length,
          sampleConfidence: getConfidence(longs.length),
          stats: `Long PnL: ${formatCurrency(longPnL)} vs Short PnL: ${formatCurrency(shortPnL)}`,
        });
      } else if (shortPnL > longPnL && shortPnL > 0) {
        strengthsList.push({
          title: 'Short Bias Outperformance',
          statement: 'Your short trades significantly outperform your long trades in net profitability.',
          sampleSize: shorts.length,
          sampleConfidence: getConfidence(shorts.length),
          stats: `Short PnL: ${formatCurrency(shortPnL)} vs Long PnL: ${formatCurrency(longPnL)}`,
        });
      }
    }

    // Sort by sample size descending so most reliable patterns show first
    strengthsList.sort((a, b) => b.sampleSize - a.sampleSize);
    weaknessesList.sort((a, b) => b.sampleSize - a.sampleSize);

    return { strengths: strengthsList.slice(0, 4), weaknesses: weaknessesList.slice(0, 4) };
  }, [trades]);

  const renderBadge = (confidence: 'insufficient' | 'early_signal' | 'reliable', n: number) => {
    if (confidence === 'reliable') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
          {n} trades — Reliable Pattern
        </span>
      );
    }
    if (confidence === 'early_signal') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
          {n} trades — Early Signal
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-[#8B98A8]">
        {n} trades — Insufficient Sample
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths Card */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-[#26313D]">
          <TrendingUp className="w-4 h-4 text-[#22C55E]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
            IDENTIFIED STRENGTHS
          </h3>
        </div>

        {strengths.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8B98A8]">
            <Info className="w-5 h-5 mx-auto mb-2 text-[#8B98A8]" />
            Minimum sample size required (10+ closed trades per category) to declare statistically meaningful edge.
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {strengths.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-[#0B0F14] border border-[#26313D] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold font-mono text-[#F5F7FA]">
                    {item.title}
                  </span>
                  {renderBadge(item.sampleConfidence, item.sampleSize)}
                </div>
                <p className="text-xs text-[#8B98A8]">{item.statement}</p>
                <div className="text-[10px] font-mono text-[#22C55E] pt-1 border-t border-[#26313D]/40">
                  {item.stats}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weaknesses Card */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-[#26313D]">
          <AlertOctagon className="w-4 h-4 text-[#EF4444]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
            IDENTIFIED WEAKNESSES
          </h3>
        </div>

        {weaknesses.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8B98A8]">
            <CheckCircle className="w-5 h-5 mx-auto mb-2 text-[#22C55E]" />
            No major statistically significant underperformance clusters detected across active sample sets.
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {weaknesses.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-[#0B0F14] border border-[#26313D] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold font-mono text-[#F5F7FA]">
                    {item.title}
                  </span>
                  {renderBadge(item.sampleConfidence, item.sampleSize)}
                </div>
                <p className="text-xs text-[#8B98A8]">{item.statement}</p>
                <div className="text-[10px] font-mono text-[#EF4444] pt-1 border-t border-[#26313D]/40">
                  {item.stats}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
