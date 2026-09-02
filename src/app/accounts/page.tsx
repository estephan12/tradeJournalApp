'use client';

import React, { useState } from 'react';
import { useTrades } from '@/context/trade-context';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Wallet, Plus, CheckCircle2, DollarSign } from 'lucide-react';

export default function AccountsPage() {
  const { accounts, trades } = useTrades();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('10000');
  const [currency, setCurrency] = useState('USD');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-2 border-b border-[#26313D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
            TRADING ACCOUNTS
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Manage prop firm accounts, personal portfolios, and brokers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Account</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Account created! (In demo mode)');
            setShowAdd(false);
          }}
          className="p-4 bg-[#111820] border border-[#38BDF8]/40 rounded-lg space-y-3"
        >
          <div className="text-xs font-mono uppercase text-[#38BDF8]">CREATE ACCOUNT</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Account Name (e.g. Apex 50k, FTMO)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            />
            <input
              type="number"
              required
              placeholder="Initial Balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
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
              Save Account
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const accTrades = trades.filter((t) => t.account_id === acc.id);
          const closed = accTrades.filter((t) => t.pnl !== null);
          const pnl = closed.reduce((a, c) => a + (c.pnl || 0), 0);
          const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
          const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

          return (
            <div
              key={acc.id}
              className="bg-[#111820] border border-[#26313D] rounded-lg p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#38BDF8]" />
                    <span className="font-bold text-sm font-mono text-[#F5F7FA]">
                      {acc.name}
                    </span>
                  </div>
                  {acc.is_default && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono">
                  <div>
                    <span className="text-[#8B98A8] text-[10px] block">Initial Balance</span>
                    <span className="text-sm font-semibold text-[#F5F7FA]">
                      {formatCurrency(acc.initial_balance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] text-[10px] block">Net Realized P&L</span>
                    <span
                      className={`text-sm font-semibold ${
                        pnl > 0 ? 'text-[#22C55E]' : pnl < 0 ? 'text-[#EF4444]' : 'text-[#8B98A8]'
                      }`}
                    >
                      {formatCurrency(pnl)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#26313D] flex items-center justify-between text-xs font-mono text-[#8B98A8]">
                <span>{accTrades.length} trades recorded</span>
                <span className="text-[#38BDF8]">{formatPercent(winRate)} Win Rate</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
