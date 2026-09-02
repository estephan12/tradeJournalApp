'use client';

import React from 'react';
import { ImportFlow } from '@/components/import/import-flow';

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-2 border-b border-[#26313D]">
        <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
          IMPORT TRADES
        </h1>
        <p className="text-xs text-[#8B98A8]">
          Upload broker statements, CSV logs, spreadsheets, or trade screenshots
        </p>
      </div>

      <ImportFlow />
    </div>
  );
}
