import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray, ne } from "drizzle-orm";
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
  allowedRanksByDuty,
  isEligible,
  isHeavyType,
  cellKey,
} from "@/lib/schedule";
import { getStats } from "@/lib/stats";
import { ActionButton } from "@/components/action-button";
import { toggleFinalize, generateSchedule, clearAuto } from "../actions";
import { SettingsPanel } from "./settings-panel";
import { Grid } from "./grid";
import { FairnessPanel } from "./fairness-panel";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schedule = db.select().from(schedules).where(eq(schedules.id, id)).get();
  if (!schedule) notFound();

  const settings = (schedule.settings ?? { dutyTypes: [] }) as ScheduleSettings;
  const activeDutyIds = settings.dutyTypes.map((d) => d.dutyTypeId);
  const readOnly = schedule.status === "finalized";

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
  const activeDuties = activeDutyIds
    .map((did) => dutyById.get(did))
    .filter((d): d is (typeof allDuties)[number] => Boolean(d))
    .map((d) => ({ id: d.id, name: d.name, color: d.color }));
  const dutyMeta: Record<string, { name: string; color: string | null }> = {};
  for (const d of allDuties) dutyMeta[d.id] = { name: d.name, color: d.color };

  const allowed = allowedRanksByDuty();
  const ppl = db
    .select({
      id: people.id,
      name: people.fullName,
      status: people.status,
      rankId: people.rankId,
      rankName: ranks.name,
    })
    .from(people)
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .where(ne(people.status, "archived"))
    .orderBy(asc(ranks.sortOrder), asc(people.fullName))
    .all();
  const gridPeople = ppl.map((p) => ({
    id: p.id,
    name: p.name,
    rankName: p.rankName,
    status: p.status,
    eligible: activeDutyIds.filter((did) => isEligible(allowed, did, p.rankId)),
  }));

  const assignmentsByCell: Record<string, string[]> = {};
  for (const a of db
    .select()
    .from(assignments)
    .where(eq(assignments.scheduleId, id))
    .all()) {
    (assignmentsByCell[cellKey(a.personId, a.date)] ??= []).push(a.dutyTypeId);
  }

  const rejectedCells = db
    .select()
    .from(unavailabilities)
    .where(eq(unavailabilities.scheduleId, id))
    .all()
    .map((u) => cellKey(u.personId, u.date));

  const days = dates.map((date) => {
    const cal = calByDate.get(date);
    const dayType = cal?.dayType ?? "weekday";
    return {
      date,
      day: dayNum(date),
      dow: dowOf(date),
      dayType,
      label: cal?.label ?? null,
      heavy: isHeavyType(dayType),
    };
  });

  const settingsCurrent: Record<string, number> = {};
  for (const d of settings.dutyTypes) settingsCurrent[d.dutyTypeId] = d.perDay;

  // Προεπισκόπηση δικαιοσύνης (Φάση 6, D11): διαχρονική ισορροπία ενεργών ατόμων.
  // Επαναχρησιμοποιεί τους ίδιους υπολογισμούς με τα Στατιστικά (D5/Φάση 5).
  const today = new Date().toISOString().slice(0, 10);
  const fairnessPeople = getStats({}, today)
    .persons.filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      name: p.name,
      rankName: p.rankName,
      perMonth: p.perMonth,
      heavyPerMonth: (p.heavy / p.availableDays) * 30,
    }));

  // Κάλυψη: πόσες θέσεις χρειάζονται vs πόσες είναι γεμάτες (για ενεργές υπηρεσίες).
  const activeIdSet = new Set(activeDutyIds);
  const neededTotal =
    days.length * settings.dutyTypes.reduce((s, d) => s + d.perDay, 0);
  let filledTotal = 0;
  for (const ids of Object.values(assignmentsByCell))
    for (const did of ids) if (activeIdSet.has(did)) filledTotal++;
  const fullyCovered = neededTotal > 0 && filledTotal >= neededTotal;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/schedule"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Υπηρεσίες Μήνα
        </Link>
        <Link
          href={`/history/${schedule.id}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Ανασκόπηση →
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {monthLabel(schedule.year, schedule.month)}
          </h1>
          <p className="text-sm text-gray-500">
            {gridPeople.length} άτομα · {activeDuties.length} ενεργές υπηρεσίες ·{" "}
            <span className={fullyCovered ? "text-green-600" : "text-amber-600"}>
              κάλυψη {filledTotal}/{neededTotal}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && activeDuties.length > 0 ? (
            <>
              <ActionButton
                action={generateSchedule}
                id={schedule.id}
                className={ui.btn}
                confirm="Αυτόματη κατανομή για όλον τον μήνα; (διατηρεί τις χειροκίνητες, αντικαθιστά τις προηγούμενες αυτόματες)"
              >
                Αυτόματη κατανομή
              </ActionButton>
              <ActionButton
                action={clearAuto}
                id={schedule.id}
                className={ui.btnSm}
                confirm="Να αφαιρεθούν οι αυτόματες εκχωρήσεις; (οι χειροκίνητες μένουν)"
              >
                Καθαρισμός auto
              </ActionButton>
            </>
          ) : null}
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              readOnly
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {readOnly ? "οριστικό" : "πρόχειρο"}
          </span>
          <a
            href={`/history/${schedule.id}/export`}
            className={ui.btnSm}
            download
          >
            Κατέβασε CSV
          </a>
          <ActionButton
            action={toggleFinalize}
            id={schedule.id}
            className={ui.btnSm}
          >
            {readOnly ? "Επαναφορά σε πρόχειρο" : "Οριστικοποίηση"}
          </ActionButton>
        </div>
      </div>

      <SettingsPanel
        scheduleId={schedule.id}
        duties={allDuties.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
          defaultPerDay: d.defaultPerDay,
        }))}
        current={settingsCurrent}
        disabled={readOnly}
      />

      <FairnessPanel people={fairnessPeople} />

      {activeDuties.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {activeDuties.map((d) => (
            <span key={d.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-[2px]"
                style={{ backgroundColor: d.color ?? "#9ca3af" }}
              />
              {d.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="text-red-500">✕</span> απόρριψη
          </span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700">
          Δεν έχεις ενεργές υπηρεσίες γι&apos; αυτόν τον μήνα — άνοιξε τις
          «Ρυθμίσεις μήνα».
        </p>
      )}

      <Grid
        scheduleId={schedule.id}
        readOnly={readOnly}
        days={days}
        people={gridPeople}
        duties={activeDuties}
        dutyMeta={dutyMeta}
        assignmentsByCell={assignmentsByCell}
        rejectedCells={rejectedCells}
      />
    </div>
  );
}
