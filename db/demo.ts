// Demo δεδομένα για στιγμιότυπα/παρουσίαση — ΟΛΑ τα ονόματα είναι φανταστικά.
// ΣΒΗΝΕΙ ό,τι υπάρχει στη βάση του DATABASE_PATH· τρέξ' το μόνο σε προσωρινή βάση:
//   DATABASE_PATH=/tmp/demo.db npm run db:migrate && DATABASE_PATH=/tmp/demo.db npm run db:demo
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

const rank = { stratiotis: uuid(), dekaneas: uuid(), lochias: uuid() };
db.insert(ranks).values([
  { id: rank.stratiotis, name: "Στρατιώτης", sortOrder: 1 },
  { id: rank.dekaneas, name: "Δεκανέας", sortOrder: 2 },
  { id: rank.lochias, name: "Λοχίας", sortOrder: 3 },
]).run();

db.insert(units).values({ id: uuid(), name: "Μονάδα μας", isHome: true }).run();

const duty = { skopia: uuid(), thalamos: uuid(), aggelia: uuid(), epoptis: uuid() };
db.insert(dutyTypes).values([
  { id: duty.skopia, name: "Σκοπιά", defaultPerDay: 2, color: "#ef4444" },
  { id: duty.thalamos, name: "Θαλαμοφύλακας", defaultPerDay: 1, color: "#3b82f6" },
  { id: duty.aggelia, name: "Αγγελιαφόρος", defaultPerDay: 1, color: "#22c55e" },
  { id: duty.epoptis, name: "Επόπτης", defaultPerDay: 1, color: "#a855f7" },
]).run();

db.insert(dutyTypeRanks).values([
  { dutyTypeId: duty.skopia, rankId: rank.stratiotis },
  { dutyTypeId: duty.skopia, rankId: rank.dekaneas },
  { dutyTypeId: duty.thalamos, rankId: rank.stratiotis },
  { dutyTypeId: duty.aggelia, rankId: rank.dekaneas },
  { dutyTypeId: duty.epoptis, rankId: rank.dekaneas },
  { dutyTypeId: duty.epoptis, rankId: rank.lochias },
]).run();

const roster: [string, keyof typeof rank, string, ("active" | "frozen")?][] = [
  ["Αντωνίου Κ.", "stratiotis", "2025-11-03"],
  ["Βασιλείου Μ.", "stratiotis", "2025-11-03"],
  ["Γεωργίου Π.", "stratiotis", "2026-01-12"],
  ["Δημητρίου Α.", "stratiotis", "2026-01-12"],
  ["Ευαγγέλου Σ.", "stratiotis", "2026-03-02"],
  ["Ζαχαρίου Ν.", "stratiotis", "2026-03-02"],
  ["Ηλιόπουλος Θ.", "stratiotis", "2026-05-11"],
  ["Θεοδώρου Λ.", "stratiotis", "2026-05-11", "frozen"],
  ["Ιωάννου Χ.", "dekaneas", "2025-09-15"],
  ["Καραγιάννης Ε.", "dekaneas", "2025-09-15"],
  ["Λαμπρόπουλος Δ.", "dekaneas", "2026-02-02"],
  ["Μανωλάκης Ρ.", "dekaneas", "2026-02-02"],
  ["Νικολάου Φ.", "lochias", "2025-06-01"],
  ["Ξενάκης Β.", "lochias", "2025-10-06"],
];
const personIds = roster.map(() => uuid());
db.insert(people).values(
  roster.map(([fullName, r, serviceStartDate, status], i) => ({
    id: personIds[i],
    fullName,
    rankId: rank[r],
    serviceStartDate,
    status: status ?? "active",
  })),
).run();

const special: Record<string, { dayType: "holiday" | "special"; label: string }> = {
  "2026-07-20": { dayType: "special", label: "Άσκηση (demo)" },
  "2026-08-15": { dayType: "holiday", label: "Κοίμηση της Θεοτόκου" },
  "2026-09-14": { dayType: "special", label: "Επιθεώρηση (demo)" },
};

const settings = {
  dutyTypes: [
    { dutyTypeId: duty.skopia, perDay: 2 },
    { dutyTypeId: duty.thalamos, perDay: 1 },
    { dutyTypeId: duty.aggelia, perDay: 1 },
    { dutyTypeId: duty.epoptis, perDay: 1 },
  ],
};

const scheduleIds: Record<number, string> = {};
for (const month of [7, 8, 9]) {
  const days = new Date(2026, month, 0).getDate();
  const rows = [];
  for (let d = 1; d <= days; d++) {
    const date = `2026-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(2026, month - 1, d)).getUTCDay();
    rows.push(
      special[date]
        ? { date, ...special[date] }
        : { date, dayType: (dow === 0 || dow === 6 ? "weekend" : "weekday") as "weekend" | "weekday" },
    );
  }
  db.insert(calendarDays).values(rows).run();

  scheduleIds[month] = uuid();
  db.insert(schedules)
    .values({ id: scheduleIds[month], year: 2026, month, status: "draft", settings })
    .run();
}

// Απορρίψεις (δηλώσεις «δεν μπορώ») στον Σεπτέμβριο.
const rejections: [number, string, string][] = [
  [0, "2026-09-05", "άδεια"],
  [0, "2026-09-06", "άδεια"],
  [2, "2026-09-12", "εξετάσεις"],
  [4, "2026-09-19", "άδεια"],
  [4, "2026-09-20", "άδεια"],
  [9, "2026-09-26", "υπηρεσιακό ταξίδι"],
  [12, "2026-09-10", "σχολείο"],
];
db.insert(unavailabilities).values(
  rejections.map(([i, date, reason]) => ({
    scheduleId: scheduleIds[9],
    personId: personIds[i],
    date,
    reason,
  })),
).run();

sqlite.close();
console.log(
  `✓ demo: ${roster.length} άτομα, 4 υπηρεσίες, 3 μήνες (Ιούλ–Σεπ 2026, draft), ${rejections.length} απορρίψεις`,
);
