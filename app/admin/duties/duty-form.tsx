"use client";

import { useActionState, useEffect, useRef } from "react";
import { idleResult, type FormResult } from "@/lib/form";
import { ui } from "@/lib/ui";

type Rank = { id: string; name: string };
type Duty = {
  id?: string;
  name?: string;
  defaultPerDay?: number;
  color?: string | null;
  active?: boolean;
  rankIds?: string[];
};

export function DutyForm({
  action,
  ranks,
  duty,
  submitLabel = "Προσθήκη",
  resetOnSuccess = false,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  ranks: Rank[];
  duty?: Duty;
  submitLabel?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleResult);
  const ref = useRef<HTMLFormElement>(null);
  const selected = new Set(duty?.rankIds ?? []);

  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {duty?.id ? <input type="hidden" name="id" value={duty.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={ui.label}>Όνομα υπηρεσίας</label>
          <input
            name="name"
            defaultValue={duty?.name ?? ""}
            className={ui.input}
            placeholder="π.χ. Σκοπιά"
          />
        </div>
        <div>
          <label className={ui.label}>Θέσεις / μέρα</label>
          <input
            name="defaultPerDay"
            type="number"
            min={0}
            defaultValue={duty?.defaultPerDay ?? 1}
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label}>Χρώμα</label>
          <input
            name="color"
            type="color"
            defaultValue={duty?.color ?? "#3b82f6"}
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700"
          />
        </div>
      </div>

      <div>
        <label className={ui.label}>Ποιοι βαθμοί την κάνουν</label>
        {ranks.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">— δεν υπάρχουν βαθμοί ακόμα —</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ranks.map((r) => (
              <label
                key={r.id}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="rankIds"
                  value={r.id}
                  defaultChecked={selected.has(r.id)}
                  className="h-4 w-4"
                />
                {r.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={duty?.active ?? true}
          className="h-4 w-4"
        />
        Ενεργό για νέους μήνες
      </label>

      <div className="flex items-center gap-3">
        <button className={ui.btn} disabled={pending}>
          {submitLabel}
        </button>
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
