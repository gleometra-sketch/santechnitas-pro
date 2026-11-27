"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Sign = { signature: string | null; setSignature: (s: string | null) => void; seenEnd: boolean; setSeenEnd: (v: boolean) => void };
const Ctx = createContext<Sign | null>(null);

/** Bendra būsena tarp parašo laukelio (sutarties lape) ir „Patvirtinti“ mygtuko puslapio apačioje. */
export function SignProvider({ children }: { children: ReactNode }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [seenEnd, setSeenEnd] = useState(false);
  const value = useMemo(() => ({ signature, setSignature, seenEnd, setSeenEnd }), [signature, seenEnd]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSign(): Sign {
  const c = useContext(Ctx);
  if (!c) return { signature: null, setSignature: () => {}, seenEnd: true, setSeenEnd: () => {} };
  return c;
}

/** Žymeklis dokumento gale: kai jis pasirodo ekrane, klientas laikomas perskaičiusiu iki galo. */
export function EndMarker() {
  const { setSeenEnd } = useSign();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeenEnd(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeenEnd(true); io.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, [setSeenEnd]);
  return <div ref={ref} aria-hidden className="h-px print:hidden" />;
}

const W = 600;
const H = 200;

/** Parašo laukelis: klientas pasirašo pirštu (arba pele). Rezultatas – PNG duomenų nuoroda. */
function Pad() {
  const { setSignature } = useSign();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const ink = useRef(0);
  const [has, setHas] = useState(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
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
    if (ink.current > 60) { setHas(true); setSignature(ref.current!.toDataURL("image/png")); }
  };
  const clear = useCallback(() => {
    const c = ref.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, W, H);
    ink.current = 0; setHas(false); setSignature(null);
  }, [setSignature]);

  return (
    <div id="kliento-parasas" className="scroll-mt-24 print:scroll-mt-0">
      <div className={`relative overflow-hidden rounded-lg border-2 border-dashed ${has ? "border-go-dark/50" : "border-black/30"} bg-white print:border-0`}>
        <canvas
          ref={ref} width={W} height={H}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none" }}
          className="block aspect-[3/1] w-full cursor-crosshair"
          aria-label="Parašo laukelis: pasirašykite pirštu"
        />
        {!has && <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-black/40 print:hidden">Pasirašykite pirštu čia</span>}
      </div>
      <div className="mt-1 flex items-center justify-between font-sans text-sm print:hidden">
        <span className={has ? "font-semibold text-go-dark" : "text-black/50"}>{has ? "✓ Parašas įrašytas" : "Parašas privalomas"}</span>
        <button type="button" onClick={clear} disabled={!has} className="min-h-9 rounded-lg px-3 font-semibold text-black/70 underline disabled:opacity-40">Išvalyti</button>
      </div>
    </div>
  );
}

/** Užsakovo parašo vieta: laukelis (kol laukiama atsakymo), išsaugotas parašas (kai patvirtinta) arba tuščia eilutė. */
export function ClientSignatureSlot({ canSign, signature }: { canSign: boolean; signature: string | null }) {
  if (signature) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={signature} alt="Užsakovo parašas" className="mb-1 aspect-[3/1] w-full max-w-[18rem] object-contain object-left" />;
  }
  if (canSign) return <Pad />;
  return <div className="h-10" />;
}
