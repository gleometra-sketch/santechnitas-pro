// .docx failo tekstas naršyklėje (be bibliotekų): docx yra zip su word/document.xml.

/** word/document.xml -> paprastas tekstas (kiekviena pastraipa – nauja eilutė). */
export function docxXmlToText(xml: string): string {
  const text = xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return text.split("\n").map((l) => l.replace(/\s+$/g, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Ištraukia tekstą iš .docx baitų. Meta klaidą, jei failas nėra tinkamas .docx. */
export async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const b = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Failas nėra .docx.");
  const entries = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < entries; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    if (name === "word/document.xml") {
      const lnLen = dv.getUint16(local + 26, true);
      const lxLen = dv.getUint16(local + 28, true);
      const start = local + 30 + lnLen + lxLen;
      const raw = b.subarray(start, start + csize);
      const xml = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
      if (!xml) throw new Error("Nepalaikomas .docx suspaudimas.");
      return docxXmlToText(new TextDecoder().decode(xml));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("Nerastas dokumento tekstas (word/document.xml).");
}
