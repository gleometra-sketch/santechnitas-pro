// Pastabos biurui tekstas iš medžiagų eilučių (be React, kad būtų galima testuoti).

export type NoteRow = { name: string; qty: string; unit: string };

export const NOTE_MAX = 4000; // kaip addNote schema serveryje

/** Sudeda medžiagų eilutes ir laisvą tekstą į vieną pastabą. Tuščios eilutės (be pavadinimo) praleidžiamos. */
export function composeNote(rows: NoteRow[], extra: string): { body: string } | { error: string } {
  const lines: string[] = [];
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const q = r.qty.trim();
    if (q) {
      const n = Number(q.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) return { error: `Neteisingas kiekis: „${name}“.` };
      lines.push(`${name} ${q.replace(".", ",")} ${r.unit}`.trim());
    } else {
      lines.push(name);
    }
  }
  const text = extra.trim();
  const body = [...lines, ...(text ? [text] : [])].join("\n");
  if (!body) return { error: "Įrašykite medžiagą arba pastabą prieš siųsdami." };
  if (body.length > NOTE_MAX) return { error: "Pastaba per ilga. Sutrumpinkite arba siųskite dalimis." };
  return { body };
}
