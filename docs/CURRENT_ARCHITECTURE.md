# Current Architecture Audit - TradeLab

## 1. Overview
TradeLab is a high-performance web trading journal and analytics platform built with **Next.js 16 (Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Supabase (PostgreSQL + RLS + Realtime + Auth)**.

---

## 2. Component & Directory Structure

```text
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout wrapping TradeProvider & TerminalLayout
│   ├── page.tsx              # Dashboard (KPIs, Equity Curve, Strengths/Weaknesses)
│   ├── accounts/             # Trading accounts management
│   ├── analytics/            # Performance analytics & metrics
│   ├── api/extract-trades/   # Server route for Gemini & OpenAI AI extraction
│   ├── calendar/             # Monthly trading calendar & daily PnL
│   ├── import/               # CSV/XLSX file upload & column mapper
│   ├── insights/             # Statistical edge & behavioral insights engine
│   ├── journal/              # Interactive trade log table & filters
│   ├── login/                # Auth login/signup modal & form
│   ├── settings/             # User preferences & API key config
│   ├── strategies/           # Strategy & setup management
│   └── tags/                 # Tag library & color badges
├── components/               # Modular UI components
│   ├── calendar/             # TradeCalendar widget
│   ├── dashboard/            # KPI cards, Equity curve chart, Date selector
│   ├── import/               # Import wizard flow and modal
│   ├── journal/              # Add trade modal, Filters, Data table, Detail drawer
│   └── layout/               # Sidebar, Header, Mobile bottom nav, Terminal layout
├── context/
│   └── trade-context.tsx     # Monolithic God-Context (1444 lines) managing everything
├── lib/
│   ├── calculations.ts       # PnL, R-Multiple, Expectancy, Profit Factor, Drawdown
│   ├── demo-data.ts          # Mock trades (BTC, EUR, GBP, USDJPY, XAU) & entities
│   ├── insights-engine.ts    # Evidence-first pattern recognition engine
│   ├── utils.ts              # Currency, percentage, and date formatters
│   ├── import/csv-detector.ts# Auto-detection of CSV headers & brokers (TradingView, MT4/5)
│   └── supabase/             # Client & server Supabase client initializers
└── types/
    └── trade.ts              # TypeScript domain types & interfaces
```

---

## 3. Current Source of Truth & Data Flow

```text
                           ┌───────────────────────────────┐
                           │      User Interaction         │
                           └───────────────┬───────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │     TradeProvider Context     │
                           │   (React State in Memory)     │
                           └───────┬───────────────┬───────┘
                                   │               │
                 (Authenticated)   │               │   (Anonymous)
                                   ▼               ▼
                      ┌─────────────────┐    ┌─────────────────┐
                      │    Supabase     │    │  localStorage   │
                      │   (PostgreSQL)  │    │  (Single Key)   │
                      └────────┬────────┘    └─────────────────┘
                               │ (Realtime Sub)
                               ▼
                      ┌─────────────────┐
                      │ Local React     │
                      │ State Update    │
                      └─────────────────┘
```

---

## 4. Current State Management & "God Context" Analysis

`src/context/trade-context.tsx` currently holds 26 pieces of state and operations in a single file:
1. **Trade CRUD**: `addTrade`, `updateTrade`, `deleteTrade`, `clearAllTrades`
2. **Account CRUD**: `addAccount`, `deleteAccount`, `setDefaultAccount`
3. **Classification CRUD**: `addSetup`, `addStrategy`, `addTag`
4. **Filtering & Search**: `filters`, `setFilters`, `resetFilters`, `searchQuery`, `filteredTrades` (memoized)
5. **UI Modals**: `selectedTradeForDetail`, `isAddTradeModalOpen`, `isImportModalOpen`
6. **Authentication & Session**: `user`, `signOut`
7. **Cloud Synchronization**: `syncStatus`, `syncError`, `syncWithCloud`, `loadSupabaseData`
8. **Realtime Engine**: PostgreSQL table changes subscription with debounce
9. **Import/Export**: `importTrades`, `exportTradesToJson`, `importTradesFromJson`
10. **Demo Mode**: `isDemoMode`, `resetToDemoData`

---

## 5. Identified Vulnerabilities & Technical Debt

### 🔴 Critical Issues
1. **Destructive LocalStorage Flag (`clearedByUser`)**:
   - `localStorage` flag `clearedByUser: true` can trigger automatic deletion of real cloud records in Supabase upon logging in.
2. **Demo Detection by Content String**:
   - Demo trades are identified by substring matches on `tradeThesis` and `lesson` in `isDemoTrade()`. If a real user writes a similar note, their trade is treated as a demo trade and purged.
3. **Account Balance Fallback in Calculations**:
   - `calculateRiskPercent` and `computeDerivedFields` default to `10000` account balance if not explicitly provided, calculating inaccurate financial risk percentages.
4. **Profit Factor Representation on Zero Losses**:
   - Hardcoded to `99.99` instead of handling `Infinity` or `null` gracefully in calculation domain and UI layer.
5. **Cross-Tenant Entity Coupling Risk**:
   - RLS policies allow a user's trade to reference another user's `account_id` or `strategy_id` if a valid UUID is passed.

### 🟡 High / Medium Issues
1. **Outlier Sample Reliability**:
   - In `src/lib/insights-engine.ts`, single-trade outliers set `sampleSize: 1` with `reliability: 'reliable'`. Reliability and Severity are conflated.
2. **Single Singular `mistake` & `emotion`**:
   - `trade.mistake` is a single string enum, preventing multiple mistakes per trade (e.g. FOMO + Moved Stop).
   - Only `emotion` is supported rather than tracking psychology across the trade lifecycle (`emotion_before`, `emotion_during`, `emotion_after`).
3. **Absence of Versioned Migrations**:
   - Database schema exists only as a single `supabase/schema.sql` file rather than incremental, reversible SQL migration scripts in `supabase/migrations/`.
4. **Lack of Pure Analytics Module**:
   - Portions of analytics and calculations are coupled directly to page components.
5. **God Context Monolith**:
   - Every state change triggers top-level context re-renders across the entire application.
