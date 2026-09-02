'use client';

import React, { useState } from 'react';
import { useTrades } from '@/context/trade-context';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Target, Plus } from 'lucide-react';

export default function StrategiesPage() {
  const { strategies, trades, addStrategy } = useTrades();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addStrategy(name, desc);
    setName('');
    setDesc('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-2 border-b border-[#26313D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
            TRADING STRATEGIES
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Classify and analyze trading models, playbooks, and methodologies
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Strategy</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-[#111820] border border-[#38BDF8]/40 rounded-lg space-y-3"
        >
          <div className="text-xs font-mono uppercase text-[#38BDF8]">ADD STRATEGY</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Strategy Name (e.g. ICT Silver Bullet, Trend Follow)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            />
            <input
              type="text"
              placeholder="Description / Rules summary"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs"
            >
              Save Strategy
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((strat) => {
          const stratTrades = trades.filter((t) => t.strategy_id === strat.id || t.strategy_name === strat.name);
          const closed = stratTrades.filter((t) => t.pnl !== null);
          const pnl = closed.reduce((a, c) => a + (c.pnl || 0), 0);
          const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
          const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

          return (
            <div
              key={strat.id}
              className="bg-[#111820] border border-[#26313D] rounded-lg p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#38BDF8]" />
                  <span className="font-bold text-sm font-mono text-[#F5F7FA]">
                    {strat.name}
                  </span>
                </div>
                <p className="text-xs text-[#8B98A8] mb-4 min-h-[36px]">
                  {strat.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#8B98A8] block">Win Rate</span>
                    <span className="font-semibold text-[#F5F7FA]">
                      {formatPercent(winRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B98A8] block">Net Realized</span>
                    <span
                      className={`font-semibold ${
                        pnl > 0 ? 'text-[#22C55E]' : pnl < 0 ? 'text-[#EF4444]' : 'text-[#8B98A8]'
                      }`}
                    >
                      {formatCurrency(pnl)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#26313D] flex items-center justify-between text-xs font-mono text-[#8B98A8]">
                <span>{stratTrades.length} trades</span>
                <span>{stratTrades.length >= 10 ? 'Signal valid' : 'Collecting data'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
