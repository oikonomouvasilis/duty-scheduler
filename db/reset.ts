import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { resolveDbPath } from "./open";

config({ path: ".env.local" });

// Σβήνει το αρχείο της βάσης (+ WAL/SHM). Μετά τρέχει db:migrate && db:seed (βλ. package.json).
const dbPath = resolveDbPath();
for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  fs.rmSync(f, { force: true });
}
console.log("✓ διαγράφηκε η τοπική βάση →", path.relative(process.cwd(), dbPath));
