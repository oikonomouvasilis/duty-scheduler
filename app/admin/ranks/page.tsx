import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { RankForm } from "./rank-form";
import { RankRow } from "./rank-row";

export const dynamic = "force-dynamic";

export default function RanksPage() {
  const rows = db
    .select()
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Βαθμοί
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Οι νέοι βαθμοί προστίθενται στο τέλος της λίστας.
      </p>

      <div className={`${ui.card} mt-4 p-4`}>
        <RankForm />
      </div>

      <div className={`${ui.card} mt-6 overflow-hidden`}>
        <table className={ui.table}>
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className={ui.th}>Όνομα</th>
              <th className={ui.th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <RankRow key={r.id} id={r.id} name={r.name} />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  className={`${ui.td} text-gray-400 dark:text-gray-500`}
                  colSpan={2}
                >
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
