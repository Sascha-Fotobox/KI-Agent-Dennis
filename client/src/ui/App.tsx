import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import jsPDF from "jspdf";

function buildOfferLines(s: Selections) {
  const lines: string[] = [];
  lines.push("Angebot – Fobi Fotobox");
  lines.push("");
  if (s.mode) lines.push(`Modus: ${s.mode}`);
  if (s.eventType) lines.push(`Event: ${s.eventType}`);
  if (s.guests) lines.push(`Gäste: ${s.guests}`);
  if (s.format) lines.push(`Druckformat: ${s.format}`);
  if (s.printPackage) lines.push(`Printpaket: ${s.printPackage}`);
  const acc: string[] = [];
  (["Requisiten","Hintergrund","Layout","Gala-Paket","Audio-Gästebuch"] as const).forEach(k => {
    if (s.accessories?.[k]) acc.push(k);
  });
  lines.push(`Zubehör: ${acc.length ? acc.join(", ") : "–"}`);
  if (s.eventDate) lines.push(`Datum: ${s.eventDate}`);
  if (s.eventLocation) lines.push(`Ort: ${s.eventLocation}`);
  lines.push("");
  return lines;
}

function makePdf(s: Selections, total: number) {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(16);
  doc.text("Fobi Fotobox – Angebot", 14, y); y += 8;
  doc.setFontSize(11);
  const lines = buildOfferLines(s);
  lines.forEach((ln) => { doc.text(ln, 14, y); y += 6; });
  y += 4;
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y); y += 8;
  doc.setFontSize(12);
  doc.text(`Gesamtsumme: ${formatCurrency(total)}`, 14, y); y += 8;
  // PREISAUSKUNFT_PDF
  doc.setFontSize(10);
  doc.text("Preisauskunft – kein verbindliches Angebot. Terminverfügbarkeit vorbehalten.", 14, y);
  y += 6;
  if (s.format === "Postkarte & Streifen") {
    doc.text("Enthalten: zweites Layout (zwei Druckformate) – 20,00 €", 14, y);
    y += 6;
  }
  return doc;
}

function buildEmailBody(s: Selections, total: number) {
  const l = buildOfferLines(s);
  l.push("");
  l.push(`Gesamtsumme: ${formatCurrency(total)}`);
  l.push("");
  l.push("Hinweis: Bitte die heruntergeladene PDF anhängen.");
  return l.join("\n");
}



/** ---------- Typen ---------- */
type Knowledge = {
  brand?: string;
  assistant_name?: string;
  theme?: { bg?: string; text?: string; brand?: string; accent?: string };
  disclaimer?: string;
};

type Mode = "Digital" | "Digital & Print" | undefined;
type Format = "Postkarte" | "Streifen" | "Postkarte & Streifen" | "Großbild" | undefined;
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

  eventDate?: string;
  eventLocation?: string;
};

/** ---------- Konstanten ---------- */
const SECOND_LAYOUT_FEE = 20;
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
  "Gala-Paket": 80,
  "Audio-Gästebuch": 90,
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
  const includedSet = new Set<AccessoryKey>(["Requisiten", "Hintergrund", "Layout"]);
  const chosenOrder = sel.accessoryOrder.filter((k) => sel.accessories[k]);
  const firstIncluded = chosenOrder.find((k) => includedSet.has(k));
  let sum = 0;
  for (const key of chosenOrder) {
    const isIncludedType = includedSet.has(key as AccessoryKey);
    const price = ACCESSORY_PRICES[key as AccessoryKey];
    if (isIncludedType && key === firstIncluded) {
      continue; // first included item is free
    }
    sum += price;
  }
  return sum;
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

  const total = useMemo(() => BASE_PRICE + printCost + accessoriesCost, [printCost, accessoriesCost]) + (sel.format === "Postkarte & Streifen" ? SECOND_LAYOUT_FEE : 0);
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
    const includedSet = new Set<AccessoryKey>(["Requisiten", "Hintergrund", "Layout"]);
    const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k as AccessoryKey]);
    const firstIncluded = chosen.find((k) => includedSet.has(k as AccessoryKey));
    return chosen.map((key) => {
      const isIncludedType = includedSet.has(key as AccessoryKey);
      const isFree = isIncludedType && key === firstIncluded;
      return {
        key,
        price: isFree ? 0 : ACCESSORY_PRICES[key as AccessoryKey],
        isFree,
      };
    });
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
{/* 1) Modus */}
        <div className="bubble a">
          <p><strong>Moin!</strong></p>
          <p>Ich bin Dennis, der KI-Assistent von Fobi Fotobox!<br/>Gerne berate ich dich bei der Wahl deiner Fotobox und führe dich Schritt für Schritt durch.</p>
          <p>Die Basis bildet die Fotobox mit dem <strong>Grundpaket &amp; Service</strong>. Dieses beinhaltet folgende Punkte:</p>

          <div className="note" style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Grundpaket – das ist immer inklusive:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Fotobox ausgestattet mit:
                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                  <li>Spiegelreflexkamera</li>
                  <li>Studioblitz / Beleuchtung</li>
                  <li>Touchscreen&nbsp;15&quot;</li>
                </ul>
              </li>
              <li>digitale Fotoflat</li>
              <li>Videovorschau (du siehst dich selbst)</li>
              <li>Fun-Filter (SW, Sepia, ...)</li>
              <li>GIF-Videos</li>
              <li>Boomerang-Videos</li>
              <li>Bilderversand an der Fotobox (QR‑Code)</li>
            </ul>
            <div style={{ fontWeight: 700, margin: "10px 0 6px" }}>Service</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Alle Fotos / Videos mit Overlay</li>
              <li>Online‑Galerie (mit Passwort)</li>
              <li>Vorabgespräch per Telefon oder Videomeeting</li>
              <li>24/7 Support</li>
              <li>Lieferung / Aufbau / Abbau <span style={{ whiteSpace: "nowrap" }}>(20&nbsp;km inkl., 80&nbsp;km möglich)</span></li>
            </ul>
            <div style={{ fontWeight: 700, margin: "10px 0 6px" }}>Zubehörpaket</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Ein kleines Zubehörpaket <span style={{ whiteSpace: "nowrap" }}>(Requisiten, Hintergrundsystem oder individuelle Layoutgestaltung)</span> ist ebenfalls inklusive.
              </li>
            </ul>
            <p className="hint" style={{ marginTop: 4 }}>
              
            </p>

          </div>
          <p style={{ marginTop: 10 }}>Als erstes kannst du wählen: Möchtest du eine <strong>rein digitale Fotobox</strong> oder eine <strong>digitale Fotobox mit Sofortdruckfunktion</strong>?</p>

          
          <div className="btnrow">
            {(["Digital", "Digital & Print"] as const).map((m) => (
              <button key={m} className={sel.mode === m ? "active" : ""} onClick={() => setMode(m)}>
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
            {[ "Hochzeit", "Geburtstag", "Internes Firmenevent", "Abschlussball", "Messe", "Kundenevent", "Sonstiges" ].map((t) => (
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
              {[ "bis 30", "30 - 50", "50 - 120", "120 - 250", "ab 250" ].map((g) => (
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
            <div className="btnrow wrap">
              {(["Postkarte","Streifen","Postkarte & Streifen","Großbild"] as const).map((f) => (
                <button
                  key={f}
                  className={sel.format === f ? "active" : ""}
                  onClick={() => setSel((s) => ({ ...s, format: f, printPackage: null }))}
                >
                  {f === "Postkarte"
  ? "Postkartenformat (10×15 cm)"
  : f === "Streifen"
  ? "Fotostreifen (5×15 cm)"
  : f === "Postkarte & Streifen"
  ? "Postkarten- & Fotostreifenformat"
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
          <p className="hint">Hinweis: Ein kleines Zubehörset (Requisiten, Hintergrund oder Layoutgestaltung) ist inklusive und wird in der Berechnung automatisch berücksichtigt.</p>
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
              {sel.format === "Postkarte & Streifen" && (
                <div className="sumrow">
                  <span>zweites Layout (zwei Druckformate)</span>
                  <b>{formatCurrency(SECOND_LAYOUT_FEE)}</b>
                </div>
              )}
            </>
          )}

          <div className="sumrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
            {/* PREISAUSKUNFT DISCLAIMER */}
<p className="hint" style={{ marginTop: 8 }}>
  Preisauskunft – kein verbindliches Angebot. Terminverfügbarkeit vorbehalten.
</p>

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

<div className="bubble a" style={{ marginTop: 12 }}>
  <div className="sectionTitle">Aktionen</div>
  <div className="btnrow wrap">
    <button className="card" onClick={handleDownloadPdf}>PDF herunterladen</button>
    <button className="card" onClick={handleEmail}>Per E-Mail senden</button>
    <button className="card" onClick={handleShareWhatsapp}>Per WhatsApp senden</button>
  </div>
  <p className="hint" style={{ marginTop: 8 }}>
    Hinweis: Browser können Anhänge nicht automatisch in E-Mails/WhatsApp einfügen.
    Nach dem Download die PDF im geöffneten Programm anhängen. Auf vielen Smartphones
    funktioniert das direkte Teilen über die System-Freigabe.
  </p>
</div>
