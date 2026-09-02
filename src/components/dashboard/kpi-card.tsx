'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'positive' | 'negative' | 'accent' | 'warning';
  sampleSize?: number;
}

export function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  sampleSize,
}: KPICardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'positive':
        return 'text-[#22C55E]';
      case 'negative':
        return 'text-[#EF4444]';
      case 'accent':
        return 'text-[#38BDF8]';
      case 'warning':
        return 'text-[#F59E0B]';
      default:
        return 'text-[#F5F7FA]';
    }
  };

  return (
    <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4 flex flex-col justify-between hover:border-[#38BDF8]/40 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B98A8]">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-[#8B98A8]" />}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className={cn('text-xl sm:text-2xl font-bold font-mono tracking-tight', getVariantStyles())}>
          {value}
        </div>
        {sampleSize !== undefined && (
          <span className="text-[10px] font-mono text-[#8B98A8]">
            {sampleSize} {sampleSize === 1 ? 'trade' : 'trades'}
          </span>
        )}
      </div>

      {subValue && (
        <div className="mt-1.5 pt-1.5 border-t border-[#26313D]/60 text-[11px] text-[#8B98A8] font-mono">
          {subValue}
        </div>
      )}
    </div>
  );
}
