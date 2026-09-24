// Προεπισκόπηση «δικαιοσύνης» (Φάση 6, D11) — server component, χωρίς client JS.
// Δείχνει τη ΔΙΑΧΡΟΝΙΚΗ ισορροπία (κανονικοποιημένο ΜΟ/μήνα) των ενεργών ατόμων,
// ώστε να φαίνεται το αποτέλεσμα της αυτόματης κατανομής. Σε <details> (μαζεμένο).

import { spread, scorePct } from "@/lib/fairness";

export type FairnessPerson = {
  id: string;
  name: string;
  rankName: string | null;
  perMonth: number; // ΜΟ συνόλου / μήνα (κανονικοποιημένο)
  heavyPerMonth: number; // ΜΟ βαριών / μήνα (κανονικοποιημένο)
};

function ScoreBadge({ label, pct }: { label: string; pct: number }) {
  const tone =
    pct >= 85
      ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
      : pct >= 65
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label} {pct}%
    </span>
  );
}

export function FairnessPanel({ people }: { people: FairnessPerson[] }) {
  const totalSpread = spread(people.map((p) => p.perMonth));
  const heavySpread = spread(people.map((p) => p.heavyPerMonth));
  const maxRate = Math.max(0.001, totalSpread.max);

  return (
    <details className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100">
        <span>Δικαιοσύνη (διαχρονικά)</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <ScoreBadge label="σύνολο" pct={scorePct(totalSpread)} />
          <ScoreBadge label="βαριές" pct={scorePct(heavySpread)} />
        </span>
        <span className="ml-auto text-xs font-normal text-gray-400 dark:text-gray-500">
          {people.length} ενεργά άτομα
        </span>
      </summary>

      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Κανονικοποιημένος ΜΟ υπηρεσιών ανά μήνα υπηρεσίας (D5). Μεγαλύτερο
          score = πιο ισόρροπη κατανομή. Πράσινο = ο λιγότερο φορτωμένος, κόκκινο
          = ο περισσότερο.
        </p>

        {people.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Δεν υπάρχουν ενεργά άτομα.</p>
        ) : (
          <ul className="space-y-1">
            {people.map((p) => {
              const isMin =
                p.perMonth <= totalSpread.min + 1e-9 && totalSpread.range > 1e-9;
              const isMax =
                p.perMonth >= totalSpread.max - 1e-9 && totalSpread.range > 1e-9;
              const tone = isMax
                ? "bg-red-400 dark:bg-red-500/70"
                : isMin
                  ? "bg-green-400 dark:bg-green-500/70"
                  : "bg-gray-300 dark:bg-gray-700";
              return (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 truncate text-gray-700 dark:text-gray-300">
                    {p.name}
                    {p.rankName ? (
                      <span className="text-gray-400 dark:text-gray-500"> · {p.rankName}</span>
                    ) : null}
                  </span>
                  <span className="flex h-3 flex-1 items-center">
                    <span
                      className={`h-2 rounded-sm ${tone}`}
                      style={{
                        width: `${Math.round((p.perMonth / maxRate) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-gray-600 dark:text-gray-400">
                    {p.perMonth.toFixed(1)}
                  </span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-gray-400 dark:text-gray-500">
                    βαρ. {p.heavyPerMonth.toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
