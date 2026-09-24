import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { people, ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { ActionButton } from "@/components/action-button";
import { PersonForm } from "./person-form";
import {
  createPerson,
  freezePerson,
  unfreezePerson,
  archivePerson,
  restorePerson,
  deletePerson,
} from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "ενεργός",
  frozen: "παγωμένος",
  archived: "αρχειοθετημένος",
};
const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  frozen: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  archived: "bg-gray-200 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? ""}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function PeoplePage() {
  const rankList = db
    .select({ id: ranks.id, name: ranks.name })
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  const rows = db
    .select({
      id: people.id,
      fullName: people.fullName,
      status: people.status,
      start: people.serviceStartDate,
      rank: ranks.name,
    })
    .from(people)
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .orderBy(asc(ranks.sortOrder), asc(people.fullName))
    .all();

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Προσωπικό
      </h1>

      <div className={`${ui.card} mt-4 p-4`}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Νέο άτομο
        </h2>
        {rankList.length === 0 ? (
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
            Πρόσθεσε πρώτα{" "}
            <Link href="/admin/ranks" className="underline">
              βαθμούς
            </Link>
            .
          </p>
        ) : null}
        <PersonForm action={createPerson} ranks={rankList} resetOnSuccess />
      </div>

      <div className={`${ui.card} mt-6 overflow-x-auto`}>
        <table className={ui.table}>
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className={ui.th}>Όνομα</th>
              <th className={ui.th}>Βαθμός</th>
              <th className={ui.th}>Κατάσταση</th>
              <th className={ui.th}>Έναρξη</th>
              <th className={ui.th}>Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((p) => (
              <tr key={p.id} className={p.status === "archived" ? "opacity-60" : ""}>
                <td className={`${ui.td} font-medium text-gray-900 dark:text-gray-100`}>{p.fullName}</td>
                <td className={`${ui.td} text-gray-600 dark:text-gray-400`}>{p.rank ?? "—"}</td>
                <td className={ui.td}>
                  <StatusBadge status={p.status} />
                </td>
                <td className={`${ui.td} text-gray-600 dark:text-gray-400`}>{p.start ?? "—"}</td>
                <td className={ui.td}>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/people/${p.id}`} className={ui.btnSm}>
                      Επεξεργασία
                    </Link>
                    {p.status === "active" ? (
                      <ActionButton
                        action={freezePerson}
                        id={p.id}
                        className={ui.btnSm}
                      >
                        Πάγωμα
                      </ActionButton>
                    ) : null}
                    {p.status === "frozen" ? (
                      <ActionButton
                        action={unfreezePerson}
                        id={p.id}
                        className={ui.btnSm}
                      >
                        Ξεπάγωμα
                      </ActionButton>
                    ) : null}
                    {p.status !== "archived" ? (
                      <ActionButton
                        action={archivePerson}
                        id={p.id}
                        className={ui.btnSm}
                        confirm={`Αρχειοθέτηση του «${p.fullName}»;`}
                      >
                        Αρχειοθέτηση
                      </ActionButton>
                    ) : (
                      <ActionButton
                        action={restorePerson}
                        id={p.id}
                        className={ui.btnSm}
                      >
                        Επαναφορά
                      </ActionButton>
                    )}
                    <ActionButton
                      action={deletePerson}
                      id={p.id}
                      className={ui.btnDanger}
                      confirm={`Οριστική διαγραφή του «${p.fullName}»;`}
                    >
                      Διαγραφή
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className={`${ui.td} text-gray-400 dark:text-gray-500`} colSpan={5}>
                  Κανένα άτομο ακόμα.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
