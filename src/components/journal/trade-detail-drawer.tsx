'use client';

import React from 'react';
import { X, Trash2, Calendar, Clock, DollarSign, ShieldAlert, Brain, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useTrades } from '@/context/trade-context';
import { formatCurrency, formatPercent, formatR } from '@/lib/utils';

export function TradeDetailDrawer() {
  const { selectedTradeForDetail, setSelectedTradeForDetail, deleteTrade } = useTrades();

  if (!selectedTradeForDetail) return null;
  const trade = selectedTradeForDetail;

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete this ${trade.symbol} trade record?`)) {
      await deleteTrade(trade.id);
    }
  };

  const isWin = trade.result === 'WIN';
  const isLoss = trade.result === 'LOSS';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#111820] border-l border-[#26313D] h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#26313D] bg-[#0B0F14]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider ${
                trade.direction === 'LONG'
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
              }`}
            >
              {trade.direction}
            </span>
            <div>
              <div className="text-base font-bold font-mono text-[#F5F7FA] tracking-wide">
                {trade.symbol}
              </div>
              <div className="text-[11px] text-[#8B98A8] flex items-center gap-2">
                <span>{trade.date}</span>
                <span>•</span>
                <span>{trade.session || 'Session N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 rounded text-[#8B98A8] hover:text-[#EF4444] hover:bg-[#16202B] transition-colors"
              title="Delete Trade"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTradeForDetail(null)}
              className="p-1.5 rounded text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Result Banner */}
        <div className="px-5 py-4 bg-[#0B0F14] border-b border-[#26313D] grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded bg-[#111820] border border-[#26313D]">
            <div className="text-[10px] text-[#8B98A8] uppercase tracking-wider mb-0.5">Net P&L</div>
            <div
              className={`text-base font-mono font-bold ${
                isWin ? 'text-[#22C55E]' : isLoss ? 'text-[#EF4444]' : 'text-[#8B98A8]'
              }`}
            >
              {formatCurrency(trade.pnl)}
            </div>
          </div>
          <div className="p-2 rounded bg-[#111820] border border-[#26313D]">
            <div className="text-[10px] text-[#8B98A8] uppercase tracking-wider mb-0.5">R Multiple</div>
            <div
              className={`text-base font-mono font-bold ${
                isWin ? 'text-[#22C55E]' : isLoss ? 'text-[#EF4444]' : 'text-[#8B98A8]'
              }`}
            >
              {formatR(trade.r_multiple)}
            </div>
          </div>
          <div className="p-2 rounded bg-[#111820] border border-[#26313D]">
            <div className="text-[10px] text-[#8B98A8] uppercase tracking-wider mb-0.5">Result</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {isWin ? (
                <span className="text-xs font-mono font-bold text-[#22C55E] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> WIN
                </span>
              ) : isLoss ? (
                <span className="text-xs font-mono font-bold text-[#EF4444] flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> LOSS
                </span>
              ) : (
                <span className="text-xs font-mono text-[#8B98A8]">BE</span>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Timing & Market Context */}
          <div>
            <div className="text-[11px] font-mono text-[#38BDF8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Timing & Timeframe</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F14] p-3 rounded border border-[#26313D] text-xs font-mono">
              <div>
                <span className="text-[#8B98A8]">Date: </span>
                <span className="text-[#F5F7FA]">{trade.date}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Timeframe: </span>
                <span className="text-[#F5F7FA]">{trade.timeframe || '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Entry Time: </span>
                <span className="text-[#F5F7FA]">{trade.entry_time || '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Exit Time: </span>
                <span className="text-[#F5F7FA]">{trade.exit_time || '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Session: </span>
                <span className="text-[#F5F7FA]">{trade.session || '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Account: </span>
                <span className="text-[#F5F7FA]">{trade.account_name || 'Main Account'}</span>
              </div>
            </div>
          </div>

          {/* Execution & Position */}
          <div>
            <div className="text-[11px] font-mono text-[#38BDF8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Execution & Sizing</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F14] p-3 rounded border border-[#26313D] text-xs font-mono">
              <div>
                <span className="text-[#8B98A8]">Entry Price: </span>
                <span className="text-[#F5F7FA] font-medium">{trade.entry_price}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Exit Price: </span>
                <span className="text-[#F5F7FA] font-medium">{trade.exit_price ?? 'Open'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Stop Loss: </span>
                <span className="text-[#F5F7FA]">{trade.stop_loss ?? '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Take Profit: </span>
                <span className="text-[#F5F7FA]">{trade.take_profit ?? '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Position Size: </span>
                <span className="text-[#F5F7FA]">{trade.position_size}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Commission / Swap: </span>
                <span className="text-[#F5F7FA]">
                  ${(trade.commission || 0) + (trade.swap || 0)}
                </span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Risk Amount: </span>
                <span className="text-[#F5F7FA]">{formatCurrency(trade.risk_amount)}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Risk %: </span>
                <span className="text-[#F5F7FA]">{formatPercent(trade.risk_percent)}</span>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <div className="text-[11px] font-mono text-[#38BDF8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Setup & Strategy</span>
            </div>
            <div className="bg-[#0B0F14] p-3 rounded border border-[#26313D] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8B98A8]">Setup:</span>
                <span className="text-[#F5F7FA] font-medium">{trade.setup_name || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B98A8]">Strategy:</span>
                <span className="text-[#F5F7FA] font-medium">{trade.strategy_name || 'None'}</span>
              </div>
              {trade.tags && trade.tags.length > 0 && (
                <div className="pt-2 border-t border-[#26313D] flex flex-wrap gap-1.5">
                  {trade.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-[#111820] border border-[#26313D] text-[10px] text-[#38BDF8]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Psychology & Discipline */}
          <div>
            <div className="text-[11px] font-mono text-[#38BDF8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              <span>Psychology & Discipline</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F14] p-3 rounded border border-[#26313D] text-xs">
              <div>
                <span className="text-[#8B98A8]">Emotion: </span>
                <span className="text-[#F5F7FA] font-medium">{trade.emotion || '-'}</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Mistake: </span>
                <span
                  className={
                    trade.mistake && trade.mistake !== 'None'
                      ? 'text-[#F59E0B] font-semibold'
                      : 'text-[#22C55E]'
                  }
                >
                  {trade.mistake || 'None'}
                </span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Confidence: </span>
                <span className="text-[#38BDF8] font-mono font-bold">
                  {trade.confidence ? `${trade.confidence}/10` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Discipline: </span>
                <span className="text-[#38BDF8] font-mono font-bold">
                  {trade.discipline ? `${trade.discipline}/10` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Journal Narrative */}
          {trade.notes && (
            <div>
              <div className="text-[11px] font-mono text-[#38BDF8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Review</span>
              </div>
              <div className="bg-[#0B0F14] p-3 rounded border border-[#26313D] space-y-3 text-xs leading-relaxed">
                {trade.notes.tradeThesis && (
                  <div>
                    <div className="text-[10px] text-[#8B98A8] uppercase tracking-wider font-semibold">
                      Trade Thesis
                    </div>
                    <div className="text-[#F5F7FA] mt-0.5">{trade.notes.tradeThesis}</div>
                  </div>
                )}
                {trade.notes.whatHappened && (
                  <div>
                    <div className="text-[10px] text-[#8B98A8] uppercase tracking-wider font-semibold">
                      What Happened
                    </div>
                    <div className="text-[#F5F7FA] mt-0.5">{trade.notes.whatHappened}</div>
                  </div>
                )}
                {trade.notes.whatWentWell && (
                  <div>
                    <div className="text-[10px] text-[#22C55E] uppercase tracking-wider font-semibold">
                      What Went Well
                    </div>
                    <div className="text-[#F5F7FA] mt-0.5">{trade.notes.whatWentWell}</div>
                  </div>
                )}
                {trade.notes.whatWentWrong && (
                  <div>
                    <div className="text-[10px] text-[#EF4444] uppercase tracking-wider font-semibold">
                      What Went Wrong
                    </div>
                    <div className="text-[#F5F7FA] mt-0.5">{trade.notes.whatWentWrong}</div>
                  </div>
                )}
                {trade.notes.lesson && (
                  <div className="p-2.5 rounded bg-[#111820] border border-[#38BDF8]/30">
                    <div className="text-[10px] text-[#38BDF8] uppercase tracking-wider font-bold">
                      Key Lesson
                    </div>
                    <div className="text-[#F5F7FA] mt-0.5">{trade.notes.lesson}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
