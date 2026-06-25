import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { calendarDays } from "@/db/schema";
import { ui } from "@/lib/ui";
import { ActionButton } from "@/components/action-button";
import { CalendarForm } from "./calendar-form";
import { deleteDay } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  weekday: "καθημερινή",
  weekend: "Σαββατοκύριακο",
  holiday: "αργία",
  special: "ειδική",
};

export default function CalendarPage() {
  const rows = db
    .select()
    .from(calendarDays)
    .where(inArray(calendarDays.dayType, ["holiday", "special"]))
    .orderBy(asc(calendarDays.date))
    .all();

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Αργίες / Ειδικές μέρες</h1>
      <p className="mt-1 text-sm text-gray-500">
        Οι καθημερινές/Σαββατοκύριακα υπολογίζονται αυτόματα — εδώ καταχωρείς μόνο
        τις εξαιρέσεις. Καταχώρηση σε υπάρχουσα ημερομηνία την ενημερώνει.
      </p>

      <div className={`${ui.card} mt-4 p-4`}>
        <CalendarForm />
      </div>

      <div className={`${ui.card} mt-6 overflow-x-auto`}>
        <table className={ui.table}>
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}>Ημερομηνία</th>
              <th className={ui.th}>Τύπος</th>
              <th className={ui.th}>Ετικέτα</th>
              <th className={ui.th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((d) => (
              <tr key={d.date}>
                <td className={`${ui.td} font-medium`}>{d.date}</td>
                <td className={`${ui.td} text-gray-600`}>
                  {TYPE_LABEL[d.dayType] ?? d.dayType}
                </td>
                <td className={`${ui.td} text-gray-600`}>{d.label ?? "—"}</td>
                <td className={`${ui.td} text-right`}>
                  <ActionButton
                    action={deleteDay}
                    id={d.date}
                    className={ui.btnDanger}
                    confirm={`Διαγραφή της καταχώρησης ${d.date};`}
                  >
                    Διαγραφή
                  </ActionButton>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className={`${ui.td} text-gray-400`} colSpan={4}>
                  Καμία καταχώρηση ακόμα.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
