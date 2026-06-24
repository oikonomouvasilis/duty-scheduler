import { config } from "dotenv";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { openDb, resolveDbPath } from "./open";

config({ path: ".env.local" });

const { sqlite, db } = openDb();
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();

console.log("✓ migrations applied →", resolveDbPath());
