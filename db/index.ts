import { openDb, type DbConnection } from "./open";

// Singleton: στο dev το hot-reload φτιάχνει πολλά instances — κρατάμε ένα στο globalThis
// ώστε να μην ανοίγουμε πολλαπλές συνδέσεις στο ίδιο αρχείο.
const globalForDb = globalThis as unknown as { __dbConn?: DbConnection };

const conn = globalForDb.__dbConn ?? openDb();
if (process.env.NODE_ENV !== "production") globalForDb.__dbConn = conn;

export const db = conn.db;
export * as schema from "./schema";
