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

export type AutoInput = {
  days: DayInfo[];
  duties: DutyReq[]; // ενεργές υπηρεσίες + θέσεις/μέρα (σειρά επεξεργασίας)
  people: Person[]; // μόνο ενεργά άτομα (όχι frozen/archived)
  allowed: Map<string, Set<string>>; // dutyTypeId -> επιτρεπόμενοι βαθμοί (κενό = ανοιχτή)
  rejections: Set<string>; // `${personId}|${date}`
  existing: ExistingAssignment[]; // ήδη εκχωρημένες (χειροκίνητες) — μετρούν στην κάλυψη
  history: HistoryEntry[]; // ΟΛΕΣ οι εκχωρήσεις (διαχρονικά) για αρχικό φορτίο
  fallbackStart: string; // ISO — denominator όταν λείπει serviceStartDate
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

  return out;
}
