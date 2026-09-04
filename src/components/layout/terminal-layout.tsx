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
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';

export function TerminalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const {
    setIsAddTradeModalOpen,
    setIsImportModalOpen,
    searchQuery,
    setSearchQuery,
    isDemoMode,
    setIsDemoMode,
    user,
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

        {/* Sync Info Banner when in Local Mode */}
        {!user && !bannerDismissed && (
          <div className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/30 px-3 py-2 text-xs text-[#F59E0B] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate sm:overflow-visible sm:whitespace-normal">
                <strong>Modo Local:</strong> Tus datos están solo en este dispositivo.{' '}
                <Link href="/login" className="underline font-bold text-[#F5F7FA] hover:text-[#38BDF8]">
                  Inicia sesión para sincronizar con tu celular
                </Link>.
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-[#F59E0B] hover:text-[#F5F7FA] p-0.5 shrink-0"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
