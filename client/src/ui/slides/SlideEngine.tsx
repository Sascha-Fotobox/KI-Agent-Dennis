import React, { useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  audioSrc?: string;
  kind?: "mode"; // special renderer handled inside SlideEngine
};

type Props = {
  slides: Slide[];
  onFinish?: () => void;
};

export default function SlideEngine({ slides, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"Digital" | "Digital & Print" | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = slides[index];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [index]);

  const canPrev = index > 0;
  const canNext = index < slides.length - 1;

  return (
    <div>
      <div className="sectionTitle">{current.title}</div>
      {current.description && <p className="hint">{current.description}</p>}

      {current.bullets && current.bullets.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {current.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}

      {current.audioSrc && (
        <div style={{ marginTop: 12 }}>
          <audio ref={audioRef} controls src={current.audioSrc} style={{ width: "100%" }} />
        </div>
      )}

      {/* Optional interactive content (e.g., Mode selection) */}
      {/* Special slides handled internally */}
      {current.kind === "mode" && (
        <div className="btnrow" style={{ marginTop: 12 }}>
          {(["Digital", "Digital & Print"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="btnrow" style={{ marginTop: 16, alignItems: "center" }}>
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={!canPrev}>
          Zurück
        </button>
        <span className="chip">{index + 1} / {slides.length}</span>
        <button
          onClick={() => {
            if (canNext) setIndex((i) => i + 1);
            else onFinish && onFinish();
          }}
        >
          {canNext ? "Weiter" : "Fertig"}
        </button>
      </div>

      {/* Small live summary strip (mode only for now) */}
      <div className="note" style={{ marginTop: 12 }}>
        <b>Aktuelle Auswahl:</b> Modus: {mode ?? "–"}
      </div>
    </div>
  );
}
