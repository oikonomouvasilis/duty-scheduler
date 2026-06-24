import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/** Διαδρομή του αρχείου SQLite (από DATABASE_PATH ή default ./data/duty-scheduler.db). */
export function resolveDbPath(): string {
  return (
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "duty-scheduler.db")
  );
}

/** Ανοίγει σύνδεση SQLite + Drizzle. Δημιουργεί τον φάκελο αν λείπει. */
export function openDb(dbPath: string = resolveDbPath()) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type DbConnection = ReturnType<typeof openDb>;
