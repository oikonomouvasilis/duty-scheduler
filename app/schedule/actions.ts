"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  schedules,
  dutyTypes,
  assignments,
  unavailabilities,
  type ScheduleSettings,
} from "@/db/schema";
import { ok, fail, type FormResult } from "@/lib/form";
import { ensureCalendarMonth, getHomeUnitId } from "@/lib/schedule";

export async function createSchedule(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return fail("Μη έγκυρο έτος.");
  if (!Number.isInteger(month) || month < 1 || month > 12)
    return fail("Μη έγκυρος μήνας.");

  const existing = db
    .select()
    .from(schedules)
    .where(and(eq(schedules.year, year), eq(schedules.month, month)))
    .get();
  if (existing) return fail("Υπάρχει ήδη πρόγραμμα γι' αυτόν τον μήνα.");

  ensureCalendarMonth(year, month);

  const active = db
    .select()
    .from(dutyTypes)
    .where(eq(dutyTypes.active, true))
    .all();
  const settings: ScheduleSettings = {
    dutyTypes: active.map((d) => ({
      dutyTypeId: d.id,
      perDay: d.defaultPerDay,
    })),
  };

  const id = crypto.randomUUID();
  db.insert(schedules)
    .values({ id, year, month, status: "draft", settings })
    .run();
  revalidatePath("/schedule");
  redirect(`/schedule/${id}`);
}

export async function deleteSchedule(formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  // assignments & unavailabilities φεύγουν με cascade (FK onDelete).
  db.delete(schedules).where(eq(schedules.id, id)).run();
  revalidatePath("/schedule");
  return ok();
}

export async function toggleFinalize(formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const s = db.select().from(schedules).where(eq(schedules.id, id)).get();
  if (!s) return fail("Δεν βρέθηκε.");
  db.update(schedules)
    .set({
      status: s.status === "finalized" ? "draft" : "finalized",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schedules.id, id))
    .run();
  revalidatePath(`/schedule/${id}`);
  revalidatePath("/schedule");
  return ok();
}

export async function updateSettings(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get("scheduleId") ?? "");
  const all = db.select().from(dutyTypes).all();
  const list: ScheduleSettings["dutyTypes"] = [];
  for (const d of all) {
    if (formData.get(`active_${d.id}`) === "on") {
      const perDay = Math.max(0, Number(formData.get(`perDay_${d.id}`)) || 0);
      list.push({ dutyTypeId: d.id, perDay });
    }
  }
  db.update(schedules)
    .set({ settings: { dutyTypes: list }, updatedAt: new Date().toISOString() })
    .where(eq(schedules.id, id))
    .run();
  revalidatePath(`/schedule/${id}`);
  return ok();
}

function guardEditable(scheduleId: string): FormResult | null {
  const s = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();
  if (!s) return fail("Δεν βρέθηκε.");
  if (s.status === "finalized")
    return fail("Το πρόγραμμα είναι οριστικοποιημένο.");
  return null;
}

export async function toggleRejection(
  formData: FormData,
): Promise<FormResult> {
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const date = String(formData.get("date") ?? "");
  const guard = guardEditable(scheduleId);
  if (guard) return guard;

  const existing = db
    .select()
    .from(unavailabilities)
    .where(
      and(
        eq(unavailabilities.scheduleId, scheduleId),
        eq(unavailabilities.personId, personId),
        eq(unavailabilities.date, date),
      ),
    )
    .get();

  if (existing) {
    db.delete(unavailabilities)
      .where(eq(unavailabilities.id, existing.id))
      .run();
  } else {
    // απόρριψη: καθαρίζει τυχόν εκχωρήσεις του κελιού
    db.delete(assignments)
      .where(
        and(
          eq(assignments.scheduleId, scheduleId),
          eq(assignments.personId, personId),
          eq(assignments.date, date),
        ),
      )
      .run();
    db.insert(unavailabilities)
      .values({ scheduleId, personId, date })
      .run();
  }
  revalidatePath(`/schedule/${scheduleId}`);
  return ok();
}

export async function setCellDuties(formData: FormData): Promise<FormResult> {
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const date = String(formData.get("date") ?? "");
  const dutyIds = formData.getAll("dutyIds").map(String).filter(Boolean);
  const guard = guardEditable(scheduleId);
  if (guard) return guard;

  const unitId = getHomeUnitId();

  // καθάρισε το κελί και ξαναγράψε (χειροκίνητα)
  db.delete(assignments)
    .where(
      and(
        eq(assignments.scheduleId, scheduleId),
        eq(assignments.personId, personId),
        eq(assignments.date, date),
      ),
    )
    .run();

  if (dutyIds.length > 0) {
    // εκχώρηση σημαίνει «διαθέσιμος» → φύγε τυχόν απόρριψη
    db.delete(unavailabilities)
      .where(
        and(
          eq(unavailabilities.scheduleId, scheduleId),
          eq(unavailabilities.personId, personId),
          eq(unavailabilities.date, date),
        ),
      )
      .run();
    try {
      db.insert(assignments)
        .values(
          dutyIds.map((dutyTypeId) => ({
            scheduleId,
            personId,
            dutyTypeId,
            unitId,
            date,
            source: "manual" as const,
          })),
        )
        .run();
    } catch {
      return fail("Σφάλμα εκχώρησης.");
    }
  }
  revalidatePath(`/schedule/${scheduleId}`);
  return ok();
}
