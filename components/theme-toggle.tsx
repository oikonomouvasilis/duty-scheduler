"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Segmented control (tabs) Φωτεινό/Σκοτεινό. Διαβάζει την αρχική κατάσταση από
// το <html> (την έχει ήδη ορίσει το THEME_INIT στο layout πριν το πρώτο paint).
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function apply(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
  }

  const tab = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
      active
        ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300"
        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    }`;

  return (
    <div
      role="tablist"
      aria-label="Θέμα εμφάνισης"
      className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!dark}
        onClick={() => apply(false)}
        className={tab(!dark)}
      >
        <Sun size={15} />
        Φωτεινό
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={dark}
        onClick={() => apply(true)}
        className={tab(dark)}
      >
        <Moon size={15} />
        Σκοτεινό
      </button>
    </div>
  );
}
