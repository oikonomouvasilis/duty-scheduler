import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { dutyTypes } from "@/db/schema";
import { ui } from "@/lib/ui";
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
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Αρχική
      </Link>
      <h1 className="mt-2 text-xl font-bold tracking-tight">Στατιστικά</h1>
      <p className="mt-1 text-sm text-gray-500">
        Διαχρονικά σύνολα ανά τύπο ημέρας, κανονικοποιημένα στον χρόνο υπηρεσίας
        του καθενός (ΜΟ/μήνα = υπηρεσίες ανά 30 μέρες υπηρεσίας).
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

      <p className="mt-3 text-xs text-gray-500">
        Παράθυρο: {stats.windowStart} → {stats.windowEnd}
        {dutyName ? <> · υπηρεσία: {dutyName}</> : null} ·{" "}
        {stats.grand.total} εκχωρήσεις ({stats.grand.heavy} βαριές)
      </p>

      {stats.persons.length === 0 ? (
        <div
          className={`${ui.card} mt-6 p-6 text-center text-sm text-gray-400`}
        >
          Καμία εκχώρηση στο επιλεγμένο διάστημα.
        </div>
      ) : (
        <>
          {/* --- Ανά άτομο --- */}
          <h2 className="mb-2 mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Ανά άτομο
          </h2>
          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Όνομα</th>
                  <th className="px-4 py-2 font-medium">Βαθμός</th>
                  {DAY_TYPES.map((k) => (
                    <th
                      key={k}
                      className={`px-3 py-2 text-right font-medium ${
                        HEAVY_TYPES.includes(k) ? "text-amber-700" : ""
                      }`}
                    >
                      {DAY_TYPE_LABEL[k]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Σύνολο</th>
                  <th className="px-4 py-2 text-right font-medium">ΜΟ/μήνα</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.persons.map((p) => {
                  const barPct =
                    maxPerMonth > 0 ? (p.perMonth / maxPerMonth) * 100 : 0;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2">
                        <div className="font-medium">{p.name}</div>
                        {p.serviceStartDate ? (
                          <div className="text-[11px] text-gray-400">
                            από {p.serviceStartDate}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {p.rankName ?? "—"}
                      </td>
                      {DAY_TYPES.map((k) => (
                        <td
                          key={k}
                          className={`px-3 py-2 text-right tabular-nums ${
                            HEAVY_TYPES.includes(k)
                              ? "text-amber-700"
                              : "text-gray-600"
                          }`}
                        >
                          {p.counts[k] || <span className="text-gray-300">0</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {p.total}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tabular-nums font-medium">
                            {fmt1(p.perMonth)}
                          </span>
                          <span
                            className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100"
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-full bg-gray-800"
                              style={{ width: `${barPct}%` }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
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
          <h2 className="mb-2 mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Ανά βαθμό (ΜΟ ανά άτομο)
          </h2>
          <div className={`${ui.card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Βαθμός</th>
                  <th className="px-3 py-2 text-right font-medium">Άτομα</th>
                  <th className="px-3 py-2 text-right font-medium">Σύνολο</th>
                  <th className="px-3 py-2 text-right font-medium text-amber-700">
                    Βαριές
                  </th>
                  <th className="px-3 py-2 text-right font-medium">ΜΟ υπηρ.</th>
                  <th className="px-4 py-2 text-right font-medium">ΜΟ/μήνα</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.ranks.map((r) => (
                  <tr key={r.rankId ?? "__none__"}>
                    <td className="px-4 py-2 font-medium">
                      {r.rankName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {r.peopleCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {r.total}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                      {fmt1(r.avgHeavy)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt1(r.avgTotal)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {fmt1(r.avgPerMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            «Βαριές» = Σαββατοκύριακα + αργίες + ειδικές μέρες (D5). Το ΜΟ/μήνα
            κανονικοποιεί στις διαθέσιμες μέρες υπηρεσίας του καθενός μέσα στο
            παράθυρο, ώστε νεοεισερχόμενοι να μη φαίνονται άδικα «πίσω».
          </p>
        </>
      )}
    </div>
  );
}
