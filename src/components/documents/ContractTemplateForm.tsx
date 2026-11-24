"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { saveContractTemplate } from "@/lib/documents/actions";
import { extractDocxText } from "@/lib/documents/docx";
import { DEFAULT_TERMS, type Seller } from "@/lib/documents/logic";
import {
  KIND_NAME, SUGGEST, VARIABLES, autoReplaceSeller, buildTemplateVars, findCandidates, renderTemplate, replaceRange, unknownFields, type VarGroup,
} from "@/lib/documents/template";
import { Field, Msg, inputCls, primaryBtn } from "@/components/admin/ui";

const LABEL = new Map(VARIABLES.map((v) => [v.key, v.label]));
const GROUPS = [...new Set(VARIABLES.map((v) => v.group))] as VarGroup[];

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ContractTemplateForm({ seller, initial, today }: { seller: Seller; initial: string; today: string }) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const candidates = useMemo(() => findCandidates(text), [text]);
  const unknown = useMemo(() => unknownFields(text), [text]);
  const preview = useMemo(() => {
    const vars = buildTemplateVars({
      seller, clientName: "Jonas Jonaitis", clientAddress: "Gedimino pr. 1, Vilnius", clientPhone: "+370 600 00000", clientEmail: "jonas@example.com",
      workAddress: "Gedimino pr. 1, Vilnius", totalGross: 1210, vatRate: 21, estimateNumber: "S-0001", today,
      terms: { ...DEFAULT_TERMS, workDescription: "vonios kambario santechnikos darbai", advanceDate: addDays(today, 7), startDate: addDays(today, 7), endDate: addDays(today, 21) },
    });
    return renderTemplate(text, vars).replace(/\{\{numeris\}\}/gi, "0001").replace(/\{\{parasu_blokas\}\}/gi, "[Čia bus šalių adresų ir parašų blokas]");
  }, [text, seller, today]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".docx")) setText(await extractDocxText(await file.arrayBuffer()));
      else if (name.endsWith(".txt") || file.type.startsWith("text/")) setText(await file.text());
      else { setMsg({ ok: false, text: "PDF ir kitus formatus atidarykite savo programoje, pažymėkite visą tekstą (Ctrl+A), nukopijuokite ir įklijuokite į langą žemiau. Word (.docx) ir .txt galima įkelti tiesiogiai." }); return; }
      setNote("Tekstas įkeltas. Spauskite „Atpažinti mano įmonės duomenis“.");
    } catch {
      setMsg({ ok: false, text: "Nepavyko perskaityti failo. Įklijuokite tekstą ranka." });
    }
  };

  const recognize = () => {
    const r = autoReplaceSeller(text, seller);
    setText(r.text);
    setNote(r.replaced.length ? `Pakeista laukais: ${r.replaced.map((k) => LABEL.get(k) ?? k).join(", ")}.` : "Jūsų įmonės duomenų tekste nerasta (patikrinkite įmonės rekvizitus).");
  };

  const insert = (key: string) => {
    const el = area.current;
    const tok = `{{${key}}}`;
    if (!el) { setText((t) => t + tok); return; }
    const a = el.selectionStart, b = el.selectionEnd;
    setText(text.slice(0, a) + tok + text.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + tok.length, a + tok.length); });
  };

  const save = (body: string) => start(async () => {
    const r = await saveContractTemplate(body);
    setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
  });

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted">
        Įkelkite arba įklijuokite savo naudojamą darbų sutartį. Programa pakeis jūsų įmonės duomenis laukais, o sąmatos/kliento duomenis ir sumas užpildys automatiškai kiekvienai naujai sutarčiai.
        Tekstas ir sąlygos lieka tokie, kokius įklijavote.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-12 cursor-pointer items-center rounded-2xl bg-accent-soft px-4 font-semibold">
          Įkelti failą (.docx, .txt)
          <input type="file" accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={recognize} className="min-h-12 rounded-2xl bg-accent-soft px-4 font-semibold">Atpažinti mano įmonės duomenis</button>
      </div>

      <Field label="Sutarties šablono tekstas">
        <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={16} className={`${inputCls} min-h-0 py-2 font-mono text-sm`} placeholder="Įklijuokite sutarties tekstą čia..." />
      </Field>
      {note && <p className="rounded-xl bg-accent-soft p-2 text-sm">{note}</p>}
      {unknown.length > 0 && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">Nežinomi laukai: {unknown.map((u) => `{{${u}}}`).join(", ")}. Patikrinkite rašybą.</p>}

      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold">Rasti keičiami dalykai ({candidates.length})</p>
          <p className="text-xs text-muted">Datos, sumos, procentai ir terminai. Pasirinkite, kuo juos pakeisti – kitaip liks kaip įrašyta.</p>
          <ul className="space-y-2">
            {candidates.slice(0, 30).map((c) => (
              <li key={`${c.start}-${c.end}`} className="rounded-xl border border-black/10 p-2 text-sm">
                <p><b>{KIND_NAME[c.kind]}:</b> {c.text}</p>
                <p className="truncate text-xs text-muted">…{c.context}…</p>
                <select className={`${inputCls} mt-1`} value="" onChange={(e) => { if (e.target.value) setText(replaceRange(text, c.start, c.end, e.target.value)); }} aria-label={`Pakeisti: ${c.text}`}>
                  <option value="">Palikti kaip yra</option>
                  {SUGGEST[c.kind].map((k) => <option key={k} value={k}>{LABEL.get(k) ?? k}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-semibold">Įterpti lauką į žymeklio vietą</p>
        {GROUPS.map((g) => (
          <div key={g}>
            <p className="text-xs font-semibold text-muted">{g}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {VARIABLES.filter((v) => v.group === g).map((v) => (
                <button key={v.key} type="button" onClick={() => insert(v.key)} className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold">{v.label}</button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">Jei nenurodysite lauko „Šalių adresų ir parašų blokas“, jis bus pridėtas sutarties pabaigoje.</p>
      </div>

      <div>
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="font-semibold underline">{showPreview ? "Slėpti peržiūrą" : "Peržiūrėti su pavyzdiniais duomenimis"}</button>
        {showPreview && <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-xs">{preview}</pre>}
      </div>

      <Msg msg={msg} />
      <div className="flex flex-wrap gap-3">
        <button disabled={pending || !text.trim()} onClick={() => save(text)} className={primaryBtn}>{pending ? "Saugoma..." : "Išsaugoti šabloną"}</button>
        <button disabled={pending} onClick={() => { if (confirm("Bus naudojamas standartinis programos šablonas. Jūsų šablonas bus ištrintas. Tęsti?")) { setText(""); save(""); } }} className="min-h-12 rounded-2xl bg-black/5 px-4 font-semibold">Naudoti standartinį šabloną</button>
      </div>
    </div>
  );
}
