'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTrades } from '@/context/trade-context';

export function DateSelector() {
  const { filters, setFilters } = useTrades();
  const [showCustom, setShowCustom] = useState<boolean>(filters.dateRangePreset === 'custom');

  const activePreset = filters.dateRangePreset || 'all';

  const presets = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ] as const;

  const handlePresetSelect = (val: typeof presets[number]['value']) => {
    if (val === 'custom') {
      setShowCustom(true);
      setFilters((prev) => ({ ...prev, dateRangePreset: 'custom' }));
    } else {
      setShowCustom(false);
      setFilters((prev) => ({
        ...prev,
        dateRangePreset: val,
        startDate: undefined,
        endDate: undefined,
      }));
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111820] border border-[#26313D] rounded-lg p-2.5">
      <div className="flex items-center gap-2 text-xs font-mono text-[#8B98A8]">
        <CalendarIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
        <span>TIME HORIZON:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => {
          const active = activePreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handlePresetSelect(p.value)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                active
                  ? 'bg-[#0B0F14] text-[#38BDF8] border border-[#26313D] font-bold shadow-inner'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#26313D]">
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          />
          <span className="text-xs text-[#8B98A8]">to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="h-7 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>
      )}
    </div>
  );
}
