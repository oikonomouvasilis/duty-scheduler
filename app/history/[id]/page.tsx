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
import { monthLabel, monthDates, dayNum, dowOf } from "@/lib/dates";
import {
  isHeavyType,
  neededSlots,
  allowedRanksByDuty,
  isEligible,
} from "@/lib/schedule";
import { ActionButton } from "@/components/action-button";
import { reopenForEdit } from "@/app/schedule/actions";
import { DayList } from "./day-list";

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

  // απορρίψεις: πλήθος ανά μέρα (ένδειξη) + σύνολο ατόμων ανά μέρα (για το inline editor)
  const rejByDate = new Map<string, number>();
  const rejectedIdsByDate = new Map<string, string[]>();
  for (const r of db
    .select()
    .from(unavailabilities)
    .where(eq(unavailabilities.scheduleId, id))
    .all()) {
    rejByDate.set(r.date, (rejByDate.get(r.date) ?? 0) + 1);
    const arr = rejectedIdsByDate.get(r.date);
    if (arr) arr.push(r.personId);
    else rejectedIdsByDate.set(r.date, [r.personId]);
  }

  // ανά μέρα → ανά υπηρεσία → {personId, name}· και σύνολα ανά άτομο (αυτού του μήνα)
  const byDate = new Map<string, Map<string, { personId: string; name: string }[]>>();
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
    const entry = { personId: a.personId, name: a.personName };
    const list = perDuty.get(a.dutyTypeId);
    if (list) list.push(entry);
    else perDuty.set(a.dutyTypeId, [entry]);

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

  // επιλέξιμα άτομα ανά (ενεργή) υπηρεσία — για το «+ Προσθήκη» στο inline editor
  const roster = db
    .select({
      id: people.id,
      name: people.fullName,
      rankId: people.rankId,
      rankName: ranks.name,
      status: people.status,
    })
    .from(people)
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .where(inArray(people.status, ["active", "frozen"]))
    .all();
  const allowed = allowedRanksByDuty();
  const eligibleByDuty: Record<string, { id: string; name: string; rankName: string | null }[]> = {};
  for (const dutyId of activeDutyIds) {
    eligibleByDuty[dutyId] = roster
      .filter((p) => isEligible(allowed, dutyId, p.rankId))
      .map((p) => ({ id: p.id, name: p.name, rankName: p.rankName }))
      .sort((a, b) => a.name.localeCompare(b.name, "el"));
  }

  const days = dates.map((date) => {
    const cal = calByDate.get(date);
    const dayType = cal?.dayType ?? "weekday";
    const perDuty = byDate.get(date);
    const assignmentsByDuty: Record<string, { personId: string; name: string }[]> = {};
    if (perDuty) for (const [dutyId, list] of perDuty) assignmentsByDuty[dutyId] = list;
    return {
      date,
      day: dayNum(date),
      dow: dowOf(date),
      label: cal?.label ?? null,
      heavy: isHeavyType(dayType),
      assignmentsByDuty,
      rejectedIds: rejectedIdsByDate.get(date) ?? [],
    };
  });

  const tallyRows = [...tally.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, "el"),
  );

  const dutyMeta = Object.fromEntries(
    dutyOrder.map((did) => [
      did,
      { name: dutyById.get(did)?.name ?? "—", color: dutyById.get(did)?.color ?? null },
    ]),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/history"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        ← Ημερολόγιο Υπηρεσιών
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {monthLabel(schedule.year, schedule.month)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span
              className={
                fullyCovered
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-500"
              }
            >
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
                ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
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

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Ανά ημέρα
      </h2>
      <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
        Κλικ σε μία ημέρα για προβολή/επεξεργασία των υπηρεσιών της.
      </p>
      <DayList
        scheduleId={schedule.id}
        readOnly={finalized}
        days={days}
        dutyOrder={dutyOrder}
        dutyMeta={dutyMeta}
        eligibleByDuty={eligibleByDuty}
        rejByDate={Object.fromEntries(rejByDate)}
      />

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Σύνολα ατόμων (αυτού του μήνα)
      </h2>
      <div className={`${ui.card} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Όνομα</th>
              <th className="px-4 py-2 font-medium">Βαθμός</th>
              <th className="px-4 py-2 text-right font-medium">Υπηρεσίες</th>
              <th className="px-4 py-2 text-right font-medium">Βαριές</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tallyRows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {t.name}
                </td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                  {t.rank ?? "—"}
                </td>
                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                  {t.total}
                </td>
                <td className="px-4 py-2 text-right text-amber-700 dark:text-amber-500">
                  {t.heavy}
                </td>
              </tr>
            ))}
            {tallyRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-4 text-gray-400 dark:text-gray-500"
                >
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
