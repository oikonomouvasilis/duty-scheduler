// GET /history/[id]/export — κατεβάζει τον μήνα ως CSV (Φάση 6, D12).
import { buildMonthCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const out = buildMonthCsv(id);
  if (!out) return new Response("Δεν βρέθηκε.", { status: 404 });

  // BOM ώστε τα ελληνικά να εμφανίζονται σωστά στο Excel.
  const body = "﻿" + out.csv;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
