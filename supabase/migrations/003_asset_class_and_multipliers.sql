-- ==============================================================================
-- 003_asset_class_and_multipliers.sql
-- Native multi-asset fields, multipliers, tick specifications, and vocabulary constraints
-- ==============================================================================

-- 1. ADD MULTI-ASSET ATTRIBUTES TO TRADES
ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS asset_class TEXT NOT NULL DEFAULT 'crypto'
        CHECK (asset_class IN ('stocks', 'crypto', 'forex', 'futures', 'options', 'indices', 'cfd', 'other')),
    ADD COLUMN IF NOT EXISTS contract_multiplier NUMERIC(12, 4) NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS tick_size NUMERIC(18, 6),
    ADD COLUMN IF NOT EXISTS tick_value NUMERIC(18, 6);

-- 2. BACKFILL FROM JSONB NOTES IF PREVIOUSLY STORED IN TEMPORARY DTO
UPDATE public.trades
SET 
    asset_class = CASE 
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('stock', 'stocks', 'equity', 'equities', 'shares') THEN 'stocks'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('crypto', 'cryptocurrency', 'cryptos') THEN 'crypto'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('forex', 'fx', 'currency', 'currencies') THEN 'forex'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('future', 'futures', 'futs') THEN 'futures'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('option', 'options', 'opts') THEN 'options'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('index', 'indices', 'indicies') THEN 'indices'
        WHEN LOWER(TRIM(notes->>'asset_class')) IN ('cfd', 'cfds') THEN 'cfd'
        WHEN notes->>'asset_class' IS NOT NULL AND TRIM(notes->>'asset_class') != '' THEN 'other'
        ELSE asset_class
    END,
    contract_multiplier = COALESCE(NULLIF(notes->>'contract_multiplier', '')::numeric, contract_multiplier),
    tick_size = COALESCE(NULLIF(notes->>'tick_size', '')::numeric, tick_size),
    tick_value = COALESCE(NULLIF(notes->>'tick_value', '')::numeric, tick_value)
WHERE notes IS NOT NULL AND notes != '{}'::jsonb;

-- 3. INDEX FOR ASSET CLASS ANALYTICS
CREATE INDEX IF NOT EXISTS idx_trades_user_asset_class ON public.trades(user_id, asset_class);
