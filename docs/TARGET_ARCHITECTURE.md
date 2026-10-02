# Target Architecture - TradeLab Production Ready

## 1. Architectural Vision

TradeLab will transition from a single monolithic God-Context into a **Layered Clean Architecture** where:
1. **Data Safety is absolute**: Supabase is the canonical source of truth for authenticated users, Local Repository for anonymous users.
2. **Demo data is isolated by design**: Isolated storage space, with zero risk of leakages or content-string heuristic detection.
3. **Repository & Service Pattern**: UI is decoupled from storage, database, and sync mechanisms.
4. **Pure Financial & Analytical Domain**: Pure, testable functions for all financial metrics and analytics.

---

## 2. Layered Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│   Next.js App Router (Pages, UI Components, Modals, Drawers, Widgets)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Uses Custom Hooks
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            STATE / HOOKS                                │
│   useTrades, useAccounts, useStrategies, useAnalytics, useSyncStatus    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Calls Services
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                │
│   SyncService, AnalyticsService, DemoService, ImportService, AuthService│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Calls Repositories
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORY LAYER                              │
│   TradeRepository, AccountRepository, StrategyRepository, TagRepository │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │ (Authenticated)                   │ (Anonymous / Demo)
                   ▼                                   ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────┐
│           Supabase Client            │ │         LocalStorage /         │
│   PostgreSQL + RLS + Realtime        │ │      IndexedDB Cache           │
└──────────────────────────────────────┘ └────────────────────────────────┘
```

---

## 3. Directory Layout Target

```text
src/
├── app/                              # Next.js App Router (Thin views)
├── components/                       # Presentational UI components (Design Tokens)
│   ├── ui/                           # Base design system (Button, Card, Input, Modal, Badge)
│   ├── dashboard/                    # Dashboard widgets
│   ├── journal/                      # Trade table, detail, planned vs actual
│   ├── analytics/                    # Equity curves, breakdowns, analysis lab
│   ├── calendar/                     # Monthly calendar
│   └── import/                       # Multi-step import wizard
├── repositories/                     # Data access abstraction
│   ├── trade.repository.ts
│   ├── account.repository.ts
│   ├── strategy.repository.ts
│   ├── setup.repository.ts
│   ├── tag.repository.ts
│   └── auth.repository.ts
├── services/                         # Business logic & workflows
│   ├── sync.service.ts
│   ├── analytics.service.ts
│   ├── demo.service.ts
│   ├── import.service.ts
│   └── auth.service.ts
├── hooks/                            # Modular React hooks
│   ├── useTrades.ts
│   ├── useAccounts.ts
│   ├── useAnalytics.ts
│   ├── useAuth.ts
│   └── useSyncStatus.ts
├── lib/                              # Pure utilities & domain logic
│   ├── calculations/                 # Financial calculation engines
│   ├── analytics/                    # Breakdowns, drawdowns, cross-analysis
│   ├── insights/                     # Evidence-based insight engine
│   └── supabase/                     # Supabase client & server wrappers
├── types/                            # Normalized TypeScript schemas
│   ├── trade.ts
│   ├── account.ts
│   ├── strategy.ts
│   ├── analytics.ts
│   └── database.ts
└── supabase/
    └── migrations/                   # Sequential versioned SQL migrations
```

---

## 4. Key Architectural Guarantees

1. **Deterministic Isolation**: Demo mode uses an in-memory or distinct local demo sandbox. No demo trade ever touches Supabase.
2. **Explicit User Intent for Deletions**: Deletions only occur upon explicit user actions. No localStorage flag can ever automatically purge cloud records.
3. **Session Cleansing**: Switching users immediately destroys all cached state, listeners, and subscriptions, preventing data contamination.
4. **Strict RLS Multi-Tenant Integrity**: Enforce foreign-key ownership via composite policies or triggers to prevent cross-user referencing.
5. **Robust Realtime Synchronization**: Scoped channel subscriptions with deduplication keys and proper lifecycle disposal.
