'use client';

import React, { useState } from 'react';
import { useTrades } from '@/context/trade-context';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Wallet, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function AccountsPage() {
  const { accounts, trades, addAccount, deleteAccount, setDefaultAccount } = useTrades();
  const [showAdd, setShowAdd] = useState(accounts.length === 0);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const numBalance = parseFloat(balance) || 0;
      await addAccount({
        name: name.trim(),
        initial_balance: numBalance,
        currency,
      });
      setName('');
      setBalance('');
      setShowAdd(false);
    } catch (err) {
      console.error('Error creating account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    if (confirm(`¿Estás seguro de eliminar la cuenta "${accName}"?`)) {
      await deleteAccount(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
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
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] active:scale-95 transition-all shadow"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Account</span>
        </button>
      </div>

      {/* Add Account Form */}
      {showAdd && (
        <form
          onSubmit={handleCreateAccount}
          className="p-5 bg-[#111820] border border-[#38BDF8]/40 rounded-lg space-y-4 shadow-xl animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#38BDF8]">
              Create New Trading Account
            </div>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#8B98A8] block mb-1">Account Name</label>
              <input
                type="text"
                required
                placeholder="e.g. My Personal Capital, Prop 50k"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] placeholder-[#8B98A8]/60 focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#8B98A8] block mb-1">Initial Balance</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 5000, 10000, 50000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono text-[#F5F7FA] placeholder-[#8B98A8]/60 focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#8B98A8] block mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="USDT">USDT (Tether)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3.5 py-1.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {accounts.length === 0 && !showAdd && (
        <div className="bg-[#111820] border border-[#26313D] rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#0B0F14] border border-[#26313D] flex items-center justify-center text-[#38BDF8] mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F5F7FA] mb-1 font-mono">
            No Trading Accounts
          </h3>
          <p className="text-xs text-[#8B98A8] max-w-sm mb-5">
            Add your personal account or funded prop firm to start tracking your capital and performance.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Your Account</span>
          </button>
        </div>
      )}

      {/* Account Cards Grid */}
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
              className="bg-[#111820] border border-[#26313D] hover:border-[#38BDF8]/40 rounded-lg p-5 flex flex-col justify-between transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#38BDF8]" />
                    <span className="font-bold text-sm font-mono text-[#F5F7FA]">
                      {acc.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {acc.is_default ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                        DEFAULT
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefaultAccount(acc.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono text-[#8B98A8] hover:text-[#38BDF8] hover:bg-[#0B0F14] border border-[#26313D] transition-colors"
                        title="Set as Default"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(acc.id, acc.name)}
                      className="p-1.5 rounded text-[#8B98A8] hover:text-[#EF4444] hover:bg-[#16202B] transition-colors"
                      title="Delete Account"
                      aria-label="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
