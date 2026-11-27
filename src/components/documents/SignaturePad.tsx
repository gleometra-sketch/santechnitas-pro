"use client";

import { useCallback, useRef, useState } from "react";

export const SIG_W = 600;
export const SIG_H = 200;

/** Parašo laukelis: pasirašoma pirštu arba pele. onChange gauna PNG duomenų nuorodą (arba null išvalius). */
export default function SignaturePad({ onChange, id, hint = "Pasirašykite pirštu čia", doneText = "✓ Parašas įrašytas", emptyText = "Parašas privalomas", resetKey }: {
  onChange: (png: string | null) => void; id?: string; hint?: string; doneText?: string; emptyText?: string; resetKey?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const ink = useRef(0);
  const [has, setHas] = useState(false);
  const seen = useRef(resetKey);

  // Išorinis išvalymas (pvz. kai nuotrauka pakeičia nupieštą parašą).
  if (seen.current !== resetKey) {
    seen.current = resetKey;
    queueMicrotask(() => { ref.current?.getContext("2d")?.clearRect(0, 0, SIG_W, SIG_H); ink.current = 0; setHas(false); });
  }

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * SIG_W) / r.width, y: ((e.clientY - r.top) * SIG_H) / r.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.6, 0, Math.PI * 2); ctx.fill();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ink.current += Math.hypot(p.x - last.current.x, p.y - last.current.y);
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (ink.current > 60) { setHas(true); onChange(ref.current!.toDataURL("image/png")); }
  };
  const clear = useCallback(() => {
    ref.current?.getContext("2d")?.clearRect(0, 0, SIG_W, SIG_H);
    ink.current = 0; setHas(false); onChange(null);
  }, [onChange]);

  return (
    <div id={id} className="scroll-mt-24 print:scroll-mt-0">
      <div className={`relative overflow-hidden rounded-lg border-2 border-dashed ${has ? "border-go-dark/50" : "border-black/30"} bg-white print:border-0`}>
        <canvas
          ref={ref} width={SIG_W} height={SIG_H}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none" }}
          className="block aspect-[3/1] w-full cursor-crosshair"
          aria-label="Parašo laukelis: pasirašykite pirštu"
        />
        {!has && <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-black/40 print:hidden">{hint}</span>}
      </div>
      <div className="mt-1 flex items-center justify-between font-sans text-sm print:hidden">
        <span className={has ? "font-semibold text-go-dark" : "text-black/50"}>{has ? doneText : emptyText}</span>
        <button type="button" onClick={clear} disabled={!has} className="min-h-9 rounded-lg px-3 font-semibold text-black/70 underline disabled:opacity-40">Išvalyti</button>
      </div>
    </div>
  );
}

/** Parašo nuotrauka (pvz. nufotografuotas popierius) → permatomas PNG ne didesnis nei 600×200. */
export async function imageToSignaturePng(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Nepavyko perskaityti paveikslėlio.")); i.src = url; });
    const scale = Math.min(SIG_W / img.width, SIG_H / img.height, 1);
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    // Šviesus fonas → permatomas; tamsus brūkšnys lieka (paryškinamas, kad popieriaus nuotrauka atrodytų kaip rašalas).
    for (let i = 0; i < d.data.length; i += 4) {
      const lum = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
      const a = lum > 200 ? 0 : lum < 110 ? 255 : Math.round(((200 - lum) / 90) * 255);
      d.data[i] = 17; d.data[i + 1] = 17; d.data[i + 2] = 17; d.data[i + 3] = Math.min(d.data[i + 3], a);
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}
