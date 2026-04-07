/**
 * Returns a YYYY-MM-DD string in the device's LOCAL timezone.
 * Use this everywhere instead of `new Date().toISOString().split('T')[0]`
 * which returns UTC and causes day-boundary bugs for non-UTC users.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
