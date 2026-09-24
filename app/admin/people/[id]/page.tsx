import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { people, ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { PersonForm } from "../person-form";
import { updatePerson } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = db.select().from(people).where(eq(people.id, id)).get();
  if (!person) notFound();

  const rankList = db
    .select({ id: ranks.id, name: ranks.name })
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  return (
    <div>
      <Link
        href="/admin/people"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        ← Προσωπικό
      </Link>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Επεξεργασία ατόμου
      </h1>

      <div className={`${ui.card} mt-4 p-4`}>
        <PersonForm
          action={updatePerson}
          ranks={rankList}
          person={person}
          withStatus
          submitLabel="Αποθήκευση"
        />
      </div>
    </div>
  );
}
