// Κοινές κλάσεις Tailwind για συνέπεια στο admin UI.
export const ui = {
  input:
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
  label: "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500",
  btn: "inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50",
  btnSm: "inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50",
  btnDanger:
    "inline-flex items-center justify-center rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50",
  card: "rounded-lg border border-gray-200 bg-white shadow-sm",
  table: "w-full border-collapse",
  th: "px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500",
  td: "px-4 py-2 text-sm",
} as const;
