-- ==============================================================================
-- 004_strategy_setup_relationship.sql
-- Hierarchical Strategy -> Setup relationship and playbook criteria fields
-- ==============================================================================

-- 1. EXPAND STRATEGIES WITH EXECUTION GUIDELINES
ALTER TABLE public.strategies
    ADD COLUMN IF NOT EXISTS market TEXT,
    ADD COLUMN IF NOT EXISTS preferred_session TEXT,
    ADD COLUMN IF NOT EXISTS preferred_timeframe TEXT,
    ADD COLUMN IF NOT EXISTS risk_rules TEXT,
    ADD COLUMN IF NOT EXISTS management_rules TEXT,
    ADD COLUMN IF NOT EXISTS exit_rules TEXT,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. LINK SETUPS TO STRATEGIES AND EXPAND CRITERIA FIELDS
ALTER TABLE public.setups
    ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS entry_criteria TEXT,
    ADD COLUMN IF NOT EXISTS confirmation_rules TEXT,
    ADD COLUMN IF NOT EXISTS invalidation_rules TEXT;

-- 3. INDEX FOR FAST LOOKUPS BY STRATEGY
CREATE INDEX IF NOT EXISTS idx_setups_user_strategy ON public.setups(user_id, strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_active ON public.strategies(user_id, active);
