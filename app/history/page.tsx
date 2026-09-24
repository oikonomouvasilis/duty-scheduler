import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { schedules, assignments, type ScheduleSettings } from "@/db/schema";
import { ui } from "@/lib/ui";
import { monthLabel } from "@/lib/dates";
import { neededSlots } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const rows = db
    .select()
    .from(schedules)
    .orderBy(desc(schedules.year), desc(schedules.month))
    .all();

  // Όλες οι εκχωρήσεις (scheduleId, dutyTypeId) σε ένα query → tally ανά μήνα.
  const byShed = new Map<string, string[]>();
  for (const a of db
    .select({
      scheduleId: assignments.scheduleId,
      dutyTypeId: assignments.dutyTypeId,
    })
    .from(assignments)
    .all()) {
    const arr = byShed.get(a.scheduleId);
    if (arr) arr.push(a.dutyTypeId);
    else byShed.set(a.scheduleId, [a.dutyTypeId]);
  }

  type Row = (typeof rows)[number];
  function summarize(r: Row) {
    const settings = (r.settings ?? { dutyTypes: [] }) as ScheduleSettings;
    const activeSet = new Set(settings.dutyTypes.map((d) => d.dutyTypeId));
    const ids = byShed.get(r.id) ?? [];
    const filled = ids.filter((d) => activeSet.has(d)).length;
    const needed = neededSlots(r.year, r.month, settings);
    return {
      total: ids.length,
      filled,
      needed,
      fullyCovered: needed > 0 && filled >= needed,
    };
  }

  // Ομαδοποίηση ανά έτος (φθίνουσα). Οι γραμμές είναι ήδη ταξινομημένες.
  const byYear = new Map<number, Row[]>();
  for (const r of rows) {
    const arr = byYear.get(r.year);
    if (arr) arr.push(r);
    else byYear.set(r.year, [r]);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Ημερολόγιο Υπηρεσιών
        </h1>
        <Link
          href="/stats"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Στατιστικά →
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Αρχείο όλων των μηνών — ανασκόπηση και διόρθωση παλιών προγραμμάτων.
      </p>

      {rows.length === 0 ? (
        <div
          className={`${ui.card} mt-6 p-6 text-center text-sm text-gray-400 dark:text-gray-500`}
        >
          Κανένας μήνας ακόμα. Δημιούργησε από τις{" "}
          <Link
            href="/schedule"
            className="text-gray-600 underline dark:text-gray-300"
          >
            Υπηρεσίες Μήνα
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {year}
              </h2>
              <div
                className={`${ui.card} divide-y divide-gray-100 dark:divide-gray-800`}
              >
                {byYear.get(year)!.map((r) => {
                  const s = summarize(r);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-4">
                      <Link
                        href={`/history/${r.id}`}
                        className="min-w-0 flex-1"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {monthLabel(r.year, r.month)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          <span
                            className={
                              s.fullyCovered
                                ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-500"
                            }
                          >
                            κάλυψη {s.filled}/{s.needed}
                          </span>{" "}
                          · {s.total} εκχωρήσεις
                        </div>
                      </Link>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.status === "finalized"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {r.status === "finalized" ? "οριστικό" : "πρόχειρο"}
                      </span>
                      <Link href={`/history/${r.id}`} className={ui.btnSm}>
                        Ανασκόπηση
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
