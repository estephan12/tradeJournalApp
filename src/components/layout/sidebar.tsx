'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  UploadCloud,
  Calendar,
  Sparkles,
  Wallet,
  Target,
  Tag,
  Settings,
  Terminal,
  LogOut,
  Sliders,
  User as UserIcon,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrades } from '@/context/trade-context';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Import Trades', href: '/import', icon: UploadCloud },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Insights', href: '/insights', icon: Sparkles },
];

const secondaryNavItems: NavItem[] = [
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Target },
  { name: 'Tags', href: '/tags', icon: Tag },
];

interface SidebarProps {
  isDemoMode?: boolean;
  onExitDemo?: () => void;
  className?: string;
}

export function Sidebar({ isDemoMode, onExitDemo, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useTrades();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'w-64 bg-[#111820] border-r border-[#26313D] flex flex-col h-screen select-none shrink-0 transition-all duration-200',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-[#26313D] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-[#0B0F14] border border-[#26313D] flex items-center justify-center text-[#38BDF8] group-hover:border-[#38BDF8] transition-colors">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wider text-[#F5F7FA] font-mono">
              TRADELAB
            </span>
            <span className="text-[10px] text-[#8B98A8] uppercase tracking-widest">
              TERMINAL
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B0F14] border border-[#26313D] text-[10px] font-mono text-[#38BDF8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          ONLINE
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-[#8B98A8] uppercase tracking-wider">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors',
                    active
                      ? 'bg-[#0B0F14] text-[#38BDF8] border border-[#26313D] shadow-inner font-semibold'
                      : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]'
                  )}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-[#38BDF8]' : 'text-[#8B98A8]')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#26313D] mx-2" />

        {/* Classification Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-[#8B98A8] uppercase tracking-wider">
            Organization
          </div>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors',
                    active
                      ? 'bg-[#0B0F14] text-[#38BDF8] border border-[#26313D] shadow-inner font-semibold'
                      : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]'
                  )}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-[#38BDF8]' : 'text-[#8B98A8]')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#26313D] mx-2" />

        {/* System Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-[#8B98A8] uppercase tracking-wider">
            System
          </div>
          <nav className="space-y-1">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors',
                isActive('/settings')
                  ? 'bg-[#0B0F14] text-[#38BDF8] border border-[#26313D] shadow-inner font-semibold'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-[#16202B]'
              )}
            >
              <Settings className="w-4 h-4 text-[#8B98A8]" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Footer / Account status */}
      <div className="p-3 border-t border-[#26313D] bg-[#0B0F14]/50">
        {user ? (
          <div className="p-2.5 rounded bg-[#111820] border border-[#22C55E]/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserIcon className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span className="text-[11px] font-mono text-[#F5F7FA] truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-[10px] text-[#8B98A8] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : isDemoMode ? (
          <div className="p-2.5 rounded bg-[#111820] border border-[#F59E0B]/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-[#F59E0B]">DEMO ACTIVE</span>
              <span className="text-[10px] text-[#8B98A8]">Local Mock</span>
            </div>
            <p className="text-[10px] text-[#8B98A8] leading-tight">
              Using preloaded multi-asset demo dataset.
            </p>
            <Link
              href="/login"
              className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-[#0B0F14] border border-[#26313D] text-[10px] text-[#38BDF8] hover:border-[#38BDF8] transition-colors"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In / Connect</span>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-[#8B98A8]">
            <span className="font-mono text-[11px]">v1.0.0</span>
            <Link href="/login" className="text-[10px] text-[#38BDF8] font-mono hover:underline">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
