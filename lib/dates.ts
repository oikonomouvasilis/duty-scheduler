// Καθαροί helpers ημερομηνιών (χωρίς DB — ασφαλείς και σε client).

export const MONTHS_EL = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

// index με getUTCDay (0 = Κυριακή)
export const WEEKDAYS_EL = ["Κυ", "Δε", "Τρ", "Τε", "Πε", "Πα", "Σα"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthDates(year: number, month: number): string[] {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => isoDate(year, month, i + 1));
}

export function dowOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekendIso(iso: string): boolean {
  const d = dowOf(iso);
  return d === 0 || d === 6;
}

export function dayNum(iso: string): number {
  return Number(iso.split("-")[2]);
}

/** Διαφορά σε μέρες (bIso - aIso). */
export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_EL[month - 1]} ${year}`;
}
