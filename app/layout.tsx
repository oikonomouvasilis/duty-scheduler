import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "duty-scheduler",
  description: "Αυτοματοποίηση εκχώρησης υπηρεσιών (τοπικά, SQLite)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
