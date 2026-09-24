"use server";

import { revalidatePath } from "next/cache";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ranks } from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";

const RankInput = z.object({
  name: z.string().trim().min(1, "Το όνομα βαθμού είναι υποχρεωτικό"),
});

// Κανονικοποίηση Ελληνικού κειμένου για σύγκριση: πεζά, χωρίς τόνους/διαλυτικά,
// τελικό σίγμα (ς) → κανονικό (σ), ενιαία κενά. Έτσι «Δόκιμος» και «δοκιμος»
// (χωρίς τόνο) πιάνονται σωστά ως το ίδιο όνομα.
const COMBINING_MARKS = /[̀-ͯ]/g;

function normalizeName(s: string): string {
  return s
    .toLocaleLowerCase("el")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/ς/g, "σ")
    .trim()
    .replace(/\s+/g, " ");
}

// Επιστρέφει το ήδη υπάρχον rank με το ίδιο όνομα (κανονικοποιημένο), αν υπάρχει.
function findDuplicate(name: string, excludeId?: string) {
  const target = normalizeName(name);
  return db
    .select()
    .from(ranks)
    .all()
    .find((r) => normalizeName(r.name) === target && r.id !== excludeId);
}

export async function createRank(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = RankInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name } = parsed.data;

  if (findDuplicate(name))
    return fail(`Ο βαθμός «${name}» υπάρχει ήδη.`);

  const maxOrder =
    db.select({ m: max(ranks.sortOrder) }).from(ranks).get()?.m ?? -1;
  db.insert(ranks).values({ name, sortOrder: maxOrder + 1 }).run();
  revalidatePath("/admin/ranks");
  return ok();
}

export async function updateRank(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const parsed = RankInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name } = parsed.data;

  if (findDuplicate(name, id))
    return fail(`Ο βαθμός «${name}» υπάρχει ήδη.`);

  db.update(ranks).set({ name }).where(eq(ranks.id, id)).run();
  revalidatePath("/admin/ranks");
  return ok();
}

export async function deleteRank(formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  try {
    db.delete(ranks).where(eq(ranks.id, id)).run();
  } catch {
    return fail("Χρησιμοποιείται (άτομα/υπηρεσίες) — δεν διαγράφεται.");
  }
  revalidatePath("/admin/ranks");
  return ok();
}
