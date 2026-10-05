-- ==============================================================================
-- 008_multi_tenant_integrity_triggers.sql
-- Ironclad database triggers preventing cross-tenant foreign reference tampering
-- ==============================================================================

-- 1. TRADE CROSS-TENANT INTEGRITY (Account, Strategy, Setup)
CREATE OR REPLACE FUNCTION public.check_trade_cross_tenant_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate Account belongs to same user
    IF NEW.account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = NEW.account_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Account % does not belong to user %', NEW.account_id, NEW.user_id;
        END IF;
    END IF;

    -- Validate Strategy belongs to same user
    IF NEW.strategy_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.strategies 
            WHERE id = NEW.strategy_id AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Strategy % does not belong to user %', NEW.strategy_id, NEW.user_id;
        END IF;
    END IF;

    -- Validate Setup belongs to same user
    IF NEW.setup_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.setups 
            WHERE id = NEW.setup_id AND user_id = NEW.user_id
        ) THEN
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

-- 2. SETUP STRATEGY INTEGRITY
CREATE OR REPLACE FUNCTION public.check_setup_strategy_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.strategy_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.strategies 
            WHERE id = NEW.strategy_id AND user_id = NEW.user_id
        ) THEN
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

-- 3. TRADE TAGS INTEGRITY
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

-- 4. STRATEGY RULES INTEGRITY
CREATE OR REPLACE FUNCTION public.check_strategy_rule_cross_tenant_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.strategies 
        WHERE id = NEW.strategy_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Cross-tenant violation: Strategy % does not belong to user %', NEW.strategy_id, NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_strategy_rules_cross_tenant ON public.strategy_rules;
CREATE TRIGGER trigger_strategy_rules_cross_tenant
    BEFORE INSERT OR UPDATE ON public.strategy_rules
    FOR EACH ROW EXECUTE PROCEDURE public.check_strategy_rule_cross_tenant_integrity();

-- 5. TRADE RULE RESULTS INTEGRITY
CREATE OR REPLACE FUNCTION public.check_trade_rule_result_cross_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
    trade_owner UUID;
    rule_owner UUID;
BEGIN
    SELECT user_id INTO trade_owner FROM public.trades WHERE id = NEW.trade_id;
    SELECT user_id INTO rule_owner FROM public.strategy_rules WHERE id = NEW.rule_id;

    IF trade_owner IS NULL OR rule_owner IS NULL OR trade_owner != NEW.user_id OR rule_owner != NEW.user_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: Trade % and Rule % do not match authenticated user %', NEW.trade_id, NEW.rule_id, NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trade_rule_results_cross_tenant ON public.trade_rule_results;
CREATE TRIGGER trigger_trade_rule_results_cross_tenant
    BEFORE INSERT OR UPDATE ON public.trade_rule_results
    FOR EACH ROW EXECUTE PROCEDURE public.check_trade_rule_result_cross_tenant_integrity();
