// Αλγόριθμος αυτόματης δίκαιης κατανομής (D5) — καθαρή συνάρτηση (χωρίς DB).
//
// Ισορροπεί ταυτόχρονα δύο μεγέθη ανά άτομο, διαχρονικά & κανονικοποιημένα στον
// χρόνο υπηρεσίας (ΜΟ = υπηρεσίες / διαθέσιμες μέρες από την έναρξη):
//   1) συνολικό πλήθος υπηρεσιών
//   2) «βαριές μέρες» (ΣΚ + αργίες + ειδικές)
// Σε βαριά μέρα προτεραιότητα έχει η ισορροπία των βαριών· σε κανονική, του συνόλου.
//
// Σέβεται hard constraints: απορρίψεις (unavailabilities), καταλληλότητα βαθμού,
// «δεν έχει ξεκινήσει ακόμα» (serviceStartDate), και δεν βάζει το ίδιο άτομο δύο
// φορές στην ίδια υπηρεσία την ίδια μέρα. Διατηρεί τις υπάρχουσες (χειροκίνητες).
//
// Φάση 6 (fine-tuning, D11): μετά το greedy γέμισμα τρέχει ένα ντετερμινιστικό
// τοπικό-ψάξιμο (local search) που μετακινεί auto-εκχωρήσεις σε άλλο κατάλληλο άτομο
// όταν αυτό μειώνει τη συνολική ανισότητα. Αντικειμενική = άθροισμα τετραγώνων των
// κανονικοποιημένων ρυθμών (Σ ρυθμός²), που ελαχιστοποιείται όταν οι ρυθμοί
// εξισώνονται — με ρυθμιζόμενα βάρη συνόλου/βαριών. Κάθε αποδεκτή μετακίνηση μειώνει
// γνησίως την αντικειμενική → τερματίζει. Οι χειροκίνητες (`existing`) δεν μετακινούνται.

import { daysBetween } from "./dates";

export type Person = {
  id: string;
  rankId: string | null;
  serviceStartDate: string | null;
};
export type DayInfo = { date: string; heavy: boolean };
export type DutyReq = { dutyTypeId: string; perDay: number };
export type ExistingAssignment = {
  personId: string;
  date: string;
  dutyTypeId: string;
};
export type HistoryEntry = { personId: string; heavy: boolean };

/** Βάρη της αντικειμενικής δικαιοσύνης (D11) — πόσο μετρά κάθε μέγεθος στο fine-tuning.
 *  `total` = εξισορρόπηση συνόλου υπηρεσιών· `heavy` = «βαριών» (ΣΚ/αργίες/ειδικές, ως υποσύνολο). */
export type FairnessWeights = { total: number; heavy: number };
export const DEFAULT_WEIGHTS: FairnessWeights = { total: 1, heavy: 1 };

export type AutoInput = {
  days: DayInfo[];
  duties: DutyReq[]; // ενεργές υπηρεσίες + θέσεις/μέρα (σειρά επεξεργασίας)
  people: Person[]; // μόνο ενεργά άτομα (όχι frozen/archived)
  allowed: Map<string, Set<string>>; // dutyTypeId -> επιτρεπόμενοι βαθμοί (κενό = ανοιχτή)
  rejections: Set<string>; // `${personId}|${date}`
  existing: ExistingAssignment[]; // ήδη εκχωρημένες (χειροκίνητες) — μετρούν στην κάλυψη
  history: HistoryEntry[]; // ΟΛΕΣ οι εκχωρήσεις (διαχρονικά) για αρχικό φορτίο
  fallbackStart: string; // ISO — denominator όταν λείπει serviceStartDate
  weights?: FairnessWeights; // βάρη συνόλου/βαριών στο local-search (default: συμμετρικά)
  maxPasses?: number; // ανώτατα περάσματα local-search (default 8 — ασφάλεια)
};

export type AutoRow = { personId: string; date: string; dutyTypeId: string };

const k2 = (a: string, b: string) => `${a}|${b}`;
const k3 = (a: string, b: string, c: string) => `${a}|${b}|${c}`;

function eligible(
  allowed: Map<string, Set<string>>,
  dutyTypeId: string,
  rankId: string | null,
): boolean {
  const set = allowed.get(dutyTypeId);
  if (!set || set.size === 0) return true;
  return rankId !== null && set.has(rankId);
}

/** Λεξικογραφική σύγκριση tuple με ανοχή για floats. */
function less(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i] - 1e-9) return true;
    if (a[i] > b[i] + 1e-9) return false;
  }
  return false;
}

export function computeAutoAssignments(input: AutoInput): AutoRow[] {
  const { days, duties, people, allowed, rejections, existing, history } = input;

  // Αρχικό φορτίο ανά άτομο (διαχρονικά).
  const total = new Map<string, number>();
  const heavy = new Map<string, number>();
  for (const p of people) {
    total.set(p.id, 0);
    heavy.set(p.id, 0);
  }
  for (const h of history) {
    if (!total.has(h.personId)) continue; // μόνο ενεργά άτομα μας ενδιαφέρουν
    total.set(h.personId, (total.get(h.personId) ?? 0) + 1);
    if (h.heavy) heavy.set(h.personId, (heavy.get(h.personId) ?? 0) + 1);
  }

  // Κατάσταση κάλυψης από τις υπάρχουσες (χειροκίνητες).
  const coverage = new Map<string, number>(); // date|duty -> count
  const anyDay = new Map<string, number>(); // person|date -> count
  const dutyDay = new Set<string>(); // person|date|duty
  for (const e of existing) {
    coverage.set(
      k2(e.date, e.dutyTypeId),
      (coverage.get(k2(e.date, e.dutyTypeId)) ?? 0) + 1,
    );
    anyDay.set(k2(e.personId, e.date), (anyDay.get(k2(e.personId, e.date)) ?? 0) + 1);
    dutyDay.add(k3(e.personId, e.date, e.dutyTypeId));
  }

  const startOf = (p: Person) => p.serviceStartDate ?? input.fallbackStart;
  const out: AutoRow[] = [];

  for (const day of days) {
    for (const duty of duties) {
      let have = coverage.get(k2(day.date, duty.dutyTypeId)) ?? 0;

      while (have < duty.perDay) {
        let best: Person | null = null;
        let bestScore: number[] = [];

        for (const p of people) {
          if (!eligible(allowed, duty.dutyTypeId, p.rankId)) continue;
          const start = startOf(p);
          if (start > day.date) continue; // δεν έχει ξεκινήσει ακόμα
          if (rejections.has(k2(p.id, day.date))) continue;
          if (dutyDay.has(k3(p.id, day.date, duty.dutyTypeId))) continue;

          const avail = Math.max(1, daysBetween(start, day.date) + 1);
          const tRate = (total.get(p.id) ?? 0) / avail;
          const hRate = (heavy.get(p.id) ?? 0) / avail;
          const today = anyDay.get(k2(p.id, day.date)) ?? 0;

          // βαριά μέρα → πρώτα ισορροπία βαριών· αλλιώς συνόλου.
          // ενδιάμεσο tiebreak: λιγότερες υπηρεσίες την ίδια μέρα (spread).
          const score = day.heavy
            ? [hRate, today, tRate]
            : [tRate, today, hRate];

          if (best === null || less(score, bestScore)) {
            best = p;
            bestScore = score;
          }
        }

        if (best === null) break; // αδύνατη η κάλυψη (constraints)

        out.push({ personId: best.id, date: day.date, dutyTypeId: duty.dutyTypeId });
        total.set(best.id, (total.get(best.id) ?? 0) + 1);
        if (day.heavy) heavy.set(best.id, (heavy.get(best.id) ?? 0) + 1);
        anyDay.set(
          k2(best.id, day.date),
          (anyDay.get(k2(best.id, day.date)) ?? 0) + 1,
        );
        dutyDay.add(k3(best.id, day.date, duty.dutyTypeId));
        have++;
      }
      coverage.set(k2(day.date, duty.dutyTypeId), have);
    }
  }

  // --- Φάση 6: τοπικό-ψάξιμο εξισορρόπησης (D11) -----------------------------
  // Μετακινεί auto-εκχωρήσεις σε άλλο κατάλληλο άτομο όταν μειώνεται η ανισότητα.
  refine(out, input, total, heavy, dutyDay, rejections, allowed);

  return out;
}

/**
 * Τοπική βελτιστοποίηση (hill-climbing) πάνω στις auto-εκχωρήσεις `out`.
 *
 * Αντικειμενική (D5: σύνολο ΚΑΙ βαριές ταυτόχρονα, βαριές = υποσύνολο):
 *   J = Σ_ατόμων ( wΣ·σύνολο² + wΒ·βαριές² ) / διαθέσιμες-μέρες
 * Μια θέση καθημερινής μετακινεί μόνο το «σύνολο»· μια θέση βαριάς μέρας μετακινεί
 * «σύνολο» ΚΑΙ «βαριές» (η βαριά μετρά και στα δύο — γι' αυτό βαραίνει περισσότερο).
 *
 * Σημείωση: ο διαιρέτης είναι `avail` (όχι `avail²`) — αυτό είναι το potential που, όταν
 * ελαχιστοποιείται, **εξισώνει τον ρυθμό** πλήθος/avail (το ίδιο που κατεβαίνει το greedy
 * «διάλεξε τον μικρότερο ρυθμό»). Κάθε αποδεκτή μετακίνηση μειώνει γνησίως το J → τερματισμός.
 */
function refine(
  out: AutoRow[],
  input: AutoInput,
  total: Map<string, number>,
  heavy: Map<string, number>,
  dutyDay: Set<string>,
  rejections: Set<string>,
  allowed: Map<string, Set<string>>,
): void {
  const { days, people } = input;
  if (out.length === 0 || days.length === 0) return;

  const wT = input.weights?.total ?? DEFAULT_WEIGHTS.total;
  const wH = input.weights?.heavy ?? DEFAULT_WEIGHTS.heavy;
  const maxPasses = input.maxPasses ?? 8;
  const startOf = (p: Person) => p.serviceStartDate ?? input.fallbackStart;

  // Σταθερός παρονομαστής ανά άτομο: διαθέσιμες μέρες ως το τέλος του μήνα.
  const lastDate = days[days.length - 1].date;
  const availRef = new Map<string, number>();
  for (const p of people)
    availRef.set(p.id, Math.max(1, daysBetween(startOf(p), lastDate) + 1));

  const heavyByDate = new Map(days.map((d) => [d.date, d.heavy]));

  // Μεταβολή του J αν 1 θέση πάει από a → b. Δ(πλήθος²)=−2c+1 (φεύγει) / +2c+1 (έρχεται),
  // διά avail του καθενός. Το «σύνολο» αλλάζει πάντα· το «βαριές» μόνο σε βαριά μέρα.
  function moveDelta(aId: string, bId: string, isHeavy: boolean): number {
    const aAv = availRef.get(aId) ?? 1;
    const bAv = availRef.get(bId) ?? 1;
    const tA = total.get(aId) ?? 0;
    const tB = total.get(bId) ?? 0;
    let d = wT * ((-2 * tA + 1) / aAv + (2 * tB + 1) / bAv);
    if (isHeavy) {
      const hA = heavy.get(aId) ?? 0;
      const hB = heavy.get(bId) ?? 0;
      d += wH * ((-2 * hA + 1) / aAv + (2 * hB + 1) / bAv);
    }
    return d;
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    for (const r of out) {
      const aId = r.personId;
      const isHeavy = heavyByDate.get(r.date) ?? false;
      let bestB: string | null = null;
      let bestDelta = -1e-9; // αποδεκτό μόνο γνήσια βελτιωτικό

      for (const p of people) {
        if (p.id === aId) continue;
        if (!eligible(allowed, r.dutyTypeId, p.rankId)) continue;
        if (startOf(p) > r.date) continue; // δεν έχει ξεκινήσει ακόμα
        if (rejections.has(k2(p.id, r.date))) continue;
        if (dutyDay.has(k3(p.id, r.date, r.dutyTypeId))) continue; // ήδη στην ίδια υπηρεσία/μέρα
        const d = moveDelta(aId, p.id, isHeavy);
        if (d < bestDelta) {
          bestDelta = d;
          bestB = p.id;
        }
      }

      if (bestB !== null) {
        total.set(aId, (total.get(aId) ?? 0) - 1);
        total.set(bestB, (total.get(bestB) ?? 0) + 1);
        if (isHeavy) {
          heavy.set(aId, (heavy.get(aId) ?? 0) - 1);
          heavy.set(bestB, (heavy.get(bestB) ?? 0) + 1);
        }
        dutyDay.delete(k3(aId, r.date, r.dutyTypeId));
        dutyDay.add(k3(bestB, r.date, r.dutyTypeId));
        r.personId = bestB;
        improved = true;
      }
    }
    if (!improved) break; // σταθερό σημείο
  }
}
