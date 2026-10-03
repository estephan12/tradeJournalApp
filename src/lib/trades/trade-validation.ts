/**
 * Utility functions for validating trade identifiers and database fields.
 * Independent of React and context.
 */

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function sanitizeIntScale1to10(val: unknown, fallback: number = 7): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  // If float strictly between 0 and 1 (such as AI/CSV confidence 0.98), scale to 1-10 integer
  if (num > 0 && num < 1) {
    return Math.min(10, Math.max(1, Math.round(num * 10)));
  }
  return Math.min(10, Math.max(1, Math.round(num)));
}
