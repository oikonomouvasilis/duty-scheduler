// Κοινές κλάσεις Tailwind για συνέπεια στο UI (light/dark, accent σκούρο μπλε).
export const ui = {
  input:
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500",
  label:
    "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400",
  btn: "inline-flex items-center justify-center rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50",
  btnSm: "inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
  btnDanger:
    "inline-flex items-center justify-center rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
  card: "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
  table: "w-full border-collapse",
  th: "px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400",
  td: "px-4 py-2 text-sm",
} as const;
