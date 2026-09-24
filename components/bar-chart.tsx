// Απλή οριζόντια μπάρα κατανομής (χωρίς βιβλιοθήκη γραφημάτων) — server-renderable.
export type BarItem = {
  key: string;
  label: string;
  value: number;
};

export function BarChart({
  items,
  formatValue = (v) => v.toFixed(1),
}: {
  items: BarItem[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-3">
          <div
            className="w-32 shrink-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300"
            title={it.label}
          >
            {it.label}
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
              style={{ width: `${(Math.max(0, it.value) / max) * 100}%` }}
            />
          </div>
          <div className="w-12 shrink-0 text-right text-sm tabular-nums text-gray-600 dark:text-gray-400">
            {formatValue(it.value)}
          </div>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Δεν υπάρχουν δεδομένα.
        </p>
      ) : null}
    </div>
  );
}
