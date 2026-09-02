-- ==============================================================================
-- TRADELAB DATABASE SCHEMA WITH FULL ROW LEVEL SECURITY (RLS)
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
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STRATEGIES
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SETUPS
CREATE TABLE IF NOT EXISTS public.setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TAGS
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#38BDF8',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TRADES
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- Date & Times
    date DATE NOT NULL,
    entry_time TIME,
    exit_time TIME,
    
    -- Symbol & Direction & Context
    symbol TEXT NOT NULL,
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
    
    -- Classifications
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    setup_id UUID REFERENCES public.setups(id) ON DELETE SET NULL,
    
    -- Psychology
    emotion TEXT,
    confidence INT CHECK (confidence >= 1 AND confidence <= 10),
    discipline INT CHECK (discipline >= 1 AND discipline <= 10),
    mistake TEXT,
    
    -- Notes
    notes JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRADE_TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.trade_tags (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

-- 8. IMPORTS
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

-- 9. IMPORT_ROWS
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
-- INDEXES FOR HIGH-PERFORMANCE ANALYTICS & QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON public.trades(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user_account ON public.trades(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy ON public.trades(user_id, strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_setup ON public.trades(user_id, setup_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_direction ON public.trades(user_id, direction);
CREATE INDEX IF NOT EXISTS idx_trades_user_result ON public.trades(user_id, result);
CREATE INDEX IF NOT EXISTS idx_trades_user_session ON public.trades(user_id, session);
CREATE INDEX IF NOT EXISTS idx_trades_user_emotion ON public.trades(user_id, emotion);
CREATE INDEX IF NOT EXISTS idx_trades_user_mistake ON public.trades(user_id, mistake);
CREATE INDEX IF NOT EXISTS idx_import_rows_import ON public.import_rows(import_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view & update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Accounts
CREATE POLICY "Users can view own accounts" ON public.accounts
    FOR ALL USING (auth.uid() = user_id);

-- Strategies
CREATE POLICY "Users can view and manage own strategies" ON public.strategies
    FOR ALL USING (auth.uid() = user_id);

-- Setups
CREATE POLICY "Users can view and manage own setups" ON public.setups
    FOR ALL USING (auth.uid() = user_id);

-- Tags
CREATE POLICY "Users can view and manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

-- Trades
CREATE POLICY "Users can manage own trades" ON public.trades
    FOR ALL USING (auth.uid() = user_id);

-- Trade Tags
CREATE POLICY "Users can manage trade tags for own trades" ON public.trade_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trades
            WHERE public.trades.id = trade_tags.trade_id
            AND public.trades.user_id = auth.uid()
        )
    );

-- Imports
CREATE POLICY "Users can manage own imports" ON public.imports
    FOR ALL USING (auth.uid() = user_id);

-- Import Rows
CREATE POLICY "Users can manage import rows for own imports" ON public.import_rows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.imports
            WHERE public.imports.id = import_rows.import_id
            AND public.imports.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    
    -- Create default account for new user
    INSERT INTO public.accounts (user_id, name, is_default, initial_balance, currency)
    VALUES (new.id, 'Main Account', TRUE, 10000.00, 'USD');

    -- Seed standard default setups
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
