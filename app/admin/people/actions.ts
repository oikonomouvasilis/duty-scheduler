"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { people, assignments, unavailabilities } from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const statusEnum = z.enum(["active", "frozen", "archived"]);

const PersonInput = z.object({
  fullName: z.string().trim().min(1, "Το ονοματεπώνυμο είναι υποχρεωτικό"),
  rankId: z
    .string()
    .trim()
    .transform((v) => v || null),
  serviceStartDate: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || DATE_RE.test(v), "Ημερομηνία σε μορφή ΕΕΕΕ-ΜΜ-ΗΗ"),
  notes: z
    .string()
    .trim()
    .transform((v) => v || null),
});

function readPerson(formData: FormData) {
  return PersonInput.safeParse({
    fullName: formData.get("fullName") ?? "",
    rankId: formData.get("rankId") ?? "",
    serviceStartDate: formData.get("serviceStartDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createPerson(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = readPerson(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    db.insert(people).values({ ...parsed.data, status: "active" }).run();
  } catch {
    return fail("Σφάλμα αποθήκευσης (έλεγξε τον βαθμό).");
  }
  revalidatePath("/admin/people");
  return ok();
}

export async function updatePerson(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const parsed = readPerson(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const status = statusEnum.safeParse(formData.get("status"));
  try {
    db.update(people)
      .set({ ...parsed.data, status: status.success ? status.data : "active" })
      .where(eq(people.id, id))
      .run();
  } catch {
    return fail("Σφάλμα αποθήκευσης (έλεγξε τον βαθμό).");
  }
  revalidatePath("/admin/people");
  redirect("/admin/people");
}

async function setStatus(
  formData: FormData,
  status: "active" | "frozen" | "archived",
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  db.update(people).set({ status }).where(eq(people.id, id)).run();
  revalidatePath("/admin/people");
  return ok();
}

export async function freezePerson(fd: FormData) {
  return setStatus(fd, "frozen");
}
export async function unfreezePerson(fd: FormData) {
  return setStatus(fd, "active");
}
export async function archivePerson(fd: FormData) {
  return setStatus(fd, "archived");
}
export async function restorePerson(fd: FormData) {
  return setStatus(fd, "active");
}

export async function deletePerson(formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const refs =
    db.select().from(assignments).where(eq(assignments.personId, id)).all()
      .length +
    db
      .select()
      .from(unavailabilities)
      .where(eq(unavailabilities.personId, id))
      .all().length;
  if (refs > 0)
    return fail("Έχει ιστορικό — κάνε «Αρχειοθέτηση» αντί για διαγραφή.");
  try {
    db.delete(people).where(eq(people.id, id)).run();
  } catch {
    return fail("Δεν διαγράφεται.");
  }
  revalidatePath("/admin/people");
  return ok();
}
