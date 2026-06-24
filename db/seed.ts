import { config } from "dotenv";
import { openDb } from "./open";
import {
  ranks,
  people,
  dutyTypes,
  dutyTypeRanks,
  units,
  calendarDays,
  schedules,
  assignments,
  unavailabilities,
} from "./schema";

config({ path: ".env.local" });

const { sqlite, db } = openDb();
const uuid = () => crypto.randomUUID();

// --- καθάρισμα (σεβόμενοι τα FK: παιδιά πρώτα) ---
for (const t of [
  assignments,
  unavailabilities,
  schedules,
  dutyTypeRanks,
  calendarDays,
  people,
  dutyTypes,
  units,
  ranks,
]) {
  db.delete(t).run();
}

// --- Βαθμοί ---
const rank = {
  stratiotis: uuid(),
  dekaneas: uuid(),
  lochias: uuid(),
};
db.insert(ranks).values([
  { id: rank.stratiotis, name: "Στρατιώτης", sortOrder: 1 },
  { id: rank.dekaneas, name: "Δεκανέας", sortOrder: 2 },
  { id: rank.lochias, name: "Λοχίας", sortOrder: 3 },
]).run();

// --- Μονάδα (δική μας) ---
const homeUnit = uuid();
db.insert(units).values({ id: homeUnit, name: "Μονάδα μας", isHome: true }).run();

// --- Είδη υπηρεσιών ---
const duty = {
  skopia: uuid(),
  thalamofylakas: uuid(),
  aggeliaforos: uuid(),
};
db.insert(dutyTypes).values([
  { id: duty.skopia, name: "Σκοπιά", defaultPerDay: 2, color: "#ef4444" },
  { id: duty.thalamofylakas, name: "Θαλαμοφύλακας", defaultPerDay: 1, color: "#3b82f6" },
  { id: duty.aggeliaforos, name: "Αγγελιαφόρος", defaultPerDay: 1, color: "#22c55e" },
]).run();

// ποιοι βαθμοί κάνουν τι (demo)
db.insert(dutyTypeRanks).values([
  { dutyTypeId: duty.skopia, rankId: rank.stratiotis },
  { dutyTypeId: duty.skopia, rankId: rank.dekaneas },
  { dutyTypeId: duty.thalamofylakas, rankId: rank.stratiotis },
  { dutyTypeId: duty.aggeliaforos, rankId: rank.dekaneas },
  { dutyTypeId: duty.aggeliaforos, rankId: rank.lochias },
]).run();

// --- Προσωπικό (ΨΕΥΤΙΚΑ δείγματα) ---
const person = {
  a: uuid(),
  b: uuid(),
  c: uuid(),
  d: uuid(),
};
db.insert(people).values([
  { id: person.a, fullName: "Α. Δείγμα", rankId: rank.stratiotis, serviceStartDate: "2026-01-15" },
  { id: person.b, fullName: "Β. Δοκιμή", rankId: rank.stratiotis, serviceStartDate: "2026-03-01" },
  { id: person.c, fullName: "Γ. Παράδειγμα", rankId: rank.dekaneas, serviceStartDate: "2025-11-10" },
  { id: person.d, fullName: "Δ. Τεστ", rankId: rank.lochias, status: "frozen", serviceStartDate: "2025-09-20" },
]).run();

// --- Ημερολόγιο: Ιούνιος 2026 (weekday/weekend + μία special) ---
const YEAR = 2026;
const MONTH = 6; // Ιούνιος
const daysInMonth = new Date(YEAR, MONTH, 0).getDate();
const days: { date: string; dayType: "weekday" | "weekend" | "holiday" | "special"; label?: string }[] = [];
for (let d = 1; d <= daysInMonth; d++) {
  const iso = `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dow = new Date(Date.UTC(YEAR, MONTH - 1, d)).getUTCDay(); // 0=Κυρ, 6=Σαβ
  const isWeekend = dow === 0 || dow === 6;
  days.push({ date: iso, dayType: isWeekend ? "weekend" : "weekday" });
}
// demo: μία ειδική μέρα
const special = days.find((x) => x.date === `${YEAR}-06-29`);
if (special) {
  special.dayType = "special";
  special.label = "Ειδική μέρα (demo)";
}
db.insert(calendarDays).values(days).run();

// --- Schedule του μήνα ---
const scheduleId = uuid();
db.insert(schedules).values({
  id: scheduleId,
  year: YEAR,
  month: MONTH,
  status: "draft",
  settings: {
    dutyTypes: [
      { dutyTypeId: duty.skopia, perDay: 2 },
      { dutyTypeId: duty.thalamofylakas, perDay: 1 },
      { dutyTypeId: duty.aggeliaforos, perDay: 1 },
    ],
  },
}).run();

// --- Λίγες εκχωρήσεις & μία απόρριψη (demo) ---
db.insert(assignments).values([
  { scheduleId, personId: person.a, dutyTypeId: duty.skopia, unitId: homeUnit, date: `${YEAR}-06-01`, source: "auto" },
  { scheduleId, personId: person.b, dutyTypeId: duty.skopia, unitId: homeUnit, date: `${YEAR}-06-01`, source: "auto" },
  { scheduleId, personId: person.c, dutyTypeId: duty.aggeliaforos, unitId: homeUnit, date: `${YEAR}-06-02`, source: "manual" },
]).run();

db.insert(unavailabilities).values({
  scheduleId,
  personId: person.a,
  date: `${YEAR}-06-03`,
  reason: "άδεια (demo)",
}).run();

sqlite.close();
console.log("✓ seed ολοκληρώθηκε: 3 βαθμοί, 4 άτομα, 3 υπηρεσίες, ", daysInMonth, "μέρες, 1 schedule");
