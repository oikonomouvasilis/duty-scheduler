"use client";

import { useActionState } from "react";
import { idleResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { MONTHS_EL } from "@/lib/dates";
import { createSchedule } from "./actions";

export function CreateScheduleForm() {
  const [state, action, pending] = useActionState(createSchedule, idleResult);
  const now = new Date();

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className={ui.label}>Μήνας</label>
        <select
          name="month"
          defaultValue={now.getMonth() + 1}
          className={ui.input}
        >
          {MONTHS_EL.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className={ui.label}>Έτος</label>
        <input
          name="year"
          type="number"
          defaultValue={now.getFullYear()}
          className={ui.input}
        />
      </div>
      <button className={ui.btn} disabled={pending}>
        Δημιουργία
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
