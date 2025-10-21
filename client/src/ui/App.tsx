import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/** ---------- Typen ---------- */
type Knowledge = {
  brand?: string;
  assistant_name?: string;
  theme?: { bg?: string; text?: string; brand?: string; accent?: string };
  disclaimer?: string;
};

type Mode = "Digital" | "Digital & Print" | undefined;
type Format = "Postkarte" | "Streifen" | "Großbild" | undefined;
type PrintPkg = "100" | "200" | "400" | "800" | "802" | null;
type AccessoryKey = "Requisiten" | "Hintergrund" | "Layout" | "Gala-Paket" | "Audio-Gästebuch";

type Selections = {
  mode: Mode;
  eventType?: string;
  guests?: string;
  format?: Format;
  printPackage: PrintPkg;

  accessories: Partial<Record<AccessoryKey, boolean>>;
  accessoryOrder: AccessoryKey[]; // Reihenfolge der Aktivierung (für „erstes inkl.“)
};

/** ---------- Konstanten ---------- */
const BASE_PRICE = 350;

const PRINT_PRICES: Record<Exclude<PrintPkg, null>, number> = {
  "100": 70,
  "200": 100,
  "400": 150,
  "800": 250,
  "802": 280,
};

const BASE_COUNTS: Record<Exclude<PrintPkg, null>, number> = {
  "100": 100,
  "200": 200,
  "400": 400,
  "800": 800,
  "802": 800,
};

const IS_DUAL: Record<Exclude<PrintPkg, null>, boolean> = {
  "100": false,
  "200": false,
  "400": false,
  "800": false,
  "802": true,
};


const ACCESSORY_PRICES: Record<AccessoryKey, number> = {
  Requisiten: 30,
  Hintergrund: 30,
  Layout: 30,
};

/** ---------- Helpers ---------- */
const sanitize = (s?: string) =>
  (s ?? "").replace(/\\n/g, "\n").replace(/\s+\n/g, "\n").trim();

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatFactor(format?: Format) {
  if (format === "Streifen") return 2;
  if (format === "Großbild") return 0.5;
  return 1; // Postkarte/undefined
}

function effectivePrints(pkg: Exclude<PrintPkg, null>, format?: Format) {
  const base = BASE_COUNTS[pkg];
  return Math.round(base * formatFactor(format));
}

function formatLabel(format?: Format) {
  if (format === "Streifen") return "Fotostreifenformat";
  if (format === "Großbild") return "Großbildformat";
  return "Postkartenformat";
}


/** ---------- Knowledge.json laden ---------- */
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
              "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden.",
          }
        );
      } catch {
        if (!alive) return;
        setK({
          brand: "Fobi Fotobox",
          assistant_name: "Dennis",
          theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
          disclaimer:
            "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden.",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return k;
}

/** Zubehörkosten (erstes gewähltes Zubehör gratis) */
function calcAccessoryCost(sel: Selections) {
  const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k]);
  if (chosen.length === 0) return 0;
  const freeKey = chosen[0];
  return chosen.reduce((sum, key) => sum + (key === freeKey ? 0 : ACCESSORY_PRICES[key]), 0);
}

/** ---------- Hauptkomponente ---------- */
export default function App() {
  const k = useKnowledge();
  const brand = k?.brand ?? "Fobi Fotobox";
  const themeBg = k?.theme?.bg ?? "#1e1e1c";
  const themeText = k?.theme?.text ?? "#ffffff";

  const [sel, setSel] = useState<Selections>({
    mode: undefined,
    eventType: undefined,
    guests: undefined,
    format: undefined,
    printPackage: null,
    accessories: {},
    accessoryOrder: [],
  });

  /** Moduswechsel: Bei „Digital“ Druck-bezogenes zurücksetzen */
  function setMode(m: Mode) {
    setSel((s) => {
      if (m === "Digital") {
        return {
          ...s,
          mode: m,
          guests: undefined,
          format: undefined,
          printPackage: null,
        };
      }
      return { ...s, mode: m };
    });
  }

  /** Zubehör toggeln */
  function toggleAccessory(key: AccessoryKey) {
    setSel((s) => {
      const next = { ...s, accessories: { ...s.accessories } };
      const wasOn = !!next.accessories[key];
      next.accessories[key] = !wasOn;

      let order = [...next.accessoryOrder];
      if (!wasOn) {
        if (!order.includes(key)) order.push(key);
      } else {
        order = order.filter((k) => k !== key);
      }
      next.accessoryOrder = order;
      return next;
    });
  }

  /** Kosten */
  const accessoriesCost = useMemo(() => calcAccessoryCost(sel), [sel]);
  const printCost = useMemo(() => {
    if (sel.mode !== "Digital & Print") return 0;
    if (!sel.printPackage) return 0;
    return PRINT_PRICES[sel.printPackage];
  }, [sel.mode, sel.printPackage]);

  const total = useMemo(() => BASE_PRICE + printCost + accessoriesCost, [printCost, accessoriesCost]);
  // Sichtbarkeitslogik (progressiver Flow)
  const showEvent = !!sel.mode;
  const showGuests = sel.mode === "Digital & Print" && !!sel.eventType;
  const showFormat = sel.mode === "Digital & Print" && !!sel.guests;
  const showPrintPkgs = sel.mode === "Digital & Print" && !!sel.format;
  const showAccessories = (sel.mode === "Digital" && !!sel.eventType) || (sel.mode === "Digital & Print" && !!sel.printPackage && !!sel.format);


  /** Karten für Druckpakete */
  const pkgCards = useMemo(() => {
    const keys: Exclude<PrintPkg, null>[] = ["100", "200", "400", "800", "802"];
    return keys.map((key) => {
      const count = effectivePrints(key, sel.format);
      const info = IS_DUAL[key] ? "2 Drucker" : `≈${BASE_COUNTS[key]} Basis (Postkarte)`;
      return { key, label: `${count} Prints im ${formatLabel(sel.format)}`, sub: `(Printpaket ${key})`, price: PRINT_PRICES[key] };
    });
  }, [sel.format]);

  /** Zubehör-Linien für Summe */
  const accessoriesLines = useMemo(() => {
    const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k]);
    if (chosen.length === 0) return [];
    const freeKey = chosen[0];
    return chosen.map((key) => ({
      key,
      price: key === freeKey ? 0 : ACCESSORY_PRICES[key],
      isFree: key === freeKey,
    }));
  }, [sel]);

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
            <div className="brandSub">Assistent „{k?.assistant_name ?? "Dennis"}“</div>
          </div>
        </div>
        <p className="disclaimer">{sanitize(k?.disclaimer)}</p>
      </header>

      <main className="chat">
        <div className="infobar">
          <strong>Grundpaket</strong>: Enthält die typischen Basispunkte – Fotobox, Spiegelreflexkamera und Lieferung. (Im Projekt definierbar)
        </div>
        {/* 1) Modus */}
        <div className="bubble a">
          <p>Moin! Ich begleite dich Schritt für Schritt zu deiner individuellen Fotobox.</p>
          <p>Möchtest du eine rein digitale Fotobox oder eine digitale Fotobox mit Sofortdruckfunktion?</p>
          <div className="btnrow">
            {(["Digital", "Digital & Print"] as const).map((m) => (
              <button key={m} className={sel.mode === m ? "active" : ""} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 2) Eventtyp */}
        {showEvent && (
        <div className="bubble a">
          <div className="sectionTitle">Eventtyp</div>
<div className="btnrow wrap">
            {["Hochzeit", "Geburtstag", "Firmenfeier", "Abschlussball", "Gartenparty", "Sonstiges"].map((t) => (
              <button
                key={t}
                className={sel.eventType === t ? "active" : ""}
                onClick={() => setSel((s) => ({ ...s, eventType: t }))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        )}


        {/* 3) Gästezahl – nur bei Digital & Print */}
        {showGuests && (
          <div className="bubble a">
            <div className="sectionTitle">Gästezahl</div>
            <div className="btnrow">
              {["bis 50", "50–100", "100–150", "150–200", "200+"].map((g) => (
                <button
                  key={g}
                  className={sel.guests === g ? "active" : ""}
                  onClick={() => setSel((s) => ({ ...s, guests: g }))}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4) Druckformat – nur bei Digital & Print UND wenn Gäste gewählt */}
        {showFormat && (
          <div className="bubble a focus">
            <div className="sectionTitle">Druckformat</div>
            <p>Welches Druckformat wünschst du dir?</p>
            <div className="note">
              Abrechnung basiert auf dem Postkartenformat. Fotostreifen = 2× Postkarte, Großbild = 0,5× Postkarte.
            </div>
            <div className="btnrow wrap">
              {(["Postkarte", "Streifen", "Großbild"] as const).map((f) => (
                <button
                  key={f}
                  className={sel.format === f ? "active" : ""}
                  onClick={() => setSel((s) => ({ ...s, format: f, printPackage: null }))}
                >
                  {f === "Postkarte"
                    ? "Postkartenformat (10×15 cm)"
                    : f === "Streifen"
                    ? "Fotostreifen (5×15 cm)"
                    : "Großbildformat (15×20 cm)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5) Druckpakete – nur bei Digital & Print UND wenn Format gewählt */}
        {showPrintPkgs && (
          <div className="bubble a">
            <div className="sectionTitle">Druckpakete</div>
            <div className="btnrow wrap threecol">
              {(["100", "200", "400", "800", "802"] as const).map((key) => {
                const active = sel.printPackage === key;
                const count = effectivePrints(key, sel.format);
                const labelTop = `${count} Prints im ${formatLabel(sel.format)}`;
                return (
                  <button
                    key={key}
                    className={active ? "active card" : "card"}
                    onClick={() => setSel((s) => ({ ...s, printPackage: key }))}
                  >
                    <div className="btn-title">{labelTop}</div>
                    <div className="btn-sub">{`(Printpaket ${key})`}</div>
                    <div className="btn-price">{formatCurrency(PRINT_PRICES[key])}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6) Zubehör – immer sichtbar */}
        {showAccessories && (
        <div className="bubble a">
          <div className="sectionTitle">Zubehör (Mehrfachauswahl möglich)</div>
          <div className="note">Das zuerst gewählte Zubehör ist inklusive. Jedes weitere kostet 30 €.</div>
          <div className="btnrow wrap threecol">
            {(["Requisiten", "Hintergrund", "Layout", "Gala-Paket", "Audio-Gästebuch"] as const).map((z) => {
              const active = !!sel.accessories[z];
              return (
                <button key={z} className={active ? "active card" : "card"} onClick={() => toggleAccessory(z)}>
                  <div className="btn-title">{z}</div>
                  <div className="btn-sub">
                    {z === "Requisiten"
                      ? "Themen-Sets & Accessoires"
                      : z === "Hintergrund"
                      ? "Mobiles Hintergrundsystem"
                      : z === "Layout"
                      ? "Individuelle Druck-/Screen-Layouts"
                      : z === "Gala-Paket"
                      ? "Roter Teppich & Personenleitsystem (rote Kordeln)"
                      : "Audio-Gästebuch – für vertonte Erinnerungen"}
                  </div>
                  <div className="btn-price">{formatCurrency(ACCESSORY_PRICES[z])}</div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Zusammenfassung */}
        <div className="bubble sum">
          {/* Allgemeine Informationen (ohne Preise) */}
          <div className="sumrow"><span>Fotobox</span><b>{sel.mode ?? "–"}</b></div>
          <div className="sumrow"><span>Event</span><b>{sel.eventType ?? "–"}</b></div>
          {sel.mode === "Digital & Print" && (
            <>
              <div className="sumrow"><span>Gäste</span><b>{sel.guests ?? "–"}</b></div>
              <div className="sumrow"><span>Format</span><b>{sel.format ?? "–"}</b></div>
            </>
          )}
          <div className="divider" />

          {/* Preise */}
          <div className="sumrow"><span>Grundpaket</span><b>{formatCurrency(BASE_PRICE)}</b></div>

          {sel.mode === "Digital & Print" && sel.printPackage && (
            <>
              <div className="sumrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
                <span>Druckpakete</span><b></b>
              </div>
              <div className="sumrow" style={{ paddingTop: 4 }}>
                <span>{`Printpaket ${sel.printPackage}`}</span>
                <b>{formatCurrency(PRINT_PRICES[sel.printPackage])}</b>
              </div>
            </>
          )}

          <div className="sumrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <span>Zubehör</span><b>{/* header spacer */}</b>
          </div>
          {accessoriesLines.length === 0 ? (
            <div className="sumrow" style={{ paddingTop: 4 }}>
              <span>–</span><b>–</b>
            </div>
          ) : (
            accessoriesLines.map((line) => (
              <div key={line.key} className="sumrow" style={{ paddingTop: 4 }}>
                <span>{line.key}{line.isFree ? " (inklusive)" : ""}</span>
                <b>{formatCurrency(line.price)}</b>
              </div>
            ))
          )}

          <div className="total"><span>Gesamt</span><b>{formatCurrency(total)}</b></div>
        </div>

      </main>
    </div>
  );
}
