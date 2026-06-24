import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// --- helpers (φρέσκος builder κάθε φορά — δεν ξαναχρησιμοποιούμε instances) ---
const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  text("created_at").notNull().default(sql`(current_timestamp)`);

// Ρυθμίσεις μήνα (αποθηκεύονται ως JSON στο schedules.settings)
export type ScheduleSettings = {
  dutyTypes: { dutyTypeId: string; perDay: number }[];
};

// ranks — Βαθμοί
export const ranks = sqliteTable("ranks", {
  id: id(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

// people — Προσωπικό
export const people = sqliteTable("people", {
  id: id(),
  fullName: text("full_name").notNull(),
  rankId: text("rank_id").references(() => ranks.id),
  status: text("status", { enum: ["active", "frozen", "archived"] })
    .notNull()
    .default("active"),
  // ISO date YYYY-MM-DD — από πότε ξεκίνησε υπηρεσίες (για δίκαια στατιστικά)
  serviceStartDate: text("service_start_date"),
  notes: text("notes"),
  createdAt: createdAt(),
});

// duty_types — Είδη υπηρεσιών
export const dutyTypes = sqliteTable("duty_types", {
  id: id(),
  name: text("name").notNull(),
  defaultPerDay: integer("default_per_day").notNull().default(1),
  color: text("color"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

// duty_type_ranks — ποιοι βαθμοί κάνουν κάθε υπηρεσία (many-to-many)
export const dutyTypeRanks = sqliteTable(
  "duty_type_ranks",
  {
    dutyTypeId: text("duty_type_id")
      .notNull()
      .references(() => dutyTypes.id, { onDelete: "cascade" }),
    rankId: text("rank_id")
      .notNull()
      .references(() => ranks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.dutyTypeId, t.rankId] })],
);

// units — Μονάδες (δική μας / εξωτερική)
export const units = sqliteTable("units", {
  id: id(),
  name: text("name").notNull(),
  isHome: integer("is_home", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

// calendar_days — Τύπος ημέρας ανά ημερομηνία
export const calendarDays = sqliteTable("calendar_days", {
  date: text("date").primaryKey(), // ISO YYYY-MM-DD
  dayType: text("day_type", {
    enum: ["weekday", "weekend", "holiday", "special"],
  }).notNull(),
  label: text("label"),
});

// schedules — Στιγμιότυπα μήνα
export const schedules = sqliteTable("schedules", {
  id: id(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  status: text("status", { enum: ["draft", "finalized"] })
    .notNull()
    .default("draft"),
  settings: text("settings", { mode: "json" }).$type<ScheduleSettings>(),
  createdAt: createdAt(),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// assignments — Εκχωρήσεις (ο κεντρικός πίνακας γεγονότων)
export const assignments = sqliteTable("assignments", {
  id: id(),
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  personId: text("person_id")
    .notNull()
    .references(() => people.id),
  dutyTypeId: text("duty_type_id")
    .notNull()
    .references(() => dutyTypes.id),
  unitId: text("unit_id")
    .notNull()
    .references(() => units.id),
  date: text("date")
    .notNull()
    .references(() => calendarDays.date),
  source: text("source", { enum: ["auto", "manual"] })
    .notNull()
    .default("manual"),
  createdAt: createdAt(),
});

// unavailabilities — Δηλώσεις «να μην κάνω» (hard constraints)
export const unavailabilities = sqliteTable("unavailabilities", {
  id: id(),
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  personId: text("person_id")
    .notNull()
    .references(() => people.id),
  date: text("date").notNull(),
  reason: text("reason"),
});
