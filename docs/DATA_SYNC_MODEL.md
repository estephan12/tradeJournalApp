# Data Synchronization & Lifecycle Model

## 1. Core Principles

1. **Authenticated Users**: **Supabase PostgreSQL** is the **Canonical Source of Truth**.
2. **Anonymous Users**: **Local Storage** is the **Canonical Source of Truth**.
3. **Demo Mode**: **In-Memory / Isolated Demo Store** is the **Source of Truth** (strictly air-gapped from cloud).
4. **Data Safety Principle**: Local cache is **read-only / reactive mirror** for authenticated users; it NEVER executes destructive operations on the cloud unless explicitly triggered by a user in the UI.

---

## 2. Sync Lifecycle Matrix

| User State | Primary Store | Secondary Store | On Login | On Logout | On Realtime Event |
|---|---|---|---|---|---|
| **Anonymous** | LocalStorage | Memory | Migrates to Cloud if explicit or empty | N/A | N/A |
| **Authenticated** | Supabase DB | React State + Cache | Fetch canonical DB data | Wipe all memory/cache, reset to Anonymous/Demo | Patch state via deduplicated ID |
| **Demo Mode** | Demo Memory Store | Demo Cache | N/A | N/A | Disconnected |

---

## 3. Detailed Data Flows

### A. Authenticated Read Flow
```text
[User Opens App]
      │
      ▼
[Check Supabase Session] ── (Valid User) ──► [Query Supabase Tables]
                                                    │
                                                    ▼
                                           [Populate In-Memory State]
                                                    │
                                                    ▼
                                           [Update Read-Only Cache]
```

### B. Authenticated Write Flow (Create / Update)
```text
[User Submits Trade]
      │
      ▼
[Validate Domain Model (Zod/TS)]
      │
      ▼
[Execute Mutation in Supabase] ── (Success) ──► [Update Local State with DB UUID]
      │                                                │
      ▼ (Failure)                                      ▼
[Display User-Friendly Error]                  [Update Read-Only Cache]
```

### C. Authenticated Delete Flow (Explicit Delete / Clear All)
```text
[User Triggers 'Delete' / 'Clear All']
      │
      ▼
[Show Explicit Confirmation Modal]
      │
      ▼ (Confirmed)
[Delete from Supabase WHERE user_id = auth.uid()]
      │
      ▼ (Success)
[Remove from Local State & Clear Cache]
      │
      ▼ (Failure)
[Retain Local State + Show Error Toast]
```

### D. User Switching Safeguard
```text
[User A Session Active]
      │
      ▼
[User Clicks 'Sign Out']
      │
      ▼
[1. Unsubscribe Supabase Realtime Channels]
[2. Wipe In-Memory Trades, Accounts, Strategies, Tags]
[3. Clear Local User Storage Keys]
[4. Sign Out Supabase Auth]
      │
      ▼
[User B Logs In]
      │
      ▼
[Load ONLY User B Data from Supabase]
```

---

## 4. Realtime Subscription Protocol

- **Channel Identifier**: Scoped by user UUID: `realtime:trades:${userId}`.
- **Debouncing & Deduplication**:
  - In-flight mutations initiated locally skip realtime re-fetches using an optimistic mutation lock or revision ID.
  - Remote modifications trigger targeted row merge rather than full re-fetching where possible.
- **Disposal**: Subscriptions are terminated and removed on component unmount and `SIGNED_OUT` auth events.
