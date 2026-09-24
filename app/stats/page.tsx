import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { dutyTypes } from "@/db/schema";
import { ui } from "@/lib/ui";
import { BarChart } from "@/components/bar-chart";
import {
  getStats,
  DAY_TYPES,
  type DayTypeKey,
  type StatsFilters,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

const DAY_TYPE_LABEL: Record<DayTypeKey, string> = {
  weekday: "Καθημ.",
  weekend: "ΣΚ",
  holiday: "Αργ.",
  special: "Ειδ.",
};

const HEAVY_TYPES: DayTypeKey[] = ["weekend", "holiday", "special"];

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD (τοπική ζώνη)
}

function fmt1(n: number): string {
  return n.toFixed(1);
}

// Κρατά μόνο μη-κενά string searchParams (αλλιώς undefined = «όλα»).
function pick(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters: StatsFilters = {
    from: pick(sp.from),
    to: pick(sp.to),
    dutyTypeId: pick(sp.duty),
  };

  const duties = db
    .select({ id: dutyTypes.id, name: dutyTypes.name, color: dutyTypes.color })
    .from(dutyTypes)
    .orderBy(asc(dutyTypes.name))
    .all();

  const stats = getStats(filters, todayIso());
  const dutyName = filters.dutyTypeId
    ? (duties.find((d) => d.id === filters.dutyTypeId)?.name ?? "—")
    : null;

  const maxPerMonth = Math.max(0, ...stats.persons.map((p) => p.perMonth));
  const hasFilters = !!(filters.from || filters.to || filters.dutyTypeId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Στατιστικά
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Διαχρονικά σύνολα ανά τύπο ημέρας, κανονικοποιημένα στον χρόνο υπηρεσίας
        του καθενός (ΜΟ/μήνα = υπηρεσίες ανά ημερολογιακό μήνα, με τις
        πραγματικές μέρες κάθε μήνα).
      </p>

      {/* --- Φίλτρα (GET form, server-rendered) --- */}
      <form
        method="get"
        className={`${ui.card} mt-5 flex flex-wrap items-end gap-3 p-4`}
      >
        <div>
          <label className={ui.label}>Από</label>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label}>Έως</label>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className={ui.input}
          />
        </div>
        <div className="min-w-48">
          <label className={ui.label}>Υπηρεσία</label>
          <select
            name="duty"
            defaultValue={filters.dutyTypeId ?? ""}
            className={ui.input}
          >
            <option value="">Όλες οι υπηρεσίες</option>
            {duties.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button className={ui.btn}>Εφαρμογή</button>
        {hasFilters ? (
          <Link href="/stats" className={ui.btnSm}>
            Καθαρισμός
          </Link>
        ) : null}
      </form>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Παράθυρο: {stats.windowStart} → {stats.windowEnd}
        {dutyName ? <> · υπηρεσία: {dutyName}</> : null} ·{" "}
        {stats.grand.total} εκχωρήσεις ({stats.grand.heavy} βαριές)
      </p>

      {stats.persons.length === 0 ? (
        <div
          className={`${ui.card} mt-6 p-6 text-center text-sm text-gray-400 dark:text-gray-500`}
        >
          Καμία εκχώρηση στο επιλεγμένο διάστημα.
        </div>
      ) : (
        <>
          {/* --- Κατανομή (μπάρες) --- */}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className={`${ui.card} p-4`}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Κατανομή ανά άτομο (ΜΟ/μήνα)
              </h2>
              <BarChart
                items={stats.persons.map((p) => ({
                  key: p.id,
                  label: p.name,
                  value: p.perMonth,
                }))}
              />
            </div>
            <div className={`${ui.card} p-4`}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Κατανομή ανά βαθμό (ΜΟ/μήνα ανά άτομο)
              </h2>
              <BarChart
                items={stats.ranks.map((r) => ({
                  key: r.rankId ?? "__none__",
                  label: r.rankName ?? "—",
                  value: r.avgPerMonth,
                }))}
              />
            </div>
          </div>

          {/* --- Ανά άτομο --- */}
          <h2 className="mb-2 mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ανά άτομο
          </h2>
          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Όνομα</th>
                  <th className="px-4 py-2 font-medium">Βαθμός</th>
                  {DAY_TYPES.map((k) => (
                    <th
                      key={k}
                      className={`px-3 py-2 text-right font-medium ${
                        HEAVY_TYPES.includes(k)
                          ? "text-amber-700 dark:text-amber-500"
                          : ""
                      }`}
                    >
                      {DAY_TYPE_LABEL[k]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Σύνολο</th>
                  <th className="px-4 py-2 text-right font-medium">ΜΟ/μήνα</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.persons.map((p) => {
                  const barPct =
                    maxPerMonth > 0 ? (p.perMonth / maxPerMonth) * 100 : 0;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {p.name}
                        </div>
                        {p.serviceStartDate ? (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500">
                            από {p.serviceStartDate}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {p.rankName ?? "—"}
                      </td>
                      {DAY_TYPES.map((k) => (
                        <td
                          key={k}
                          className={`px-3 py-2 text-right tabular-nums ${
                            HEAVY_TYPES.includes(k)
                              ? "text-amber-700 dark:text-amber-500"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {p.counts[k] || (
                            <span className="text-gray-300 dark:text-gray-600">
                              0
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {p.total}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
                            {fmt1(p.perMonth)}
                          </span>
                          <span
                            className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-full bg-blue-600 dark:bg-blue-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/5 dark:text-gray-400">
                <tr>
                  <td className="px-4 py-2 font-medium" colSpan={2}>
                    Σύνολο ({stats.persons.length} άτομα)
                  </td>
                  {DAY_TYPES.map((k) => (
                    <td
                      key={k}
                      className="px-3 py-2 text-right tabular-nums"
                    >
                      {stats.grand.counts[k]}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {stats.grand.total}
                  </td>
                  <td className="px-4 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* --- Ανά βαθμό --- */}
          <h2 className="mb-2 mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ανά βαθμό (ΜΟ ανά άτομο)
          </h2>
          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Βαθμός</th>
                  <th className="px-3 py-2 text-right font-medium">Άτομα</th>
                  <th className="px-3 py-2 text-right font-medium">Σύνολο</th>
                  <th className="px-3 py-2 text-right font-medium text-amber-700 dark:text-amber-500">
                    Βαριές
                  </th>
                  <th className="px-3 py-2 text-right font-medium">ΜΟ υπηρ.</th>
                  <th className="px-4 py-2 text-right font-medium">ΜΟ/μήνα</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.ranks.map((r) => (
                  <tr key={r.rankId ?? "__none__"}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {r.rankName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {r.peopleCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {r.total}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-500">
                      {fmt1(r.avgHeavy)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {fmt1(r.avgTotal)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {fmt1(r.avgPerMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            «Βαριές» = Σαββατοκύριακα + αργίες + ειδικές μέρες (D5). Το ΜΟ/μήνα
            κανονικοποιεί στους μήνες υπηρεσίας του καθενός μέσα στο παράθυρο
            (με τις πραγματικές μέρες κάθε μήνα — 28/29/30/31), ώστε
            νεοεισερχόμενοι να μη φαίνονται άδικα «πίσω».
          </p>
        </>
      )}
    </div>
  );
}
