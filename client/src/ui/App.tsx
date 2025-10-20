// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import K from "../knowledge.json"; // Pfad ggf. anpassen: src/knowledge.json o.ä.

type Knowledge = typeof K;
type Step = Knowledge["button_flow"]["steps"][number];

type Selections = {
  mode?: "Digital" | "Digital & Print";
  eventType?: string;   // Button-Label mit Emoji
  guests?: string;      // "0–30 Personen" | ... | "ab 250 Personen"
  format?: "Postkarte" | "Streifen" | "Großbild";
  accessories?: {
    requisiten?: boolean;
    hintergrund?: boolean;
    layout?: boolean;
  };
  // gespeicherte Textempfehlung nach Gästezahl (für Zusammenfassung)
  printRecommendation?: string;
};

type Message = { role: "assistant" | "user"; text: string };

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [selections, setSelections] = useState<Selections>({
    accessories: { requisiten: false, hintergrund: false, layout: false },
  });
  const [subIndex, setSubIndex] = useState<number>(0); // für Zubehör-Substeps

  // Hilfen
  const stepById = (id: number) => K.button_flow.steps.find((s) => s.id === id);
  const currentStep = stepById(currentStepId);

  const addBot = (text: string) =>
    setMessages((m) => [...m, { role: "assistant", text }]);
  const addUser = (text: string) =>
    setMessages((m) => [...m, { role: "user", text }]);

  // Emojis & Zusatzbeispiele von Event-Buttons entfernen → "Geburtstag", "Hochzeit", ...
  const normalizeEventKey = (label?: string): string => {
    if (!label) return "";
    let s = label
      .replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, "")
      .trim();
    s = s.replace(/\s*\(z\.\s*B\..*?\)\s*$/i, ""); // Klammerhinweise entfernen
    return s;
  };

  // App-Start
  useEffect(() => {
    // Begrüßung + Step 1
    const intro =
      "Hi! Ich begleite dich Schritt für Schritt zur passenden Fotobox. Möchtest du die Fotobox 📱 Digital nutzen oder 🖨️ Digital & Print?";
    addBot(intro);
  }, []);

  // Buttons eines Steps (aus Knowledge) generisch rendern
  const stepButtons = useMemo(() => {
    return currentStep?.buttons ?? [];
  }, [currentStep]);

  // Handler für Buttonklicks (deterministisch, IF-basiert)
  const onChoice = (choice: string) => {
    addUser(choice);

    // Step 1 – Modus wählen
    if (currentStepId === 1) {
      const mode =
        choice.indexOf("Digital & Print") !== -1 ? "Digital & Print" : "Digital";
      setSelections((p) => ({ ...p, mode }));

      if (mode === "Digital") {
        // Direkt zu Zubehör (Step 5); kurzer Vorteilstext
        addBot(
          "Top! Digital bedeutet unbegrenzt viele Fotos, QR-Downloads und eine DSGVO-konforme Online-Galerie – nachhaltig und flexibel.\n\nLass uns noch kurz dein Zubehör anschauen."
        );
        setCurrentStepId(5);
        setSubIndex(0);
        return;
      } else {
        // Mit Druck → Step 2 (Art der Veranstaltung)
        addBot("Alles klar – mit Sofortdruck. Was wird gefeiert?");
        setCurrentStepId(2);
        return;
      }
    }

    // Step 2 – Art der Veranstaltung
    if (currentStepId === 2) {
      const eventType = choice;
      setSelections((p) => ({ ...p, eventType }));

      const s2 = stepById(2);
      const rec = s2?.recommendations?.[choice];
      const bridge =
        (s2 as any)?.after_reply?.text ||
        "Klingt gut! Magst du mir sagen, wie viele Gäste ungefähr erwartet werden?";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));

      // → automatisch Step 3
      setCurrentStepId(3);
      return;
    }

    // Step 3 – Gästezahl (mit special_contexts)
    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));

      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = s3?.special_contexts?.[eventKey]?.[choice];
      const rec = spec || s3?.recommendations?.[choice] || "";
      setSelections((p) => ({ ...p, printRecommendation: rec }));

      // Empfehlung anzeigen und Übergang zu Druckformat
      addBot(
        [rec, "Als Nächstes: Welches Druckformat wünscht ihr euch?"].join("\n\n")
      );
      setCurrentStepId(4);
      return;
    }

    // Step 4 – Druckformat
    if (currentStepId === 4) {
      const format: Selections["format"] = choice.startsWith("📸")
        ? "Postkarte"
        : choice.startsWith("🎞️")
        ? "Streifen"
        : "Großbild";
      setSelections((p) => ({ ...p, format }));

      const s4 = stepById(4) as any;
      const rec = s4?.recommendations?.[choice] || "";
      const bridge =
        s4?.after_reply?.text ||
        "Super, dann berücksichtige ich dieses Format für deine Preisübersicht am Ende. Lass uns jetzt noch kurz dein Zubehör anschauen.";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));

      // → Zubehör (Step 5)
      setCurrentStepId(5);
      setSubIndex(0);
      return;
    }

    // Step 5 – Zubehör (Substeps toggeln)
    if (currentStepId === 5) {
      const substeps = (stepById(5) as any)?.substeps ?? [];
      const idx = subIndex;
      const sub = substeps[idx];

      // Auswertung Buttons (✅/❌)
      if (sub) {
        const key = sub.key as keyof NonNullable<Selections["accessories"]>;
        const yes = choice.startsWith("✅");

        setSelections((p) => ({
          ...p,
          accessories: { ...(p.accessories || {}), [key]: yes },
        }));

        const confirm = yes ? sub.confirm_yes : sub.confirm_no;
        if (confirm) addBot(confirm);
      }

      // Nächster Substep oder weiter
      const next = subIndex + 1;
      if (next < substeps.length) {
        setSubIndex(next);
        // Den nächsten Substep-Text „say“ anzeigen
        const nextSub = substeps[next];
        if (nextSub?.say) addBot(nextSub.say);
      } else {
        // Zubehör abgeschlossen → Step 6 (Zusammenfassung & Preise)
        setCurrentStepId(6);
        // Zusammenfassung + Preise
        const summary = buildSummary(selections);
        const priceText = buildPriceText(selections, K);
        addBot(
          [
            "Kurze Zusammenfassung deiner Auswahl:",
            summary,
            "Transparente Preisübersicht:",
            priceText,
          ].join("\n\n")
        );
      }
      return;
    }

    // Step 6 – fertig (Nothing to choose)
  };

  // Beim Eintritt in Step 5 den ersten Substep-Text anzeigen
  useEffect(() => {
    if (currentStepId === 5) {
      const substeps = (stepById(5) as any)?.substeps ?? [];
      if (substeps.length > 0) {
        const s = substeps[0];
        if (s?.say) addBot(s.say);
      } else {
        // kein Substep → direkt zu Step 6
        setCurrentStepId(6);
        const summary = buildSummary(selections);
        const priceText = buildPriceText(selections, K);
        addBot(
          [
            "Kurze Zusammenfassung deiner Auswahl:",
            summary,
            "Transparente Preisübersicht:",
            priceText,
          ].join("\n\n")
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  // Render
  return (
    <div className="app">
      <header className="header">
        <h1>{K.brand} – Assistent „{K.assistant_name}“</h1>
        <small>{K.privacy_notice}</small>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}

        {/* Step-UI */}
        <div className="step">
          {currentStep?.title && <h2>{currentStep.title}</h2>}
          {currentStep?.ask && <p className="ask">{currentStep.ask}</p>}

          {/* Bei Step 4 zusätzliche Infos/Wechselintervalle zeigen */}
          {currentStepId === 4 && (
            <div className="info">
              {((stepById(4) as any)?.info || "") && (
                <p>{(stepById(4) as any).info}</p>
              )}
              <ul>
                <li>{(stepById(4) as any)?.change_intervals?.Postkartenformat}</li>
                <li>
                  {(stepById(4) as any)?.change_intervals?.Fotostreifenformat}
                </li>
                <li>{(stepById(4) as any)?.change_intervals?.Großbildformat}</li>
              </ul>
            </div>
          )}

          {/* Zubehör: Intro ohne Preise */}
          {currentStepId === 5 && (stepById(5) as any)?.intro && (
            <p className="intro">{(stepById(5) as any).intro}</p>
          )}

          {/* Buttons */}
          {stepButtons.length > 0 && (
            <div className="buttons">
              {stepButtons.map((b: string) => (
                <button key={b} onClick={() => onChoice(b)}>
                  {b}
                </button>
              ))}
            </div>
          )}

          {/* Zubehör-Substep Buttons */}
          {currentStepId === 5 && renderAccessoryButtons(subIndex, stepById(5) as any, onChoice)}
        </div>
      </main>

      <footer className="footer">
        <small>Tonalität: {K.language_tone}</small>
      </footer>

      <style jsx>{`
        .app { max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .header { padding: 16px 12px; border-bottom: 1px solid #eee; }
        .chat { padding: 16px 12px; min-height: 60vh; }
        .msg { display: flex; margin-bottom: 12px; }
        .msg.assistant { justify-content: flex-start; }
        .msg.user { justify-content: flex-end; }
        .bubble { max-width: 80%; padding: 10px 12px; border-radius: 12px; white-space: pre-wrap; }
        .assistant .bubble { background: #f6f7f8; border: 1px solid #e8eaed; }
        .user .bubble { background: #dff0ff; border: 1px solid #b6dcff; }
        .step { padding: 12px; border-top: 1px dashed #eee; }
        .ask { color: #333; }
        .buttons { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 8px; margin-top: 10px; }
        button { padding: 10px 12px; border-radius: 10px; border: 1px solid #ddd; background: white; cursor: pointer; }
        button:hover { border-color: #aaa; }
        .info { background: #fff8e6; border: 1px solid #ffe0a3; padding: 10px 12px; border-radius: 8px; margin: 10px 0; }
        .intro { margin-top: 6px; font-weight: 500; }
        .footer { padding: 12px; border-top: 1px solid #eee; color: #666; }
      `}</style>
    </div>
  );
};

/* ---------- Zubehör Buttons Renderer ---------- */
function renderAccessoryButtons(
  subIndex: number,
  step5: any,
  onChoice: (choice: string) => void
) {
  const substeps = step5?.substeps ?? [];
  const sub = substeps[subIndex];
  if (!sub) return null;
  const btns: string[] = sub.buttons ?? [];
  return (
    <div className="buttons">
      {btns.map((b) => (
        <button key={b} onClick={() => onChoice(b)}>
          {b}
        </button>
      ))}
    </div>
  );
}

/* ---------- Zusammenfassung ---------- */
function buildSummary(sel: Selections) {
  const parts: string[] = [];
  parts.push(`Modus: ${sel.mode === "Digital" ? "Digital (Fobi Smart, digitale Nutzung inkl.)" : "Digital & Print"}`);
  if (sel.eventType) parts.push(`Event: ${sel.eventType}`);
  if (sel.guests) parts.push(`Gäste: ${sel.guests}`);
  if (sel.format)
    parts.push(
      `Druckformat: ${
        sel.format === "Postkarte"
          ? "Postkartenformat (10×15)"
          : sel.format === "Streifen"
          ? "Fotostreifen (5×15)"
          : "Großbildformat (15×20)"
      }`
    );
  const acc = sel.accessories || {};
  const accList: string[] = [];
  if (acc.requisiten) accList.push("Requisiten");
  if (acc.hintergrund) accList.push("Hintergrund");
  if (acc.layout) accList.push("Individuelles Layout");
  if (accList.length) parts.push(`Zubehör: ${accList.join(", ")}`);

  if (sel.printRecommendation) parts.push(`Empfehlung: ${sel.printRecommendation}`);

  // Hinweise (Umrechungen)
  parts.push(
    "Hinweise: 400 Prints im Postkartenformat entsprechen automatisch 800 Fotostreifen; beim Großbildformat entspricht ein Printpaket 200 → 100 Großbild-Prints."
  );

  return "• " + parts.join("\n• ");
}

/* ---------- Preislogik (nur am Ende!) ---------- */
function buildPriceText(sel: Selections, K: Knowledge) {
  const p = K.pricing;
  const items: Array<{ label: string; price: number }> = [];

  // Digitalpaket
  if (sel.mode === "Digital") {
    items.push({ label: "Digitalpaket (Fobi Smart)", price: p["Digitalpaket (Fobi Smart)"] });
  }

  // Printpaket (wenn Digital & Print)
  if (sel.mode === "Digital & Print") {
    const printItem = recommendPrintPackageFromGuests(sel, K);
    if (printItem) items.push(printItem);

    // Externes Kundenevent → Sonderhinweis Verbrauchsabrechnung
    const eventKey = normalizeEventKeyLocal(sel.eventType);
    if (eventKey === "Externes Kundenevent") {
      items.push({
        label:
          "Hinweis: Bei Messen/Promotions/Recruitingdays erfolgt die Abrechnung nach Verbrauch in 100er-Schritten. Media-Kit + Reserve-Kit werden gestellt.",
        price: 0,
      });
    }
  }

  // Zubehörpreise (ein Paket inkl.; jedes weitere 30€) → Preise erst hier nennen
  const acc = sel.accessories || {};
  const chosen = ["requisiten", "hintergrund", "layout"].filter(
    (k) => (acc as any)[k]
  );
  if (chosen.length > 1) {
    const extras = chosen.length - 1; // 1 inkl.
    items.push({
      label: `Weitere Zubehörpakete (${extras}×)`,
      price: extras * (K.pricing["Jedes weitere Zubehörpaket"] || 0),
    });
  }

  // Summe
  const sum = items.reduce((a, b) => a + (b.price || 0), 0);

  const lines = items.map((i) =>
    i.price > 0 ? `• ${i.label}: ${i.price} €` : `• ${i.label}`
  );
  lines.push(`\n**Gesamtsumme: ${sum} €**`);

  return lines.join("\n");
}

function recommendPrintPackageFromGuests(sel: Selections, K: Knowledge) {
  // Standard-Mapping nach Gästezahl
  const g = sel.guests;
  let label = "";
  if (g === "0–30 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "30–50 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "50–120 Personen") label = "400 Prints (Postkartenformat)";
  if (g === "120–250 Personen") label = "800 Prints (Postkartenformat, 1 Drucksystem)";
  if (g === "ab 250 Personen") label = ""; // individuell

  if (!label) return null;

  // Preis aus Pricing
  const price = K.pricing[label as keyof typeof K.pricing];
  if (price == null) return null;

  return { label, price };
}

// lokale Kopie (ohne Unicode-RegEx), falls Build-Tool kein u-Flag kann:
function normalizeEventKeyLocal(label?: string): string {
  if (!label) return "";
  let s = label.trim();
  s = s.replace(/^(\S+\s)/, (m) => (m.match(/^\p{Extended_Pictographic}/u) ? "" : m)); // best effort
  s = s.replace(/^([^\w]*)(🎂|💍|🎓|🏢|🎪|🎉)\s*/u, ""); // Emojis entfernen (Fallback)
  s = s.replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
  // Vereinheitliche Keys für special_contexts
  if (/geburt/i.test(s)) return "Geburtstag";
  if (/hochzeit/i.test(s)) return "Hochzeit";
  if (/abschluss/i.test(s)) return "Abschlussball";
  if (/internes/i.test(s)) return "Internes Mitarbeiterevent";
  if (/externes/i.test(s)) return "Externes Kundenevent";
  if (/öffentlich/i.test(s) || /party/i.test(s)) return "Öffentliche Veranstaltung";
  return s;
}

export default App;
