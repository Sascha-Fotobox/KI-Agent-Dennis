// src/ui/App.tsx (prints as desired outputs + pricing for print packages)
import React, { useEffect, useMemo, useState } from "react";

type Knowledge = any;
type Step = any;

type Selections = {
  mode?: "Digital" | "Digital & Print";
  eventType?: string;
  guests?: string;
  // desired final outputs (units depend on format)
  prints?: 100 | 200 | 400 | 800;
  format?: "Postkarte" | "Streifen" | "Beide";
  accessories?: { requisiten?: boolean; hintergrund?: boolean; layout?: boolean };
  printRecommendation?: string;
};

type Message = { role: "assistant" | "user"; text: string };

const GITHUB_RAW =
  "https://raw.githubusercontent.com/Sascha-Fotobox/KI-Agent-Dennis/main/public/knowledge.json";

const STEP_PRINTS = 34;

export default function App() {
  const [K, setK] = useState<Knowledge | null>(null);
  const [kError, setKError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selections, setSelections] = useState<Selections>({});
  const [currentStepId, setCurrentStepId] = useState<number>(1);

  // Knowledge laden – zuerst GitHub, dann lokale Fallbacks
  useEffect(() => {
    (async () => {
      const urls = [
        GITHUB_RAW,
        `${import.meta.env.BASE_URL}knowledge.json`,
        `/knowledge.json`,
        `knowledge.json`,
      ];
      let lastErr: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
          const data = await res.json();
          setK(data);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      setKError(String(lastErr));
    })();
  }, []);

  const addBot = (text: string) => setMessages((m) => [...m, { role: "assistant", text }]);
  const addUser = (text: string) => setMessages((m) => [...m, { role: "user", text }]);
  const stepById = (id: number): Step | undefined =>
    K?.button_flow?.steps?.find((s: any) => s.id === id);

  // Mappe Button-Labels → Schlüssel (für special_contexts)
  const normalizeEventKey = (label?: string): string => {
    if (!label) return "";
    const s = label.trim().replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
    if (/geburt/i.test(s)) return "Geburtstag";
    if (/hochzeit/i.test(s)) return "Hochzeit";
    if (/firm|unternehmen|weihnacht/i.test(s)) return "Firmenfeier";
    return s;
  };

  // Einstieg
  useEffect(() => {
    if (!K) return;
    addBot(
      [
        `👋 Moin! Ich bin ${K.assistant_name} von ${K.brand}.`,
        K.privacy_notice?.replaceAll("...", "…"),
        stepById(1)?.ask ?? "Wie möchtet ihr die Fotobox nutzen?",
      ].join("\n\n")
    );
    setCurrentStepId(1);
  }, [K]);

  // Helpers
  const postcardToStrips = (postcardPrints: number) => postcardPrints * 2;
  const effectivePostcardPackage = (prints: number, format: Selections["format"]) => {
    if (format === "Postkarte" || format === "Beide") return prints;
    if (format === "Streifen") return Math.ceil(prints / 2);
    return prints;
  };

  // Preiszeilen berechnen (inkl. Printpaket + Layout-Logik)
  const priceLines = useMemo(() => {
    if (!K) return [];
    const pricing = K.pricing || {};
    const lines: { label: string; amount: number }[] = [];

    // Grundpaket (immer enthalten)
    if (pricing["Digitalpaket (Fobi Smart)"] != null) {
      lines.push({ label: "Digitalpaket (Fobi Smart)", amount: pricing["Digitalpaket (Fobi Smart)"] });
    }

    // Printpaket (wenn ausgewählt)
    if (selections.prints && selections.format) {
      const effPkg = effectivePostcardPackage(selections.prints, selections.format);
      const pkgLabel = `Printpaket ${effPkg}`;
      const price = pricing[pkgLabel];
      if (typeof price === "number") {
        lines.push({ label: pkgLabel, amount: price });
      } else {
        lines.push({ label: `${pkgLabel} (Preis in knowledge.json hinterlegen)`, amount: 0 });
      }
    }

    // Zubehörlogik: 1 Paket inklusive, weitere kostenpflichtig
    const acc = selections.accessories || {};
    const picked = ["requisiten", "hintergrund", "layout"].filter((k) => (acc as any)[k]) as string[];
    const extraCount = Math.max(0, picked.length - 1);
    if (extraCount > 0 && pricing["Jedes weitere Zubehörpaket"] != null) {
      lines.push({
        label: `Weitere Zubehörpakete x ${extraCount}`,
        amount: pricing["Jedes weitere Zubehörpaket"] * extraCount,
      });
    }

    // Zweites Drucklayout bei "Beide" Formate (+20 €, gleiches Basisdesign)
    if (selections.format === "Beide" && pricing["Zusätzliches Drucklayout (gleiches Designbasis)"] != null) {
      lines.push({
        label: "Zweites Drucklayout (gleiches Design, anderes Format)",
        amount: pricing["Zusätzliches Drucklayout (gleiches Designbasis)"],
      });
    }

    return lines;
  }, [K, selections]);

  const total = useMemo(() => priceLines.reduce((s, l) => s + l.amount, 0), [priceLines]);

  const handleChoice = (choice: string) => {
    addUser(choice);

    // Schritt 1 – Digital vs. Print
    if (currentStepId === 1) {
      const mode = choice.includes("Print") ? "Digital & Print" : "Digital";
      setSelections((p) => ({ ...p, mode }));
      addBot(stepById(2)?.ask ?? "Welche Art von Veranstaltung?");
      setCurrentStepId(2);
      return;
    }

    // Schritt 2 – Eventtyp
    if (currentStepId === 2) {
      setSelections((p) => ({ ...p, eventType: choice }));
      const s3 = stepById(3) as any;
      addBot(s3?.ask ?? "Wie viele Gäste ungefähr?");
      setCurrentStepId(3);
      return;
    }

    // Schritt 3 – Gästezahl → Empfehlungstext + NEUER Schritt (Prints wählen)
    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));
      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = s3?.special_contexts?.[eventKey]?.[choice];
      const rec = spec || s3?.recommendations?.[choice] || "";
      setSelections((p) => ({ ...p, printRecommendation: rec }));

      const printsAsk = [
        rec,
        "Wie viele Prints möchtest du tatsächlich buchen?",
        "Wähle 100, 200, 400 oder 800 (als **finale Ausgabemenge**).",
        "Hinweis: 1 Postkarte = 2 Fotostreifen. Mindestabnahme bei Streifen: **200 Fotostreifen**.",
      ].join("\n\n");
      addBot(printsAsk);
      setCurrentStepId(STEP_PRINTS);
      return;
    }

    // NEUER Schritt: Prints wählen (100/200/400/800)
    if (currentStepId === STEP_PRINTS) {
      const num = parseInt(choice.replace(/[^0-9]/g, ""), 10) as 100 | 200 | 400 | 800;
      const valid: number[] = [100, 200, 400, 800];
      const selected = (valid.includes(num) ? num : 200) as 100 | 200 | 400 | 800;
      setSelections((p) => ({ ...p, prints: selected }));

      // Weiter zu Format (Original Schritt 4), aber mit erweitertem Text/Buttons
      const s4 = stepById(4) as any;
      const formatIntro = [
        s4?.title ? `**${s4.title}**` : "Druckformat",
        "Wähle das Format:",
        "• Postkarte (10×15 cm) – klassisch und beliebt",
        "• Fotostreifen (5×15 cm) – 2 Streifen pro Postkarte",
        "• Beide Formate – Gäste wählen vor Ort am Touchscreen",
      ].join("\n");
      addBot([formatIntro, s4?.ask ?? ""].filter(Boolean).join("\n\n"));
      setCurrentStepId(4);
      return;
    }

    // Schritt 4 – Format (mit 'Beide' Option + Streifen-Minimum)
    if (currentStepId === 4) {
      let fmt: Selections["format"] = "Postkarte";
      if (/streifen/i.test(choice)) fmt = "Streifen";
      if (/beide|beides/i.test(choice)) fmt = "Beide";

      // Enforce min 200 Streifen, wenn fmt=Streifen & prints=100
      if (fmt === "Streifen" && (selections.prints || 0) < 200) {
        // Upgrade to 200 (strips), which equals 100 postcards? No: selections.prints are desired outputs (strips now).
        // We enforce at least 200 desired outputs for strips.
        setSelections((p) => ({ ...p, prints: 200, format: fmt }));
        addBot("Hinweis: Mindestabnahme bei Fotostreifen sind **200 Streifen**. Ich habe deine Auswahl von 100 auf **200** angehoben.");
      } else {
        setSelections((p) => ({ ...p, format: fmt }));
      }

      const chosen = fmt === "Streifen"
        ? `${(selections.prints ?? 0) < 200 ? 200 : selections.prints} Fotostreifen`
        : fmt === "Postkarte"
        ? `${selections.prints} Postkarten`
        : `${selections.prints} Postkarten-Äquivalent (Mix)`;

      const effPkg = effectivePostcardPackage(selections.prints || 200, fmt);
      const info: string[] = [];
      if (fmt === "Streifen") {
        const strips = (selections.prints && selections.prints >= 200) ? selections.prints : 200;
        info.push(`Du hast **${strips} Fotostreifen** gewählt. (2 Streifen = 1 Postkarte)`);
        info.push(`Abrechnungseinheit: **Printpaket ${effPkg}** (Postkarten-Äquivalent).`);
      }
      if (fmt === "Postkarte") {
        info.push(`Du hast **${selections.prints} Postkarten** gewählt.`);
        info.push(`Abrechnungseinheit: **Printpaket ${effPkg}**.`);
      }
      if (fmt === "Beide") {
        info.push("Gäste können vor Ort **Postkarte ODER Fotostreifen** wählen.");
        info.push(`Regel: Wir rechnen immer das **größere Postkarten-Paket** ab → hier: **Printpaket ${effPkg}**.`);
        info.push("Zusätzlich wird ein **zweites Drucklayout** benötigt (gleiches Design, anderes Format): **+20 €**.");
      }

      const s5 = stepById(5) as any;
      addBot([info.join("\n"), s5?.ask ?? "Möchtet ihr Zubehör hinzubuchen?"].filter(Boolean).join("\n\n"));
      setCurrentStepId(5);
      return;
    }

    // Schritt 5 – Zubehör (Mehrfachauswahl simuliert über Buttons)
    if (currentStepId === 5) {
      const acc = { ...(selections.accessories || {}) };
      if (/Requisiten/i.test(choice)) acc.requisiten = !acc.requisiten;
      if (/Hintergrund/i.test(choice)) acc.hintergrund = !acc.hintergrund;
      if (/Layout/i.test(choice)) acc.layout = !acc.layout;

      setSelections((p) => ({ ...p, accessories: acc }));

      // Wir bleiben in Schritt 5, bis Nutzer "Weiter" klickt
      return;
    }
  };

  const goNextFromAccessories = () => {
    addUser("Weiter");
    setCurrentStepId(6);
    const s6 = stepById(6) as any;

    const prints = selections.prints || 200;
    const effPkg = effectivePostcardPackage(prints, selections.format || "Postkarte");
    const stripsInfo = selections.format === "Streifen" ? `↔️ Entspricht **${prints} Fotostreifen** = **${effPkg} Postkarten-Paket**.` : undefined;

    // Preise nur am Ende nennen, wenn policy das verlangt
    if (K?.policy?.prices_at_end) {
      const priceTextLines = [
        "💶 Preise (Übersicht):",
        ...priceLines.map((l) => `• ${l.label}: ${l.amount.toFixed(2)} €`),
        `—\nGesamtsumme: ${total.toFixed(2)} €`,
      ];

      // Hinweis, falls Printpaket-Preise noch 0 sind
      const pkgLabel = `Printpaket ${effPkg}`;
      const pkgPrice = K?.pricing?.[pkgLabel];
      const pkgWarn = (typeof pkgPrice !== "number" || pkgPrice === 0)
        ? `⚠️ Bitte Preis für **${pkgLabel}** in der Datei **public/knowledge.json** setzen (derzeit 0 €).`
        : undefined;

      const layoutWarn = selections.format === "Beide" and K?.pricing?.["Zusätzliches Drucklayout (gleiches Designbasis)"] === 0
        ? "⚠️ Bitte Preis für **Zweites Drucklayout** auf >0 € setzen."
        : undefined;

      const summaryLines = [
        `🖨️ Ausgewählte Menge: **${prints}** (als finale Ausgabemenge)`,
        selections.format ? `📐 Format: **${selections.format}**` : `📐 Format: —`,
        stripsInfo,
        `🧾 Abrechnungseinheit: **Printpaket ${effPkg}** (Postkarten-Äquivalent).`,
        `🖼️ Drucklayout: 1 Layout inkl. Zweites Layout (gleiches Design, anderes Format): **+20 €**. Komplett neues zusätzliches Layout: **+50 €**.`,
        `ℹ️ 1 Postkarte = 2 Fotostreifen.`,
        pkgWarn,
        layoutWarn
      ].filter(Boolean) as string[];

      const info = s6?.info?.map((i: any) => `ℹ️ ${i.text}`).join("\n") || "";
      addBot([
        s6?.ask ?? "Zusammenfassung & Preise",
        summaryLines.join("\n"),
        priceTextLines.join("\n"),
        info
      ].join("\n\n"));
    } else {
      addBot(s6?.ask ?? "Zusammenfassung");
    }
  };

  if (kError) {
    return (
      <div className="app">
        <div className="header"><strong>FOBI Fotobox – Dennis</strong></div>
        <div className="chat">
          <div className="info">Konnte knowledge.json nicht laden: {kError}</div>
        </div>
      </div>
    );
  }

  if (!K) {
    return (
      <div className="app">
        <div className="header"><strong>FOBI Fotobox – Dennis</strong></div>
        <div className="chat"><div className="info">Lade Inhalte…</div></div>
      </div>
    );
  }

  const step = stepById(currentStepId);

  const renderButtons = () => {
    if (currentStepId === STEP_PRINTS) {
      const options = ["100", "200", "400", "800"];
      return options.map((o) => (
        <button key={o} onClick={() => handleChoice(o)}>{o}</button>
      ));
    }
    if (currentStepId === 4) {
      const buttons = [
        "Postkarte (10×15 cm)",
        "Fotostreifen (5×15 cm)",
        "Beide Formate (vor Ort wählbar)"
      ];
      return buttons.map((b) => (
        <button key={b} onClick={() => handleChoice(b)}>{b}</button>
      ));
    }
    return Array.isArray((step as any)?.buttons)
      ? (step as any).buttons.map((b: string) => (
          <button key={b} onClick={() => handleChoice(b)}>{b}</button>
        ))
      : null;
  };

  return (
    <div className="app">
      <div className="header"><strong>{K.brand} – {K.assistant_name}</strong></div>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}

        {step || currentStepId === STEP_PRINTS ? (
          <div className="step">
            {currentStepId === STEP_PRINTS ? (
              <>
                <div className="ask"><strong>Printmenge wählen</strong></div>
                <div className="ask">
                  Bitte wähle 100, 200, 400 oder 800 **finale Ausgaben**.
                  <br/>Hinweis: 1 Postkarte = 2 Fotostreifen (min. 200 Streifen).
                </div>
                <div className="buttons">{renderButtons()}</div>
              </>
            ) : (
              <>
                {(step as any)?.title && <div className="ask"><strong>{(step as any).title}</strong></div>}
                <div className="ask">{(step as any)?.ask}</div>
                <div className="buttons">{renderButtons()}</div>
                {currentStepId === 5 && (
                  <div className="buttons" style={{ marginTop: 10 }}>
                    <button onClick={goNextFromAccessories}>Weiter</button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="footer">
        <div>Made with Vite + React • Preise vorbehaltlich finaler Abstimmung</div>
      </div>
    </div>
  );
}
