"use client";

import { useActionState, useEffect, useRef } from "react";
import { idleResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { createRank } from "./actions";

export function RankForm() {
  const [state, action, pending] = useActionState(createRank, idleResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <div className="grow">
        <label className={ui.label}>Όνομα βαθμού</label>
        <input name="name" className={ui.input} placeholder="π.χ. Λοχίας" />
      </div>
      <div className="w-24">
        <label className={ui.label}>Σειρά</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={0}
          className={ui.input}
        />
      </div>
      <button className={ui.btn} disabled={pending}>
        Προσθήκη
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
