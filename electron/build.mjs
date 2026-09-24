// Orchestration script για το πακετάρισμα σε Windows .exe (Electron).
// Βήματα: next build (standalone) -> αντιγραφή static assets -> template DB
// (μόνο schema, χωρίς δεδομένα) -> rebuild better-sqlite3 για Electron ABI
// -> electron-builder.
//
// Εκτέλεση: npm run electron:build

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const bsq3Dir = path.join(root, "node_modules", "better-sqlite3");
const bsq3Binary = path.join(bsq3Dir, "build", "Release", "better_sqlite3.node");

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`Απέτυχε: ${cmd} ${args.join(" ")}`);
  }
}

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

/** Αντικαθιστά αναδρομικά κάθε symlink κάτω από `dir` με πραγματικό αντίγραφο
 * του στόχου του. Το Turbopack αφήνει symlinks για externalized packages
 * (π.χ. better-sqlite3) που δείχνουν στο ΑΠΟΛΥΤΟ path του dev μηχανήματος —
 * σπάνε μόλις το standalone bundle μετακινηθεί (π.χ. μέσα στο packaged exe). */
function dereferenceSymlinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.realpathSync(full);
      const tmp = `${full}.deref-tmp`;
      fs.cpSync(target, tmp, { recursive: true });
      // ΠΡΟΣΟΧΗ: fs.rmSync(full, {recursive:true}) σε directory-symlink στα Windows
      // ΔΙΑΓΡΑΦΕΙ το ίδιο το PRAGMATIKO target (ακολουθεί το reparse point), όχι μόνο
      // τον σύνδεσμο. Χωρίς recursive αφαιρείται ΜΟΝΟ ο σύνδεσμος — ασφαλές.
      fs.rmSync(full, { force: true });
      fs.renameSync(tmp, full);
    } else if (entry.isDirectory()) {
      dereferenceSymlinks(full);
    }
  }
}

/** Επαναφέρει το ΡΙΖΙΚΟ better-sqlite3 binary στο ABI του συστήματος (system Node),
 * ώστε `npm run dev` / db:* scripts να συνεχίσουν να δουλεύουν μετά το build. */
function restoreRootBinaryToSystemNode() {
  console.log("\n--- επαναφορά root better-sqlite3 σε system-Node ABI ---");
  run(
    "npx",
    ["prebuild-install", "--runtime=node", `--target=${process.versions.node}`, "--arch=x64", "--platform=win32"],
    { cwd: bsq3Dir },
  );
}

// Το Turbopack (Next 16) σκάει όταν το απόλυτο path έχει μη-ASCII χαρακτήρες
// ("start byte index … is not a char boundary"), και subst/junction δεν βοηθούν
// γιατί επιλύει το πραγματικό path. Άρα: αντιγράφουμε το project σε ASCII φάκελο,
// χτίζουμε εκεί, και φέρνουμε πίσω μόνο τον installer.
if (/[^\x00-\x7F]/.test(root)) {
  const buildDir = path.join(os.tmpdir(), "duty-scheduler-build");
  if (/[^\x00-\x7F]/.test(buildDir)) {
    throw new Error(`Ο φάκελος build (${buildDir}) έχει επίσης μη-ASCII χαρακτήρες.`);
  }
  console.log(`Μη-ASCII path — build μέσω αντιγράφου στο ${buildDir}`);
  const rc = spawnSync(
    "robocopy",
    [root, buildDir, "/MIR", "/MT:8", "/XD", ".git", ".next", "dist-electron", "/NFL", "/NDL", "/NP", "/NJH", "/NJS", "/R:1", "/W:1"],
    { stdio: "inherit" },
  ).status;
  if (rc === null || rc >= 8) throw new Error(`robocopy απέτυχε (κωδικός ${rc})`);

  run("node", [path.join("electron", "build.mjs")], { cwd: buildDir });

  const outDir = path.join(root, "dist-electron");
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(path.join(buildDir, "dist-electron"))) {
    if (f.endsWith(".exe") && !f.includes("__uninstaller")) {
      fs.copyFileSync(path.join(buildDir, "dist-electron", f), path.join(outDir, f));
      console.log(`→ ${path.join(outDir, f)}`);
    }
  }
  process.exit(0);
}

console.log("=== 1/5: next build (standalone) ===");
run("npx", ["next", "build"]);

// Το Next file-tracer αντιγράφει συντηρητικά ολόκληρο το ./data (περιέχει την
// ΠΡΑΓΜΑΤΙΚΗ dev βάση με ενδεχομένως πραγματικά δεδομένα προσωπικού) — ΔΕΝ
// πρέπει να καταλήξει μέσα στο πακέτο. Το template.db (βήμα 3) το αντικαθιστά.
fs.rmSync(path.join(standaloneDir, "data"), { recursive: true, force: true });

dereferenceSymlinks(standaloneDir);

console.log("=== 2/5: αντιγραφή static assets ===");
copyDir(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(standaloneDir, "public"));
}

console.log("=== 3/5: δημιουργία template βάσης (schema, χωρίς δεδομένα) ===");
const templateDb = path.join(os.tmpdir(), `duty-scheduler-template-${Date.now()}.db`);
for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(templateDb + suffix, { force: true });
}
run("npx", ["tsx", "db/migrate.ts"], {
  env: { ...process.env, DATABASE_PATH: templateDb },
});
fs.copyFileSync(templateDb, path.join(standaloneDir, "template.db"));
for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(templateDb + suffix, { force: true });
}

// --- Από εδώ και κάτω το ΡΙΖΙΚΟ better-sqlite3 γίνεται προσωρινά Electron ABI.
// try/finally εγγυάται ότι ΠΑΝΤΑ θα επαναφερθεί σε system-Node ABI στο τέλος,
// ό,τι κι αν πάει στραβά στο electron-builder (αλλιώς σπάει το επόμενο `npm run dev`).
try {
  console.log("=== 4/5: better-sqlite3 binary για το Electron ABI ===");
  // electron-rebuild αποτυγχάνει εδώ: ο Next file-tracer αντιγράφει στο standalone
  // μόνο ό,τι χρειάζεται σε runtime (όχι binding.gyp/src) οπότε δεν αναγνωρίζει το
  // module ως native, και χωρίς Visual Studio Build Tools δεν γίνεται ούτως ή άλλως
  // compile από source. Αντ' αυτού: κατεβάζουμε το επίσημο prebuilt .node binary
  // του better-sqlite3 για Electron (GitHub releases, χωρίς compiler) πάνω στο
  // ΡΙΖΙΚΟ node_modules και το αντιγράφουμε στο standalone.
  const electronVersion = JSON.parse(
    fs.readFileSync(path.join(root, "node_modules", "electron", "package.json"), "utf8"),
  ).version;

  run(
    "npx",
    ["prebuild-install", "--runtime=electron", `--target=${electronVersion}`, "--arch=x64", "--platform=win32"],
    { cwd: bsq3Dir },
  );

  // Δύο αντίγραφα του better-sqlite3 υπάρχουν στο standalone και πρέπει ΚΑΙ τα δύο
  // να πάρουν το Electron binary: το κανονικό node_modules/better-sqlite3, και το
  // `.next/node_modules/better-sqlite3-<hash>` (το "external shim" του Turbopack —
  // αυτό είναι που φορτώνεται πραγματικά σε runtime).
  const targets = [path.join(standaloneDir, "node_modules", "better-sqlite3")];
  const shimRoot = path.join(standaloneDir, ".next", "node_modules");
  if (fs.existsSync(shimRoot)) {
    for (const name of fs.readdirSync(shimRoot)) {
      if (name.startsWith("better-sqlite3-")) targets.push(path.join(shimRoot, name));
    }
  }
  for (const dir of targets) {
    fs.copyFileSync(bsq3Binary, path.join(dir, "build", "Release", "better_sqlite3.node"));
  }

  console.log("=== 5/5: electron-builder ===");
  run("npx", ["electron-builder", "--win"]);
} finally {
  restoreRootBinaryToSystemNode();
}

console.log("\nΈτοιμο. Δες τον φάκελο dist-electron/.");
