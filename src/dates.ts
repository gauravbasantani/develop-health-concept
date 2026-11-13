// Calendar helpers. Dates are plain ISO strings ("2026-09-29"), read as UTC,
// so no time zone can move a day.

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "09/29/2026", the format the chart and the form use. */
export function us(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

/** Reads "09/29/2026" (or "9/29/2026") back to ISO; null if it isn't a real date. */
export function parseUs(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return toIso(date);
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round((parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

/** Same day of the month, n months later (clamped to the month's last day). */
export function addMonths(iso: string, n: number): string {
  const d = parseIso(iso);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return toIso(target);
}

/** "6 weeks", "14 weeks", "6 weeks and 2 days", "5 days". */
export function weeksText(days: number): string {
  const w = Math.floor(days / 7);
  const r = days % 7;
  const wk = w === 1 ? "1 week" : `${w} weeks`;
  const dy = r === 1 ? "1 day" : `${r} days`;
  if (w === 0) return dy;
  return r === 0 ? wk : `${wk} and ${dy}`;
}

export function ageOn(birthIso: string, onIso: string): number {
  const b = parseIso(birthIso);
  const o = parseIso(onIso);
  let age = o.getUTCFullYear() - b.getUTCFullYear();
  const before =
    o.getUTCMonth() < b.getUTCMonth() ||
    (o.getUTCMonth() === b.getUTCMonth() && o.getUTCDate() < b.getUTCDate());
  if (before) age -= 1;
  return age;
}
