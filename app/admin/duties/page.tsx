import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dutyTypes, dutyTypeRanks, ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { ActionButton } from "@/components/action-button";
import { DutyForm } from "./duty-form";
import { createDuty, deleteDuty } from "./actions";

export const dynamic = "force-dynamic";

export default function DutiesPage() {
  const rankList = db
    .select({ id: ranks.id, name: ranks.name })
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  const duties = db.select().from(dutyTypes).orderBy(asc(dutyTypes.name)).all();

  const links = db
    .select({ dutyTypeId: dutyTypeRanks.dutyTypeId, rankName: ranks.name })
    .from(dutyTypeRanks)
    .innerJoin(ranks, eq(dutyTypeRanks.rankId, ranks.id))
    .all();

  const ranksByDuty = new Map<string, string[]>();
  for (const l of links) {
    const arr = ranksByDuty.get(l.dutyTypeId) ?? [];
    arr.push(l.rankName);
    ranksByDuty.set(l.dutyTypeId, arr);
  }

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Είδη υπηρεσιών</h1>

      <div className={`${ui.card} mt-4 p-4`}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Νέα υπηρεσία
        </h2>
        <DutyForm action={createDuty} ranks={rankList} resetOnSuccess />
      </div>

      <div className={`${ui.card} mt-6 overflow-x-auto`}>
        <table className={ui.table}>
          <thead className="bg-gray-50">
            <tr>
              <th className={ui.th}>Υπηρεσία</th>
              <th className={ui.th}>Θέσεις/μέρα</th>
              <th className={ui.th}>Βαθμοί</th>
              <th className={ui.th}>Κατάσταση</th>
              <th className={ui.th}>Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {duties.map((d) => (
              <tr key={d.id} className={d.active ? "" : "opacity-60"}>
                <td className={`${ui.td} font-medium`}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: d.color ?? "#9ca3af" }}
                    />
                    {d.name}
                  </span>
                </td>
                <td className={`${ui.td} text-gray-600`}>{d.defaultPerDay}</td>
                <td className={`${ui.td} text-gray-600`}>
                  {(ranksByDuty.get(d.id) ?? []).join(", ") || "—"}
                </td>
                <td className={ui.td}>
                  {d.active ? (
                    <span className="text-green-700">ενεργό</span>
                  ) : (
                    <span className="text-gray-400">ανενεργό</span>
                  )}
                </td>
                <td className={ui.td}>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/duties/${d.id}`} className={ui.btnSm}>
                      Επεξεργασία
                    </Link>
                    <ActionButton
                      action={deleteDuty}
                      id={d.id}
                      className={ui.btnDanger}
                      confirm={`Διαγραφή της υπηρεσίας «${d.name}»;`}
                    >
                      Διαγραφή
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {duties.length === 0 ? (
              <tr>
                <td className={`${ui.td} text-gray-400`} colSpan={5}>
                  Καμία υπηρεσία ακόμα.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
