-- ==============================================================================
-- 002_updated_at_triggers_and_timestamps.sql
-- Reusable updated_at trigger, canonical timestamps, and trade status
-- ==============================================================================

-- 1. REUSABLE UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ENSURE UPDATED_AT COLUMNS EXIST ACROSS ENTITIES
ALTER TABLE public.strategies 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.setups 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.tags 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. ATTACH AUTOMATIC UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_strategies_updated_at ON public.strategies;
CREATE TRIGGER trigger_strategies_updated_at
    BEFORE UPDATE ON public.strategies
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_setups_updated_at ON public.setups;
CREATE TRIGGER trigger_setups_updated_at
    BEFORE UPDATE ON public.setups
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tags_updated_at ON public.tags;
CREATE TRIGGER trigger_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_trades_updated_at ON public.trades;
CREATE TRIGGER trigger_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. CANONICAL TIMESTAMPTZ AND TRADE STATUS ON TRADES
ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS entry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS exit_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'));

-- 5. PERFORMANCE INDEXES FOR TIMESTAMPS AND STATUS
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_at ON public.trades(user_id, entry_at DESC);
