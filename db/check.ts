import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { openDb, resolveDbPath } from "./open";
import { people, ranks, assignments, calendarDays } from "./schema";

config({ path: ".env.local" });

const { sqlite, db } = openDb();

const roster = db
  .select({ name: people.fullName, rank: ranks.name, status: people.status })
  .from(people)
  .leftJoin(ranks, eq(people.rankId, ranks.id))
  .orderBy(ranks.sortOrder, people.fullName)
  .all();

console.log("DB:", resolveDbPath());
console.log("Άτομα:", roster.length, "| Εκχωρήσεις:", db.select().from(assignments).all().length, "| Μέρες:", db.select().from(calendarDays).all().length);
console.table(roster);

sqlite.close();
