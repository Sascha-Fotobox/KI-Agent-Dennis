import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

type Knowledge = {
  brand?: string;
  assistant_name?: string;
  theme?: { bg?: string; text?: string; brand?: string; accent?: string };
  disclaimer?: string;
};

type Selections = {
  mode?: "Digital" | "Digital & Print";
  eventType?: string;
  guests?: string;
  format?: "Postkarte" | "Streifen" | "Großbild";
  printPackage?: "100" | "200" | "400" | "800" | "802" | null;
};

const PRINT_PRICES: Record<string, number> = {
  "100": 70,
  "200": 100,
  "400": 150,
  "800": 250,
  "802": 280, // 2 Drucker
};

const BASE_PRICE = 350;

/** Hilfsfunktionen */
const sanitize = (s?: string) =>
  (s ?? "").replace(/\\n/g, "\n").replace(/\s+\n/g, "\n").trim();

/** Faktor nach Format: Postkarte = 1x, Streifen = 2x, Großbild = 0.5x */
function formatFactor(format?: Selections["format"]) {
  if (format === "Streifen") return 2;
  if (format === "Großbild") return 0.5;
  return 1; // Postkarte / undefined
}

/** Effektive Druckanzahl pro Paket (je nach Format) */
function effectivePrints(pkgKey: keyof typeof PRINT_PRICES, format?: Selections["format"]) {
  const base = pkgKey === "802" ? 800 : Number(pkgKey); // 802 wie 800
  const factor = formatFactor(format);
  return Math.round(base * factor);
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function useKnowledge() {
  const [k, setK] = useState<Knowledge | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/knowledge.json");
        const data = res.ok ? ((await res.json()) as Knowledge) : null;
        if (!active) return;
        setK(
          data ?? {
            brand: "Fobi Fotobox",
            assistant_name: "Dennis",
            theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
            disclaimer:
              "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden.",
          }
        );
      } catch {
        if (!active) return;
        setK({
          brand: "Fobi Fotobox",
          assistant_name: "Dennis",
          theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
          disclaimer:
            "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return k;
}

export default function App() {
  const k = useKnowledge();
  const [sel, setSel] = useState<Selections>({ printPackage: null });

  const brand = (k?.brand ?? "Fobi Fotobox").replace(/^FOBI\b/, "Fobi");
  const themeBg = k?.theme?.bg ?? "#1e1e1c";
  const themeText = k?.theme?.text ?? "#ffffff";

  /** Summe: Grundpaket + ggf. Printpaket */
  const total = useMemo(() => {
    let sum = BASE_PRICE;
    if (sel.mode === "Digital & Print" && sel.printPackage) sum += PRINT_PRICES[sel.printPackage];
    return sum;
  }, [sel.mode, sel.printPackage]);

  /** Texte für Druckpakete dynamisch je Format */
  const pkgCards = useMemo(() => {
    const keys: Selections["printPackage"][] = ["100", "200", "400", "800", "802"];
    return keys.map((key) => {
      const count = effectivePrints(key as keyof typeof PRINT_PRICES, sel.format);
      const baseCount = key === "802" ? 800 : Number(key);
      const info = key === "802" ? "2 Drucker" : f"≈{baseCount} Basis (Postkarte)";
      return {
        key,
        label: `Printpaket ${key}`,
        sub: `${count} Drucke`,
        info,
        price: PRINT_PRICES[key as keyof typeof PRINT_PRICES],
      };
    });
  }, [sel.format]);

  return (
    <div className="app" style={{ background: themeBg, color: themeText }}>
      <header className="topbar">
        <div className="brandRow">
          <img
            className="logo"
            src="/logo.svg"
            alt={brand}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div className="brandName">{brand}</div>
            <div className="brandSub">Assistent „{k?.assistant_name ?? "Dennis"}“</div>
          </div>
        </div>
        <p className="disclaimer">{sanitize(k?.disclaimer)}</p>
      </header>

      <main className="chat">
        {/* 1) Modus */}
        <div className="bubble a">
          <p>Moin! Gerne begleite ich dich Schritt für Schritt zu deiner individuellen Fotobox.</p>
          <p>
            <strong>Möchtest du die Fotobox</strong> <span className="chip">Digital</span> nutzen oder
            <span className="chip">Digital &amp; Print</span>?
          </p>
          <div className="btnrow">
            {(["Digital", "Digital & Print"] as const).map((m) => (
              <button
                key={m}
                className={sel.mode === m ? "active" : ""}
                onClick={() => setSel((s) => ({ ...s, mode: m, printPackage: m === "Digital" ? null : s.printPackage }))}
                aria-pressed={sel.mode === m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 2) Eventtyp */}
        {sel.mode && (
          <div className="bubble a">
            <p>Alles klar – {sel.mode === "Digital" ? "digital" : "mit Sofortdruck"} soll es sein.</p>
            <p>Was für eine Veranstaltung ist denn geplant?</p>
            <div className="btnrow wrap">
              {[
                "Hochzeit",
                "Geburtstag",
                "Abschlussball",
                "Internes Mitarbeiterevent",
                "Externes Kundenevent",
                "Öffentliche Veranstaltung",
              ].map((e) => (
                <button key={e} className={sel.eventType === e ? "active" : ""} onClick={() => setSel((s) => ({ ...s, eventType: e }))}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3) Gäste (neue Staffel) */}
        {sel.eventType && (
          <div className="bubble a">
            <p>Wie viele Gäste werden ungefähr erwartet?</p>
            <div className="btnrow wrap">
              {["0–30 Personen", "30–50 Personen", "50–120 Personen", "120–250 Personen", "ab 250 Personen"].map(
                (g) => (
                  <button key={g} className={sel.guests === g ? "active" : ""} onClick={() => setSel((s) => ({ ...s, guests: g }))}>
                    {g}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* 4) Druckformat */}
        {sel.guests && (
          <div className="bubble a focus">
            <div className="sectionTitle">Druckformat</div>
            <p>Welches Druckformat wünschst du dir?</p>
            <div className="note">
              Abrechnung basiert auf dem Postkartenformat. Fotostreifen = 2× Postkarte, Großbild = 0,5× Postkarte.
            </div>
            <div className="btnrow wrap">
              {(["Postkarte", "Streifen", "Großbild"] as const).map((f) => (
                <button key={f} className={sel.format === f ? "active" : ""} onClick={() => setSel((s) => ({ ...s, format: f }))}>
                  {f === "Postkarte" ? "Postkartenformat (10×15 cm)" : f === "Streifen" ? "Fotostreifen (5×15 cm)" : "Großbildformat (15×20 cm)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5) Druckpakete mit dynamischen Mengen */}
        {sel.mode === "Digital & Print" && sel.format && (
          <div className="bubble a">
            <div className="sectionTitle">Druckpakete</div>
            <div className="btnrow wrap">
              {pkgCards.map((p) => {
                const active = sel.printPackage === (p.key as Selections["printPackage"]);
                return (
                  <button key={p.key as string} className={active ? "active" : ""} onClick={() => setSel((s) => ({ ...s, printPackage: p.key as Selections["printPackage"] }))}>
                    <div className="btn-title">{p.label}</div>
                    <div className="btn-sub">{p.sub}</div>
                    <div className="btn-sub">{p.info}</div>
                    <div className="btn-price">{formatCurrency(p.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zusammenfassung */}
        <div className="bubble sum">
          <div className="sumrow"><span>Grundpaket</span><b>{formatCurrency(BASE_PRICE)}</b></div>
          <div className="sumrow"><span>Modus</span><b>{sel.mode ?? "–"}</b></div>
          <div className="sumrow"><span>Event</span><b>{sel.eventType ?? "–"}</b></div>
          <div className="sumrow"><span>Gäste</span><b>{sel.guests ?? "–"}</b></div>
          <div className="sumrow"><span>Format</span><b>{sel.format ?? "–"}</b></div>
          <div className="sumrow"><span>Druckpaket</span><b>{sel.printPackage ? `Printpaket ${sel.printPackage}` : "–"}</b></div>
          <div className="total"><span>Gesamt</span><b>{formatCurrency(total)}</b></div>
        </div>
      </main>
    </div>
  );
}
