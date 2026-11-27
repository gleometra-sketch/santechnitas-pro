"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import SignaturePad from "@/components/documents/SignaturePad";

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

function Pad() {
  const { setSignature } = useSign();
  return <SignaturePad id="kliento-parasas" onChange={setSignature} />;
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
