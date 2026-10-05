-- ==============================================================================
-- TRADELAB CUMULATIVE DATABASE SCHEMA (PRODUCTION-READY)
-- Comprehensive Schema with Multi-Asset, Hierarchical Playbooks,
-- Rule Adherence, Prop Firm Expansion, RLS, and Cross-Tenant Integrity Triggers
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    broker TEXT,
    account_type TEXT NOT NULL DEFAULT 'personal' 
        CHECK (account_type IN ('personal', 'broker', 'prop_firm', 'crypto', 'demo')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_prop_firm BOOLEAN NOT NULL DEFAULT FALSE,
    prop_firm_name TEXT,
    phase TEXT,
    profit_target NUMERIC(15, 2),
    daily_loss_limit NUMERIC(15, 2),
    max_loss_limit NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'passed', 'failed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STRATEGIES
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    market TEXT,
    preferred_session TEXT,
    preferred_timeframe TEXT,
    risk_rules TEXT,
    management_rules TEXT,
    exit_rules TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SETUPS (Linked to Strategy)
CREATE TABLE IF NOT EXISTS public.setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    entry_criteria TEXT,
    confirmation_rules TEXT,
    invalidation_rules TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. STRATEGY RULES (Checklist)
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

-- 6. TAGS
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#38BDF8',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. NORMALIZED MISTAKES
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_mistake_name UNIQUE (user_id, name)
);

-- 8. TRADES (Multi-Asset & Multi-Timeline Execution)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- Canonical Timestamps & Status
    status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    date DATE NOT NULL,
    entry_time TIME,
    exit_time TIME,
    entry_at TIMESTAMPTZ,
    exit_at TIMESTAMPTZ,
    
    -- Instrument & Asset Class
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'crypto' 
        CHECK (asset_class IN ('stocks', 'crypto', 'forex', 'futures', 'options', 'indices', 'cfd', 'other')),
    contract_multiplier NUMERIC(12, 4) NOT NULL DEFAULT 1.0,
    tick_size NUMERIC(18, 6),
    tick_value NUMERIC(18, 6),
    
    -- Direction & Context
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    timeframe TEXT,
    session TEXT,
    
    -- Execution
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    position_size NUMERIC(18, 6) NOT NULL,
    
    -- Risk & Cost
    risk_amount NUMERIC(15, 2),
    risk_percent NUMERIC(8, 4),
    commission NUMERIC(15, 2) DEFAULT 0.00,
    swap NUMERIC(15, 2) DEFAULT 0.00,
    
    -- Derived / Performance
    pnl NUMERIC(15, 2),
    pnl_percent NUMERIC(10, 4),
    r_multiple NUMERIC(10, 4),
    result TEXT CHECK (result IN ('WIN', 'LOSS', 'BREAKEVEN')),
    
    -- Playbook Classifications
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    setup_id UUID REFERENCES public.setups(id) ON DELETE SET NULL,
    
    -- Psychological Lifecycle & Legacy Mistakes
    emotion TEXT,
    emotion_before TEXT,
    emotion_during TEXT,
    emotion_after TEXT,
    confidence INT CHECK (confidence >= 1 AND confidence <= 10),
    discipline INT CHECK (discipline >= 1 AND discipline <= 10),
    mistake TEXT,
    
    -- Notes & Metadata
    notes JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TRADE RULE RESULTS (Rule Adherence)
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

-- 10. TRADE_TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.trade_tags (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

-- 11. TRADE_MISTAKES (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    mistake_id UUID NOT NULL REFERENCES public.mistakes(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, mistake_id)
);

-- 12. IMPORTS
CREATE TABLE IF NOT EXISTS public.imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    total_rows INT NOT NULL DEFAULT 0,
    successful_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. IMPORT_ROWS
CREATE TABLE IF NOT EXISTS public.import_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
    raw_data JSONB,
    parsed_data JSONB,
    confidence NUMERIC(5, 4) DEFAULT 1.0000,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'duplicate', 'error', 'imported')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON public.trades(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user_asset_class ON public.trades(user_id, asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_user_account ON public.trades(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy ON public.trades(user_id, strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_setup ON public.trades(user_id, setup_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_direction ON public.trades(user_id, direction);
CREATE INDEX IF NOT EXISTS idx_trades_user_result ON public.trades(user_id, result);
CREATE INDEX IF NOT EXISTS idx_trades_user_session ON public.trades(user_id, session);
CREATE INDEX IF NOT EXISTS idx_trades_user_emotion ON public.trades(user_id, emotion);
CREATE INDEX IF NOT EXISTS idx_trades_user_mistake ON public.trades(user_id, mistake);
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_at ON public.trades(user_id, entry_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user_type_status ON public.accounts(user_id, account_type, status);
CREATE INDEX IF NOT EXISTS idx_setups_user_strategy ON public.setups(user_id, strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_active ON public.strategies(user_id, active);
CREATE INDEX IF NOT EXISTS idx_strategy_rules_user_strat ON public.strategy_rules(user_id, strategy_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trade_rule_results_user_trade ON public.trade_rule_results(user_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_mistake ON public.trade_mistakes(mistake_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_import ON public.import_rows(import_id);

-- ==============================================================================
-- UPDATED_AT TRIGGER FUNCTION & TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS trigger_strategy_rules_updated_at ON public.strategy_rules;
CREATE TRIGGER trigger_strategy_rules_updated_at
    BEFORE UPDATE ON public.strategy_rules
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tags_updated_at ON public.tags;
CREATE TRIGGER trigger_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_trades_updated_at ON public.trades;
CREATE TRIGGER trigger_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==============================================================================
-- CROSS-TENANT INTEGRITY TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_trade_cross_tenant_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Account % does not belong to user %', NEW.account_id, NEW.user_id;
        END IF;
    END IF;

    IF NEW.strategy_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.strategies WHERE id = NEW.strategy_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Strategy % does not belong to user %', NEW.strategy_id, NEW.user_id;
        END IF;
    END IF;

    IF NEW.setup_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.setups WHERE id = NEW.setup_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Setup % does not belong to user %', NEW.setup_id, NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trades_cross_tenant ON public.trades;
CREATE TRIGGER trigger_trades_cross_tenant
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW EXECUTE PROCEDURE public.check_trade_cross_tenant_integrity();

CREATE OR REPLACE FUNCTION public.check_setup_strategy_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.strategy_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.strategies WHERE id = NEW.strategy_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Strategy % does not belong to user %', NEW.strategy_id, NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_setups_cross_tenant ON public.setups;
CREATE TRIGGER trigger_setups_cross_tenant
    BEFORE INSERT OR UPDATE ON public.setups
    FOR EACH ROW EXECUTE PROCEDURE public.check_setup_strategy_integrity();

CREATE OR REPLACE FUNCTION public.check_trade_tag_cross_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
    trade_owner UUID;
    tag_owner UUID;
BEGIN
    SELECT user_id INTO trade_owner FROM public.trades WHERE id = NEW.trade_id;
    SELECT user_id INTO tag_owner FROM public.tags WHERE id = NEW.tag_id;

    IF trade_owner IS NULL OR tag_owner IS NULL OR trade_owner != tag_owner THEN
        RAISE EXCEPTION 'Cross-tenant violation: Trade % and Tag % belong to different users', NEW.trade_id, NEW.tag_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trade_tags_cross_tenant ON public.trade_tags;
CREATE TRIGGER trigger_trade_tags_cross_tenant
    BEFORE INSERT OR UPDATE ON public.trade_tags
    FOR EACH ROW EXECUTE PROCEDURE public.check_trade_tag_cross_tenant_integrity();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own strategies" ON public.strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own setups" ON public.setups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own strategy rules" ON public.strategy_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own mistakes" ON public.mistakes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own trade rule results" ON public.trade_rule_results FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage trade tags for own trades" ON public.trade_tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.trades WHERE public.trades.id = trade_tags.trade_id AND public.trades.user_id = auth.uid())
    );

CREATE POLICY "Users can manage trade mistakes for own trades" ON public.trade_mistakes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.trades WHERE public.trades.id = trade_mistakes.trade_id AND public.trades.user_id = auth.uid())
    );

CREATE POLICY "Users can manage own imports" ON public.imports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage import rows for own imports" ON public.import_rows
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.imports WHERE public.imports.id = import_rows.import_id AND public.imports.user_id = auth.uid())
    );

-- ==============================================================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    
    INSERT INTO public.accounts (user_id, name, is_default, initial_balance, current_balance, currency)
    VALUES (new.id, 'Main Account', TRUE, 10000.00, 10000.00, 'USD');

    INSERT INTO public.setups (user_id, name, description) VALUES
    (new.id, 'Breakout', 'Range or consolidation breakout'),
    (new.id, 'Breakout + Retest', 'Breakout followed by retest of key level'),
    (new.id, 'Liquidity Sweep', 'Sweep of swing high/low liquidity into order block'),
    (new.id, 'Momentum', 'High momentum impulse with trend continuation'),
    (new.id, 'Pullback', 'Fibonacci or dynamic MA pullback in trend'),
    (new.id, 'Trend Continuation', 'Continuation signal in established trend'),
    (new.id, 'Reversal', 'Mean reversion or macro key reversal level');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
