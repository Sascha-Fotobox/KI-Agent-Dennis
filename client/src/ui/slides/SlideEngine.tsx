import React, { useEffect, useRef, useState } from "react";

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
    <div>
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
      </div>
    </div>
  );
}
