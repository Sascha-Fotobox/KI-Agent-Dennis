import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

type Knowledge = {
  brand?: string;
  assistant_name?: string;
  theme?: { bg?: string; text?: string; brand?: string; accent?: string };
};

type Selections = {
  mode?: "Digital" | "Digital & Print";
  eventType?: string;
  guests?: number;
  format?: "Postkarte" | "Streifen" | "Großbild";
  printPackage?: "100" | "200" | "400" | "800" | "802" | null;
  accessories?: { requisiten?: boolean; hintergrund?: boolean; layout?: boolean };
};

const PRINT_PRICES: Record<string, number> = {
  "100": 70,
  "200": 100,
  "400": 150,
  "800": 250,
  "802": 280
};

const BASE_PRICE = 350;

function useKnowledge() {
  const [k, setK] = useState<Knowledge | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/knowledge.json");
        if (!res.ok) throw new Error("knowledge.json not found");
        const data = (await res.json()) as Knowledge;
        if (active) setK(data);
      } catch {
        if (active)
          setK({
            brand: "Fobi Fotobox",
            assistant_name: "Dennis",
            theme: { bg: "#232321", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
          });
      }
    })();
    return () => { active = false; };
  }, []);

  return k;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function App() {
  const k = useKnowledge();

  const [sel, setSel] = useState<Selections>({
    mode: undefined,
    eventType: undefined,
    guests: undefined,
    format: undefined,
    printPackage: null,
    accessories: { requisiten: false, hintergrund: false, layout: false },
  });

  const brand = (k?.brand ?? "Fobi Fotobox").replace(/^FOBI\b/, "Fobi");
  const themeBg = k?.theme?.bg ?? "#232321";
  const themeText = k?.theme?.text ?? "#ffffff";

  const total = useMemo(() => {
    let sum = BASE_PRICE;
    if (sel.mode === "Digital & Print" && sel.printPackage) {
      sum += PRINT_PRICES[sel.printPackage];
    }
    return sum;
  }, [sel.mode, sel.printPackage]);

  return (
    <div className="app" style={{ background: themeBg, color: themeText }}>
      <header className="header">
        <div className="brand">
          <img
            className="logo"
            src="/logo.svg"
            alt={brand}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
            }}
          />
          <div className="brand-meta">
            <h1>{brand}</h1>
            <small>Assistent „Dennis“ – Beratung & Preisübersicht</small>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="col">
          <h2>1) Basis wählen</h2>
          <div className="buttons">
            {(["Digital", "Digital & Print"] as const).map((m) => (
              <button
                key={m}
                className={sel.mode === m ? "active" : ""}
                onClick={() =>
                  setSel((s) => ({
                    ...s,
                    mode: m,
                    printPackage: m === "Digital" ? null : s.printPackage,
                  }))
                }
                aria-pressed={sel.mode === m}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="rule" />

          <h3>Eventtyp</h3>
          <div className="buttons">
            {[
              "Hochzeit",
              "Geburtstag",
              "Abschlussball",
              "Internes Mitarbeiterevent",
              "Externes Kundenevent",
              "Öffentliche Veranstaltung",
            ].map((e) => (
              <button
                key={e}
                className={sel.eventType === e ? "active" : ""}
                onClick={() => setSel((s) => ({ ...s, eventType: e }))}
                aria-pressed={sel.eventType === e}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="rule" />

          <h3>Format</h3>
          <div className="buttons">
            {(["Postkarte", "Streifen", "Großbild"] as const).map((f) => (
              <button
                key={f}
                className={sel.format === f ? "active" : ""}
                onClick={() => setSel((s) => ({ ...s, format: f }))}
                aria-pressed={sel.format === f}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section className="col">
          <h2>2) Druckpaket</h2>
          <p className="muted">Nur relevant bei „Digital & Print“.</p>
          <div className="buttons">
            {[
              { key: "100", label: "Printpaket 100", info: "≈100 Drucke", price: PRINT_PRICES["100"] },
              { key: "200", label: "Printpaket 200", info: "≈200 Drucke", price: PRINT_PRICES["200"] },
              { key: "400", label: "Printpaket 400", info: "≈400 Drucke", price: PRINT_PRICES["400"] },
              { key: "800", label: "Printpaket 800", info: "≈800 Drucke", price: PRINT_PRICES["800"] },
              { key: "802", label: "Printpaket 802", info: "2 Drucker", price: PRINT_PRICES["802"] },
            ].map((p) => {
              const active = sel.printPackage === (p.key as Selections["printPackage"]);
              return (
                <button
                  key={p.key}
                  disabled={sel.mode !== "Digital & Print"}
                  className={active ? "active" : ""}
                  onClick={() => setSel((s) => ({ ...s, printPackage: p.key as Selections["printPackage"] }))}
                  aria-pressed={active}
                >
                  <div className="btn-title">{p.label}</div>
                  <div className="btn-sub">{p.info}</div>
                  <div className="btn-price">{formatCurrency(p.price)}</div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="col summary">
          <h2>3) Zusammenfassung</h2>
          <ul className="kv">
            <li>
              <span>Grundpaket</span>
              <b>{formatCurrency(BASE_PRICE)}</b>
            </li>
            <li>
              <span>Modus</span>
              <b>{sel.mode ?? "–"}</b>
            </li>
            <li>
              <span>Event</span>
              <b>{sel.eventType ?? "–"}</b>
            </li>
            <li>
              <span>Format</span>
              <b>{sel.format ?? "–"}</b>
            </li>
            <li>
              <span>Druckpaket</span>
              <b>{sel.printPackage ? `Printpaket ${sel.printPackage}` : "–"}</b>
            </li>
          </ul>
          <div className="total">
            <span>Gesamt</span>
            <b>{formatCurrency(total)}</b>
          </div>
          <p className="hint">Hinweis: Digitale Nutzung ist immer inklusive.</p>
        </aside>
      </main>
    </div>
  );
}
