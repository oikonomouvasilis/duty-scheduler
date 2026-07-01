import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  schedules,
  people,
  ranks,
  dutyTypes,
  calendarDays,
  assignments,
  unavailabilities,
  type ScheduleSettings,
} from "@/db/schema";
import { ui } from "@/lib/ui";
import { monthLabel, monthDates, dayNum, dowOf, WEEKDAYS_EL } from "@/lib/dates";
import { isHeavyType, neededSlots } from "@/lib/schedule";
import { ActionButton } from "@/components/action-button";
import { reopenForEdit } from "@/app/schedule/actions";

export const dynamic = "force-dynamic";

// updatedAt: ISO 8601 (toISOString) ή SQLite "YYYY-MM-DD HH:MM:SS" — δείξε «YYYY-MM-DD HH:MM».
function fmtUpdated(s: string): string {
  return s.slice(0, 16).replace("T", " ");
}

export default async function HistoryReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, id))
    .get();
  if (!schedule) notFound();

  const settings = (schedule.settings ?? { dutyTypes: [] }) as ScheduleSettings;
  const activeDutyIds = settings.dutyTypes.map((d) => d.dutyTypeId);
  const finalized = schedule.status === "finalized";

  const dates = monthDates(schedule.year, schedule.month);
  const calByDate = new Map(
    db
      .select()
      .from(calendarDays)
      .where(inArray(calendarDays.date, dates))
      .all()
      .map((r) => [r.date, r]),
  );

  const allDuties = db
    .select()
    .from(dutyTypes)
    .orderBy(asc(dutyTypes.name))
    .all();
  const dutyById = new Map(allDuties.map((d) => [d.id, d]));

  const rows = db
    .select({
      date: assignments.date,
      dutyTypeId: assignments.dutyTypeId,
      personId: assignments.personId,
      personName: people.fullName,
      rankName: ranks.name,
    })
    .from(assignments)
    .innerJoin(people, eq(assignments.personId, people.id))
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .where(eq(assignments.scheduleId, id))
    .all();

  // απορρίψεις ανά μέρα (μικρός δείκτης στην προβολή)
  const rejByDate = new Map<string, number>();
  for (const r of db
    .select()
    .from(unavailabilities)
    .where(eq(unavailabilities.scheduleId, id))
    .all())
    rejByDate.set(r.date, (rejByDate.get(r.date) ?? 0) + 1);

  // ανά μέρα → ανά υπηρεσία → ονόματα· και σύνολα ανά άτομο (αυτού του μήνα)
  const byDate = new Map<string, Map<string, string[]>>();
  const tally = new Map<
    string,
    { id: string; name: string; rank: string | null; total: number; heavy: number }
  >();
  for (const a of rows) {
    const heavy = isHeavyType(calByDate.get(a.date)?.dayType ?? "weekday");

    let perDuty = byDate.get(a.date);
    if (!perDuty) {
      perDuty = new Map();
      byDate.set(a.date, perDuty);
    }
    const names = perDuty.get(a.dutyTypeId);
    if (names) names.push(a.personName);
    else perDuty.set(a.dutyTypeId, [a.personName]);

    const t = tally.get(a.personId);
    if (t) {
      t.total++;
      if (heavy) t.heavy++;
    } else {
      tally.set(a.personId, {
        id: a.personId,
        name: a.personName,
        rank: a.rankName,
        total: 1,
        heavy: heavy ? 1 : 0,
      });
    }
  }

  const filled = rows.filter((a) => activeDutyIds.includes(a.dutyTypeId)).length;
  const needed = neededSlots(schedule.year, schedule.month, settings);
  const fullyCovered = needed > 0 && filled >= needed;

  // σειρά υπηρεσιών: ενεργές πρώτα, μετά ό,τι άλλο υπάρχει στις εκχωρήσεις
  const dutyOrder = [...activeDutyIds];
  for (const a of rows)
    if (!dutyOrder.includes(a.dutyTypeId)) dutyOrder.push(a.dutyTypeId);

  const days = dates.map((date) => {
    const cal = calByDate.get(date);
    const dayType = cal?.dayType ?? "weekday";
    return {
      date,
      day: dayNum(date),
      dow: dowOf(date),
      label: cal?.label ?? null,
      heavy: isHeavyType(dayType),
    };
  });

  const tallyRows = [...tally.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, "el"),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/history"
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Ημερολόγιο Υπηρεσιών
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {monthLabel(schedule.year, schedule.month)}
          </h1>
          <p className="text-sm text-gray-500">
            <span className={fullyCovered ? "text-green-600" : "text-amber-600"}>
              κάλυψη {filled}/{needed}
            </span>{" "}
            · {rows.length} εκχωρήσεις · τελευταία ενημέρωση{" "}
            {fmtUpdated(schedule.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              finalized
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {finalized ? "οριστικό" : "πρόχειρο"}
          </span>
          <a
            href={`/history/${schedule.id}/export`}
            className={ui.btnSm}
            download
          >
            Κατέβασε CSV
          </a>
          {finalized ? (
            <ActionButton
              action={reopenForEdit}
              id={schedule.id}
              className={ui.btn}
              confirm="Άνοιγμα του οριστικοποιημένου μήνα για διόρθωση; Επιστρέφει σε «πρόχειρο» μέχρι να τον ξανα-οριστικοποιήσεις."
            >
              Διόρθωση
            </ActionButton>
          ) : (
            <Link href={`/schedule/${schedule.id}`} className={ui.btn}>
              Επεξεργασία
            </Link>
          )}
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Ανά ημέρα
      </h2>
      <div className={`${ui.card} divide-y divide-gray-100`}>
        {days.map((d) => {
          const perDuty = byDate.get(d.date);
          const rej = rejByDate.get(d.date) ?? 0;
          return (
            <div
              key={d.date}
              className={`flex gap-3 p-3 ${d.heavy ? "bg-amber-50/40" : ""}`}
            >
              <div className="w-10 shrink-0 text-center">
                <div className="text-sm font-semibold">{d.day}</div>
                <div className="text-[11px] text-gray-400">
                  {WEEKDAYS_EL[d.dow]}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {d.label ? (
                  <div className="text-xs text-amber-700">{d.label}</div>
                ) : null}
                {perDuty && perDuty.size > 0 ? (
                  <div className="flex flex-col gap-1">
                    {dutyOrder
                      .filter((did) => perDuty.has(did))
                      .map((did) => (
                        <div
                          key={did}
                          className="flex flex-wrap items-baseline gap-x-2 text-sm"
                        >
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              className="h-2.5 w-2.5 rounded-[2px]"
                              style={{
                                backgroundColor:
                                  dutyById.get(did)?.color ?? "#9ca3af",
                              }}
                            />
                            {dutyById.get(did)?.name ?? "—"}
                          </span>
                          <span className="text-gray-600">
                            {perDuty.get(did)!.join(", ")}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">—</div>
                )}
              </div>
              {rej > 0 ? (
                <div
                  className="shrink-0 self-center text-[11px] text-red-400"
                  title={`${rej} απορρίψεις`}
                >
                  {rej} απόρρ.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Σύνολα ατόμων (αυτού του μήνα)
      </h2>
      <div className={`${ui.card} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Όνομα</th>
              <th className="px-4 py-2 font-medium">Βαθμός</th>
              <th className="px-4 py-2 text-right font-medium">Υπηρεσίες</th>
              <th className="px-4 py-2 text-right font-medium">Βαριές</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tallyRows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2 text-gray-600">{t.rank ?? "—"}</td>
                <td className="px-4 py-2 text-right">{t.total}</td>
                <td className="px-4 py-2 text-right text-amber-700">
                  {t.heavy}
                </td>
              </tr>
            ))}
            {tallyRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-gray-400">
                  Καμία εκχώρηση σ&apos; αυτόν τον μήνα.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
