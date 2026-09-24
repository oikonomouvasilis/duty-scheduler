import type { Metadata } from "next";
import "./globals.css";
import { Sidenav } from "@/components/sidenav";

export const metadata: Metadata = {
  title: "Υπηρεσίες",
  description: "Αυτοματοποίηση εκχώρησης υπηρεσιών (τοπικά, SQLite)",
};

// Ρυθμίζει το .dark στο <html> πριν το πρώτο paint, ώστε να μην αναβοσβήνει
// η σελίδα από φωτεινό σε σκοτεινό όταν ο χρήστης έχει επιλέξει dark.
const THEME_INIT = `
try {
  var t = localStorage.theme;
  var dark = t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidenav />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
