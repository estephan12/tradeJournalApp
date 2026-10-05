-- ==============================================================================
-- 006_mistakes_and_psychology.sql
-- Normalized mistakes entity, junction table, and multi-stage emotional lifecycle
-- ==============================================================================

-- 1. NORMALIZED MISTAKES TABLE
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_mistake_name UNIQUE (user_id, name)
);

-- 2. TRADE MISTAKES (MANY-TO-MANY RELATIONSHIP)
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    mistake_id UUID NOT NULL REFERENCES public.mistakes(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, mistake_id)
);

-- 3. EXPAND TRADES WITH MULTI-STAGE PSYCHOLOGICAL LIFECYCLE
ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS emotion_before TEXT,
    ADD COLUMN IF NOT EXISTS emotion_during TEXT,
    ADD COLUMN IF NOT EXISTS emotion_after TEXT;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_mistake ON public.trade_mistakes(mistake_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_emotions ON public.trades(user_id, emotion_before, emotion_after);

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mistakes" ON public.mistakes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage trade mistakes for own trades" ON public.trade_mistakes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trades
            WHERE public.trades.id = trade_mistakes.trade_id
            AND public.trades.user_id = auth.uid()
        )
    );
