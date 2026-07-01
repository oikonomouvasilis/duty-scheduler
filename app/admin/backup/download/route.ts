// GET /admin/backup/download — κατεβάζει συνεπές αντίγραφο της βάσης (Φάση 6, D12).
//
// Χρησιμοποιεί το online backup API του SQLite (sqlite.backup) — ασφαλές ακόμη κι όταν
// γίνονται εγγραφές (WAL), σε αντίθεση με απλή αντιγραφή του αρχείου. Γράφει σε προσωρινό
// αρχείο (ASCII path, εκτός project), το στέλνει, και το καθαρίζει.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function GET() {
  const tmp = path.join(os.tmpdir(), `duty-backup-${Date.now()}.db`);
  try {
    await sqlite.backup(tmp);
    const buf = await fs.promises.readFile(tmp);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="duty-scheduler-backup-${stamp()}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Αποτυχία δημιουργίας αντιγράφου.", { status: 500 });
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
}
