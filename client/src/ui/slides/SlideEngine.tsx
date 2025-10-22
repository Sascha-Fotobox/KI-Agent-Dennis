import React, { useEffect, useRef, useState } from "react";

// Pricing constants mirrored from original chat app
const BASE_PRICE = 350;
const PRINT_PRICES: Record<"100"|"200"|"400"|"800"|"802", number> = {
  "100": 70, "200": 100, "400": 150, "800": 250, "802": 280
};
const SECOND_LAYOUT_FEE = 20; // Postkarte & Streifen
const ACCESSORY_PRICES: Record<string, number> = {
  "Requisiten": 30,
  "Hintergrund": 30,
  "Layout": 30,
  "Gala-Paket": 80,
  "Audio-Gästebuch": 90,
};


export type Slide = {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  audioSrc?: string;
  kind?: "mode" | "event" | "guests" | "format" | "printpkgs" | "accessories" | "summary" | "info";
  options?: string[];      // for slides with selectable options
  multi?: boolean;         // allow multiple selections (e.g., accessories)
};

type Selections = {
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
};

function computePrice(sel: any) {
  let total = BASE_PRICE;
  if (sel.mode === 'Digital & Print' && sel.printpkg) {
    total += PRINT_PRICES[sel.printpkg as keyof typeof PRINT_PRICES] || 0;
    if (sel.format === 'Postkarte & Streifen') total += SECOND_LAYOUT_FEE;
  }
  // Accessories sum
  if (Array.isArray(sel.accessories)) {
    for (const a of sel.accessories) total += (ACCESSORY_PRICES[a] || 0);
  }
  return total;
}

export default function SlideEngine({ slides, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<Selections>({ accessories: [] });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = slides[index];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [index]);

  function chooseSingle(value: string) {
    switch (current.kind) {
      case "mode":
        setSel((s) => ({ ...s, mode: value as Selections["mode"] }));
        break;
      case "event":
        setSel((s) => ({ ...s, event: value }));
        break;
      case "guests":
        setSel((s) => ({ ...s, guests: value }));
        break;
      case "format":
        setSel((s) => ({ ...s, format: value }));
        break;
      case "printpkgs":
        setSel((s) => ({ ...s, printpkg: value }));
        break;
    }
  }

  function toggleMulti(value: string) {
    setSel((s) => {
      const has = s.accessories.includes(value);
      const next = has ? s.accessories.filter((x) => x !== value) : [...s.accessories, value];
      return { ...s, accessories: next };
    });
  }

  // Validation: require a selection before moving on for specific slides
  const needsChoice = ["mode", "event", "guests", "format", "printpkgs"].includes(current.kind || "");
  const hasChoice =
    current.kind === "mode" ? !!sel.mode :
    current.kind === "event" ? !!sel.event :
    current.kind === "guests" ? !!sel.guests :
    current.kind === "format" ? !!sel.format :
    current.kind === "printpkgs" ? !!sel.printpkg :
    true;

  const canPrev = index > 0;
  const canNext = index < slides.length - 1 && (!needsChoice || hasChoice);

  return (
    <div style={{height: 520, maxWidth: 880, overflowY: "auto"}}>
      <div className="sectionTitle">{current.title}</div>
      {current.description && <p className="hint">{current.description}</p>}

      {/* bullets list (info content) */}
      {current.bullets && current.bullets.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {current.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}

      {/* audio */}
      {current.audioSrc && (
        <div style={{ marginTop: 12 }}>
          <div className="sectionTitle" style={{ fontSize: 14, marginBottom: 6 }}>Erklärung anhören</div>
          <audio ref={audioRef} controls src={current.audioSrc} style={{ width: "100%" }} />
        </div>
      )}

      {/* interactive options */}
      {current.options && current.options.length > 0 && (
        <div className="btnrow wrap" style={{ marginTop: 12 }}>
          {current.options.map((opt) => {
            const active =
              current.kind === "mode" ? sel.mode === opt :
              current.kind === "event" ? sel.event === opt :
              current.kind === "guests" ? sel.guests === opt :
              current.kind === "format" ? sel.format === opt :
              current.kind === "printpkgs" ? sel.printpkg === opt :
              current.kind === "accessories" ? sel.accessories.includes(opt) :
              false;
            return (
              <button
                key={opt}
                className={active ? "active card" : "card"}
                onClick={() => {
                  if (current.kind === "accessories" || current.multi) toggleMulti(opt);
                  else chooseSingle(opt);
                }}
              >
                <div className="btn-title">{opt}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* navigation */}
      <div className="btnrow" style={{ marginTop: 16, alignItems: "center" }}>
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={!canPrev}>
          Zurück
        </button>
        <span className="chip">{index + 1} / {slides.length}</span>
        <button
          onClick={() => {
            if (index < slides.length - 1) setIndex((i) => i + 1);
            else onFinish && onFinish();
          }}
          disabled={!canNext}
        >
          {index < slides.length - 1 ? "Weiter" : "Fertig"}
        </button>
      </div>

      {/* summary */}
      <div className="note" style={{ marginTop: 12 }}>
        <b>Zusammenfassung (live):</b>
        <div className="sumrow"><span>Modus</span><b>{sel.mode ?? "–"}</b></div>
        <div className="sumrow"><span>Event</span><b>{sel.event ?? "–"}</b></div>
        {sel.mode === "Digital & Print" && (
          <>
            <div className="sumrow"><span>Gäste</span><b>{sel.guests ?? "–"}</b></div>
            <div className="sumrow"><span>Format</span><b>{sel.format ?? "–"}</b></div>
            <div className="sumrow"><span>Druckpaket</span><b>{sel.printpkg ?? "–"}</b></div>
          </>
        )}
        <div className="sumrow"><span>Zubehör</span><b>{sel.accessories.length ? sel.accessories.join(", ") : "–"}</b></div>
              <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.15)" }} />
        <div className="sumrow"><span>Grundpaket</span><b>{BASE_PRICE.toFixed(2)} €</b></div>
        {sel.mode === "Digital & Print" && (
          <>
            <div className="sumrow"><span>Druckpaket</span><b>{sel.printpkg ? (PRINT_PRICES[sel.printpkg as keyof typeof PRINT_PRICES]).toFixed(2) + " €" : "–"}</b></div>
            <div className="sumrow"><span>Format-Extra</span><b>{sel.format === "Postkarte & Streifen" ? SECOND_LAYOUT_FEE.toFixed(2) + " €" : "0,00 €"}</b></div>
          </>
        )}
        {sel.accessories.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div className="sectionTitle" style={{ fontSize: 14, marginBottom: 4 }}>Zubehör</div>
            {sel.accessories.map(a => (
              <div key={a} className="sumrow"><span>{a}</span><b>{(ACCESSORY_PRICES[a] || 0).toFixed(2)} €</b></div>
            ))}
          </div>
        )}
        <div className="sumrow" style={{ marginTop: 8 }}>
          <span><b>Gesamt</b></span><b>{computePrice(sel).toFixed(2)} €</b>
        </div>
      </div>
    </div>
  );
}
