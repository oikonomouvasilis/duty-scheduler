import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { schedules, assignments } from "@/db/schema";
import { ui } from "@/lib/ui";
import { monthLabel } from "@/lib/dates";
import { ActionButton } from "@/components/action-button";
import { CreateScheduleForm } from "./create-form";
import { deleteSchedule } from "./actions";

export const dynamic = "force-dynamic";

export default function ScheduleListPage() {
  const rows = db
    .select()
    .from(schedules)
    .orderBy(desc(schedules.year), desc(schedules.month))
    .all();

  const countBySchedule = new Map<string, number>();
  for (const r of rows) {
    countBySchedule.set(
      r.id,
      db.select().from(assignments).where(eq(assignments.scheduleId, r.id))
        .all().length,
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Αρχική
      </Link>
      <h1 className="mt-2 text-xl font-bold tracking-tight">Υπηρεσίες Μήνα</h1>

      <div className={`${ui.card} mt-4 p-4`}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Νέος μήνας
        </h2>
        <CreateScheduleForm />
      </div>

      <div className={`${ui.card} mt-6 divide-y divide-gray-100`}>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-4">
            <Link href={`/schedule/${r.id}`} className="min-w-0 flex-1">
              <div className="font-medium">{monthLabel(r.year, r.month)}</div>
              <div className="text-xs text-gray-400">
                {countBySchedule.get(r.id) ?? 0} εκχωρήσεις
              </div>
            </Link>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                r.status === "finalized"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {r.status === "finalized" ? "οριστικό" : "πρόχειρο"}
            </span>
            <Link href={`/schedule/${r.id}`} className={ui.btnSm}>
              Άνοιγμα
            </Link>
            <ActionButton
              action={deleteSchedule}
              id={r.id}
              className={ui.btnDanger}
              confirm={`Διαγραφή του προγράμματος «${monthLabel(r.year, r.month)}» και όλων των εκχωρήσεών του;`}
            >
              Διαγραφή
            </ActionButton>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className={`${ui.td} text-gray-400`}>Κανένα πρόγραμμα ακόμα.</p>
        ) : null}
      </div>
    </div>
  );
}
