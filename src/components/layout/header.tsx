'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, UploadCloud, Menu, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenAddTrade: () => void;
  onOpenImport?: () => void;
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeAccountName?: string;
}

export function Header({
  onOpenAddTrade,
  onOpenImport,
  onToggleMobileMenu,
  searchQuery = '',
  onSearchChange,
  activeAccountName = 'Main Account',
}: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#111820] border-b border-[#26313D] px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B98A8]" />
          <input
            type="text"
            placeholder="Search symbol, notes, setup, tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full h-8 pl-9 pr-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] placeholder-[#8B98A8] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
        </div>
      </div>

      {/* Terminal Right Actions */}
      <div className="flex items-center gap-3">
        {/* UTC Clock & Account indicator */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0B0F14] border border-[#26313D] text-xs font-mono">
          <span className="text-[#8B98A8]">{activeAccountName}</span>
          <span className="text-[#26313D]">|</span>
          <span className="text-[#38BDF8]">{time}</span>
        </div>

        {/* Import Quick Button */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-xs font-medium text-[#F5F7FA] transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Import</span>
          </button>
        )}

        {/* Add Trade Primary Button */}
        <button
          onClick={onOpenAddTrade}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded bg-[#38BDF8] text-[#0B0F14] hover:bg-[#0284C7] text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Trade</span>
        </button>
      </div>
    </header>
  );
}
