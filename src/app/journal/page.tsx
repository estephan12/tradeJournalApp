'use client';

import React from 'react';
import { JournalTable } from '@/components/journal/journal-table';
import { JournalFilters } from '@/components/journal/journal-filters';
import { useTrades } from '@/context/trade-context';
import { Download, FileSpreadsheet, Plus, UploadCloud, Trash2 } from 'lucide-react';

export default function JournalPage() {
  const { filteredTrades, setIsAddTradeModalOpen, setIsImportModalOpen, clearAllTrades } = useTrades();

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTrades.length === 0) {
      alert('No trades available to export.');
      return;
    }

    const headers = [
      'Date',
      'Time',
      'Symbol',
      'Direction',
      'Timeframe',
      'Session',
      'Setup',
      'Strategy',
      'Entry Price',
      'Exit Price',
      'Stop Loss',
      'Take Profit',
      'Position Size',
      'Net P&L',
      'R Multiple',
      'Result',
      'Emotion',
      'Mistake',
    ];

    const rows = filteredTrades.map((t) => [
      t.date,
      t.entry_time || '',
      t.symbol,
      t.direction,
      t.timeframe || '',
      t.session || '',
      t.setup_name || '',
      t.strategy_name || '',
      t.entry_price,
      t.exit_price ?? '',
      t.stop_loss ?? '',
      t.take_profit ?? '',
      t.position_size,
      t.pnl ?? '',
      t.r_multiple ?? '',
      t.result || '',
      t.emotion || '',
      t.mistake || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tradelab_journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredTrades.length === 0) {
      alert('No trades available to export.');
      return;
    }

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredTrades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tradelab_journal_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#26313D]">
        <div>
          <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
            TRADE JOURNAL
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Chronological ledger of executed positions and outcomes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>CSV</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
            title="Export filtered records as JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>JSON</span>
          </button>

          {/* Clear Journal */}
          {filteredTrades.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all trades from the journal and start fresh?')) {
                  clearAllTrades();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#EF4444]/40 hover:border-[#EF4444] text-xs font-mono text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
              title="Clear all trade records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {/* Import */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#26313D] hover:border-[#38BDF8] text-xs font-medium text-[#F5F7FA] transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Import</span>
          </button>

          {/* Add Trade */}
          <button
            onClick={() => setIsAddTradeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] shadow transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      {/* Journal Filters */}
      <JournalFilters />

      {/* Journal Table */}
      <JournalTable />
    </div>
  );
}
