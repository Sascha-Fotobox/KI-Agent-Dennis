import React, { useMemo, useState } from "react";
import "./App.css";

type Mode = "Digital" | "Digital & Print" | undefined;
type EventType =
  | "Hochzeit"
  | "Geburtstag"
  | "Interne Firmenfeier"
  | "Kunden-Event"
  | "Abschlussball"
  | "Öffentliches Event"
  | "Sonstiges"
  | undefined;
type Guests =
  | "0–30"
  | "30–50"
  | "50–120"
  | "120–250"
  | "ab 250"
  | undefined;
type Format = "Postkarte" | "Streifen" | "Großbild" | "Kombiniert" | undefined;
type PrintPkg = "100" | "200" | "400" | "800" | "802" | null;
type AccessoryKey = "Requisiten" | "Hintergrund" | "Layout" | "Gala-Paket" | "Audio-Gästebuch";

const MODES = ["Digital","Digital & Print"] as const;
const EVENTS = ["Hochzeit","Geburtstag","Interne Firmenfeier","Kunden-Event","Abschlussball","Öffentliches Event","Sonstiges"] as const;
const GUEST_RANGES = ["0–30","30–50","50–120","120–250","ab 250"] as const;
const FORMATS = ["Postkarte","Streifen","Großbild","Kombiniert"] as const;

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

function formatLabel(format?: Format) {
  if (format === "Streifen") return "Fotostreifenformat";
  if (format === "Großbild") return "Großbildformat";
  if (format === "Kombiniert") return "Postkarten- oder Fotostreifenformat";
  return "Postkartenformat";
}
function formatFactor(format?: Format) {
  if (format === "Streifen") return 2;
  if (format === "Großbild") return 0.5;
  if (format === "Kombiniert") return 1; // Kombiniert nutzt Postkartenbasis
  return 1; // Postkarte/undefined
}
function effectivePrints(pkg: Exclude<PrintPkg, null>, format?: Format) {
  const base = BASE_COUNTS[pkg];
  return Math.round(base * formatFactor(format));
}

const ACCESSORY_PRICES: Record<AccessoryKey, number> = {
  Requisiten: 30,
  Hintergrund: 30,
  Layout: 30,
  "Gala-Paket": 80,
  "Audio-Gästebuch": 90,
};

type Selections = {
  mode: Mode;
  eventType: EventType;
  guests: Guests;
  format: Format;
  printPackage: PrintPkg;
  accessories: Partial<Record<AccessoryKey, boolean>>;
  accessoryOrder: AccessoryKey[];
};

export default function App() {
  const [sel, setSel] = useState<Selections>({
    mode: undefined,
    eventType: undefined,
    guests: undefined,
    format: undefined,
    printPackage: null,
    accessories: {},
    accessoryOrder: [],
  });

  function resetForMode(next: Mode) {
    if (next === "Digital") {
      setSel((s): Selections => ({
        ...s,
        mode: next,
        guests: undefined,
        format: undefined,
        printPackage: null,
      }));
    } else {
      setSel((s): Selections => ({ ...s, mode: next }));
    }
  }

  function toggleAccessory(k: AccessoryKey) {
    setSel((s): Selections => {
      const nextVal = !s.accessories[k];
      const nextAcc = { ...s.accessories, [k]: nextVal };
      let order = s.accessoryOrder.filter((x) => x !== k);
      if (nextVal) order = [...order, k];
      return { ...s, accessories: nextAcc, accessoryOrder: order };
    });
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }

  // Sichtbarkeit (progressiver Flow)
  const showEvent = !!sel.mode;
  const showGuests = sel.mode === "Digital & Print" && !!sel.eventType;
  const showFormat = sel.mode === "Digital & Print" && !!sel.guests;
  const showPrintPkgs = sel.mode === "Digital & Print" && !!sel.format;
  const showAccessories =
    (sel.mode === "Digital" && !!sel.eventType) ||
    (sel.mode === "Digital & Print" && !!sel.printPackage && !!sel.format);

  // Accessories Kosten: erstes inkludiertes (nur aus R/H/Layout) gratis
  function calcAccessoryCost(s: Selections) {
    const includedSet = new Set<AccessoryKey>(["Requisiten", "Hintergrund", "Layout"]);
    const chosen = s.accessoryOrder.filter((k) => !!s.accessories[k]);
    const firstIncluded = chosen.find((k) => includedSet.has(k));
    let sum = 0;
    for (const key of chosen) {
      const isIncludedType = includedSet.has(key);
      const free = isIncludedType && key === firstIncluded;
      sum += free ? 0 : ACCESSORY_PRICES[key];
    }
    return sum;
  }

  const accessoriesLines = useMemo(() => {
    const includedSet = new Set<AccessoryKey>(["Requisiten", "Hintergrund", "Layout"]);
    const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k]);
    const firstIncluded = chosen.find((k) => includedSet.has(k));
    return chosen.map((key) => {
      const isIncludedType = includedSet.has(key);
      const isFree = isIncludedType && key === firstIncluded;
      return { key, price: isFree ? 0 : ACCESSORY_PRICES[key], isFree };
    });
  }, [sel]);

  const printCost = useMemo(() => {
    if (sel.mode !== "Digital & Print" || !sel.printPackage) return 0;
    return PRINT_PRICES[sel.printPackage];
  }, [sel.mode, sel.printPackage]);

  const accessoriesCost = useMemo(() => calcAccessoryCost(sel), [sel]);
  const total = useMemo(() => BASE_PRICE + printCost + accessoriesCost, [printCost, accessoriesCost]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brandRow">
          <div className="brand">FOBI Fotobox</div>
          <div className="spacer" />
          <a className="privacy" href="#" aria-label="Datenschutz">Datenschutz</a>
        </div>
      </header>

      <main className="chat">
        {/* 1) Intro / Modus */}
        <div className="bubble a">
          <p><strong>Moin!</strong></p>
          <p>Ich bin Dennis, der KI‑Assistent von Fobi Fotobox!<br/>Gerne berate ich dich bei der Wahl deiner Fotobox und führe dich Schritt für Schritt durch.</p>
          <p>Die Basis bildet die Fotobox mit dem <strong>Grundpaket &amp; Service</strong>. Dieses beinhaltet folgende Punkte:</p>
          <div className="note">
            <ul>
              <li>Fotobox ausgestattet mit:
                <ul>
                  <li>Spiegelreflexkamera</li>
                  <li>Studioblitz / Beleuchtung</li>
                  <li>Touchscreen&nbsp;15"</li>
                </ul>
              </li>
              <li>digitale Fotoflat</li>
              <li>Videovorschau (du siehst dich selbst)</li>
              <li>Fun‑Filter (SW, Sepia, ...)</li>
              <li>GIF‑Videos</li>
              <li>Boomerang‑Videos</li>
              <li>Bilderversand an der Fotobox (QR‑Code)</li>
            </ul>
            <div className="subhead">Service</div>
            <ul>
              <li>Alle Fotos / Videos mit Overlay</li>
              <li>Online‑Galerie (mit Passwort)</li>
              <li>telefonisches Vorabgespräch</li>
              <li>24/7 Support</li>
              <li>Lieferung / Aufbau / Abbau (20 km inkl., 80 km möglich)</li>
            </ul>
            <p className="hint">Ein kleines Zubehörpaket (Requisiten, Hintergrundsystem oder individuelle Layoutgestaltung) ist ebenfalls inklusive. Die Auswahl erfolgt bei den Zubehörpaketen.</p>
          </div>
          <p style={{ marginTop: 10 }}>
            Als erstes kannst du wählen: Möchtest du eine <strong>rein digitale Fotobox</strong> oder eine <strong>digitale Fotobox mit Sofortdruckfunktion</strong>?
          </p>
          <div className="btnrow">
            {MODES.map((m) => (
              <button
                key={m}
                className={sel.mode === m ? "active" : ""}
                onClick={() => resetForMode(m as Mode)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 2) Event */}
        {showEvent && (
          <div className="bubble a">
            <div className="sectionTitle">Event</div>
            <div className="btnrow wrap">
              {EVENTS.map((t) => (
                <button key={t} className={sel.eventType === t ? "active" : ""} onClick={() => setSel((s): Selections => ({...s, eventType: t as EventType}))}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3) Gäste */}
        {showGuests && (
          <div className="bubble a">
            <div className="sectionTitle">Gäste</div>
            <div className="btnrow wrap">
              {GUEST_RANGES.map((g) => (
                <button key={g} className={sel.guests === g ? "active" : ""} onClick={() => setSel((s): Selections => ({...s, guests: g as Guests}))}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4) Format */}
        {showFormat && (
          <div className="bubble a">
            <div className="sectionTitle">Druckformat</div>
            <div className="btnrow wrap">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  className={sel.format === f ? "active" : ""}
                  onClick={() => setSel((s): Selections => ({...s, format: f as Format, printPackage: null}))}
                >
                  {f === "Postkarte"
                    ? "Postkartenformat (10×15 cm)"
                    : f === "Streifen"
                    ? "Fotostreifen (5×15 cm)"
                    : f === "Großbild"
                    ? "Großbildformat (15×20 cm)"
                    : "Postkarte + Fotostreifen"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5) Druckpakete */}
        {showPrintPkgs && (
          <div className="bubble a">
            <div className="sectionTitle">Druckpakete</div>
            <div className="btnrow wrap">
              {(["100","200","400","800","802"] as const).map((key) => {
                const count = effectivePrints(key, sel.format);
                const labelTop = `${count} Prints im ${formatLabel(sel.format)}`;
                return (
                  <button
                    key={key}
                    className={sel.printPackage === key ? "active card" : "card"}
                    onClick={() => setSel((s): Selections => ({...s, printPackage: key}))}
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

        {/* 6) Zubehör */}
        {showAccessories && (
          <div className="bubble a">
            <div className="sectionTitle">Zubehör (Mehrfachauswahl möglich)</div>
            <p className="hint">Hinweis: Ein kleines Zubehörset (Requisiten, Hintergrund oder Layoutgestaltung) ist inklusive und wird in der Berechnung automatisch berücksichtigt.</p>
            <div className="btnrow wrap">
              {(["Requisiten","Hintergrund","Layout","Gala-Paket","Audio-Gästebuch"] as const).map((z) => {
                const active = !!sel.accessories[z];
                const sub =
                  z === "Requisiten" ? "Themen-Sets & Accessoires" :
                  z === "Hintergrund" ? "Mobiles Hintergrundsystem" :
                  z === "Layout" ? "Individuelle Druck-/Screen-Layouts" :
                  z === "Gala-Paket" ? "Roter Teppich & Personenleitsystem" :
                  "für vertonte Erinnerungen";
                return (
                  <button key={z} className={active ? "active card" : "card"} onClick={() => toggleAccessory(z)}>
                    <div className="btn-title">{z}</div>
                    <div className="btn-sub">{sub}</div>
                    <div className="btn-price">{formatCurrency(ACCESSORY_PRICES[z])}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zusammenfassung */}
        <div className="bubble sum">
          {/* Infos (ohne Preise) */}
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
                <span>{`(Printpaket ${sel.printPackage})`}</span>
                <b>{formatCurrency(PRINT_PRICES[sel.printPackage])}</b>
              </div>
            </>
          )}

          <div className="sumrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <span>Zubehör</span><b></b>
          </div>
          {accessoriesLines.length === 0 ? (
            <div className="sumrow" style={{ paddingTop: 4 }}><span>–</span><b>–</b></div>
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