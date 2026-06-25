"use client";

import { useActionState } from "react";
import { idleResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { updateSettings } from "../actions";

type Duty = {
  id: string;
  name: string;
  color: string | null;
  defaultPerDay: number;
};

export function SettingsPanel({
  scheduleId,
  duties,
  current,
  disabled,
}: {
  scheduleId: string;
  duties: Duty[];
  current: Record<string, number>;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateSettings, idleResult);

  return (
    <details className={`${ui.card} mt-4`}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        Ρυθμίσεις μήνα — ενεργές υπηρεσίες &amp; θέσεις/μέρα
      </summary>
      <form action={action} className="space-y-3 border-t border-gray-100 p-4">
        <input type="hidden" name="scheduleId" value={scheduleId} />
        {duties.length === 0 ? (
          <p className="text-sm text-gray-400">
            Δεν υπάρχουν υπηρεσίες — πρόσθεσε στη Διαχείριση.
          </p>
        ) : (
          duties.map((d) => {
            const active = d.id in current;
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-3">
                <label className="inline-flex w-52 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`active_${d.id}`}
                    defaultChecked={active}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: d.color ?? "#9ca3af" }}
                    />
                    {d.name}
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-500">
                  θέσεις/μέρα
                  <input
                    type="number"
                    min={0}
                    name={`perDay_${d.id}`}
                    defaultValue={active ? current[d.id] : d.defaultPerDay}
                    disabled={disabled}
                    className={`${ui.input} w-20`}
                  />
                </label>
              </div>
            );
          })
        )}
        {!disabled && duties.length > 0 ? (
          <div className="flex items-center gap-3">
            <button className={ui.btn} disabled={pending}>
              Αποθήκευση ρυθμίσεων
            </button>
            {state.ok ? (
              <span className="text-sm text-green-600">Αποθηκεύτηκε.</span>
            ) : null}
            {state.error ? (
              <span className="text-sm text-red-600">{state.error}</span>
            ) : null}
          </div>
        ) : null}
      </form>
    </details>
  );
}
