// Server-side helpers για το πρόγραμμα μήνα (χρησιμοποιεί DB — όχι για client).
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarDays, units, dutyTypeRanks } from "@/db/schema";
import { monthDates, isWeekendIso } from "@/lib/dates";

/** Βαριές μέρες (D5): Σαββατοκύριακα + αργίες + ειδικές. */
export function isHeavyType(t: string): boolean {
  return t === "weekend" || t === "holiday" || t === "special";
}

/**
 * Εξασφαλίζει ότι υπάρχουν εγγραφές calendar_days για όλο τον μήνα.
 * Συμπληρώνει μόνο όσες λείπουν (weekday/weekend) — δεν πειράζει αργίες/ειδικές.
 */
export function ensureCalendarMonth(year: number, month: number): void {
  const rows = monthDates(year, month).map((date) => ({
    date,
    dayType: (isWeekendIso(date) ? "weekend" : "weekday") as
      | "weekend"
      | "weekday",
  }));
  db.insert(calendarDays).values(rows).onConflictDoNothing().run();
}

/** Επιστρέφει το id της δικής μας μονάδας (το δημιουργεί αν λείπει). */
export function getHomeUnitId(): string {
  const existing = db.select().from(units).where(eq(units.isHome, true)).get();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  db.insert(units).values({ id, name: "Μονάδα μας", isHome: true }).run();
  return id;
}

/**
 * Επιτρεπόμενοι βαθμοί ανά υπηρεσία. Υπηρεσία χωρίς εγγραφές = ανοιχτή σε όλους.
 */
export function allowedRanksByDuty(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of db.select().from(dutyTypeRanks).all()) {
    const set = map.get(row.dutyTypeId) ?? new Set<string>();
    set.add(row.rankId);
    map.set(row.dutyTypeId, set);
  }
  return map;
}

/** Είναι το άτομο (με δεδομένο βαθμό) κατάλληλο για την υπηρεσία; */
export function isEligible(
  allowed: Map<string, Set<string>>,
  dutyTypeId: string,
  rankId: string | null,
): boolean {
  const set = allowed.get(dutyTypeId);
  if (!set || set.size === 0) return true; // ανοιχτή υπηρεσία
  return rankId !== null && set.has(rankId);
}

export function cellKey(personId: string, date: string): string {
  return `${personId}|${date}`;
}
