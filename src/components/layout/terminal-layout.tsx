'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { AddTradeModal } from '@/components/journal/add-trade-modal';
import { TradeDetailDrawer } from '@/components/journal/trade-detail-drawer';
import { ImportModal } from '@/components/import/import-modal';
import { useTrades } from '@/context/trade-context';
import { usePathname } from 'next/navigation';

export function TerminalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const {
    setIsAddTradeModalOpen,
    setIsImportModalOpen,
    searchQuery,
    setSearchQuery,
    isDemoMode,
    setIsDemoMode,
  } = useTrades();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#F5F7FA] overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar
        isDemoMode={isDemoMode}
        onExitDemo={() => setIsDemoMode(false)}
        className="hidden md:flex"
      />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-2xl animate-in slide-in-from-left">
          <Sidebar
            isDemoMode={isDemoMode}
            onExitDemo={() => {
              setIsDemoMode(false);
              setMobileMenuOpen(false);
            }}
          />
        </div>
      )}

      {/* Main Terminal Stage */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          onOpenAddTrade={() => setIsAddTradeModalOpen(true)}
          onOpenImport={() => setIsImportModalOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onOpenAddTrade={() => setIsAddTradeModalOpen(true)} />
      </div>

      {/* Global Modals & Drawers */}
      <AddTradeModal />
      <TradeDetailDrawer />
      <ImportModal />
    </div>
  );
}
