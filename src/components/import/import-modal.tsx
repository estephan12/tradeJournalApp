'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useTrades } from '@/context/trade-context';
import { ImportFlow } from './import-flow';

export function ImportModal() {
  const { isImportModalOpen, setIsImportModalOpen } = useTrades();

  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={() => setIsImportModalOpen(false)}
          className="absolute right-4 top-4 z-10 p-1.5 rounded text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]"
        >
          <X className="w-5 h-5" />
        </button>
        <ImportFlow onComplete={() => setIsImportModalOpen(false)} />
      </div>
    </div>
  );
}
