"use client";

import { useEffect, useState } from "react";

/**
 * Animuotas logotipas: paleidžiamas vieną kartą ir lieka paskutiniame kadre.
 * Jei telefone išjungti judesiai arba vaizdo įrašas nepasileidžia (pvz., taupymo režimas),
 * rodomas statinis paskutinis kadras.
 */
export default function AnimatedLogo({ size = 64, label = "SANTECHNITAS" }: { size?: number; label?: string }) {
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStill(true);
  }, []);

  const box = "shrink-0 overflow-hidden rounded-2xl bg-[#202343] shadow-card";

  return (
    <div className={box} style={{ width: size, height: size }} role="img" aria-label={label}>
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/logo-poster.webp" alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <video
          className="h-full w-full object-cover"
          width={size}
          height={size}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/brand/logo-poster.webp"
          aria-hidden="true"
          onError={() => setStill(true)}
        >
          <source src="/brand/logo-intro.webm" type="video/webm" />
          <source src="/brand/logo-intro.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
