"use client";

import { useActionState, useState } from "react";
import { idleResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { ActionButton } from "@/components/action-button";
import { updateRank, deleteRank } from "./actions";

export function RankRow({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateRank, idleResult);

  if (state.ok && editing) setEditing(false);

  if (editing) {
    return (
      <tr>
        <td className={ui.td} colSpan={2}>
          <form action={action} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <input
              name="name"
              defaultValue={name}
              autoFocus
              className={`${ui.input} max-w-xs`}
            />
            <button className={ui.btn} disabled={pending}>
              Αποθήκευση
            </button>
            <button
              type="button"
              className={ui.btnSm}
              onClick={() => setEditing(false)}
            >
              Άκυρο
            </button>
            {state.error ? (
              <span className="text-sm text-red-600 dark:text-red-400">
                {state.error}
              </span>
            ) : null}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className={`${ui.td} font-medium text-gray-900 dark:text-gray-100`}>
        {name}
      </td>
      <td className={`${ui.td} text-right`}>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={ui.btnSm}
            onClick={() => setEditing(true)}
          >
            Επεξεργασία
          </button>
          <ActionButton
            action={deleteRank}
            id={id}
            className={ui.btnDanger}
            confirm={`Διαγραφή του βαθμού «${name}»;`}
          >
            Διαγραφή
          </ActionButton>
        </div>
      </td>
    </tr>
  );
}
