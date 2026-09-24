"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { calendarDays, assignments } from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DayInput = z.object({
  date: z.string().trim().regex(DATE_RE, "Επίλεξε ημερομηνία"),
  dayType: z.enum(["holiday", "special"]),
  label: z
    .string()
    .trim()
    .transform((v) => v || null),
});

export async function upsertDay(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = DayInput.safeParse({
    date: formData.get("date") ?? "",
    dayType: formData.get("dayType") ?? "",
    label: formData.get("label") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { date, dayType, label } = parsed.data;
  db.insert(calendarDays)
    .values({ date, dayType, label })
    .onConflictDoUpdate({
      target: calendarDays.date,
      set: { dayType, label },
    })
    .run();
  revalidatePath("/admin/calendar");
  return ok();
}

export async function deleteDay(formData: FormData): Promise<FormResult> {
  const date = String(formData.get("id") ?? "");
  const used = db
    .select()
    .from(assignments)
    .where(eq(assignments.date, date))
    .all().length;
  if (used > 0)
    return fail("Υπάρχουν εκχωρήσεις αυτή τη μέρα — δεν διαγράφεται.");
  try {
    db.delete(calendarDays).where(eq(calendarDays.date, date)).run();
  } catch {
    return fail("Δεν διαγράφεται.");
  }
  revalidatePath("/admin/calendar");
  return ok();
}
