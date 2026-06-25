"use client";

import { useActionState } from "react";
import { idleResult, type FormResult } from "@/lib/form";

/**
 * Κουμπί που εκτελεί ένα server action (delete/toggle κ.λπ.) μέσα σε form.
 * Δείχνει inline σφάλμα (π.χ. FK constraint) και υποστηρίζει confirm.
 */
export function ActionButton({
  action,
  id,
  children,
  className,
  confirm,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  id: string;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: FormResult, formData: FormData) => action(formData),
    idleResult,
  );

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={className}>
        {children}
      </button>
      {state.error ? (
        <span className="ml-2 align-middle text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
