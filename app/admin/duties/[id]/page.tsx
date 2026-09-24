import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dutyTypes, dutyTypeRanks, ranks } from "@/db/schema";
import { ui } from "@/lib/ui";
import { DutyForm } from "../duty-form";
import { updateDuty } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditDutyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duty = db.select().from(dutyTypes).where(eq(dutyTypes.id, id)).get();
  if (!duty) notFound();

  const rankList = db
    .select({ id: ranks.id, name: ranks.name })
    .from(ranks)
    .orderBy(asc(ranks.sortOrder), asc(ranks.name))
    .all();

  const rankIds = db
    .select({ rankId: dutyTypeRanks.rankId })
    .from(dutyTypeRanks)
    .where(eq(dutyTypeRanks.dutyTypeId, id))
    .all()
    .map((x) => x.rankId);

  return (
    <div>
      <Link
        href="/admin/duties"
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        ← Υπηρεσίες
      </Link>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Επεξεργασία υπηρεσίας
      </h1>

      <div className={`${ui.card} mt-4 p-4`}>
        <DutyForm
          action={updateDuty}
          ranks={rankList}
          duty={{ ...duty, rankIds }}
          submitLabel="Αποθήκευση"
        />
      </div>
    </div>
  );
}
