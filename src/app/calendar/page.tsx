'use client';

import React from 'react';
import { TradeCalendar } from '@/components/calendar/trade-calendar';

export default function CalendarPage() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="pb-2 border-b border-[#26313D]">
        <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
          CALENDAR OVERVIEW
        </h1>
        <p className="text-xs text-[#8B98A8]">
          Daily performance frequency and P&L distribution • Strictly table-based
        </p>
      </div>

      <TradeCalendar />
    </div>
  );
}
