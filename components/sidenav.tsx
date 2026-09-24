"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  DatabaseBackup,
  History,
  Home,
  Menu,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type Item = { href: string; label: string; icon: LucideIcon };

const MAIN: Item[] = [
  { href: "/", label: "Αρχική", icon: Home },
  { href: "/schedule", label: "Υπηρεσίες Μήνα", icon: CalendarRange },
  { href: "/history", label: "Ημερολόγιο", icon: History },
  { href: "/stats", label: "Στατιστικά", icon: BarChart3 },
];

const ADMIN: Item[] = [
  { href: "/admin/people", label: "Προσωπικό", icon: Users },
  { href: "/admin/ranks", label: "Βαθμοί", icon: Award },
  { href: "/admin/duties", label: "Υπηρεσίες", icon: ClipboardList },
  { href: "/admin/calendar", label: "Αργίες / Ειδικές", icon: CalendarDays },
  { href: "/admin/backup", label: "Αντίγραφα ασφαλείας", icon: DatabaseBackup },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SidenavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: Item;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-500" />
      ) : null}
      <Icon size={18} className="shrink-0" />
      {item.label}
    </Link>
  );
}

function SidenavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 px-3 py-4 font-bold tracking-tight text-gray-900 dark:text-white"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
          <ShieldCheck size={18} />
        </span>
        Υπηρεσίες
      </Link>

      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-2">
        {MAIN.map((item) => (
          <SidenavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}

        <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-600">
          Διαχείριση
        </div>
        {ADMIN.map((item) => (
          <SidenavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-gray-200 p-2 dark:border-gray-800">
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidenav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 md:hidden">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
            <ShieldCheck size={16} />
          </span>
          Υπηρεσίες
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-gray-600 dark:text-gray-400"
          aria-label="Άνοιγμα μενού"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-white px-2 dark:bg-gray-950">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Κλείσιμο μενού"
            >
              <X size={18} />
            </button>
            <SidenavContent
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-gray-200 md:bg-white md:px-2 dark:md:border-gray-800 dark:md:bg-gray-950">
        <SidenavContent pathname={pathname} />
      </aside>
    </>
  );
}
