import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency: string = "$"): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${currency}${abs}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}
