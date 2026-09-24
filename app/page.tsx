import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  people,
  ranks,
  dutyTypes,
  calendarDays,
  assignments,
} from "@/db/schema";

// Διαβάζει από το τοπικό SQLite σε κάθε request (όχι build-time prerender).
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "ενεργός",
  frozen: "παγωμένος",
  archived: "αρχειοθετημένος",
};

export default function Home() {
  const roster = db
    .select({
      id: people.id,
      name: people.fullName,
      rank: ranks.name,
      status: people.status,
      start: people.serviceStartDate,
    })
    .from(people)
    .leftJoin(ranks, eq(people.rankId, ranks.id))
    .orderBy(ranks.sortOrder, people.fullName)
    .all();

  const counts = {
    people: roster.length,
    duties: db.select().from(dutyTypes).all().length,
    days: db.select().from(calendarDays).all().length,
    assignments: db.select().from(assignments).all().length,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Αρχική
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Τοπική βάση SQLite (Drizzle + better-sqlite3). Δεδομένα demo.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Άτομα", counts.people],
          ["Υπηρεσίες", counts.duties],
          ["Μέρες", counts.days],
          ["Εκχωρήσεις", counts.assignments],
        ].map(([label, n]) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {n}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {label}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Προσωπικό
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Όνομα</th>
                <th className="px-4 py-2 font-medium">Βαθμός</th>
                <th className="px-4 py-2 font-medium">Κατάσταση</th>
                <th className="px-4 py-2 font-medium">Έναρξη</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {roster.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {p.rank ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {p.start ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
