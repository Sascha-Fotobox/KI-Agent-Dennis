import ConsentDeclined from "./components/ConsentDeclined";
import ConsentGate, { STORAGE_KEY_BASE } from "./components/ConsentGate";
// src/ui/App.tsx
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
  selectedPrints?: 100 | 200 | 400 | 800;
  bothFormats?: boolean;
};

type Message = { role: "assistant" | "user"; text: string };

// GitHub RAW hat Priorität (damit Knowledge ohne Redeploy aktualisiert werden kann)
const GITHUB_RAW =
  "https://raw.githubusercontent.com/Sascha-Fotobox/KI-Agent-Dennis/main/public/knowledge.json";

const App: React.FC = () => {
  const [K, setK] = useState<Knowledge | null>(null);
  const [kError, setKError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [selections, setSelections] = useState<Selections>({
    accessories: { requisiten: false, hintergrund: false, layout: false },
  });
  const [subIndex, setSubIndex] = useState<number>(0);

  // Datenschutz-Einwilligung
  const [consent, setConsent] = useState<"unknown" | "accepted" | "declined">("unknown");
  const versionKey = "v1";
  useEffect(() => {
    const key = STORAGE_KEY_BASE + versionKey;
    const v = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (v === "accepted") setConsent("accepted");
    else if (v === "declined") setConsent("declined");
    else setConsent("unknown");
  }, []);

  // Knowledge laden – GitHub-RAW zuerst, dann lokale Fallbacks
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
  const stepById = (id: number): Step | undefined =>
    K?.button_flow?.steps?.find((s: any) => s.id === id);

  // Mappe Button-Labels → Schlüssel (für special_contexts)
  const normalizeEventKey = (label?: string): string => {
    if (!label) return "";
    const s = label.trim().replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
    if (/geburt/i.test(s)) return "Geburtstag";
    if (/hochzeit/i.test(s)) return "Hochzeit";
    if (/abschluss/i.test(s)) return "Abschlussball";
    if (/internes/i.test(s)) return "Internes Mitarbeiterevent";
    if (/externes/i.test(s)) return "Externes Kundenevent";
    if (/öffentlich|party/i.test(s)) return "Öffentliche Veranstaltung";
    return s;
  };

  // Startnachricht sobald Knowledge geladen ist
  useEffect(() => {
    if (!K) return;
    setMessages([
      {
        role: "assistant",
        text:
          "Hi! Ich begleite dich Schritt für Schritt zur passenden Fotobox. Möchtest du die Fotobox 📱 Digital nutzen oder 🖨️ Digital & Print?",
      },
    ]);
    setCurrentStepId(1);
    setSubIndex(0);
    setSelections({ accessories: { requisiten: false, hintergrund: false, layout: false } });
  }, [K]);

  const onChoice = (choice: string) => {
    addUser(choice);

    // Schritt 1 – Modus wählen
    if (currentStepId === 1) {
      const mode = choice.includes("Digital & Print") ? "Digital & Print" : "Digital";
      setSelections((p) => ({ ...p, mode }));
      if (mode === "Digital") {
        addBot(
          "Top! Digital bedeutet unbegrenzt viele Fotos, QR-Downloads und eine DSGVO-konforme Online-Galerie – nachhaltig und flexibel.\n\nLass uns noch kurz dein Zubehör anschauen."
        );
        setCurrentStepId(5);
        setSubIndex(0);
        return;
      } else {
        addBot("Alles klar – mit Sofortdruck. Was wird gefeiert?");
        setCurrentStepId(2);
        return;
      }
    }

    // Schritt 2 – Eventtyp
    if (currentStepId === 2) {
      setSelections((p) => ({ ...p, eventType: choice }));
      const s2 = stepById(2) as any;
      const rec = s2?.recommendations?.[choice] || "";
      const bridge =
        s2?.after_reply?.text ||
        "Klingt gut! Magst du mir sagen, wie viele Gäste ungefähr erwartet werden?";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));
      setCurrentStepId(3);
      return;
    }

    // Schritt 3 – Gäste
    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));
      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = s3?.special_contexts?.[eventKey]?.[choice];
      const rec = spec || s3?.recommendations?.[choice] || "";
      setSelections((p) => ({ ...p, printRecommendation: rec }));
      addBot([rec, "Als Nächstes: Welches Druckformat wünscht ihr euch?"].join("\n\n"));
      setCurrentStepId(selections.mode === "Digital & Print" ? 35 : 4);
      return;
    }

    
// Schritt 3.5 – Anzahl Prints wählen (nur bei Digital & Print)
if (currentStepId === 35) {
  const num = parseInt((choice.match(/\d+/) || [])[0] || "0", 10) as 100 | 200 | 400 | 800;
  setSelections((p) => ({ ...p, selectedPrints: num }));
  addBot("Alles klar. Als Nächstes: Welches Druckformat wünscht ihr euch?");
  setCurrentStepId(4);
  return;
}
// Schritt 4 – Druckformat
    if (currentStepId === 4) {
      const isBoth = choice.includes("Postkarten- und Fotostreifenformat");
      const format: Selections["format"] = choice.startsWith("📸")
        ? "Postkarte"
        : choice.startsWith("🎞️")
        ? "Streifen"
        : (isBoth ? "Postkarte" : "Großbild");
      setSelections((p) => ({ ...p, format, bothFormats: isBoth }));
      if (!isBoth && format === "Streifen" && (selections.selectedPrints || 0) === 100) {
        addBot("Hinweis: 100 Prints entsprechen 200 Fotostreifen. Mindestabnahme für Fotostreifen sind 200 – das passt also. 👍");
      }
      if (isBoth) {
        addBot("Ihr habt beide Formate gewählt. Vor Ort kann pro Bild zwischen Postkarte und Fotostreifen gewählt werden.");
      }
      const s4 = stepById(4) as any;
      const rec = s4?.recommendations?.[choice] || "";
      const bridge =
        s4?.after_reply?.text ||
        "Super, dann berücksichtige ich dieses Format für deine Preisübersicht am Ende. Lass uns jetzt noch kurz dein Zubehör anschauen.";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));
      setCurrentStepId(5);
      setSubIndex(0);
      return;
    }

    // Schritt 5 – Zubehör (Substeps)
    if (currentStepId === 5) {
      const substeps = (stepById(5) as any)?.substeps ?? [];
      const sub = substeps[subIndex];
      if (sub) {
        const yes = choice.startsWith("✅");
        const key = sub.key as keyof NonNullable<Selections["accessories"]>;
        setSelections((p) => ({
          ...p,
          accessories: { ...(p.accessories || {}), [key]: yes },
        }));
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
        addBot(
          ["Kurze Zusammenfassung deiner Auswahl:", summary, "Transparente Preisübersicht:", priceText].join(
            "\n\n"
          )
        );
      }
      return;
    }
  };

  // Einstiegstext für Zubehör, sobald Step 5 erreicht
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
        <header className="header">
          <h1>FOBI Fotobox – Assistent</h1>
        </header>
        <main className="chat">
          <div className="msg assistant">
            <div className="bubble">
              <strong>Fehler beim Laden der Knowledge-Datei.</strong>
              {"\n"}Details: {kError}
              {"\n"}Der Assistent versucht zuerst GitHub RAW zu laden. Prüfe, ob die Datei dort öffentlich
              erreichbar ist.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!K) {
    return (
      <div className="app">
        <header className="header">
          <h1>FOBI Fotobox – Assistent</h1>
        </header>
        <main className="chat">
          <div className="msg assistant">
            <div className="bubble">Knowledge wird geladen …</div>
          </div>
        </main>
      </div>
    );
  }

if (consent === "unknown") {
  return (
    <ConsentGate
      brand={K.brand}
      noticeText={K.privacy_notice || "Bitte Datenschutzhinweis lesen."}
      privacyLink={(K as any).privacy_link}
      versionKey={versionKey}
      onAccept={() => setConsent("accepted")}
      onDecline={() => setConsent("declined")}
    />
  );
}

if (consent === "declined") {
  return (
    <div className="app">
      <ConsentDeclined
        versionKey={versionKey}
        onAcceptNow={() => setConsent("accepted")}
        notice={
          "Völlig verständlich, dass du nicht zustimmen möchtest. " +
          "Ohne Einwilligung können wir diesen Chat nicht anbieten. " +
          "Wenn du es dir anders überlegst, kannst du unten zustimmen."
        }
      />
    </div>
  );
}



  const current = stepById(currentStepId);
  const buttons: string[] = (currentStepId === 35)
  ? ["100 Prints", "200 Prints", "400 Prints", "800 Prints"]
  : (currentStepId === 4 && current?.buttons ? [...current.buttons, "🧩 Postkarten- und Fotostreifenformat (vor Ort wählbar)"] : (current?.buttons ?? []));

  return (
    <div className="app">
      <header className="header">
        <h1>
          {K.brand} – Assistent „{K.assistant_name}“
        </h1>
        <small>{K.privacy_notice}</small>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}

        <div className="step">
          {currentStepId === 35 ? <h2>Wie viele Prints möchtet ihr insgesamt?</h2> : (current?.title && <h2>{current.title}</h2>)}
          {currentStepId === 35 ? <p className="ask">Wähle bitte die gewünschte Gesamtmenge an Prints: 100, 200, 400 oder 800.</p> : (current?.ask && <p className="ask">{current.ask}</p>)}

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
              {buttons.map((b) => (
                <button key={b} onClick={() => onChoice(b)}>
                  {b}
                </button>
              ))}
            </div>
          )}

          {currentStepId === 5 &&
            renderAccessoryButtons(subIndex, stepById(5) as any, onChoice)}
        </div>
      </main>

      <footer className="footer">
        <small>Tonalität: {K.language_tone}</small>
      </footer>
    </div>
  );
};

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

function buildSummary(sel: Selections) {
  const parts: string[] = [];
  parts.push(
    `Modus: ${
      sel.mode === "Digital"
        ? "Digital (Fobi Smart, digitale Nutzung inkl.)"
        : "Digital & Print"
    }`
  );
  if (sel.eventType) parts.push(`Event: ${sel.eventType}`);
  if (sel.guests) parts.push(`Gäste: ${sel.guests}`);
  if (sel.format) {
    parts.push(
      `Druckformat: ${
        sel.format === "Postkarte"
          ? "Postkartenformat (10×15)"
          : sel.format === "Streifen"
          ? "Fotostreifen (5×15)"
          : "Großbildformat (15×20)"
      }`
    );
  }
  const acc = sel.accessories || {};
  const accList: string[] = [];
  if (acc.requisiten) accList.push("Requisiten");
  if (acc.hintergrund) accList.push("Hintergrund");
  if (acc.layout) accList.push("Individuelles Layout");
  if (accList.length) parts.push(`Zubehör: ${accList.join(", ")}`);
  if (sel.printRecommendation) parts.push(`Empfehlung: ${sel.printRecommendation}`);
  parts.push(
    "Hinweise: 400 Prints im Postkartenformat entsprechen automatisch 800 Fotostreifen; beim Großbildformat entspricht ein Printpaket 200 → 100 Großbild-Prints."
  );
  return "• " + parts.join("\n• ");
}


function recommendPrintPackageFromGuests(sel: Selections, K: Knowledge) {
  const g = sel.guests;
  let label = "";
  if (g === "0–30 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "30–50 Personen") label = "200 Prints (Postkartenformat)";
  if (g === "50–120 Personen") label = "400 Prints (Postkartenformat)";
  if (g === "120–250 Personen") label = "800 Prints (Postkartenformat, 1 Drucksystem)";
  if (g === "ab 250 Personen") label = ""; // individuelle Beratung
  if (!label) return null;
  const price = K?.pricing?.[label];
  if (price == null) return null;
  return { label, price };
}

function normalizeEventKeyLocal(label?: string): string {
  if (!label) return "";
  const s = label.trim().replace(/\s*\(z\.\s*B\..*?\)\s*$/i, "");
  if (/geburt/i.test(s)) return "Geburtstag";
  if (/hochzeit/i.test(s)) return "Hochzeit";
  if (/abschluss/i.test(s)) return "Abschlussball";
  if (/internes/i.test(s)) return "Internes Mitarbeiterevent";
  if (/externes/i.test(s)) return "Externes Kundenevent";
  if (/öffentlich|party/i.test(s)) return "Öffentliche Veranstaltung";
  return s;
}

export default App;


function buildPriceText(sel: Selections, K: Knowledge) {
  const p = K.pricing || {};
  const items: Array<{ label: string; price: number }> = [];

  // 1) Grundpaket immer ansetzen
  items.push({
    label: "Grundpaket (digitale Nutzung inkl.)",
    price: p["Digitalpaket (Fobi Smart)"] ?? 0,
  });

  // 2) Prints nach Auswahl/Format (nur bei Digital & Print)
  if (sel.mode === "Digital & Print") {
    let packPost = sel.selectedPrints || 0; // gewünschte Gesamtprints in Postkarten-Einheiten
    let packUsed = packPost;

    if (sel.bothFormats) {
      // Bei beiden Formaten: größeres Paket aus Postkarte vs. (Fotostreifen -> Postkartenäquivalent)
      const packStripesAsPost = Math.ceil(packPost / 2); // 2 Streifen = 1 Postkarte
      packUsed = Math.max(packPost, packStripesAsPost);
    } else if (sel.format === "Streifen") {
      packUsed = Math.ceil(packPost / 2);
    } else {
      packUsed = packPost;
    }

    // Wähle passenden Pricing-Key (auf Postkartenbasis)
    let labelKey = "";
    if (packUsed === 100) labelKey = "100 Prints (Postkartenformat)";
    if (packUsed === 200) labelKey = "200 Prints (Postkartenformat)";
    if (packUsed === 400) labelKey = "400 Prints (Postkartenformat)";
    if (packUsed === 800) {
      labelKey = p["800 Prints (Postkartenformat, 1 Drucksystem)"] != null
        ? "800 Prints (Postkartenformat, 1 Drucksystem)"
        : "800 Prints (Postkartenformat, 2 Drucksysteme – Printpaket 802)";
    }

    let price = 0;
    if (labelKey && p[labelKey] != null) {
      price = p[labelKey];
    } else if (packUsed === 100 && p["200 Prints (Postkartenformat)"] != null) {
      // Fallback: halber Preis vom 200er, falls 100er nicht gepflegt
      price = Math.round((p["200 Prints (Postkartenformat)"] as number) / 2);
      labelKey = "100 Prints (Postkartenformat)";
    }

    if (packUsed > 0 && (price || price === 0)) {
      items.push({ label: labelKey || `${packUsed} Prints (Postkartenformat)`, price });
    }

    // Zusätzliche Layoutkosten, wenn beide Formate (zweites Layout notwendig)
    if (sel.bothFormats) {
      // Standard: zweites Layout auf Basis des ersten = 20 €
      items.push({ label: "Zusätzliches Drucklayout (gleiches Design)", price: 20 });
      // Hinweis: Für komplett neues Zweitlayout wären es 50 € (kann später auswählbar gemacht werden)
    }
  }

  // 3) Zubehör: 1 Paket inklusive, weitere kostenpflichtig
  const acc = sel.accessories || {};
  const chosen = ["requisiten", "hintergrund", "layout"].filter((k) => (acc as any)[k]);
  const oneAccessoryIncludedInfo = "1 Zubehörpaket inklusive (Requisiten ODER Hintergrund ODER Layout)";
  if (chosen.length > 1) {
    const extras = chosen.length - 1;
    const addPrice = K.pricing?.["Jedes weitere Zubehörpaket"] || 0;
    if (addPrice > 0) {
      items.push({
        label: `Weitere Zubehörpakete (${extras}×)`,
        price: extras * addPrice,
      });
    }
  }

  const sum = items.reduce((a, b) => a + (b.price || 0), 0);
  const lines = items.map((i) =>
    i.price > 0 ? `• ${i.label}: ${i.price} €` : `• ${i.label}`
  );
  lines.unshift(`• ${oneAccessoryIncludedInfo}`);
  lines.push(`
**Gesamtsumme: ${sum} €**`);
  return lines.join("\n");
}

