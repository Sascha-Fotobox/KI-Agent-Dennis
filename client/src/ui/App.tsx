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

  accessories: {
    Requisiten?: boolean;
    Hintergrund?: boolean;
    Layout?: boolean;
  };
  accessoryOrder: Array<"Requisiten" | "Hintergrund" | "Layout">;
};

const BASE_PRICE = 350;

const PRINT_PRICES: Record<NonNullable<Selections["printPackage"]>, number> = {
  "100": 70,
  "200": 100,
  "400": 150,
  "800": 250,
  "802": 280 // 2 Drucker
};

/** Zubehörpreise – alle gleich (30 €) */
const ACCESSORY_PRICES: Record<"Requisiten" | "Hintergrund" | "Layout", number> = {
  Requisiten: 30,
  Hintergrund: 30,
  Layout: 30
};

const sanitize = (s?: string) =>
  (s ?? "").replace(/\\n/g, "\n").replace(/\s+\n/g, "\n").trim();

/** Faktor nach Format: Postkarte = 1x, Streifen = 2x, Großbild = 0.5x */
function formatFactor(format?: Selections["format"]) {
  if (format === "Streifen") return 2;
  if (format === "Großbild") return 0.5;
  return 1;
}

/** Effektive Druckanzahl pro Paket (je nach Format) */
function effectivePrints(pkgKey: keyof typeof PRINT_PRICES, format?: Selections["format"]) {
  const base = pkgKey === "802" ? 800 : Number(pkgKey);
  const factor = formatFactor(format);
  return Math.round(base * factor);
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(v);
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
              "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden."
          }
        );
      } catch {
        if (!active) return;
        setK({
          brand: "Fobi Fotobox",
          assistant_name: "Dennis",
          theme: { bg: "#1e1e1c", text: "#ffffff", brand: "#ccb63f", accent: "#ccb63f" },
          disclaimer:
            "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Um unseren Service zu verbessern, können Gespräche gespeichert werden. Bitte keine personenbezogenen Daten eingeben – keine Telefonnummern, E-Mail-Adressen oder vollständigen Namen. Nenne bei Bedarf nur allgemeine Eckdaten (z. B. Stadt, Gästezahl, Zeitraum). Mit dem Fortfahren stimmst du zu, dass deine Eingaben zu Beratungszwecken verarbeitet werden."
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return k;
}

/** Zubehörkosten: erstes gewähltes Zubehör ist kostenlos */
function calcAccessoryCost(sel: Selections) {
  const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k]);
  if (chosen.length === 0) return 0;
  const freeKey = chosen[0];
  return chosen.reduce((sum, key) => sum + (key === freeKey ? 0 : ACCESSORY_PRICES[key]), 0);
}

export default function App() {
  const k = useKnowledge();
  const brand = k?.brand ?? "Fobi Fotobox";
  const themeBg = k?.theme?.bg ?? "#1e1e1c";
  const themeText = k?.theme?.text ?? "#ffffff";

  const [sel, setSel] = useState<Selections>({
    printPackage: null,
    accessories: {},
    accessoryOrder: []
  });

  // Kosten
  const accessoriesCost = useMemo(() => calcAccessoryCost(sel), [sel]);
  const printCost = useMemo(
    () => (sel.mode === "Digital & Print" && sel.printPackage ? PRINT_PRICES[sel.printPackage] : 0),
    [sel.mode, sel.printPackage]
  );
  const total = useMemo(() => BASE_PRICE + printCost + accessoriesCost, [printCost, accessoriesCost]);

  // Druckpaket-Karten (nur sinnvoll wenn Format vorhanden)
  const pkgCards = useMemo(() => {
    const keys: NonNullable<Selections["printPackage"]>[] = ["100", "200", "400", "800", "802"];
    return keys.map((key) => {
      const count = effectivePrints(key, sel.format);
      const baseCount = key === "802" ? 800 : Number(key);
      const info = key === "802" ? "2 Drucker" : `≈${baseCount} Basis (Postkarte)`;
      return {
        key,
        label: `Printpaket ${key}`,
        sub: `${count} Drucke`,
        info,
        price: PRINT_PRICES[key]
      };
    });
  }, [sel.format]);

  const ACCESSORIES: Array<"Requisiten" | "Hintergrund" | "Layout"> = ["Requisiten", "Hintergrund", "Layout"];

  function toggleAccessory(key: "Requisiten" | "Hintergrund" | "Layout") {
    setSel((s) => {
      const next = { ...s, accessories: { ...s.accessories } };
      const currently = !!next.accessories[key];
      next.accessories[key] = !currently;

      let order = [...next.accessoryOrder];
      if (!currently) {
        if (!order.includes(key)) order.push(key);
      } else {
        order = order.filter((k) => k !== key);
      }
      next.accessoryOrder = order;
      return next;
    });
  }

  // Beim Wechsel des Modus: wenn auf „Digital“, alles Druck-bezogene zurücksetzen
  function setMode(m: "Digital" | "Digital & Print") {
    setSel((s) => {
      if (m === "Digital") {
        return {
          ...s,
          mode: m,
          guests: undefined,
          format: undefined,
          printPackage: null
        };
      }
      return { ...s, mode: m };
    });
  }

  const accessoriesLines = useMemo(() => {
    const chosen = sel.accessoryOrder.filter((k) => sel.accessories[k]);
    if (chosen.length === 0) return [];
    const freeKey = chosen[0];
    return chosen.map((key) => ({
      key,
      price: key === freeKey ? 0 : ACCESSORY_PRICES[key],
      isFree: key === freeKey
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
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 2) Eventtyp */}
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

        {/* 3) Gästezahl – NUR bei „Digital & Print“ */}
        {sel.mode === "Digital & Print" && (
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

        {/* 4) Druckformat – NUR bei „Digital & Print“ UND wenn Gäste gewählt */}
        {sel.mode === "Digital & Print" && sel.guests && (
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

        {/* 5) Druckpakete – NUR bei „Digital & Print“ UND wenn Format gewählt */}
        {sel.mode === "Digital & Print" && sel.format && (
          <div className="bubble a">
            <div className="sectionTitle">Druckpakete</div>
            <div className="btnrow wrap threecol">
              {pkgCards.map((p) => {
                const active = sel.printPackage === (p.key as Selections["printPackage"]);
                return (
                  <button
                    key={p.key as string}
                    className={active ? "active card" : "card"}
                    onClick={() => setSel((s) => ({ ...s, printPackage: p.key as Selections["printPackage"] }))}
                  >
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

        {/* 6) Zubehör – immer verfügbar */}
        <div className="bubble a">
          <div className="sectionTitle">Zubehör (Mehrfachauswahl möglich)</div>
          <div className="note">
            Das zuerst gewählte Zubehör ist inklusive. Jedes weitere kostet 30 €.
          </div>
          <div className="btnrow wrap threecol">
            {(["Requisiten", "Hintergrund", "Layout"] as const).map((z) => {
              const active = !!sel.accessories[z];
              return (
                <button key={z} className={active ? "active card" : "card"} onClick={() => toggleAccessory(z)}>
                  <div className="btn-title">{z}</div>
                  <div className="btn-sub">
                    {z === "Requisiten"
                      ? "Themen-Sets & Accessoires"
                      : z === "Hintergrund"
                      ? "Mobiles Hintergrundsystem"
                      : "Individuelle Druck-/Screen-Layouts"}
                  </div>
                  <div className="btn-price">{formatCurrency(ACCESSORY_PRICES[z])}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="bubble sum">
          <div className="sumrow"><span>Grundpaket</span><b>{formatCurrency(BASE_PRICE)}</b></div>
          <div className="sumrow"><span>Modus</span><b>{sel.mode ?? "–"}</b></div>
          <div className="sumrow"><span>Event</span><b>{sel.eventType ?? "–"}</b></div>
          {sel.mode === "Digital & Print" && (
            <>
              <div className="sumrow"><span>Gäste</span><b>{sel.guests ?? "–"}</b></div>
              <div className="sumrow"><span>Format</span><b>{sel.format ?? "–"}</b></div>
              <div className="sumrow"><span>Druckpaket</span><b>{sel.printPackage ? `Printpaket ${sel.printPackage}` : "–"}</b></div>
            </>
          )}

          <div className="sumrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <span>Zubehör</span>
            <b></b>
          </div>
          {(() => {
            if (accessoriesLines.length === 0) {
              return (
                <div className="sumrow" style={{ paddingTop: 4 }}>
                  <span>–</span><b>–</b>
                </div>
              );
            }
            return accessoriesLines.map((line) => (
              <div key={line.key} className="sumrow" style={{ paddingTop: 4 }}>
                <span>{line.key}{line.isFree ? " (inklusive)" : ""}</span>
                <b>{formatCurrency(line.price)}</b>
              </div>
            ));
          })()}

          <div className="total"><span>Gesamt</span><b>{formatCurrency(total)}</b></div>
        </div>
      </main>
    </div>
  );
}
