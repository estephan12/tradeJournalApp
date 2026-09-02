'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar,
  Eye,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';

interface EquityCurveChartProps {
  trades: Trade[];
  initialBalance?: number;
}

interface DataPoint {
  index: number;
  tradeId?: string;
  date: string;
  time?: string;
  symbol?: string;
  direction?: 'LONG' | 'SHORT';
  tradePnL: number;
  cumulativePnL: number;
  equity: number;
  peak: number;
  drawdownDollars: number;
  drawdownPercent: number;
  x?: number;
  y?: number;
}

export interface DataPointWithCoords extends DataPoint {
  x: number;
  y: number;
}

export function EquityCurveChart({
  trades,
  initialBalance = 10000,
}: EquityCurveChartProps) {
  const [viewMode, setViewMode] = useState<'equity' | 'drawdown'>('equity');
  const [aggregation, setAggregation] = useState<'trade' | 'daily'>('trade');
  const [hoveredPoint, setHoveredPoint] = useState<DataPointWithCoords | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize observer for crisp vector scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setChartWidth(Math.max(entries[0].contentRect.width, 320));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter closed trades with valid PnL and sort chronologically (oldest -> newest)
  const sortedTrades = useMemo(() => {
    return trades
      .filter((t) => t.pnl !== null && t.pnl !== undefined)
      .slice()
      .sort((a, b) => {
        const timeA = a.entry_time || a.exit_time || '00:00';
        const timeB = b.entry_time || b.exit_time || '00:00';
        return new Date(`${a.date}T${timeA}`).getTime() - new Date(`${b.date}T${timeB}`).getTime();
      });
  }, [trades]);

  // Compute the series of data points
  const dataPoints: DataPoint[] = useMemo(() => {
    if (sortedTrades.length === 0) return [];

    let cumPnL = 0;
    let currentPeak = 0;

    if (aggregation === 'daily') {
      // Group by date
      const dateMap = new Map<string, Trade[]>();
      for (const t of sortedTrades) {
        const group = dateMap.get(t.date) || [];
        group.push(t);
        dateMap.set(t.date, group);
      }

      const points: DataPoint[] = [
        {
          index: 0,
          date: 'Start',
          tradePnL: 0,
          cumulativePnL: 0,
          equity: initialBalance,
          peak: 0,
          drawdownDollars: 0,
          drawdownPercent: 0,
        },
      ];

      let idx = 1;
      for (const [date, dayTrades] of dateMap.entries()) {
        const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        cumPnL += dayPnL;
        currentPeak = Math.max(currentPeak, cumPnL);
        const ddDollars = Math.max(0, currentPeak - cumPnL);
        const currentEquity = initialBalance + cumPnL;
        const peakEquity = initialBalance + currentPeak;
        const ddPercent = peakEquity > 0 ? (ddDollars / peakEquity) * 100 : 0;

        points.push({
          index: idx++,
          date,
          tradePnL: Number(dayPnL.toFixed(2)),
          cumulativePnL: Number(cumPnL.toFixed(2)),
          equity: Number(currentEquity.toFixed(2)),
          peak: Number(currentPeak.toFixed(2)),
          drawdownDollars: Number(ddDollars.toFixed(2)),
          drawdownPercent: Number(ddPercent.toFixed(2)),
        });
      }
      return points;
    }

    // Trade-by-trade series
    const points: DataPoint[] = [
      {
        index: 0,
        date: sortedTrades[0]?.date || 'Start',
        tradePnL: 0,
        cumulativePnL: 0,
        equity: initialBalance,
        peak: 0,
        drawdownDollars: 0,
        drawdownPercent: 0,
      },
    ];

    sortedTrades.forEach((t, i) => {
      const pnl = t.pnl || 0;
      cumPnL += pnl;
      currentPeak = Math.max(currentPeak, cumPnL);
      const ddDollars = Math.max(0, currentPeak - cumPnL);
      const currentEquity = initialBalance + cumPnL;
      const peakEquity = initialBalance + currentPeak;
      const ddPercent = peakEquity > 0 ? (ddDollars / peakEquity) * 100 : 0;

      points.push({
        index: i + 1,
        tradeId: t.id,
        date: t.date,
        time: t.exit_time || t.entry_time || undefined,
        symbol: t.symbol,
        direction: t.direction,
        tradePnL: Number(pnl.toFixed(2)),
        cumulativePnL: Number(cumPnL.toFixed(2)),
        equity: Number(currentEquity.toFixed(2)),
        peak: Number(currentPeak.toFixed(2)),
        drawdownDollars: Number(ddDollars.toFixed(2)),
        drawdownPercent: Number(ddPercent.toFixed(2)),
      });
    });

    return points;
  }, [sortedTrades, aggregation, initialBalance]);

  // Overall metrics summary
  const summary = useMemo(() => {
    if (dataPoints.length === 0) {
      return { totalPnL: 0, peakPnL: 0, maxDrawdownDollars: 0, maxDrawdownPercent: 0, currentDrawdownDollars: 0 };
    }
    const last = dataPoints[dataPoints.length - 1];
    let maxDD = 0;
    let maxDDPct = 0;
    for (const p of dataPoints) {
      if (p.drawdownDollars > maxDD) maxDD = p.drawdownDollars;
      if (p.drawdownPercent > maxDDPct) maxDDPct = p.drawdownPercent;
    }
    return {
      totalPnL: last.cumulativePnL,
      peakPnL: last.peak,
      maxDrawdownDollars: maxDD,
      maxDrawdownPercent: maxDDPct,
      currentDrawdownDollars: last.drawdownDollars,
      currentDrawdownPercent: last.drawdownPercent,
    };
  }, [dataPoints]);

  // Chart Dimensions & Bounding Box
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 35, left: 65 };
  const innerWidth = Math.max(chartWidth - padding.left - padding.right, 50);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 50);

  // Y-Scale calculations
  const { minVal, maxVal, zeroY, pointsWithCoords } = useMemo(() => {
    if (dataPoints.length === 0) {
      return { minVal: 0, maxVal: 100, zeroY: height / 2, pointsWithCoords: [] };
    }

    const values = dataPoints.map((p) =>
      viewMode === 'equity' ? p.cumulativePnL : -p.drawdownPercent
    );

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (viewMode === 'equity') {
      // Ensure zero line has breathing room
      min = Math.min(min, 0);
      max = Math.max(max, 0);
      const span = max - min || 100;
      min -= span * 0.08;
      max += span * 0.08;
    } else {
      // Underwater: max is 0%, min is -maxDrawdown%
      max = 0;
      min = Math.min(min, -5);
      const span = Math.abs(min) || 10;
      min -= span * 0.1;
    }

    const scaleX = (idx: number) =>
      padding.left + (idx / Math.max(dataPoints.length - 1, 1)) * innerWidth;

    const scaleY = (val: number) =>
      padding.top + ((max - val) / (max - min || 1)) * innerHeight;

    const zeroCoord = scaleY(0);

    const coords: DataPointWithCoords[] = dataPoints.map((p) => {
      const val = viewMode === 'equity' ? p.cumulativePnL : -p.drawdownPercent;
      return {
        ...p,
        x: scaleX(p.index),
        y: scaleY(val),
      };
    });

    return { minVal: min, maxVal: max, zeroY: zeroCoord, pointsWithCoords: coords };
  }, [dataPoints, viewMode, innerWidth, innerHeight, padding.left, padding.top, height]);

  // Generate SVG paths
  const { linePath, areaPath, hwmPath } = useMemo(() => {
    if (pointsWithCoords.length < 2) {
      return { linePath: '', areaPath: '', hwmPath: '' };
    }

    // Polyline path
    const pathCommands = pointsWithCoords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const line = pathCommands.join(' ');

    // Area closed path to zero baseline
    const firstX = pointsWithCoords[0].x.toFixed(1);
    const lastX = pointsWithCoords[pointsWithCoords.length - 1].x.toFixed(1);
    const safeZeroY = Math.min(Math.max(zeroY, padding.top), height - padding.bottom).toFixed(1);
    const area = `${line} L ${lastX} ${safeZeroY} L ${firstX} ${safeZeroY} Z`;

    // High Water Mark (HWM) peak step line
    let hwm = '';
    if (viewMode === 'equity') {
      const hwmCommands = pointsWithCoords.map((p, idx) => {
        const peakY = padding.top + ((maxVal - p.peak) / (maxVal - minVal || 1)) * innerHeight;
        return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${peakY.toFixed(1)}`;
      });
      hwm = hwmCommands.join(' ');
    }

    return { linePath: line, areaPath: area, hwmPath: hwm };
  }, [pointsWithCoords, zeroY, viewMode, maxVal, minVal, innerHeight, padding.top, padding.bottom, height]);

  // Grid tick marks
  const yTicks = useMemo(() => {
    const ticksCount = 5;
    const step = (maxVal - minVal) / (ticksCount - 1);
    const ticks = [];
    for (let i = 0; i < ticksCount; i++) {
      const val = minVal + i * step;
      const y = padding.top + ((maxVal - val) / (maxVal - minVal || 1)) * innerHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, maxVal, innerHeight, padding.top]);

  // Mouse hover event handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || pointsWithCoords.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closest = pointsWithCoords[0];
    let minDist = Infinity;
    for (const p of pointsWithCoords) {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    setHoveredPoint(closest);
  };

  // Mobile touch event handler
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!containerRef.current || pointsWithCoords.length === 0 || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    let closest = pointsWithCoords[0];
    let minDist = Infinity;
    for (const p of pointsWithCoords) {
      const dist = Math.abs(p.x - touchX);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    setHoveredPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const isNetProfit = summary.totalPnL >= 0;

  return (
    <div className="bg-[#111820] border border-[#26313D] rounded-lg p-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-[#F5F7FA] tracking-wide">
                EQUITY CURVE & DRAWDOWN
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1E2836] text-[#8B98A8]">
                {dataPoints.length > 0 ? `${dataPoints.length - 1} Executions` : 'No Data'}
              </span>
            </div>
            <p className="text-[11px] text-[#8B98A8]">
              Cumulative trajectory • High-water mark • Underwater drawdown tracking
            </p>
          </div>
        </div>

        {/* View Mode & Granularity Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Aggregation Toggle */}
          <div className="flex rounded bg-[#0B0F14] border border-[#26313D] p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setAggregation('trade')}
              className={`px-2 py-0.5 rounded transition-colors ${
                aggregation === 'trade'
                  ? 'bg-[#1E2836] text-[#38BDF8] font-bold'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA]'
              }`}
            >
              Trade-by-Trade
            </button>
            <button
              onClick={() => setAggregation('daily')}
              className={`px-2 py-0.5 rounded transition-colors ${
                aggregation === 'daily'
                  ? 'bg-[#1E2836] text-[#38BDF8] font-bold'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA]'
              }`}
            >
              Daily
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded bg-[#0B0F14] border border-[#26313D] p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('equity')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'equity'
                  ? 'bg-[#1E2836] text-[#22C55E] font-bold'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA]'
              }`}
            >
              Cumulative P&L
            </button>
            <button
              onClick={() => setViewMode('drawdown')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'drawdown'
                  ? 'bg-[#1E2836] text-[#EF4444] font-bold'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA]'
              }`}
            >
              Underwater %
            </button>
          </div>
        </div>
      </div>

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F14] border border-[#26313D] rounded-md p-3">
        <div>
          <div className="text-[10px] font-mono text-[#8B98A8] uppercase">Net Equity Shift</div>
          <div
            className={`text-base font-bold font-mono ${
              isNetProfit ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {formatCurrency(summary.totalPnL)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-[#8B98A8] uppercase">High-Water Mark</div>
          <div className="text-base font-bold font-mono text-[#38BDF8]">
            {formatCurrency(summary.peakPnL)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-[#8B98A8] uppercase">Max Drawdown in Period</div>
          <div className="text-base font-bold font-mono text-[#EF4444]">
            -{formatCurrency(summary.maxDrawdownDollars)} ({summary.maxDrawdownPercent.toFixed(1)}%)
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-[#8B98A8] uppercase">Current Drawdown</div>
          <div className="text-base font-bold font-mono text-[#F5F7FA]">
            {summary.currentDrawdownDollars > 0
              ? `-${formatCurrency(summary.currentDrawdownDollars)} (${summary.currentDrawdownPercent?.toFixed(1)}%)`
              : 'At Peak (0.0%)'}
          </div>
        </div>
      </div>

      {/* SVG Vector Chart Canvas */}
      <div ref={containerRef} className="relative w-full h-[280px] select-none">
        {dataPoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs font-mono text-[#8B98A8]">
            <Activity className="w-8 h-8 mb-2 text-[#26313D]" />
            No closed trades available to construct the equity curve.
          </div>
        ) : (
          <>
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 ${chartWidth} ${height}`}
              className="overflow-visible touch-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchMove}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseLeave}
            >
              <defs>
                {/* Green Gradient for Equity Growth */}
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                </linearGradient>

                {/* Red Gradient for Drawdown */}
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.30" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={tick.y}
                    x2={chartWidth - padding.right}
                    y2={tick.y}
                    stroke="#1E2836"
                    strokeWidth="1"
                    strokeDasharray={tick.val === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={tick.y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="#8B98A8"
                    fontFamily="monospace"
                  >
                    {viewMode === 'equity'
                      ? formatCurrency(tick.val)
                      : `${tick.val.toFixed(1)}%`}
                  </text>
                </g>
              ))}

              {/* Zero Baseline indicator */}
              <line
                x1={padding.left}
                y1={zeroY}
                x2={chartWidth - padding.right}
                y2={zeroY}
                stroke={viewMode === 'equity' ? '#38BDF8' : '#8B98A8'}
                strokeWidth="1.2"
                strokeOpacity="0.5"
              />

              {/* High Water Mark (HWM) Step Line */}
              {viewMode === 'equity' && hwmPath && (
                <path
                  d={hwmPath}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />
              )}

              {/* Area Gradient Fill */}
              <path
                d={areaPath}
                fill={viewMode === 'equity' ? 'url(#equityGradient)' : 'url(#drawdownGradient)'}
              />

              {/* Main Line Stroke */}
              <path
                d={linePath}
                fill="none"
                stroke={viewMode === 'equity' ? '#22C55E' : '#EF4444'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dynamic Interactive Crosshair Line */}
              {hoveredPoint && (
                <g>
                  {/* Vertical Guideline */}
                  <line
                    x1={hoveredPoint.x}
                    y1={padding.top}
                    x2={hoveredPoint.x}
                    y2={height - padding.bottom}
                    stroke="#38BDF8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  {/* Highlighted Data Point Circle */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5"
                    fill="#0B0F14"
                    stroke={viewMode === 'equity' ? '#22C55E' : '#EF4444'}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="2"
                    fill="#F5F7FA"
                  />
                </g>
              )}

              {/* X-Axis Dates / Ticks */}
              {pointsWithCoords.length > 0 && (
                <g>
                  {/* First Date */}
                  <text
                    x={pointsWithCoords[0].x}
                    y={height - 12}
                    textAnchor="start"
                    fontSize="10"
                    fill="#8B98A8"
                    fontFamily="monospace"
                  >
                    {pointsWithCoords[0].date}
                  </text>

                  {/* Mid Date */}
                  {pointsWithCoords.length > 4 && (
                    <text
                      x={pointsWithCoords[Math.floor(pointsWithCoords.length / 2)].x}
                      y={height - 12}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#8B98A8"
                      fontFamily="monospace"
                    >
                      {pointsWithCoords[Math.floor(pointsWithCoords.length / 2)].date}
                    </text>
                  )}

                  {/* Last Date */}
                  <text
                    x={pointsWithCoords[pointsWithCoords.length - 1].x}
                    y={height - 12}
                    textAnchor="end"
                    fontSize="10"
                    fill="#8B98A8"
                    fontFamily="monospace"
                  >
                    {pointsWithCoords[pointsWithCoords.length - 1].date}
                  </text>
                </g>
              )}
            </svg>

            {/* Hover Floating Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-75"
                style={{
                  left: Math.min(
                    Math.max(hoveredPoint.x - 90, 10),
                    chartWidth - 210
                  ),
                  top: Math.max(hoveredPoint.y - 100, 10),
                }}
              >
                <div className="bg-[#0B0F14]/95 border border-[#38BDF8]/40 shadow-xl shadow-black/80 rounded-lg p-2.5 min-w-[190px] text-xs font-mono backdrop-blur-md">
                  {/* Tooltip Header */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#26313D]">
                    <span className="text-[#8B98A8] text-[10px]">
                      {hoveredPoint.date} {hoveredPoint.time || ''}
                    </span>
                    {hoveredPoint.symbol && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          hoveredPoint.direction === 'LONG'
                            ? 'bg-[#22C55E]/15 text-[#22C55E]'
                            : 'bg-[#EF4444]/15 text-[#EF4444]'
                        }`}
                      >
                        {hoveredPoint.symbol} {hoveredPoint.direction}
                      </span>
                    )}
                  </div>

                  {/* Tooltip Metrics */}
                  <div className="space-y-1">
                    {hoveredPoint.index > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#8B98A8]">Trade P&L:</span>
                        <span
                          className={`font-bold ${
                            hoveredPoint.tradePnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          {hoveredPoint.tradePnL >= 0 ? '+' : ''}
                          {formatCurrency(hoveredPoint.tradePnL)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8B98A8]">Cumulative:</span>
                      <span
                        className={`font-bold ${
                          hoveredPoint.cumulativePnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {hoveredPoint.cumulativePnL >= 0 ? '+' : ''}
                        {formatCurrency(hoveredPoint.cumulativePnL)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8B98A8]">Total Equity:</span>
                      <span className="text-[#F5F7FA] font-bold">
                        {formatCurrency(hoveredPoint.equity)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-[#26313D]/60 text-[#8B98A8]">
                      <span>Drawdown from Peak:</span>
                      <span className="text-[#EF4444] font-semibold">
                        -{hoveredPoint.drawdownPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend & Help Note */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#8B98A8] pt-2 border-t border-[#26313D]/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            <span>Cumulative Profit</span>
          </div>
          {viewMode === 'equity' && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-[#38BDF8]" />
              <span>Peak Equity (HWM)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#38BDF8]/60" />
            <span>Baseline ($0.00)</span>
          </div>
        </div>

        <span className="text-[10px] text-[#8B98A8]/70">
          Tip: Hover over any point to inspect individual execution results.
        </span>
      </div>
    </div>
  );
}
