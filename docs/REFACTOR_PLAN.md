# Step-by-Step Refactoring Plan - TradeLab

## 1. Execution Principles
- **No Big-Bang Rewrite**: Iterative, backward-compatible modifications.
- **Data Safety First**: Guarantee zero data loss across cloud sync and storage operations.
- **Commit & Verify**: Run tests, lint, and build verification after each phase before pushing/committing.

---

## 2. Master Phase Roadmap

| Phase | Description | Key Deliverables & Actions |
|---|---|---|
| **Phase 1** | **Audit + Documentation** | Complete codebase analysis, map lifecycles, generate 5 foundational architecture docs. *(Completed)* |
| **Phase 2** | **Data Safety Core** | Eliminate `clearedByUser` cloud deletion vulnerability, isolate demo data structurally (no content string matching), secure `clearAllTrades()`. |
| **Phase 3** | **Sync Architecture** | Implement `SyncService`, user-switching isolation tests, robust Realtime subscription management with proper channel teardown. |
| **Phase 4** | **TradeContext Refactor** | Deconstruct God Context into Repositories (`trade.repository`, `account.repository`, etc.) and specialized Hooks (`useTrades`, `useAccounts`, `useAuth`). |
| **Phase 5** | **Financial Correctness** | Fix account balance fallback bug (use selected account balance), handle zero-loss Profit Factor (`null`/`Infinity`), add multi-asset support. |
| **Phase 6** | **Database Migrations** | Establish versioned `supabase/migrations/` (001 to 009) with `updated_at` triggers and DB constraints. |
| **Phase 7** | **Multi-Tenant Security** | Enhance RLS and add cross-tenant foreign key integrity triggers/checks. Add RLS integration test scenarios. |
| **Phase 8** | **Strategy / Setup / Rules** | Implement hierarchical `Strategy -> Setup -> Rules` model and `trade_rule_results` for Rule Adherence tracking. |
| **Phase 9** | **Mistakes & Psychology** | Normalize mistakes (`mistakes`, `trade_mistakes`), support multi-stage emotions (`before`, `during`, `after`). |
| **Phase 10** | **Trade Timestamps & Timezones** | Add UTC `entry_at`/`exit_at` TIMESTAMPTZ, user timezone preference in profile. |
| **Phase 11** | **Account Model Expansion** | Expand `accounts` with prop firm fields, balance tracking, phase targets, and drawdown limits. |
| **Phase 12** | **Auth Improvements** | Complete auth flows (Password reset, password validation, friendly error mapping, cascade account deletion). |
| **Phase 13** | **Pure Analytics Refactor** | Extract pure analytics functions to `src/lib/analytics/` with 100% test coverage for all edge cases. |
| **Phase 14** | **Insights Engine Refactor** | Fix outlier sample reliability (separate reliability from severity), expand pattern detection. |
| **Phase 15** | **Trade Detail & Planned vs Actual** | Enhance Trade Detail with Planned vs Actual metrics and visual Rule Adherence breakdown. |
| **Phase 16** | **Analysis Lab (Cross-Analysis)** | Implement multi-dimensional pivot analysis (Strategy x Session, Setup x Symbol, etc.). |
| **Phase 17** | **Global Currency / % / R Mode** | Implement persistent `$ / % / R` global display mode switch across all pages. |
| **Phase 18** | **Global Account Filter** | Implement unified account filtering across Dashboard, Journal, Analytics, Calendar, and Insights. |
| **Phase 19** | **Import Wizard Enhancement** | Multi-step import workflow (Upload -> Detect -> Map -> Validate -> Preview -> Import -> Summary) with duplicate/error tracking. |
| **Phase 20** | **Storage & Screenshots** | Integrate Supabase Storage for trade chart attachments (`before`, `during`, `after`). |
| **Phase 21** | **Design System Tokens** | Standardize CSS tokens (`bg-surface`, `text-secondary`, `border-border`) across all components. |
| **Phase 22** | **Internationalization (i18n)** | Implement English and Spanish language switching. |
| **Phase 23** | **Mobile UX & Accessibility** | Responsive card/list views, full keyboard navigation, screen reader accessibility, touch targets. |
| **Phase 24** | **Onboarding & Demo Experience** | First-time user onboarding wizard and air-gapped demo sandbox experience. |
| **Phase 25** | **Production Readiness & Security** | Security audit, GitHub Actions CI workflow, comprehensive README.md, final production verification. |
