// Server-side στατιστικά (χρησιμοποιεί DB — όχι για client).
//
// Όλα παράγονται **διαχρονικά** από τον πίνακα γεγονότων `assignments` (D3) — κανένα
// προ-υπολογισμένο άθροισμα. Δίνουμε σύνολα ανά τύπο ημέρας + κανονικοποιημένο ΜΟ
// στον χρόνο υπηρεσίας (D5: ΜΟ = υπηρεσίες / διαθέσιμες μέρες από την έναρξη), ώστε οι
// νεοεισερχόμενοι να μην «δείχνουν» πίσω.
import { and, eq, gte, lte, min } from "drizzle-orm";
import { db } from "@/db";
import { assignments, people, ranks, calendarDays } from "@/db/schema";
import { daysBetween } from "@/lib/dates";

export type DayTypeKey = "weekday" | "weekend" | "holiday" | "special";

export const DAY_TYPES: DayTypeKey[] = [
  "weekday",
  "weekend",
  "holiday",
  "special",
];

/** Βαριές μέρες (D5): ΣΚ + αργίες + ειδικές. */
const HEAVY: ReadonlySet<DayTypeKey> = new Set<DayTypeKey>([
  "weekend",
  "holiday",
  "special",
]);

export type StatsFilters = {
  from?: string; // ISO YYYY-MM-DD (inclusive)
  to?: string; // ISO YYYY-MM-DD (inclusive)
  dutyTypeId?: string; // συγκεκριμένη υπηρεσία ή undefined = όλες
};

const emptyCounts = (): Record<DayTypeKey, number> => ({
  weekday: 0,
  weekend: 0,
  holiday: 0,
  special: 0,
});

export type PersonStat = {
  id: string;
  name: string;
  rankId: string | null;
  rankName: string | null;
  serviceStartDate: string | null;
  status: string;
  counts: Record<DayTypeKey, number>;
  total: number;
  heavy: number; // ΣΚ + αργίες + ειδικές
  availableDays: number; // παρονομαστής κανονικοποίησης (μέρες υπηρεσίας στο παράθυρο)
  perMonth: number; // ΜΟ υπηρεσιών ανά 30 μέρες υπηρεσίας (κανονικοποιημένο)
};

export type RankStat = {
  rankId: string | null;
  rankName: string | null;
  peopleCount: number;
  total: number;
  heavy: number;
  avgTotal: number; // ΜΟ υπηρεσιών / άτομο
  avgHeavy: number; // ΜΟ βαριών / άτομο
  avgPerMonth: number; // ΜΟ κανονικοποιημένου ρυθμού / άτομο
};

export type StatsResult = {
  windowStart: string;
  windowEnd: string;
  persons: PersonStat[];
  ranks: RankStat[];
  grand: {
    total: number;
    heavy: number;
    counts: Record<DayTypeKey, number>;
  };
};

/** ΜΟ ανά 30 μέρες υπηρεσίας — μικρό, ευανάγνωστο μέγεθος (αντί για ρυθμό/μέρα). */
function perMonthRate(total: number, availableDays: number): number {
  if (availableDays <= 0) return 0;
  return (total / availableDays) * 30;
}

export function getStats(filters: StatsFilters, today: string): StatsResult {
  // --- 1) Φιλτραρισμένες εκχωρήσεις + τύπος ημέρας (ένα JOIN στο calendar_days) ---
  const conds = [];
  if (filters.from) conds.push(gte(assignments.date, filters.from));
  if (filters.to) conds.push(lte(assignments.date, filters.to));
  if (filters.dutyTypeId)
    conds.push(eq(assignments.dutyTypeId, filters.dutyTypeId));

  const rows = db
    .select({
      personId: assignments.personId,
      dayType: calendarDays.dayType,
    })
    .from(assignments)
    .innerJoin(calendarDays, eq(assignments.date, calendarDays.date))
    .where(conds.length ? and(...conds) : undefined)
    .all();

  // Συγκεντρωτικά ανά άτομο (counts ανά τύπο ημέρας).
  const byPerson = new Map<string, Record<DayTypeKey, number>>();
  for (const r of rows) {
    const c = byPerson.get(r.personId) ?? emptyCounts();
    c[r.dayType as DayTypeKey]++;
    byPerson.set(r.personId, c);
  }

  // --- 2) Όρια παραθύρου για την κανονικοποίηση ---
  // windowEnd = filters.to ή σήμερα· windowStart = filters.from ή η νωρίτερη εκχώρηση.
  const earliest =
    db.select({ d: min(assignments.date) }).from(assignments).get()?.d ?? null;
  const windowEnd = filters.to ?? today;
  const windowStart = filters.from ?? earliest ?? today;

  // --- 3) Πληθυσμός: ολόκληρο το roster + βαθμοί ---
  const roster = db
    .select({
      id: people.id,
      name: people.fullName,
      status: people.status,
      serviceStartDate: people.serviceStartDate,
      rankId: people.rankId,
      rankName: ranks.name,
    })
    .from(people)
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .all();

  const persons: PersonStat[] = [];
  const grandCounts = emptyCounts();
  let grandTotal = 0;
  let grandHeavy = 0;

  for (const p of roster) {
    const counts = byPerson.get(p.id) ?? emptyCounts();
    const total =
      counts.weekday + counts.weekend + counts.holiday + counts.special;
    const heavy = counts.weekend + counts.holiday + counts.special;

    // Είχε ξεκινήσει μέσα στο παράθυρο; (σύγκριση ISO = λεξικογραφική)
    const startedInWindow =
      !p.serviceStartDate || p.serviceStartDate <= windowEnd;

    // Δείχνουμε: ενεργό/παγωμένο roster που είχε ξεκινήσει, ή όποιον έχει εκχωρήσεις.
    const include =
      (startedInWindow && (p.status === "active" || p.status === "frozen")) ||
      total > 0;
    if (!include) continue;

    // Παρονομαστής: από την έναρξη (ή την αρχή του παραθύρου) ως το τέλος του παραθύρου.
    const effectiveStart =
      p.serviceStartDate && p.serviceStartDate > windowStart
        ? p.serviceStartDate
        : windowStart;
    const availableDays = Math.max(
      1,
      daysBetween(effectiveStart, windowEnd) + 1,
    );

    persons.push({
      id: p.id,
      name: p.name,
      rankId: p.rankId,
      rankName: p.rankName,
      serviceStartDate: p.serviceStartDate,
      status: p.status,
      counts,
      total,
      heavy,
      availableDays,
      perMonth: perMonthRate(total, availableDays),
    });

    grandTotal += total;
    grandHeavy += heavy;
    for (const k of DAY_TYPES) grandCounts[k] += counts[k];
  }

  persons.sort(
    (a, b) =>
      b.perMonth - a.perMonth ||
      b.total - a.total ||
      a.name.localeCompare(b.name, "el"),
  );

  // --- 4) ΜΟ ανά βαθμό (μέσος όρος των ατόμων του βαθμού) ---
  const rankAgg = new Map<
    string,
    {
      rankId: string | null;
      rankName: string | null;
      n: number;
      total: number;
      heavy: number;
      perMonthSum: number;
    }
  >();
  for (const p of persons) {
    const key = p.rankId ?? "__none__";
    const agg = rankAgg.get(key) ?? {
      rankId: p.rankId,
      rankName: p.rankName,
      n: 0,
      total: 0,
      heavy: 0,
      perMonthSum: 0,
    };
    agg.n++;
    agg.total += p.total;
    agg.heavy += p.heavy;
    agg.perMonthSum += p.perMonth;
    rankAgg.set(key, agg);
  }

  const rankStats: RankStat[] = [...rankAgg.values()]
    .map((a) => ({
      rankId: a.rankId,
      rankName: a.rankName,
      peopleCount: a.n,
      total: a.total,
      heavy: a.heavy,
      avgTotal: a.total / a.n,
      avgHeavy: a.heavy / a.n,
      avgPerMonth: a.perMonthSum / a.n,
    }))
    .sort((a, b) => b.avgPerMonth - a.avgPerMonth);

  return {
    windowStart,
    windowEnd,
    persons,
    ranks: rankStats,
    grand: { total: grandTotal, heavy: grandHeavy, counts: grandCounts },
  };
}
