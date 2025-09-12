// Shared validators for forms
export function isValidLatitude(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const n = Number(value);
  return !Number.isNaN(n) && n >= -90 && n <= 90;
}

export function isValidLongitude(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const n = Number(value);
  return !Number.isNaN(n) && n >= -180 && n <= 180;
}

export function isNonEmptyMinMax(value: unknown, min = 1, max = 200): boolean {
  if (value === undefined || value === null || value === '') return true;
  const s = String(value);
  return s.length >= min && s.length <= max;
}

export function isNameLike(value: unknown, min = 2, max = 100): boolean {
  if (value === undefined || value === null || value === '') return true;
  const s = String(value).trim();
  if (s.length < min || s.length > max) return false;
  return /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]+$/.test(s);
}
