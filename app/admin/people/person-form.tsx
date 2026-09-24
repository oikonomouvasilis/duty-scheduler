"use client";

import { useActionState, useEffect, useRef } from "react";
import { idleResult, type FormResult } from "@/lib/form";
import { ui } from "@/lib/ui";

type Rank = { id: string; name: string };
type Person = {
  id?: string;
  fullName?: string;
  rankId?: string | null;
  status?: string;
  serviceStartDate?: string | null;
  notes?: string | null;
};

export function PersonForm({
  action,
  ranks,
  person,
  submitLabel = "Προσθήκη",
  withStatus = false,
  resetOnSuccess = false,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  ranks: Rank[];
  person?: Person;
  submitLabel?: string;
  withStatus?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {person?.id ? <input type="hidden" name="id" value={person.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={ui.label}>Ονοματεπώνυμο</label>
          <input
            name="fullName"
            defaultValue={person?.fullName ?? ""}
            className={ui.input}
            placeholder="π.χ. Ιωάννης Παπαδόπουλος"
          />
        </div>

        <div>
          <label className={ui.label}>Βαθμός</label>
          <select
            name="rankId"
            defaultValue={person?.rankId ?? ""}
            className={ui.input}
          >
            <option value="">— χωρίς —</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={ui.label}>Έναρξη υπηρεσιών</label>
          <input
            name="serviceStartDate"
            type="date"
            defaultValue={person?.serviceStartDate ?? ""}
            className={ui.input}
          />
        </div>

        {withStatus ? (
          <div>
            <label className={ui.label}>Κατάσταση</label>
            <select
              name="status"
              defaultValue={person?.status ?? "active"}
              className={ui.input}
            >
              <option value="active">ενεργός</option>
              <option value="frozen">παγωμένος</option>
              <option value="archived">αρχειοθετημένος</option>
            </select>
          </div>
        ) : null}

        <div className={withStatus ? "" : "sm:col-span-2"}>
          <label className={ui.label}>Σημειώσεις</label>
          <input
            name="notes"
            defaultValue={person?.notes ?? ""}
            className={ui.input}
            placeholder="προαιρετικά"
          />
        </div>
      </div>

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
