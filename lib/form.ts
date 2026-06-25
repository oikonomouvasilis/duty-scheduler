// Κοινός τύπος αποτελέσματος για server actions (χρησιμοποιείται με useActionState).
export type FormResult = { ok: boolean; error: string | null };

export const idleResult: FormResult = { ok: false, error: null };

export function ok(): FormResult {
  return { ok: true, error: null };
}

export function fail(error: string): FormResult {
  return { ok: false, error };
}
