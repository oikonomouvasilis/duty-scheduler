// Admin: Αντίγραφα ασφαλείας (Φάση 6, D12). Download συνεπούς backup + οδηγίες επαναφοράς.
import fs from "node:fs";
import { db } from "@/db";
import { resolveDbPath } from "@/db/open";
import { assignments, people, schedules } from "@/db/schema";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupPage() {
  const dbPath = resolveDbPath();
  let size = 0;
  let mtime: string | null = null;
  try {
    const st = fs.statSync(dbPath);
    size = st.size;
    mtime = st.mtime.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    // η βάση μπορεί να μην έχει δημιουργηθεί ακόμα
  }

  const counts = {
    people: db.select().from(people).all().length,
    schedules: db.select().from(schedules).all().length,
    assignments: db.select().from(assignments).all().length,
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Αντίγραφα ασφαλείας</h1>
      <p className="mt-1 text-sm text-gray-500">
        Όλα τα δεδομένα ζουν σε ένα τοπικό αρχείο SQLite. Κράτα τακτικά αντίγραφο —
        δεν ανεβαίνει ποτέ στο git.
      </p>

      <div className={`${ui.card} mt-6 p-4`}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Αρχείο βάσης
            </dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-gray-700">
              {dbPath}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Μέγεθος
            </dt>
            <dd className="mt-0.5">{mtime ? human(size) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Τελευταία αλλαγή
            </dt>
            <dd className="mt-0.5">{mtime ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Περιεχόμενο
            </dt>
            <dd className="mt-0.5 text-gray-700">
              {counts.people} άτομα · {counts.schedules} μήνες ·{" "}
              {counts.assignments} εκχωρήσεις
            </dd>
          </div>
        </dl>

        <a
          href="/admin/backup/download"
          className={`${ui.btn} mt-4 inline-flex`}
          download
        >
          Κατέβασε αντίγραφο (.db)
        </a>
        <p className="mt-2 text-xs text-gray-400">
          Συνεπές στιγμιότυπο μέσω του online backup του SQLite (ασφαλές ακόμη κι
          ενώ γράφεται).
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm">
        <h2 className="font-semibold text-amber-800">Επαναφορά (χειροκίνητα)</h2>
        <p className="mt-1 text-amber-900/80">
          Η επαναφορά αντικαθιστά όλα τα δεδομένα, γι&apos; αυτό γίνεται με το χέρι
          και με την εφαρμογή <strong>σταματημένη</strong> (ώστε να μην είναι
          ανοιχτή η βάση):
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-900/80">
          <li>Σταμάτα την εφαρμογή.</li>
          <li>
            Αντικατέστησε το αρχείο{" "}
            <code className="font-mono text-xs">{dbPath}</code> με το αντίγραφο
            (μετονόμασέ το ίδιο).
          </li>
          <li>
            Σβήσε τυχόν σελίδες WAL δίπλα του:{" "}
            <code className="font-mono text-xs">*.db-wal</code> και{" "}
            <code className="font-mono text-xs">*.db-shm</code>.
          </li>
          <li>Ξεκίνα ξανά την εφαρμογή.</li>
        </ol>
      </div>
    </div>
  );
}
