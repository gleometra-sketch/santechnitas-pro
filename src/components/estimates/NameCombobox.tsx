"use client";

import { useMemo, useState, type Ref } from "react";
import { formatEuro } from "@/lib/estimates/calc";
import type { CatalogEntry } from "@/lib/estimates/search";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Pasirinktas katalogo įrašas: pavadinimas, vienetas ir kaina užpildomi, kiekį įveda naudotojas. */
  onPick: (entry: CatalogEntry) => void;
  search: (query: string) => CatalogEntry[];
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
};

/** Pavadinimo laukelis su siūlymais iš katalogo: rodo neseniai naudotus, o rašant – pagal pradžią ar raides. */
export default function NameCombobox({ id, value, onChange, onPick, search, inputRef, placeholder, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const results = useMemo(() => (open ? search(value) : []), [open, value, search]);
  const listId = `${id}-list`;
  const showList = open && results.length > 0;

  const pick = (entry: CatalogEntry) => {
    onPick(entry);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && showList && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        maxLength={200}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        className={`min-h-12 w-full rounded-xl border bg-white px-3 ${invalid ? "border-danger" : "border-black/15"}`}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-[25] mt-1 max-h-72 overflow-y-auto rounded-xl border border-black/15 bg-white shadow-lg"
        >
          {results.map((r, i) => (
            <li
              key={`${r.kind}:${r.name}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown + preventDefault: laukelis neprarandą fokuso, kol paspaudimas apdorojamas
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-3 py-2 ${i === active ? "bg-accent-soft" : ""}`}
            >
              <span className="min-w-0 truncate font-medium">{r.name}</span>
              <span className="shrink-0 text-sm text-muted">
                {formatEuro(r.priceCents)} / {r.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
