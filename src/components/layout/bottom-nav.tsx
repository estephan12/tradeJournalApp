'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Plus, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onOpenAddTrade: () => void;
}

export function BottomNav({ onOpenAddTrade }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111820] border-t border-[#26313D] px-2 flex items-center justify-around z-40">
      <Link
        href="/"
        className={cn(
          'flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-medium transition-colors',
          isActive('/') ? 'text-[#38BDF8]' : 'text-[#8B98A8]'
        )}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Dashboard</span>
      </Link>

      <Link
        href="/journal"
        className={cn(
          'flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-medium transition-colors',
          isActive('/journal') ? 'text-[#38BDF8]' : 'text-[#8B98A8]'
        )}
      >
        <BookOpen className="w-5 h-5" />
        <span>Journal</span>
      </Link>

      {/* Central Floating-style Add Trade button */}
      <button
        onClick={onOpenAddTrade}
        className="flex flex-col items-center justify-center -mt-4 w-12 h-12 rounded-full bg-[#38BDF8] text-[#0B0F14] shadow-lg border-2 border-[#111820] active:scale-95 transition-transform"
        aria-label="Add Trade"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <Link
        href="/analytics"
        className={cn(
          'flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-medium transition-colors',
          isActive('/analytics') ? 'text-[#38BDF8]' : 'text-[#8B98A8]'
        )}
      >
        <TrendingUp className="w-5 h-5" />
        <span>Analytics</span>
      </Link>

      <Link
        href="/calendar"
        className={cn(
          'flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-medium transition-colors',
          isActive('/calendar') ? 'text-[#38BDF8]' : 'text-[#8B98A8]'
        )}
      >
        <Calendar className="w-5 h-5" />
        <span>Calendar</span>
      </Link>
    </div>
  );
}
