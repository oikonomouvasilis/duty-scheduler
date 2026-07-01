// Server-side εξαγωγή μήνα σε CSV (χρησιμοποιεί DB — όχι για client).
//
// «Επίπεδη» μορφή: μία γραμμή ανά εκχώρηση (ημερομηνία × άτομο × υπηρεσία), που είναι
// η πιο ανθεκτική/επαναεισαγώγιμη. Τα σύνολα/πίνακες παράγονται από τα Στατιστικά.
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  schedules,
  people,
  ranks,
  dutyTypes,
  units,
  calendarDays,
  assignments,
} from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { dowOf, WEEKDAYS_EL, pad2 } from "@/lib/dates";

const DAY_TYPE_EL: Record<string, string> = {
  weekday: "Καθημερινή",
  weekend: "Σαββατοκύριακο",
  holiday: "Αργία",
  special: "Ειδική",
};
const SOURCE_EL: Record<string, string> = {
  auto: "αυτόματη",
  manual: "χειροκίνητη",
};

const HEADERS = [
  "Ημερομηνία",
  "Ημέρα",
  "Τύπος",
  "Ετικέτα",
  "Όνομα",
  "Βαθμός",
  "Υπηρεσία",
  "Μονάδα",
  "Πηγή",
];

export type MonthCsv = { filename: string; csv: string };

/** CSV του μήνα, ή null αν δεν βρεθεί το πρόγραμμα. Filename ASCII (Content-Disposition). */
export function buildMonthCsv(scheduleId: string): MonthCsv | null {
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();
  if (!schedule) return null;

  const rows = db
    .select({
      date: assignments.date,
      dayType: calendarDays.dayType,
      label: calendarDays.label,
      name: people.fullName,
      rank: ranks.name,
      duty: dutyTypes.name,
      unit: units.name,
      source: assignments.source,
    })
    .from(assignments)
    .innerJoin(people, eq(assignments.personId, people.id))
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .innerJoin(dutyTypes, eq(assignments.dutyTypeId, dutyTypes.id))
    .innerJoin(units, eq(assignments.unitId, units.id))
    .leftJoin(calendarDays, eq(assignments.date, calendarDays.date))
    .where(eq(assignments.scheduleId, scheduleId))
    .orderBy(asc(assignments.date), asc(dutyTypes.name), asc(people.fullName))
    .all();

  const body = rows.map((r) => [
    r.date,
    WEEKDAYS_EL[dowOf(r.date)],
    DAY_TYPE_EL[r.dayType ?? "weekday"] ?? r.dayType ?? "",
    r.label ?? "",
    r.name,
    r.rank ?? "",
    r.duty,
    r.unit,
    SOURCE_EL[r.source] ?? r.source,
  ]);

  return {
    filename: `duty-scheduler-${schedule.year}-${pad2(schedule.month)}.csv`,
    csv: toCsv(HEADERS, body),
  };
}
