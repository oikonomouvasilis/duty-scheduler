import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // better-sqlite3 είναι native module — δεν πρέπει να μπει στο bundle, μένει external.
  serverExternalPackages: ["better-sqlite3"],
  // Standalone output: αυτόνομο server.js + traced node_modules, για το Electron packaging.
  output: "standalone",
  // Ρητό tracing root: χωρίς αυτό, το Next μπορεί να ανιχνεύσει λάθος root (π.χ. έναν
  // ανώτερο φάκελο κάτω από %TEMP% όταν χτίζουμε από αντίγραφο εκτός του dev path) και
  // να φωλιάσει όλο το standalone output κάτω από ένα ψευδο-relative subfolder.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
