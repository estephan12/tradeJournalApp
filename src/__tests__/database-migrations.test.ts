import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseSupabaseTrade, tradeToSupabasePayload } from '../lib/trades/trade-mappers';
import { Trade } from '../types/trade';

describe('Phase 6 Database Migrations & Product Model', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');

  it('contains all required sequential migration files in supabase/migrations/', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs.readdirSync(migrationsDir).sort();

    const expectedFiles = [
      '001_initial_schema.sql',
      '002_updated_at_triggers_and_timestamps.sql',
      '003_asset_class_and_multipliers.sql',
      '004_strategy_setup_relationship.sql',
      '005_strategy_rules_and_execution.sql',
      '006_mistakes_and_psychology.sql',
      '007_account_model_expansion.sql',
      '008_multi_tenant_integrity_triggers.sql',
    ];

    expect(files).toEqual(expectedFiles);
  });

  it('validates 001_initial_schema.sql contains baseline entities and RLS policies', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '001_initial_schema.sql'), 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.profiles');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.accounts');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.strategies');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.setups');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.tags');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.trades');
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('auth.uid() = user_id');
  });

  it('validates 002_updated_at_triggers_and_timestamps.sql defines reusable trigger and timestamps', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '002_updated_at_triggers_and_timestamps.sql'), 'utf-8');
    expect(content).toContain('FUNCTION public.handle_updated_at()');
    expect(content).toContain('entry_at TIMESTAMPTZ');
    expect(content).toContain('exit_at TIMESTAMPTZ');
    expect(content).toContain("CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))");
  });

  it('validates 003_asset_class_and_multipliers.sql enforces canonical vocabulary and multiplier defaults', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '003_asset_class_and_multipliers.sql'), 'utf-8');
    expect(content).toContain('asset_class TEXT');
    expect(content).toContain("CHECK (asset_class IN ('stocks', 'crypto', 'forex', 'futures', 'options', 'indices', 'cfd', 'other'))");
    expect(content).toContain('contract_multiplier NUMERIC');
    expect(content).toContain('tick_size NUMERIC');
    expect(content).toContain('tick_value NUMERIC');
  });

  it('validates 004_strategy_setup_relationship.sql establishes Strategy -> Setup hierarchy and playbook fields', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '004_strategy_setup_relationship.sql'), 'utf-8');
    expect(content).toContain('strategy_id UUID REFERENCES public.strategies(id)');
    expect(content).toContain('entry_criteria TEXT');
    expect(content).toContain('confirmation_rules TEXT');
    expect(content).toContain('invalidation_rules TEXT');
    expect(content).toContain('preferred_session TEXT');
    expect(content).toContain('preferred_timeframe TEXT');
  });

  it('validates 005_strategy_rules_and_execution.sql defines checklist rules and trade adherence results', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '005_strategy_rules_and_execution.sql'), 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.strategy_rules');
    expect(content).toContain("CHECK (rule_type IN ('ENTRY', 'CONFIRMATION', 'RISK', 'MANAGEMENT', 'EXIT'))");
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.trade_rule_results');
    expect(content).toContain('followed BOOLEAN NOT NULL DEFAULT TRUE');
  });

  it('validates 006_mistakes_and_psychology.sql establishes normalized mistakes and multi-stage emotions', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '006_mistakes_and_psychology.sql'), 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.mistakes');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.trade_mistakes');
    expect(content).toContain('emotion_before TEXT');
    expect(content).toContain('emotion_during TEXT');
    expect(content).toContain('emotion_after TEXT');
  });

  it('validates 007_account_model_expansion.sql provides prop firm models and drawdown limits', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '007_account_model_expansion.sql'), 'utf-8');
    expect(content).toContain("CHECK (account_type IN ('personal', 'broker', 'prop_firm', 'crypto', 'demo'))");
    expect(content).toContain('is_prop_firm BOOLEAN');
    expect(content).toContain('current_balance NUMERIC');
    expect(content).toContain('daily_loss_limit NUMERIC');
    expect(content).toContain('max_loss_limit NUMERIC');
  });

  it('validates 008_multi_tenant_integrity_triggers.sql ensures cross-tenant isolation triggers', () => {
    const content = fs.readFileSync(path.join(migrationsDir, '008_multi_tenant_integrity_triggers.sql'), 'utf-8');
    expect(content).toContain('check_trade_cross_tenant_integrity');
    expect(content).toContain('Cross-tenant violation: Account');
    expect(content).toContain('Cross-tenant violation: Strategy');
    expect(content).toContain('Cross-tenant violation: Setup');
    expect(content).toContain('check_trade_tag_cross_tenant_integrity');
  });

  it('parses native columns roundtrip between Trade and Supabase row/payload', () => {
    const mockTrade: Partial<Trade> = {
      id: 'da8fa828-991a-46a9-913f-0a4773f7d06a',
      symbol: 'NQ1!',
      direction: 'LONG',
      asset_class: 'futures',
      contract_multiplier: 20,
      tick_size: 0.25,
      tick_value: 5,
      status: 'CLOSED',
      entry_at: '2026-09-15T14:30:00Z',
      exit_at: '2026-09-15T16:00:00Z',
      emotion_before: 'Calm',
      emotion_during: 'Focused',
      emotion_after: 'Confident',
      entry_price: 18000,
      exit_price: 18050,
      position_size: 2,
    };

    const payload = tradeToSupabasePayload(mockTrade, 'user-123');

    expect(payload.asset_class).toBe('futures');
    expect(payload.contract_multiplier).toBe(20);
    expect(payload.tick_size).toBe(0.25);
    expect(payload.tick_value).toBe(5);
    expect(payload.status).toBe('CLOSED');
    expect(payload.entry_at).toBe('2026-09-15T14:30:00Z');
    expect(payload.exit_at).toBe('2026-09-15T16:00:00Z');
    expect(payload.emotion_before).toBe('Calm');
    expect(payload.emotion_during).toBe('Focused');
    expect(payload.emotion_after).toBe('Confident');

    const simulatedRow = {
      ...payload,
      id: mockTrade.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const parsed = parseSupabaseTrade(simulatedRow);
    expect(parsed.asset_class).toBe('futures');
    expect(parsed.contract_multiplier).toBe(20);
    expect(parsed.tick_size).toBe(0.25);
    expect(parsed.tick_value).toBe(5);
    expect(parsed.status).toBe('CLOSED');
    expect(parsed.entry_at).toBe('2026-09-15T14:30:00Z');
    expect(parsed.exit_at).toBe('2026-09-15T16:00:00Z');
    expect(parsed.emotion_before).toBe('Calm');
    expect(parsed.emotion_during).toBe('Focused');
    expect(parsed.emotion_after).toBe('Confident');
  });
});
