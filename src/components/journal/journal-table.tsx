'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Trade } from '@/types/trade';
import { useTrades } from '@/context/trade-context';
import { formatCurrency, formatR } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  UploadCloud,
  FolderOpen,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export function JournalTable() {
  const {
    filteredTrades,
    setSelectedTradeForDetail,
    setIsAddTradeModalOpen,
    setIsImportModalOpen,
  } = useTrades();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const columns = React.useMemo<ColumnDef<Trade>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 font-mono uppercase tracking-wider text-[11px]"
          >
            <span>Date</span>
            <ArrowUpDown className="w-3 h-3 text-[#8B98A8]" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs text-[#F5F7FA]">
            {row.original.date}
          </div>
        ),
      },
      {
        accessorKey: 'entry_time',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px]">Time</span>,
        cell: ({ row }) => (
          <div className="font-mono text-xs text-[#8B98A8]">
            {row.original.entry_time || '--:--'}
          </div>
        ),
      },
      {
        accessorKey: 'symbol',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 font-mono uppercase tracking-wider text-[11px]"
          >
            <span>Symbol</span>
            <ArrowUpDown className="w-3 h-3 text-[#8B98A8]" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="font-mono font-bold text-xs text-[#F5F7FA] tracking-wide">
            {row.original.symbol}
          </div>
        ),
      },
      {
        accessorKey: 'direction',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px]">Dir</span>,
        cell: ({ row }) => {
          const isLong = row.original.direction === 'LONG';
          return (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                isLong
                  ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20'
                  : 'text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {row.original.direction}
            </span>
          );
        },
      },
      {
        accessorKey: 'timeframe',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px]">TF</span>,
        cell: ({ row }) => (
          <div className="text-xs text-[#8B98A8] font-mono">
            {row.original.timeframe || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'session',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px]">Session</span>,
        cell: ({ row }) => (
          <div className="text-xs text-[#8B98A8]">
            {row.original.session || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'setup_name',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px]">Setup</span>,
        cell: ({ row }) => (
          <div className="text-xs text-[#F5F7FA] truncate max-w-[130px]">
            {row.original.setup_name || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'entry_price',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px] text-right block">Entry</span>,
        cell: ({ row }) => (
          <div className="text-xs font-mono text-[#F5F7FA] text-right">
            {row.original.entry_price}
          </div>
        ),
      },
      {
        accessorKey: 'exit_price',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px] text-right block">Exit</span>,
        cell: ({ row }) => (
          <div className="text-xs font-mono text-[#8B98A8] text-right">
            {row.original.exit_price ?? 'Open'}
          </div>
        ),
      },
      {
        accessorKey: 'pnl',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center justify-end gap-1 font-mono uppercase tracking-wider text-[11px] w-full text-right"
          >
            <span>P&L</span>
            <ArrowUpDown className="w-3 h-3 text-[#8B98A8]" />
          </button>
        ),
        cell: ({ row }) => {
          const pnl = row.original.pnl;
          const isPos = pnl && pnl > 0;
          const isNeg = pnl && pnl < 0;
          return (
            <div
              className={`text-xs font-mono font-semibold text-right ${
                isPos ? 'text-[#22C55E]' : isNeg ? 'text-[#EF4444]' : 'text-[#8B98A8]'
              }`}
            >
              {formatCurrency(pnl)}
            </div>
          );
        },
      },
      {
        accessorKey: 'r_multiple',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px] text-right block">R</span>,
        cell: ({ row }) => {
          const r = row.original.r_multiple;
          const isPos = r && r > 0;
          const isNeg = r && r < 0;
          return (
            <div
              className={`text-xs font-mono text-right ${
                isPos ? 'text-[#22C55E]' : isNeg ? 'text-[#EF4444]' : 'text-[#8B98A8]'
              }`}
            >
              {formatR(r)}
            </div>
          );
        },
      },
      {
        accessorKey: 'result',
        header: () => <span className="font-mono uppercase tracking-wider text-[11px] text-center block">Result</span>,
        cell: ({ row }) => {
          const res = row.original.result;
          if (!res) {
            return (
              <div className="text-center text-[10px] font-mono text-[#8B98A8]">
                OPEN
              </div>
            );
          }
          return (
            <div className="flex justify-center">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  res === 'WIN'
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                    : res === 'LOSS'
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                    : 'bg-[#26313D] text-[#8B98A8]'
                }`}
              >
                {res}
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredTrades,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (filteredTrades.length === 0) {
    return (
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#0B0F14] border border-[#26313D] flex items-center justify-center text-[#8B98A8] mb-4">
          <FolderOpen className="w-6 h-6 text-[#38BDF8]" />
        </div>
        <h3 className="text-base font-semibold text-[#F5F7FA] mb-1 font-mono">
          Your journal is empty.
        </h3>
        <p className="text-xs text-[#8B98A8] max-w-sm mb-6">
          No trade records match the selected filters, or you have not recorded any trades yet.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddTradeModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Trade</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-xs font-medium text-[#F5F7FA] transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-[#38BDF8]" />
            <span>Import Trades</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111820] border border-[#26313D] rounded-lg overflow-hidden flex flex-col">
      {/* Mobile Card Feed (touch-optimized for phone screens) */}
      <div className="sm:hidden divide-y divide-[#26313D]/60">
        {table.getRowModel().rows.map((row) => {
          const t = row.original;
          const isLong = t.direction === 'LONG';
          return (
            <div
              key={t.id}
              onClick={() => setSelectedTradeForDetail(t)}
              className="p-3.5 bg-[#111820] hover:bg-[#16202B] active:bg-[#1A2634] transition-colors cursor-pointer space-y-2.5"
            >
              {/* Top: Direction badge, Symbol, PnL */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLong
                        ? 'text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30'
                        : 'text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30'
                    }`}
                  >
                    {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {t.direction}
                  </span>
                  <span className="font-mono font-bold text-sm text-[#F5F7FA]">
                    {t.symbol}
                  </span>
                  {t.timeframe && (
                    <span className="text-[10px] font-mono text-[#8B98A8] bg-[#0B0F14] px-1.5 py-0.5 rounded border border-[#26313D]">
                      {t.timeframe}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono font-bold text-sm ${
                      t.pnl && t.pnl > 0
                        ? 'text-[#22C55E]'
                        : t.pnl && t.pnl < 0
                        ? 'text-[#EF4444]'
                        : 'text-[#8B98A8]'
                    }`}
                  >
                    {formatCurrency(t.pnl)}
                  </div>
                  {t.r_multiple !== null && t.r_multiple !== undefined && (
                    <div className="text-[10px] font-mono text-[#8B98A8]">
                      {formatR(t.r_multiple)}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: Prices & Position Size */}
              <div className="flex items-center justify-between text-xs font-mono text-[#8B98A8] bg-[#0B0F14] px-2.5 py-1.5 rounded border border-[#26313D]/60">
                <div>
                  <span className="text-[10px] text-[#8B98A8]/70 mr-1">In:</span>
                  <span className="text-[#F5F7FA] font-medium">{t.entry_price}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8B98A8]/70 mr-1">Out:</span>
                  <span className="text-[#F5F7FA] font-medium">{t.exit_price ?? 'Open'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8B98A8]/70 mr-1">Size:</span>
                  <span className="text-[#F5F7FA] font-medium">{t.position_size}</span>
                </div>
              </div>

              {/* Bottom: Date/Time, Session, Setup */}
              <div className="flex items-center justify-between text-[11px] text-[#8B98A8]">
                <span>{t.date} {t.entry_time || t.exit_time || ''}</span>
                {t.setup_name && (
                  <span className="text-[#38BDF8] truncate max-w-[140px] text-[10px] font-mono">
                    {t.setup_name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop TanStack Table (hidden on mobile) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-[#0B0F14] border-b border-[#26313D] text-[#8B98A8]"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-2.5 px-3 font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#26313D]/60">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedTradeForDetail(row.original)}
                className="hover:bg-[#16202B] cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2.5 px-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-[#26313D] bg-[#0B0F14]/50 flex items-center justify-between text-xs text-[#8B98A8]">
        <div>
          Showing{' '}
          <span className="text-[#F5F7FA] font-mono">
            {pagination.pageIndex * pagination.pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="text-[#F5F7FA] font-mono">
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredTrades.length)}
          </span>{' '}
          of <span className="text-[#F5F7FA] font-mono">{filteredTrades.length}</span> trades
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded bg-[#111820] border border-[#26313D] disabled:opacity-30 hover:border-[#38BDF8] text-[#F5F7FA] transition-colors"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded bg-[#111820] border border-[#26313D] disabled:opacity-30 hover:border-[#38BDF8] text-[#F5F7FA] transition-colors"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
