// Καθαρές μετρικές «δικαιοσύνης» (χωρίς DB — ασφαλείς και σε client).
//
// Δίνουν, για μια λίστα κανονικοποιημένων ρυθμών (π.χ. ΜΟ/μήνα ανά άτομο), ένα
// εύληπτο μέτρο διασποράς + ένα score 0–1 (1 = τέλεια ισορροπία). Χρησιμοποιείται
// για την προεπισκόπηση δικαιοσύνης στη σελίδα μήνα (Φάση 6, D11). Ο αλγόριθμος
// ελαχιστοποιεί ανάλογη αντικειμενική — εδώ απλώς την «διαβάζουμε».

export type Spread = {
  n: number;
  mean: number;
  min: number;
  max: number;
  range: number; // max − min
  cv: number; // συντελεστής μεταβλητότητας (sd / mean)
  score: number; // 1 − cv, ψαλιδισμένο στο [0, 1] — μεγαλύτερο = πιο δίκαιο
};

/** Διασπορά μιας λίστας τιμών (≥ 0). Κενή/ομοιόμορφη λίστα → τέλειο score 1. */
export function spread(values: number[]): Spread {
  const n = values.length;
  if (n === 0)
    return { n: 0, mean: 0, min: 0, max: 0, range: 0, cv: 0, score: 1 };

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / n;

  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const sd = Math.sqrt(sq / n);

  const cv = mean > 0 ? sd / mean : 0;
  const score = Math.max(0, Math.min(1, 1 - cv));
  return { n, mean, min, max, range: max - min, cv, score };
}

/** Ποσοστιαία μορφή του score (0–100, ακέραιο) για το UI. */
export function scorePct(s: Spread): number {
  return Math.round(s.score * 100);
}
