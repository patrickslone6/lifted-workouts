/**
 * Timezone-safe local date utilities
 * Prevents off-by-one errors caused by toISOString() in evening hours
 * and UTC date parsing shifts west of GMT.
 */

/**
 * Format a Date object as local YYYY-MM-DD (safe from UTC timezone shifting)
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD string into a Date in local time at noon (12:00:00)
 * to prevent any timezone/daylight saving edge shifts.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Get today's local date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

/**
 * Formats a YYYY-MM-DD string cleanly for display using Intl/toLocaleDateString
 */
export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', options);
}

export const formatDateDisplay = formatDisplayDate;

/**
 * Computes difference in calendar days between two YYYY-MM-DD dates (target - base)
 */
export function getDaysDifference(targetDateStr: string, baseDateStr: string = getTodayDateString()): number {
  const target = parseLocalDate(targetDateStr);
  const base = parseLocalDate(baseDateStr);
  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
