-- ==============================================================================
-- 007_account_model_expansion.sql
-- Prop firm accounts, drawdown rules, balance semantics, and target tracking
-- ==============================================================================

-- 1. EXPAND ACCOUNTS TABLE
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS broker TEXT,
    ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal'
        CHECK (account_type IN ('personal', 'broker', 'prop_firm', 'crypto', 'demo')),
    ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS is_prop_firm BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prop_firm_name TEXT,
    ADD COLUMN IF NOT EXISTS phase TEXT,
    ADD COLUMN IF NOT EXISTS profit_target NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS daily_loss_limit NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS max_loss_limit NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'passed', 'failed', 'archived'));

-- 2. INITIALIZE CURRENT_BALANCE DEFAULTS
UPDATE public.accounts
SET current_balance = initial_balance
WHERE current_balance IS NULL;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_accounts_user_type_status ON public.accounts(user_id, account_type, status);
