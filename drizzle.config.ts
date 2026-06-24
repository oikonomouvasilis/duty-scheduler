import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Φόρτωσε το DATABASE_PATH από το .env.local (αν υπάρχει)· αλλιώς default παρακάτω.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/duty-scheduler.db",
  },
});
