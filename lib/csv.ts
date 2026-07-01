// Καθαροί helpers CSV (χωρίς DB — ασφαλείς και σε client).
//
// Delimiter «;»: ταιριάζει με το προεπιλεγμένο διαχωριστικό λίστας του Excel σε
// ελληνικό locale, ώστε το αρχείο να ανοίγει σε στήλες χωρίς ρυθμίσεις. Το BOM
// (προστίθεται στο route) εξασφαλίζει σωστή εμφάνιση των ελληνικών.

export const CSV_DELIMITER = ";";

/** Escaping ενός πεδίου: quoting όταν περιέχει delimiter, εισαγωγικά ή αλλαγή γραμμής. */
export function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(CSV_DELIMITER) || s.includes('"') || /[\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Χτίζει CSV κείμενο (CRLF γραμμές — συμβατό με Excel) από headers + πίνακα τιμών. */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers, ...rows].map((cols) =>
    cols.map(csvCell).join(CSV_DELIMITER),
  );
  return lines.join("\r\n");
}
