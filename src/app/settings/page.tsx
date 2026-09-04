'use client';

import React, { useState } from 'react';
import { useTrades } from '@/context/trade-context';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Settings,
  Database,
  Key,
  RotateCcw,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

export default function SettingsPage() {
  const {
    isDemoMode,
    setIsDemoMode,
    resetToDemoData,
    clearAllTrades,
    trades,
    user,
    syncWithCloud,
    exportTradesToJson,
    importTradesFromJson,
  } = useTrades();
  const [currency, setCurrency] = useState('USD');
  const [copied, setCopied] = useState(false);

  const supabaseActive = isSupabaseConfigured();

  const handleDownloadSchema = () => {
    window.open('/supabase/schema.sql', '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-[#26313D]">
        <h1 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-wide">
          SYSTEM SETTINGS
        </h1>
        <p className="text-xs text-[#8B98A8]">
          Terminal configuration, backend connections, and data persistence controls
        </p>
      </div>

      {/* 1. Environment & Database Connection */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
              SINCRONIZACIÓN EN LA NUBE (PC Y CELULAR)
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
              user
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
            }`}
          >
            {user ? 'SINCRONIZADO CON LA NUBE' : 'MODO LOCAL (SIN CONECTAR)'}
          </span>
        </div>

        {user ? (
          <div className="p-3 bg-[#0B0F14] rounded border border-[#22C55E]/30 space-y-2 text-xs">
            <p className="text-[#F5F7FA]">
              Iniciaste sesión como: <strong className="text-[#22C55E] font-mono">{user.email}</strong>
            </p>
            <p className="text-[#8B98A8]">
              Tus operaciones se guardan en la nube y se sincronizan en tiempo real con cualquier dispositivo (PC, celular o tablet) donde inicies sesión con esta cuenta.
            </p>
            <div className="pt-2">
              <button
                onClick={() => syncWithCloud()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0F14] border border-[#22C55E]/40 hover:bg-[#22C55E]/10 text-xs font-mono text-[#22C55E] transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Forzar Sincronización Ahora</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#F59E0B]/10 rounded border border-[#F59E0B]/30 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#F5F7FA] font-semibold">
                  Tus datos se encuentran guardados solo en este navegador.
                </p>
                <p className="text-[#8B98A8] mt-1">
                  Para acceder a tu diario desde tu celular y mantener tus datos protegidos sin riesgo de que se borren, inicia sesión o crea tu cuenta gratuita.
                </p>
                <div className="mt-3">
                  <a
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors"
                  >
                    Iniciar Sesión / Crear Cuenta →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON Backup & Restore for 100% Data Safety */}
        <div className="p-3 bg-[#0B0F14] rounded border border-[#26313D] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#F5F7FA]">
              COPIA DE SEGURIDAD LOCAL (RESPALDO JSON)
            </span>
            <span className="text-[10px] text-[#8B98A8] font-mono">Anti-Pérdida</span>
          </div>
          <p className="text-xs text-[#8B98A8]">
            Descarga un archivo con todos tus trades para guardarlos en tu computadora o pasarlos a otro dispositivo manualmente en cualquier momento.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportTradesToJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#F5F7FA] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Exportar Respaldo (.json)</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111820] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#F5F7FA] transition-colors cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Restaurar Respaldo (.json)</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    const text = evt.target?.result as string;
                    if (text) {
                      const res = await importTradesFromJson(text);
                      if (res.error) {
                        alert(`Error: ${res.error}`);
                      } else {
                        alert(`¡Éxito! Se importaron ${res.imported} trades del respaldo.`);
                      }
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Platform Preferences */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#38BDF8]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
            PREFERENCES
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-[#8B98A8] mb-1.5">Base Display Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
              <option value="AUD">AUD ($) - Australian Dollar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B98A8] mb-1.5">Terminal Aesthetic</label>
            <input
              type="text"
              disabled
              value="Dark Terminal (#0B0F14 / #111820 / #26313D)"
              className="w-full h-8 px-2.5 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8]"
            />
          </div>
        </div>
      </div>

      {/* 3. Demo Dataset Controls */}
      <div className="bg-[#111820] border border-[#26313D] rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
            DATASET & RESET MANAGEMENT
          </h2>
        </div>

        <p className="text-xs text-[#8B98A8] leading-relaxed">
          Currently tracking <span className="text-[#38BDF8] font-bold">{trades.length} trades</span> in local terminal memory.
          You can reset back to the pristine multi-asset demo dataset (BTCUSDT, EURUSD, GBPUSD, USDJPY, XAUUSD) anytime.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete all trades and start fresh with an empty journal?')) {
                clearAllTrades();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0B0F14] border border-[#EF4444]/50 hover:border-[#EF4444] text-xs font-mono text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Trades (Start Fresh)</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Reset journal back to default multi-asset demo dataset?')) {
                resetToDemoData();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] hover:border-[#38BDF8] text-xs font-mono text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Demo Dataset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
