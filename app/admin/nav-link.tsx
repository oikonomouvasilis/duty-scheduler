"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}
