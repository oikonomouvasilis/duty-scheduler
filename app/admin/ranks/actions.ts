"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ranks } from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";

const RankInput = z.object({
  name: z.string().trim().min(1, "Το όνομα βαθμού είναι υποχρεωτικό"),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createRank(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = RankInput.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  db.insert(ranks).values(parsed.data).run();
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
