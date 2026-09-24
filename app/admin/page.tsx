import Link from "next/link";
import { inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { people, ranks, dutyTypes, calendarDays } from "@/db/schema";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const cards = [
    {
      href: "/admin/people",
      label: "Προσωπικό",
      hint: "ενεργά άτομα",
      n: db.select().from(people).where(ne(people.status, "archived")).all()
        .length,
    },
    {
      href: "/admin/ranks",
      label: "Βαθμοί",
      hint: "σύνολο",
      n: db.select().from(ranks).all().length,
    },
    {
      href: "/admin/duties",
      label: "Είδη υπηρεσιών",
      hint: "σύνολο",
      n: db.select().from(dutyTypes).all().length,
    },
    {
      href: "/admin/calendar",
      label: "Αργίες / Ειδικές",
      hint: "καταχωρημένες",
      n: db
        .select()
        .from(calendarDays)
        .where(inArray(calendarDays.dayType, ["holiday", "special"]))
        .all().length,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Διαχείριση
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Λίστες ατόμων, βαθμών, ειδών υπηρεσιών και ειδικών ημερών.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`${ui.card} p-4 transition hover:border-gray-400 dark:hover:border-gray-600`}
          >
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {c.n}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {c.label}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {c.hint}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
