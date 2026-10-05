-- ==============================================================================
-- 005_strategy_rules_and_execution.sql
-- Checklist rules per strategy and per-trade rule adherence results
-- ==============================================================================

-- 1. STRATEGY RULES CHECKLIST
CREATE TABLE IF NOT EXISTS public.strategy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('ENTRY', 'CONFIRMATION', 'RISK', 'MANAGEMENT', 'EXIT')),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TRADE RULE ADHERENCE EXECUTION RECORD
CREATE TABLE IF NOT EXISTS public.trade_rule_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.strategy_rules(id) ON DELETE CASCADE,
    followed BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trade_rule UNIQUE (trade_id, rule_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_strategy_rules_user_strat ON public.strategy_rules(user_id, strategy_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trade_rule_results_user_trade ON public.trade_rule_results(user_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_rule_results_rule ON public.trade_rule_results(rule_id);

-- 4. UPDATED_AT TRIGGER ON STRATEGY RULES
DROP TRIGGER IF EXISTS trigger_strategy_rules_updated_at ON public.strategy_rules;
CREATE TRIGGER trigger_strategy_rules_updated_at
    BEFORE UPDATE ON public.strategy_rules
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.strategy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rule_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strategy rules" ON public.strategy_rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own trade rule results" ON public.trade_rule_results
    FOR ALL USING (auth.uid() = user_id);
