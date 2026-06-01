/**
 * Ensures a phone number starts with '+'. If the number already has a leading
 * '+' it is returned as-is. Blank/whitespace-only values are returned unchanged
 * so callers can still apply their own "required" validation.
 *
 * Examples:
 *   "2348012345678"  → "+2348012345678"
 *   "+2348012345678" → "+2348012345678"
 *   "08012345678"    → "+08012345678"  (user should enter full intl number)
 *   ""               → ""
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}
