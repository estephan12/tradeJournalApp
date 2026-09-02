'use client';

import React, { useState, useRef } from 'react';
import { useTrades } from '@/context/trade-context';
import { Trade } from '@/types/trade';
import {
  autoDetectColumnMapping,
  normalizeRow,
  parseCSVData,
  parseExcelData,
  ColumnMapping,
  TARGET_FIELDS,
} from '@/lib/import/csv-detector';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ExtractedTradeRow {
  id: string;
  date: string;
  entry_time?: string | null;
  exit_time?: string | null;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number | null;
  position_size: number;
  pnl?: number | null;
  confidence: number;
  isDuplicate?: boolean;
}

export function ImportFlow({ onComplete }: { onComplete?: () => void }) {
  const { trades, importTrades } = useTrades();

  // Steps: 'upload' | 'mapping' | 'preview' | 'success'
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // CSV/XLSX mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Preview state
  const [previewTrades, setPreviewTrades] = useState<ExtractedTradeRow[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'allow' | 'review'>('skip');
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicates: number }>({
    imported: 0,
    duplicates: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. File Drop / Selection
  const handleFile = async (selectedFile: File) => {
    setError('');
    setFile(selectedFile);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    setLoading(true);

    try {
      if (ext === 'csv') {
        setFileType('CSV');
        const text = await selectedFile.text();
        const { headers, rows } = parseCSVData(text);
        if (headers.length === 0 || rows.length === 0) {
          throw new Error('The CSV file does not contain readable data or headers.');
        }
        setCsvHeaders(headers);
        setRawRows(rows);
        const autoMaps = autoDetectColumnMapping(headers);
        setMappings(autoMaps);
        setStep('mapping');
      } else if (ext === 'xlsx' || ext === 'xls') {
        setFileType('Excel');
        const buffer = await selectedFile.arrayBuffer();
        const { headers, rows } = parseExcelData(buffer);
        if (headers.length === 0 || rows.length === 0) {
          throw new Error('The Excel spreadsheet is empty.');
        }
        setCsvHeaders(headers);
        setRawRows(rows);
        const autoMaps = autoDetectColumnMapping(headers);
        setMappings(autoMaps);
        setStep('mapping');
      } else if (['png', 'jpg', 'jpeg', 'pdf'].includes(ext)) {
        setFileType(ext.toUpperCase());
        // Run AI Document Extraction
        await handleAIExtraction(selectedFile);
      } else {
        throw new Error('Unsupported format. Please upload PDF, CSV, XLSX, PNG, or JPG.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reading file');
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Extraction for PDF / Images
  const handleAIExtraction = async (docFile: File) => {
    setLoading(true);
    setError('');

    try {
      let base64 = '';
      if (docFile.type.startsWith('image/')) {
        const reader = new FileReader();
        base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(docFile);
        });
      }

      const res = await fetch('/api/extract-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: docFile.name,
          imageBase64: base64 || null,
          documentText: base64 ? null : 'Sample trade extract statement',
        }),
      });

      if (!res.ok) {
        throw new Error('AI extraction service failed. Check server connection.');
      }

      const data = await res.json();
      const extractedList: ExtractedTradeRow[] = (data.trades || []).map(
        (t: Partial<Trade>, idx: number) => ({
          id: `ext-${Date.now()}-${idx}`,
          date: t.date || new Date().toISOString().split('T')[0],
          symbol: (t.symbol || 'UNKNOWN').toUpperCase(),
          direction: (t.direction as 'LONG' | 'SHORT') || 'LONG',
          entry_price: Number(t.entry_price) || 0,
          exit_price: t.exit_price ?? null,
          position_size: Number(t.position_size) || 1,
          pnl: t.pnl ?? null,
          confidence: Number(t.confidence ?? 0.85),
        })
      );

      applyDuplicateCheck(extractedList);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract data');
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm Column Mapping (for CSV/XLSX)
  const handleConfirmMapping = () => {
    const normalized: ExtractedTradeRow[] = rawRows.map((row, idx) => {
      const { trade, confidence } = normalizeRow(row, mappings);
      return {
        id: `csv-${Date.now()}-${idx}`,
        date: trade.date || new Date().toISOString().split('T')[0],
        entry_time: trade.entry_time || null,
        exit_time: trade.exit_time || null,
        symbol: (trade.symbol || 'UNKNOWN').toUpperCase(),
        direction: trade.direction || 'LONG',
        entry_price: trade.entry_price || 0,
        exit_price: trade.exit_price ?? null,
        position_size: trade.position_size || 1,
        pnl: trade.pnl ?? null,
        confidence,
      };
    });

    applyDuplicateCheck(normalized);
    setStep('preview');
  };

  // Duplicate Check logic
  const applyDuplicateCheck = (extracted: ExtractedTradeRow[]) => {
    // Key: symbol + direction + date + entry_price + exit_price + pnl
    const existingKeys = new Set(
      trades.map(
        (t) =>
          `${t.symbol.toUpperCase()}|${t.direction}|${t.date}|${t.entry_price}|${t.exit_price}|${t.pnl}`
      )
    );

    const checked = extracted.map((row) => {
      const key = `${row.symbol.toUpperCase()}|${row.direction}|${row.date}|${row.entry_price}|${row.exit_price}|${row.pnl}`;
      const isDup = existingKeys.has(key);
      return { ...row, isDuplicate: isDup };
    });

    setPreviewTrades(checked);
  };

  // Update single row in preview
  const handleUpdateRow = (id: string, field: keyof ExtractedTradeRow, val: unknown) => {
    setPreviewTrades((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Delete row from preview
  const handleDeleteRow = (id: string) => {
    setPreviewTrades((prev) => prev.filter((r) => r.id !== id));
  };

  // 4. Final Import execution
  const handleExecuteImport = async () => {
    setLoading(true);
    try {
      let tradesToImport = previewTrades;

      if (duplicateMode === 'skip') {
        tradesToImport = previewTrades.filter((t) => !t.isDuplicate);
      }

      const res = await importTrades(tradesToImport);
      setImportSummary(res);
      setStep('success');
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const duplicatesCount = previewTrades.filter((t) => t.isDuplicate).length;
  const avgConfidence =
    previewTrades.length > 0
      ? Math.round(
          (previewTrades.reduce((acc, c) => acc + c.confidence, 0) / previewTrades.length) * 100
        )
      : 100;

  return (
    <div className="bg-[#111820] border border-[#26313D] rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#26313D]">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-[#38BDF8]" />
          <h2 className="text-base font-bold font-mono text-[#F5F7FA] tracking-wide">
            IMPORT TRADE RECORDS
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={step === 'upload' ? 'text-[#38BDF8] font-bold' : 'text-[#8B98A8]'}>
            1. Upload
          </span>
          <span className="text-[#26313D]">&gt;</span>
          {fileType === 'CSV' || fileType === 'Excel' ? (
            <>
              <span className={step === 'mapping' ? 'text-[#38BDF8] font-bold' : 'text-[#8B98A8]'}>
                2. Map
              </span>
              <span className="text-[#26313D]">&gt;</span>
            </>
          ) : null}
          <span className={step === 'preview' ? 'text-[#38BDF8] font-bold' : 'text-[#8B98A8]'}>
            {fileType === 'CSV' || fileType === 'Excel' ? '3. Preview' : '2. Preview'}
          </span>
          <span className="text-[#26313D]">&gt;</span>
          <span className={step === 'success' ? 'text-[#22C55E] font-bold' : 'text-[#8B98A8]'}>
            Done
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD DROPZONE */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#26313D] hover:border-[#38BDF8] rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0B0F14]/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <div className="w-12 h-12 rounded-full bg-[#111820] border border-[#26313D] flex items-center justify-center text-[#38BDF8] mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-[#F5F7FA] mb-1 font-mono">
              Click to select or drag and drop statement file
            </div>
            <p className="text-xs text-[#8B98A8] max-w-sm mb-4">
              Supported formats: <span className="text-[#38BDF8]">CSV, XLSX, PDF, PNG, JPG</span>
            </p>
            <div className="flex items-center gap-4 text-xs text-[#8B98A8]">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4 text-[#22C55E]" /> Auto-Mapped Spreadsheets
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#38BDF8]" /> AI Document Extraction
              </span>
            </div>
          </div>

          {loading && (
            <div className="p-4 rounded bg-[#0B0F14] border border-[#26313D] flex items-center justify-center gap-3 text-xs font-mono text-[#38BDF8]">
              <span className="w-4 h-4 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing and parsing trade execution records...</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING (CSV & XLSX) */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
                COLUMN MAPPING
              </h3>
              <p className="text-xs text-[#8B98A8]">
                Match the columns from your {fileType} file ({rawRows.length} rows detected) to TradeLab fields.
              </p>
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
              }}
              className="text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
            >
              Change file
            </button>
          </div>

          <div className="bg-[#0B0F14] border border-[#26313D] rounded-lg p-4 max-h-[350px] overflow-y-auto space-y-2.5">
            {mappings.map((m, idx) => (
              <div
                key={m.csvColumn}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center py-1.5 border-b border-[#26313D]/60 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#8B98A8] text-[10px]">#{idx + 1}</span>
                  <span className="text-[#F5F7FA] font-medium truncate">{m.csvColumn}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#8B98A8] text-[10px]">Maps to:</span>
                  <select
                    value={m.targetField}
                    onChange={(e) => {
                      const targetField = e.target.value as keyof Trade | 'ignore';
                      setMappings((prev) =>
                        prev.map((item) =>
                          item.csvColumn === m.csvColumn ? { ...item, targetField, confidence: 1 } : item
                        )
                      );
                    }}
                    className="flex-1 h-7 px-2 rounded bg-[#111820] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
                  >
                    {TARGET_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
            >
              Back
            </button>
            <button
              onClick={handleConfirmMapping}
              className="px-5 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7] transition-colors flex items-center gap-1.5"
            >
              <span>Generate Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & DUPLICATE RESOLUTION */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary Status Strip */}
          <div className="p-3.5 bg-[#0B0F14] border border-[#26313D] rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[#8B98A8]">Detected: </span>
                <span className="text-[#F5F7FA] font-bold">{previewTrades.length} trades</span>
              </div>
              <div>
                <span className="text-[#8B98A8]">Avg Confidence: </span>
                <span
                  className={
                    avgConfidence >= 90
                      ? 'text-[#22C55E] font-bold'
                      : avgConfidence >= 75
                      ? 'text-[#38BDF8] font-bold'
                      : 'text-[#F59E0B] font-bold'
                  }
                >
                  {avgConfidence}%
                </span>
              </div>
            </div>

            {/* Duplicates Alert & Toggle */}
            {duplicatesCount > 0 && (
              <div className="flex items-center gap-3 p-1.5 px-3 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                <span className="text-[#F59E0B] flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {duplicatesCount} duplicates detected
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setDuplicateMode('skip')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      duplicateMode === 'skip'
                        ? 'bg-[#F59E0B] text-[#0B0F14] font-bold'
                        : 'text-[#8B98A8] hover:text-[#F5F7FA]'
                    }`}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setDuplicateMode('allow')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      duplicateMode === 'allow'
                        ? 'bg-[#F59E0B] text-[#0B0F14] font-bold'
                        : 'text-[#8B98A8] hover:text-[#F5F7FA]'
                    }`}
                  >
                    Import Anyway
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Editable Preview Table */}
          <div className="bg-[#0B0F14] border border-[#26313D] rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-[#111820] border-b border-[#26313D] text-[#8B98A8]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Exit</th>
                    <th className="py-2.5 px-3 text-right">P&L ($)</th>
                    <th className="py-2.5 px-3 text-center">Confidence</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26313D]/40">
                  {previewTrades.map((t) => {
                    const isLowConfidence = t.confidence < 0.75;
                    const isDup = t.isDuplicate;

                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          isDup && duplicateMode === 'skip'
                            ? 'opacity-40 bg-zinc-950 line-through'
                            : isLowConfidence
                            ? 'bg-[#F59E0B]/5'
                            : 'hover:bg-[#16202B]'
                        }`}
                      >
                        {/* Date input */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={t.date}
                            onChange={(e) => handleUpdateRow(t.id, 'date', e.target.value)}
                            className="w-24 bg-transparent border-b border-transparent hover:border-[#26313D] focus:border-[#38BDF8] text-[#F5F7FA] focus:outline-none"
                          />
                        </td>

                        {/* Symbol */}
                        <td className="py-2 px-3 font-bold text-[#F5F7FA]">
                          <input
                            type="text"
                            value={t.symbol}
                            onChange={(e) => handleUpdateRow(t.id, 'symbol', e.target.value.toUpperCase())}
                            className="w-20 bg-transparent border-b border-transparent hover:border-[#26313D] focus:border-[#38BDF8] text-[#F5F7FA] focus:outline-none"
                          />
                        </td>

                        {/* Direction */}
                        <td className="py-2 px-3">
                          <select
                            value={t.direction}
                            onChange={(e) => handleUpdateRow(t.id, 'direction', e.target.value)}
                            className="bg-transparent text-xs text-[#F5F7FA] focus:outline-none"
                          >
                            <option value="LONG" className="bg-[#111820]">
                              LONG
                            </option>
                            <option value="SHORT" className="bg-[#111820]">
                              SHORT
                            </option>
                          </select>
                        </td>

                        {/* Entry */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={t.entry_price}
                            onChange={(e) =>
                              handleUpdateRow(t.id, 'entry_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-[#26313D] focus:border-[#38BDF8] text-[#F5F7FA] focus:outline-none"
                          />
                        </td>

                        {/* Exit */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={t.exit_price ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(t.id, 'exit_price', parseFloat(e.target.value) || null)
                            }
                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-[#26313D] focus:border-[#38BDF8] text-[#8B98A8] focus:outline-none"
                          />
                        </td>

                        {/* P&L */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={t.pnl ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(t.id, 'pnl', parseFloat(e.target.value) || null)
                            }
                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-[#26313D] focus:border-[#38BDF8] font-semibold text-[#F5F7FA] focus:outline-none"
                          />
                        </td>

                        {/* Confidence indicator with warning highlighting */}
                        <td className="py-2 px-3 text-center">
                          {isLowConfidence ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              {Math.round(t.confidence * 100)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#22C55E]">
                              {Math.round(t.confidence * 100)}%
                            </span>
                          )}
                        </td>

                        {/* Delete row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDeleteRow(t.id)}
                            className="p-1 rounded text-[#8B98A8] hover:text-[#EF4444]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(fileType === 'CSV' || fileType === 'Excel' ? 'mapping' : 'upload')}
              className="px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
            >
              Back
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={loading || previewTrades.length === 0}
              className="px-5 py-2 rounded bg-[#22C55E] text-[#0B0F14] font-bold text-xs hover:bg-[#16A34A] transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {loading
                  ? 'Importing...'
                  : `Confirm & Import ${
                      duplicateMode === 'skip'
                        ? previewTrades.filter((t) => !t.isDuplicate).length
                        : previewTrades.length
                    } Trades`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS CONFIRMATION */}
      {step === 'success' && (
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-mono text-[#F5F7FA]">
            IMPORT COMPLETED SUCCESSFULLY
          </h3>
          <p className="text-xs text-[#8B98A8] max-w-sm mx-auto">
            Successfully imported{' '}
            <span className="text-[#22C55E] font-bold">{importSummary.imported}</span> trades into your
            journal.
            {importSummary.duplicates > 0 && (
              <span> (Skipped {importSummary.duplicates} duplicate records).</span>
            )}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setPreviewTrades([]);
              }}
              className="px-4 py-2 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] hover:border-[#38BDF8]"
            >
              Import Another File
            </button>
            <a
              href="/journal"
              className="px-5 py-2 rounded bg-[#38BDF8] text-[#0B0F14] font-semibold text-xs hover:bg-[#0284C7]"
            >
              View in Journal
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
