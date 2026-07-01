import Link from "next/link";
import { NavLink } from "./nav-link";

const nav = [
  { href: "/admin", label: "Επισκόπηση" },
  { href: "/admin/people", label: "Προσωπικό" },
  { href: "/admin/ranks", label: "Βαθμοί" },
  { href: "/admin/duties", label: "Υπηρεσίες" },
  { href: "/admin/calendar", label: "Αργίες / Ειδικές" },
  { href: "/admin/backup", label: "Αντίγραφα ασφαλείας" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:flex-row">
      <aside className="shrink-0 sm:w-48">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Αρχική
        </Link>
        <nav className="mt-4 space-y-1">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
