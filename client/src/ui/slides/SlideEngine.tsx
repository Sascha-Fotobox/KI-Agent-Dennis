
import React, { useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  sections?: { title: string; items: string[] }[];
  audioSrc?: string;
  kind?: "mode" | "event" | "guests" | "format" | "printpkgs" | "accessories" | "summary" | "info";
  options?: string[];
  multi?: boolean;
};

export type Selections = {
  mode?: "Digital" | "Digital & Print";
  event?: string;
  guests?: string;
  format?: string;
  printpkg?: string;
  accessories: string[];
};

type Props = {
  slides: Slide[];
  onFinish?: () => void;
  onChange?: (s: Selections) => void;
};

// Pricing constants
const BASE_PRICE = 350;
const PRINT_PRICES: Record<string, number> = { "100": 70, "200": 100, "400": 150, "800": 250, "802": 280 };
const SECOND_LAYOUT_FEE = 20;
const ACCESSORY_PRICES: Record<string, number> = {"Requisiten":30,"Hintergrund":30,"Layout":30,"Gala-Paket":80,"Audio-Gästebuch":90};
const SMALL_ZUO: ReadonlyArray<string> = ["Requisiten","Hintergrund","Layout"];

// pick which small accessory is included (one of SMALL_ZUO) if chosen
export function pickIncludedSmall(sel: Selections): string | null {
  if (!Array.isArray(sel.accessories)) return null;
  for (const name of SMALL_ZUO) {
    if (sel.accessories.includes(name)) return name;
  }
  return null;
}

function getPrintPrice(sel: Selections): number {
  if (sel.mode !== "Digital & Print" || !sel.printpkg) return 0;
  const raw = parseInt(sel.printpkg, 10);
  if (!Number.isFinite(raw)) return 0;
  const effective = sel.format === "Streifen" ? Math.round(raw/2) : raw;
  return PRINT_PRICES[String(effective)] ?? 0;
}

export function computePrice(sel: Selections) {
  let total = BASE_PRICE;
  total += getPrintPrice(sel);
  if (sel.mode === "Digital & Print" && sel.format === "Postkarte & Streifen") total += SECOND_LAYOUT_FEE;

  let accessoriesTotal = 0;
  if (Array.isArray(sel.accessories)) {
    for (const a of sel.accessories) accessoriesTotal += (ACCESSORY_PRICES[a] || 0);
  }
  const included = pickIncludedSmall(sel);
  if (included) accessoriesTotal = Math.max(0, accessoriesTotal - 30);

  total += accessoriesTotal;
  return total;
}

export default function SlideEngine({ slides, onFinish, onChange }: Props) {
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<Selections>({ accessories: [] });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = slides[index];
  const isWelcome = current.id === 'welcome';

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, [index]);

  useEffect(() => { onChange?.(sel); }, [sel, onChange]);

  const needsChoice = ["mode", "event", "guests", "format", "printpkgs"].includes(current.kind || "");
  const hasChoice =
    current.kind === "mode" ? !!sel.mode :
    current.kind === "event" ? !!sel.event :
    current.kind === "guests" ? !!sel.guests :
    current.kind === "format" ? !!sel.format :
    current.kind === "printpkgs" ? !!sel.printpkg :
    true;

  const canPrev = index > 0;
  function nextIndex(i: number): number {
    let n = Math.min(slides.length - 1, i + 1);
    while (slides[n]?.kind === "printpkgs" && sel.mode === "Digital") {
      n = Math.min(slides.length - 1, n + 1);
    }
    return n;
  }
  const canNext = (index < slides.length - 1) && (!needsChoice || hasChoice);

  function chooseSingle(value: string) {
    switch (current.kind) {
      case "mode": setSel(s => ({ ...s, mode: value as Selections["mode"] })); break;
      case "event": setSel(s => ({ ...s, event: value })); break;
      case "guests": setSel(s => ({ ...s, guests: value })); break;
      case "format": setSel(s => ({ ...s, format: value })); break;
      case "printpkgs": setSel(s => ({ ...s, printpkg: value })); break;
    }
  }
  function toggleMulti(value: string) {
    setSel(s => {
      const has = s.accessories.includes(value);
      return { ...s, accessories: has ? s.accessories.filter(x => x !== value) : [...s.accessories, value] };
    });
  }

  return (
    <div className={"slideBox"}>
      <div className={isWelcome ? "slideInner" : "slideInner centered"}>
      <div className="sectionTitle">{current.title}</div>
      {current.description && <p className="hint">{current.description}</p>}

      {current.sections && current.sections.length > 0 && (
        <div className="sections">
          {current.sections.map((sec, i) => (
            <div className="sectionBlock" key={i}>
              <div className="secTitle">{sec.title}</div>
              <ul className="secList">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      {current.bullets && current.bullets.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {current.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}

      {current.options && current.options.length > 0 && (
        <div className="btnrow wrap" style={{ marginTop: 12 }}>
          {current.options.map((opt) => {
            const active =
              current.kind === "mode" ? sel.mode === opt :
              current.kind === "event" ? sel.event === opt :
              current.kind === "guests" ? sel.guests === opt :
              current.kind === "format" ? sel.format === opt :
              current.kind === "printpkgs" ? sel.printpkg === opt :
              current.kind === "accessories" ? sel.accessories.includes(opt) : false;
            return (
              <button
                key={opt}
                className={active ? "active" : ""}
                onClick={() => {
                  if (current.kind === "accessories" || current.multi) toggleMulti(opt);
                  else chooseSingle(opt);
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      

      </div>
      {/* audio above nav, centered */}
      {current.audioSrc && (
        <div className="audioInline">
          <div className="sectionTitle" style={{ fontSize: 14, marginBottom: 6, textAlign: "center" }}>Erklärung anhören</div>
          <div className="audioInlineRow">
            <button type="button" className="audioBtn" onClick={() => {
              if (!audioRef.current) return;
              if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause();
            }}>Play / Pause</button>
            <audio ref={audioRef} src={current.audioSrc} />
          </div>
        </div>
      )}

      <div className="navrow">
        <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={!canPrev}>Zurück</button>
        <span className="chip">{index + 1} / {slides.length}</span>
        <button
          onClick={() => { if (index < slides.length - 1) setIndex(i => nextIndex(i)); else onFinish && onFinish(); }}
          disabled={!canNext}
        >
          {index < slides.length - 1 ? "Weiter" : "Fertig"}
        </button>
      </div>
    </div>
  );
}
