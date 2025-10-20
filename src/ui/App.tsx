
import React, { useEffect, useMemo, useState } from "react";

type Knowledge = any;
type Step = any;

type Selections = {
  mode?: "Digital" | "Digital & Print";
  eventType?: string;
  guests?: string;
  format?: "Postkarte" | "Streifen" | "Großbild";
  accessories?: { requisiten?: boolean; hintergrund?: boolean; layout?: boolean };
  printRecommendation?: string;
};

type Message = { role: "assistant" | "user"; text: string };

const App: React.FC = () => {
  const [K, setK] = useState<Knowledge | null>(null);
  const [kError, setKError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [selections, setSelections] = useState<Selections>({
    accessories: { requisiten: false, hintergrund: false, layout: false },
  });
  const [subIndex, setSubIndex] = useState<number>(0);

  // Knowledge laden mit Fallbacks
  useEffect(() => {
    (async () => {
      const urls = [
        `${import.meta.env.BASE_URL}knowledge.json`,
        `/knowledge.json`,
        `knowledge.json`,
        `https://raw.githubusercontent.com/Sascha-Fotobox/KI-Agent-Dennis/main/public/knowledge.json`
      ];
      let lastErr: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
          const text = await res.text();
          const json = JSON.parse(text);
          setK(json);
          setKError(null);
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
  const stepById = (id: number): Step | undefined => K?.button_flow?.steps?.find((s: any) => s.id === id);
  const currentStep = useMemo(() => stepById(currentStepId), [K, currentStepId]);
  const stepButtons = useMemo(() => currentStep?.buttons ?? [], [currentStep]);

  const normalizeEventKey = (label?: string): string => {
    if (!label) return "";
    let s = label.trim();
    s = s.replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
    if (/geburt/i.test(s)) return "Geburtstag";
    if (/hochzeit/i.test(s)) return "Hochzeit";
    if (/abschluss/i.test(s)) return "Abschlussball";
    if (/internes/i.test(s)) return "Internes Mitarbeiterevent";
    if (/externes/i.test(s)) return "Externes Kundenevent";
    if (/öffentlich|party/i.test(s)) return "Öffentliche Veranstaltung";
    return s;
  };

  useEffect(() => {
    if (!K) return;
    setMessages([
      { role: "assistant", text: "Hi! Ich begleite dich Schritt für Schritt zur passenden Fotobox. Möchtest du die Fotobox 📱 Digital nutzen oder 🖨️ Digital & Print?" }
    ]);
    setCurrentStepId(1);
    setSubIndex(0);
    setSelections({ accessories: { requisiten: false, hintergrund: false, layout: false } });
  }, [K]);

  const onChoice = (choice: string) => {
    addUser(choice);

    if (currentStepId === 1) {
      const mode = choice.includes("Digital & Print") ? "Digital & Print" : "Digital";
      setSelections((p) => ({ ...p, mode }));
      if (mode === "Digital") {
        addBot("Top! Digital bedeutet unbegrenzt viele Fotos, QR-Downloads und eine DSGVO-konforme Online-Galerie – nachhaltig und flexibel.\n\nLass uns noch kurz dein Zubehör anschauen.");
        setCurrentStepId(5);
        setSubIndex(0);
        return;
      } else {
        addBot("Alles klar – mit Sofortdruck. Was wird gefeiert?");
        setCurrentStepId(2);
        return;
      }
    }

    if (currentStepId === 2) {
      setSelections((p) => ({ ...p, eventType: choice }));
      const s2 = stepById(2);
      const rec = s2?.recommendations?.[choice] || "";
      const bridge = (s2 as any)?.after_reply?.text || "Klingt gut! Magst du mir sagen, wie viele Gäste ungefähr erwartet werden?";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));
      setCurrentStepId(3);
      return;
    }

    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));
      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = s3?.special_contexts?.[eventKey]?.[choice];
      const rec = spec || s3?.recommendations?.[choice] || "";
      setSelections((p) => ({ ...p, printRecommendation: rec }));
      addBot([rec, "Als Nächstes: Welches Druckformat wünscht ihr euch?"].join("\n\n"));
      setCurrentStepId(4);
      return;
    }

    if (currentStepId === 4) {
      const format: Selections["format"] = choice.startsWith("📸") ? "Postkarte" : choice.startsWith("🎞️") ? "Streifen" : "Großbild";
      setSelections((p) => ({ ...p, format }));
      const s4 = stepById(4) as any;
      const rec = s4?.recommendations?.[choice] || "";
      const bridge = s4?.after_reply?.text || "Super, dann berücksichtige ich dieses Format für deine Preisübersicht am Ende. Lass uns jetzt noch kurz dein Zubehör anschauen.";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));
      setCurrentStepId(5);
      setSubIndex(0);
      return;
    }

    if (currentStepId === 5) {
      const substeps = (stepById(5) as any)?.substeps ?? [];
      const sub = substeps[subIndex];
      if (sub) {
        const yes = choice.startsWith("✅");
        const key = sub.key as keyof NonNullable<Selections["accessories"]>;
        setSelections((p) => ({ ...p, accessories: { ...(p.accessories || {}), [key]: yes } }));
        const confirm = yes ? sub.confirm_yes : sub.confirm_no;
        if (confirm) addBot(confirm);
      }
      const next = subIndex + 1;
      if (next < substeps.length) {
        setSubIndex(next);
        const nxt = substeps[next];
        if (nxt?.say) addBot(nxt.say);
      } else {
        setCurrentStepId(6);
        const summary = buildSummary(selections);
        const priceText = buildPriceText(selections, K);
        addBot(["Kurze Zusammenfassung deiner Auswahl:", summary, "Transparente Preisübersicht:", priceText].join("\n\n"));
      }
      return;
    }
  };

  useEffect(() => {
    if (!K) return;
    if (currentStepId === 5) {
      const intro = (stepById(5) as any)?.intro;
      if (intro) addBot(intro);
      const substeps = (stepById(5) as any)?.substeps ?? [];
      if (substeps[0]?.say) addBot(substeps[0].say);
    }
  }, [currentStepId, K]);

  if (kError) {
    return (
      <div className="app">
        <header className="header"><h1>FOBI Fotobox – Assistent</h1></header>
        <main className="chat">
          <div className="msg assistant"><div className="bubble">
            <strong>Fehler beim Laden der Knowledge-Datei.</strong>
            {"\n"}Details: {kError}
            {"\n"}Bitte prüfe, ob <code>public/knowledge.json</code> existiert und gültig ist.
          </div></div>
        </main>
      </div>
    );
  }

  if (!K) {
    return (
      <div className="app">
        <header className="header"><h1>FOBI Fotobox – Assistent</h1></header>
        <main className="chat">
          <div className="msg assistant"><div className="bubble">Knowledge wird geladen …</div></div>
        </main>
      </div>
    );
  }

  const current = stepById(currentStepId);
  const buttons = current?.buttons ?? [];

  return (
    <div className="app">
      <header className="header">
        <h1>{K.brand} – Assistent „{K.assistant_name}“</h1>
        <small>{K.privacy_notice}</small>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <div key={i} className={\`msg ${m.role}\`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}

        <div className="step">
          {current?.title && <h2>{current.title}</h2>}
          {current?.ask && <p className="ask">{current.ask}</p>}

          {currentStepId === 4 && (
            <div className="info">
              {(stepById(4) as any)?.info && <p>{(stepById(4) as any).info}</p>}
              <ul>
                <li>{(stepById(4) as any)?.change_intervals?.Postkartenformat}</li>
                <li>{(stepById(4) as any)?.change_intervals?.Fotostreifenformat}</li>
                <li>{(stepById(4) as any)?.change_intervals?.Großbildformat}</li>
              </ul>
            </div>
          )}

          {buttons.length > 0 && (
            <div className="buttons">
              {buttons.map((b: string) => (
                <button key={b} onClick={() => onChoice(b)}>{b}</button>
              ))}
            </div>
          )}

          {currentStepId === 5 && renderAccessoryButtons(subIndex, stepById(5) as any, onChoice)}
        </div>
      </main>

      <footer className="footer">
        <small>Tonalität: {K.language_tone}</small>
      </footer>
    </div>
  );
};

function renderAccessoryButtons(subIndex: number, step5: any, onChoice: (choice: string) => void) {
  const substeps = step5?.substeps ?? [];
  const sub = substeps[subIndex];
  if (!sub) return null;
  const btns: string[] = sub.buttons ?? [];
  return (
    <div className="buttons">
      {btns.map((b) => (
        <button key={b} onClick={() => onChoice(b)}>{b}</button>
      ))}
    </div>
  );
}

function buildSummary(sel: Selections) {
  const parts: string[] = [];
  parts.push(`Modus: ${sel.mode === "Digital" ? "Digital (Fobi Smart, digitale Nutzung inkl.)" : "Digital & Print"}`);
  if (sel.eventType) parts.push(`Event: ${sel.eventType}`);
  if (sel.guests) parts.push(`Gäste: ${sel.guests}`);
  if (sel.format) {
    parts.push(`Druckformat: ${sel.format === "Postkarte" ? "Postkartenformat (10×15)" : sel.format === "Streifen" ? "Fotostreifen (5×15)" : "Großbildformat (15×20)"}`);
  }
  const acc = sel.accessories || {};
  const accList: string[] = [];
  if (acc.requisiten) accList.push("Requisiten");
  if (acc.hintergrund) accList.push("Hintergrund");
  if (acc.layout) accList.push("Individuelles Layout");
  if (accList.length) parts.push(`Zubehör: ${accList.join(", ")}`);
  if (sel.printRecommendation) parts.push(`Empfehlung: ${sel.printRecommendation}`);
  parts.push("Hinweise: 400 Prints im Postkartenformat entsprechen automatisch 800 Fotostreifen; beim Großbildformat entspricht ein Printpaket 200 → 100 Großbild-Prints.");
  return "• " + parts.join("\n• ");
}

function buildPriceText(sel: Selections, K: Knowledge) {
  const p = K.pricing || {};
  const items: Array<{ label: string; price: number }> = [];

  if (sel.mode === "Digital") {
    items.push({ label: "Digitalpaket (Fobi Smart)", price: p["Digitalpaket (Fobi Smart)"] || 0 });
  }
  if (sel.mode === "Digital & Print") {
    const it = recommendPrintPackageFromGuests(sel, K);
    if (it) items.push(it);
    const eventKey = normalizeEventKeyLocal(sel.eventType);
    if (eventKey === "Externes Kundenevent") {
      items.push({
        label: "Hinweis: Bei Messen/Promotions/Recruitingdays erfolgt die Abrechnung nach Verbrauch in 100er-Schritten. Media-Kit + Reserve-Kit werden gestellt.",
        price: 0
      });
    }
  }
  const acc = sel.accessories || {};
  const chosen = ["requisiten", "hintergrund", "layout"].filter((k) => (acc as any)[k]);
  if (chosen.length > 1) {
    const extras = chosen.length - 1;
    items.push({ label: `Weitere Zubehörpakete (${extras}×)`, price: extras * (K.pricing?.["Jedes weitere Zubehörpaket"] || 0) });
  }

  const sum = items.reduce((a, b) => a + (b.price || 0), 0);
  const lines = items.map((i) => (i.price > 0 ? `• ${i.label}: ${i.price} €` : `• ${i.label}`));
  lines.push(`\n**Gesamtsumme: ${sum} €**`);
  return lines.join("\n");
}

function recommendPrintPackageFromGuests(sel: Selections, K: Knowledge) {
  const g = sel.guests;
  let label = "";
  if (g === "0–30 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "30–50 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "50–120 Personen") label = "400 Prints (Postkartenformat)";
  if (g === "120–250 Personen") label = "800 Prints (Postkartenformat, 1 Drucksystem)";
  if (g === "ab 250 Personen") label = "";
  if (!label) return null;
  const price = K?.pricing?.[label];
  if (price == null) return null;
  return { label, price };
}

function normalizeEventKeyLocal(label?: string): string {
  if (!label) return "";
  let s = label.trim();
  s = s.replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
  if (/geburt/i.test(s)) return "Geburtstag";
  if (/hochzeit/i.test(s)) return "Hochzeit";
  if (/abschluss/i.test(s)) return "Abschlussball";
  if (/internes/i.test(s)) return "Internes Mitarbeiterevent";
  if (/externes/i.test(s)) return "Externes Kundenevent";
  if (/öffentlich|party/i.test(s)) return "Öffentliche Veranstaltung";
  return s;
}

export default App;
