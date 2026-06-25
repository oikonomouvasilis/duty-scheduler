"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dutyTypes, dutyTypeRanks, assignments } from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";

const DutyInput = z.object({
  name: z.string().trim().min(1, "Το όνομα υπηρεσίας είναι υποχρεωτικό"),
  defaultPerDay: z.coerce.number().int().min(0, "Οι θέσεις/μέρα πρέπει να είναι ≥ 0"),
  color: z
    .string()
    .trim()
    .transform((v) => v || null),
  active: z.boolean(),
});

function readDuty(formData: FormData) {
  return DutyInput.safeParse({
    name: formData.get("name") ?? "",
    defaultPerDay: formData.get("defaultPerDay") || 1,
    color: formData.get("color") ?? "",
    active: formData.get("active") === "on",
  });
}

function readRankIds(formData: FormData): string[] {
  return formData.getAll("rankIds").map(String).filter(Boolean);
}

export async function createDuty(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = readDuty(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const rankIds = readRankIds(formData);
  const id = crypto.randomUUID();
  try {
    db.insert(dutyTypes).values({ id, ...parsed.data }).run();
    if (rankIds.length > 0)
      db.insert(dutyTypeRanks)
        .values(rankIds.map((rankId) => ({ dutyTypeId: id, rankId })))
        .run();
  } catch {
    return fail("Σφάλμα αποθήκευσης.");
  }
  revalidatePath("/admin/duties");
  return ok();
}

export async function updateDuty(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const parsed = readDuty(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const rankIds = readRankIds(formData);
  try {
    db.update(dutyTypes).set(parsed.data).where(eq(dutyTypes.id, id)).run();
    db.delete(dutyTypeRanks).where(eq(dutyTypeRanks.dutyTypeId, id)).run();
    if (rankIds.length > 0)
      db.insert(dutyTypeRanks)
        .values(rankIds.map((rankId) => ({ dutyTypeId: id, rankId })))
        .run();
  } catch {
    return fail("Σφάλμα αποθήκευσης.");
  }
  revalidatePath("/admin/duties");
  redirect("/admin/duties");
}

export async function deleteDuty(formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const used = db
    .select()
    .from(assignments)
    .where(eq(assignments.dutyTypeId, id))
    .all().length;
  if (used > 0)
    return fail("Χρησιμοποιείται σε εκχωρήσεις — απενεργοποίησέ το αντί να διαγραφεί.");
  try {
    db.delete(dutyTypeRanks).where(eq(dutyTypeRanks.dutyTypeId, id)).run();
    db.delete(dutyTypes).where(eq(dutyTypes.id, id)).run();
  } catch {
    return fail("Δεν διαγράφεται.");
  }
  revalidatePath("/admin/duties");
  return ok();
}
