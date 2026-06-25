"use client";

import { useActionState, useEffect, useRef } from "react";
import { idleResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { upsertDay } from "./actions";

export function CalendarForm() {
  const [state, action, pending] = useActionState(upsertDay, idleResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className={ui.label}>Ημερομηνία</label>
        <input name="date" type="date" className={ui.input} />
      </div>
      <div>
        <label className={ui.label}>Τύπος</label>
        <select name="dayType" defaultValue="holiday" className={ui.input}>
          <option value="holiday">αργία</option>
          <option value="special">ειδική</option>
          <option value="weekday">καθημερινή</option>
          <option value="weekend">Σαββατοκύριακο</option>
        </select>
      </div>
      <div className="grow">
        <label className={ui.label}>Ετικέτα</label>
        <input
          name="label"
          className={ui.input}
          placeholder="π.χ. Δεκαπενταύγουστος"
        />
      </div>
      <button className={ui.btn} disabled={pending}>
        Καταχώρηση
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
