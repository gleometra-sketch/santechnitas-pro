/** DarboRitmas ženklas (mėlyna + raudona pusė su pulso linija) ir užrašas. */
const LEFT = "M16 0h16v64H16A16 16 0 0 1 0 48V16A16 16 0 0 1 16 0z";
const RIGHT = "M32 0h16a16 16 0 0 1 16 16v32a16 16 0 0 1-16 16H32z";
const PULSE = "M10 34h12l5-14 8 26 6-16 3 4h10";

export type LogoVariant = "light" | "dark";

const COLORS = {
  light: { blue: "#1456E8", red: "#D92D20", pulse: "#FFFFFF", text: "#0B1B3F", accent: "#D92D20" },
  dark: { blue: "#4C84FF", red: "#FF5A4D", pulse: "#0B1B3F", text: "#FFFFFF", accent: "#FF5A4D" },
} as const;

export function LogoMark({ size = 40, variant = "light", decorative = false }: { size?: number; variant?: LogoVariant; decorative?: boolean }) {
  const c = COLORS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "DarboRitmas logotipas" })}
    >
      <path d={LEFT} fill={c.blue} />
      <path d={RIGHT} fill={c.red} />
      <path d={PULSE} fill="none" stroke={c.pulse} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({
  size = 40,
  variant = "light",
  wordmark = true,
  wordmarkClassName = "",
}: {
  size?: number;
  variant?: LogoVariant;
  wordmark?: boolean;
  /** Pvz. „hidden min-[480px]:inline“ – užrašo slėpimui siaurame ekrane. */
  wordmarkClassName?: string;
}) {
  const c = COLORS[variant];
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} variant={variant} decorative={wordmark} />
      {wordmark && (
        <span className={`font-display font-bold leading-none ${wordmarkClassName}`} style={{ fontSize: Math.round(size * 0.64), letterSpacing: "-0.02em", color: c.text }}>
          Darbo<span style={{ color: c.accent }}>Ritmas</span>
        </span>
      )}
    </span>
  );
}
