import React, { useEffect, useState } from "react";
import "./App.css";
import SlideEngine, { computePrice, type Selections } from "./slides/SlideEngine";

// Typed maps for summary rendering
const PRINT_PRICE_MAP: Record<string, number> = { "100": 70, "200": 100, "400": 150, "800": 250, "802": 280 };
const ACCESSORY_PRICE_MAP: Record<string, number> = {
  "Requisiten": 30,
  "Hintergrund": 30,
  "Layout": 30,
  "Gala-Paket": 80,
  "Audio-Gästebuch": 90,
};

import { slides } from "./slides/slides.config";

type Knowledge = {
  brand?: string;
  assistant_name?: string;
  theme?: { bg?: string; text?: string; brand?: string; accent?: string };
  disclaimer?: string;
};

function useKnowledge() {
  const [k, setK] = useState<Knowledge | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/knowledge.json");
        const data = res.ok ? ((await res.json()) as Knowledge) : null;
        if (!alive) return;
        setK(
          data ?? {
            brand: "Fobi Fotobox",
            assistant_name: "Dennis",
            theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
            disclaimer:
              "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben.",
          }
        );
      } catch {
        if (!alive) return;
        setK({
          brand: "Fobi Fotobox",
          assistant_name: "Dennis",
          theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
          disclaimer:
            "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben.",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return k;
}

export default function App() {
  const [appSel, setAppSel] = useState<Selections>({ accessories: [] });
  const k = useKnowledge();
  const brand = k?.brand ?? "Fobi Fotobox";
  const themeBg = k?.theme?.bg ?? "#1e1e1c";
  const themeText = k?.theme?.text ?? "#ffffff";

  return (
    <div className="app" style={{ background: themeBg, color: themeText }}>
      <header className="topbar">
        <div className="brandRow">
          <img
            className="logo"
            src="/logo.svg"
            alt={brand}
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          <div>
            <div className="brandName">{brand}</div>
            <div className="hint">Dein digitaler Berater – Dennis</div>
            {k?.disclaimer && (
              <div className="note" style={{ marginTop: 6 }}>
                {k.disclaimer}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="chat">
        /* Selections lifted to App for a separate summary box */
         
        <div className="bubble a">
          <SlideEngine slides={slides} onFinish={() => console.log("Slides fertig")} onChange={setAppSel} />
        </div>

        <div className="bubble sum">
          <div className="sectionTitle">Zusammenfassung (live)</div>
          <div className="sumrow"><span>Modus</span><b>{appSel.mode ?? "–"}</b></div>
          <div className="sumrow"><span>Event</span><b>{appSel.event ?? "–"}</b></div>
          {appSel.mode === "Digital & Print" && (
            <>
              <div className="sumrow"><span>Gäste</span><b>{appSel.guests ?? "–"}</b></div>
              <div className="sumrow"><span>Format</span><b>{appSel.format ?? "–"}</b></div>
              <div className="sumrow"><span>Druckpaket</span><b>{appSel.printpkg ?? "–"}</b></div>
            </>
          )}
          <div className="sumrow"><span>Zubehör</span><b>{appSel.accessories?.length ? appSel.accessories.join(", ") : "–"}</b></div>
          <div className="divider"></div>
          <div className="sumrow"><span>Grundpaket</span><b>{(350).toFixed(2)} €</b></div>
          {appSel.mode === "Digital & Print" && (
            <>
              <div className="sumrow"><span>Druckpaket</span><b>{ appSel.printpkg ? (PRINT_PRICE_MAP[appSel.printpkg] ?? 0).toFixed(2) + " €" : "–" }</b></div>
              <div className="sumrow"><span>Format-Extra</span><b>{appSel.format === "Postkarte & Streifen" ? (20).toFixed(2) + " €" : "0,00 €"}</b></div>
            </>
          )}
          {appSel.accessories?.length ? appSel.accessories.map(a => (
            <div key={a} className="sumrow"><span>{a}</span><b>{ (ACCESSORY_PRICE_MAP[a] ?? 0).toFixed(2) } €</b></div>
          )) : null}
          <div className="sumrow" style={{ marginTop: 8 }}>
            <span><b>Gesamt</b></span><b>{computePrice(appSel).toFixed(2)} €</b>
          </div>
        </div>
      </main>
    </div>
  );
}
