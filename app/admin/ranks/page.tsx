import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { ActionButton } from "@/components/action-button";
import { RankForm } from "./rank-form";
import { deleteRank } from "./actions";

export const dynamic = "force-dynamic";

export default function RanksPage() {
  const rows = db
    .select()
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Βαθμοί</h1>
      <p className="mt-1 text-sm text-gray-500">
        Η σειρά καθορίζει την ιεραρχική ταξινόμηση στα στατιστικά.
      </p>

      <div className={`${ui.card} mt-4 p-4`}>
        <RankForm />
      </div>

      <div className={`${ui.card} mt-6 overflow-hidden`}>
        <table className={ui.table}>
          <thead className="bg-gray-50">
            <tr>
              <th className={`${ui.th} w-20`}>Σειρά</th>
              <th className={ui.th}>Όνομα</th>
              <th className={ui.th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${ui.td} text-gray-500`}>{r.sortOrder}</td>
                <td className={`${ui.td} font-medium`}>{r.name}</td>
                <td className={`${ui.td} text-right`}>
                  <ActionButton
                    action={deleteRank}
                    id={r.id}
                    className={ui.btnDanger}
                    confirm={`Διαγραφή του βαθμού «${r.name}»;`}
                  >
                    Διαγραφή
                  </ActionButton>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className={`${ui.td} text-gray-400`} colSpan={3}>
                  Κανένας βαθμός ακόμα.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
