import "./App.css";
import React, { useEffect, useMemo, useState } from "react";
import logoUrl from "/fobi-logo.png";
import ConsentDeclined from "./components/ConsentDeclined";
import ConsentGate, { STORAGE_KEY_BASE } from "./components/ConsentGate";

// -------------------- Types --------------------
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

type Btn = { label: string; value?: string } | string;

// -------------------- Consts --------------------
const GITHUB_RAW =
  "https://raw.githubusercontent.com/Sascha-Fotobox/KI-Agent-Dennis/main/public/knowledge.json";

// -------------------- Helpers --------------------
function sectionLabel(id: number) {
  switch (id) {
    case 1:
      return "Nutzungsart";
    case 2:
      return "Veranstaltungstyp";
    case 3:
      return "Gästeanzahl";
    case 35:
      return "Printmenge";
    case 4:
      return "Druckformat";
    case 5:
      return "Zubehör";
    default:
      return "";
  }
}

function normalizeEventKey(label?: string): string {
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

function renderAccessoryButtons(
  subIndex: number,
  step5: any,
  onChoice: (choice: string) => void
) {
  const substeps = step5?.substeps ?? [];
  const sub = substeps[subIndex];
  if (!sub) return null;
  const btns: string[] = Array.isArray(sub.buttons) ? sub.buttons : [];
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
  const modeText = sel.mode === "Digital" ? "Digital (Fobi Smart, digitale Nutzung inkl.)" : "Digital & Print";
  parts.push("Modus: " + modeText);
  if (sel.eventType) parts.push("Event: " + sel.eventType);
  if (sel.guests) parts.push("Gäste: " + sel.guests);
  if (sel.format) {
    const f = sel.format === "Postkarte" ? "Postkartenformat (10×15)" : sel.format === "Streifen" ? "Fotostreifen (5×15)" : "Großbildformat (15×20)";
    parts.push("Druckformat: " + f);
  }
  const accSafe = sel.accessories || {};
  const accList: string[] = [];
  if ((accSafe as any).requisiten) accList.push("Requisiten");
  if ((accSafe as any).hintergrund) accList.push("Hintergrund");
  if ((accSafe as any).layout) accList.push("Individuelles Layout");
  if (accList.length > 0) parts.push("Zubehör: " + accList.join(", "));
  if (sel.printRecommendation) parts.push("Empfehlung: " + sel.printRecommendation);
  parts.push("Hinweise: 400 Prints im Postkartenformat entsprechen automatisch 800 Fotostreifen; beim Großbildformat entspricht ein Printpaket 200 → 100 Großbild-Prints.");
  return "• " + parts.join("\n• ");
}

function buildPriceText(sel: Selections, K: Knowledge) {
  const p = (K && K.pricing) ? K.pricing : {};
  const items: { label: string; price: number }[] = [];

  items.push({ label: "Grundpaket (digitale Nutzung inkl.)", price: p["Digitalpaket (Fobi Smart)"] ?? 0 });

  if (sel.mode === "Digital & Print") {
    const chosen = sel.selectedPrints || 0; // gewünschte Gesamtprints (Postkartenbasis)
    let packUsed = chosen;

    if (sel.bothFormats) {
      const stripesAsPost = Math.ceil(chosen / 2);
      packUsed = Math.max(chosen, stripesAsPost);
    } else if (sel.format === "Streifen") {
      packUsed = Math.ceil(chosen / 2);
    }

    let key = "";
    if (packUsed === 100) key = "100 Prints (Postkartenformat)";
    if (packUsed === 200) key = "200 Prints (Postkartenformat)";
    if (packUsed === 400) key = "400 Prints (Postkartenformat)";
    if (packUsed === 800) {
      key = p["800 Prints (Postkartenformat, 1 Drucksystem)"] != null
        ? "800 Prints (Postkartenformat, 1 Drucksystem)"
        : "800 Prints (Postkartenformat, 2 Drucksysteme – Printpaket 802)";
    }

    let price = 0;
    if (key && p[key] != null) {
      price = p[key];
    } else if (packUsed === 100 && p["200 Prints (Postkartenformat)"] != null) {
      price = Math.round((p["200 Prints (Postkartenformat)"] as number) / 2);
      key = "100 Prints (Postkartenformat)";
    }

    if (packUsed > 0) {
      items.push({ label: key || (packUsed + " Prints (Postkartenformat)"), price });
    }

    if (sel.bothFormats) {
      items.push({ label: "Zusätzliches Drucklayout (gleiches Design)", price: 20 });
    }
  }

  const acc = sel.accessories || {};
  const chosenAcc = ["requisiten", "hintergrund", "layout"].filter((k) => (acc as any)[k]);
  const oneIncluded = "1 Zubehörpaket inklusive (Requisiten ODER Hintergrund ODER Layout)";
  if (chosenAcc.length > 1) {
    const extras = chosenAcc.length - 1;
    const addPrice = p["Jedes weitere Zubehörpaket"] || 0;
    if (addPrice > 0) items.push({ label: "Weitere Zubehörpakete (" + extras + "×)", price: extras * addPrice });
  }

  const sum = items.reduce((a, b) => a + (b.price || 0), 0);
  const lines = items.map((i) => (i.price > 0 ? "• " + i.label + ": " + i.price + " €" : "• " + i.label));
  lines.unshift("• " + oneIncluded);
  lines.push("\n**Gesamtsumme: " + sum + " €**");
  return lines.join("\n");
}

// -------------------- Component --------------------
const App: React.FC = () => {
  const [K, setK] = useState<Knowledge | null>(null);
  const [kError, setKError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [selections, setSelections] = useState<Selections>({ accessories: { requisiten: false, hintergrund: false, layout: false } });
  const [subIndex, setSubIndex] = useState<number>(0);

  const [consent, setConsent] = useState<"unknown" | "accepted" | "declined">("unknown");
  const versionKey = "v1";

  useEffect(() => {
    const key = STORAGE_KEY_BASE + versionKey;
    const v = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (v === "accepted") setConsent("accepted");
    else if (v === "declined") setConsent("declined");
    else setConsent("unknown");
  }, []);

  useEffect(() => {
    (async () => {
      const urls = [GITHUB_RAW, `${import.meta.env.BASE_URL}knowledge.json`, "/knowledge.json", "knowledge.json"]; 
      let lastErr: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error("HTTP " + res.status + " für " + url);
          const txt = await res.text();
          const json = JSON.parse(txt);
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

  useEffect(() => {
    if (!K) return;
    setMessages([{ role: "assistant", text: "Hi! Ich begleite dich Schritt für Schritt zur passenden Fotobox. Möchtest du die Fotobox 📱 Digital nutzen oder 🖨️ Digital & Print?" }]);
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
      }
      addBot("Alles klar – mit Sofortdruck. Was wird gefeiert?");
      setCurrentStepId(2);
      return;
    }

    if (currentStepId === 2) {
      setSelections((p) => ({ ...p, eventType: choice }));
      const s2 = stepById(2) as any;
      const rec = (s2 && s2.recommendations) ? (s2.recommendations[choice] || "") : "";
      const bridge = (s2 && s2.after_reply && s2.after_reply.text) ? s2.after_reply.text : "Klingt gut! Magst du mir sagen, wie viele Gäste ungefähr erwartet werden?";
      addBot([rec, bridge].filter(Boolean).join("\n\n"));
      setCurrentStepId(3);
      return;
    }

    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));
      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = (s3 && s3.special_contexts && s3.special_contexts[eventKey]) ? s3.special_contexts[eventKey][choice] : undefined;
      const rec = spec || (s3 && s3.recommendations ? s3.recommendations[choice] : "");
      setSelections((p) => ({ ...p, printRecommendation: rec }));
      addBot([rec, "Als Nächstes: Wie viele Prints möchtest du insgesamt?"].filter(Boolean).join("\n\n"));
      setCurrentStepId(selections.mode === "Digital & Print" ? 35 : 4);
      return;
    }

    if (currentStepId === 35) {
      const num = parseInt((choice.match(/\d+/) || [])[0] || "0", 10) as 100 | 200 | 400 | 800;
      setSelections((p) => ({ ...p, selectedPrints: num }));
      addBot("Alles klar. Als Nächstes: Welches Druckformat möchtest du?");
      setCurrentStepId(4);
      return;
    }

    if (currentStepId === 4) {
      const isBoth = choice.includes("Postkarten- und Fotostreifenformat");
      const format: Selections["format"] = choice.startsWith("📸") ? "Postkarte" : choice.startsWith("🎞️") ? "Streifen" : isBoth ? "Postkarte" : "Großbild";
      setSelections((p) => ({ ...p, format, bothFormats: isBoth }));
      if (!isBoth && format === "Streifen" && (selections.selectedPrints || 0) === 100) {
        addBot("Hinweis: 100 Prints entsprechen 200 Fotostreifen. Mindestabnahme für Fotostreifen sind 200 – das passt also. 👍");
      }
      if (isBoth) {
        addBot("Du hast Postkarten- und Fotostreifenformat gewählt. Vor Ort kannst du je Bild zwischen Postkarte und Fotostreifen wählen. Ich wähle automatisch das größere Printpaket für dich.");
      }
      const s4 = stepById(4) as any;
      const rec = (s4 && s4.recommendations) ? (s4.recommendations[choice] || "") : "";
      const bridge = (s4 && s4.after_reply && s4.after_reply.text) ? s4.after_reply.text : "Super, dann berücksichtige ich dieses Format für deine Preisübersicht am Ende. Lass uns jetzt noch kurz dein Zubehör anschauen.";
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
        if (nxt && nxt.say) addBot(nxt.say);
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
      if (substeps[0] && substeps[0].say) addBot(substeps[0].say);
    }
  }, [currentStepId, K]);

  function restartAll() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Willst du wirklich neu starten? Deine bisherigen Angaben gehen verloren.");
      if (!ok) return;
    }
    setSelections({});
    setCurrentStepId(1);
    setMessages([{ role: "assistant", text: "Hi! Ich begleite dich Schritt für Schritt zur passenden Fotobox. Möchtest du die Fotobox 🖥️ Digital nutzen oder 📸 Digital & Print?" }]);
  }

  const current = useMemo(() => stepById(currentStepId), [currentStepId, K]);

  const buttons: Btn[] = useMemo(() => {
    if (currentStepId === 35) return ["100 Prints", "200 Prints", "400 Prints", "800 Prints"];
    const opts = (current as any)?.buttons ?? (current as any)?.options ?? [];
    return Array.isArray(opts) ? opts : [];
  }, [current, currentStepId]);

  // -------------------- Consent Gates --------------------
  if (consent === "unknown") {
    return (
      <ConsentGate
        onAcceptNow={() => {
          const key = STORAGE_KEY_BASE + versionKey;
          if (typeof window !== "undefined") localStorage.setItem(key, "accepted");
          setConsent("accepted");
        }}
        onDecline={() => {
          const key = STORAGE_KEY_BASE + versionKey;
          if (typeof window !== "undefined") localStorage.setItem(key, "declined");
          setConsent("declined");
        }}
        title={(K && K.brand) ? (K.brand + " – Datenschutzhinweis") : "Datenschutzhinweis"}
        noticeText={(K && K.privacy_notice) ? K.privacy_notice : "Hinweis: Dieser Chat dient ausschließlich der Beratung und Preisfindung. Bitte keine personenbezogenen Daten eingeben."}
      />
    );
  }

  if (consent === "declined") return <ConsentDeclined />;

  // -------------------- Error & Loading --------------------
  if (kError) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <img src="/fobi-logo.png" alt="FOBI Fotobox Logo" className="brand-logo" width={44} height={44} />
            <div className="brand-txt">
              <div className="brand-title">{(K && K.brand) ? K.brand : "FOBI"} – Assistent „{(K && K.assistant_name) ? K.assistant_name : "Dennis"}“</div>
              <small className="brand-sub">{(K && K.privacy_notice) ? K.privacy_notice : "Datenschutzhinweis lädt nicht."}</small>
            </div>
          </div>
          <button className="restart-btn" data-testid="restart-chat" title="Chat neu starten" onClick={restartAll}>↻ Neu starten</button>
        </header>
        <main className="chat">
          <div className="msg assistant">
            <div className="bubble">
              <strong>Fehler beim Laden der Knowledge-Datei.</strong>
              {"\n"}Details: {kError}
              {"\n"}Der Assistent versucht zuerst GitHub RAW zu laden. Prüfe, ob die Datei dort öffentlich erreichbar ist.
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
          <div className="brand">
            <img src={logoUrl} alt="FOBI Fotobox Logo" className="brand-logo" width={44} height={44} />
            <div className="brand-txt">
              <div className="brand-title">Assistent lädt …</div>
              <small className="brand-sub">Bitte einen Moment Geduld.</small>
            </div>
          </div>
          <button className="restart-btn" data-testid="restart-chat" title="Chat neu starten" onClick={restartAll}>↻ Neu starten</button>
        </header>
        <main className="chat">
          <div className="msg assistant"><div className="bubble">Inhalte werden geladen …</div></div>
        </main>
      </div>
    );
  }

  // -------------------- Default Render --------------------
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src="/fobi-logo.png" alt="FOBI Fotobox Logo" className="brand-logo" width={44} height={44} />
          <div className="brand-txt">
            <div className="brand-title">{K.brand} – Assistent „{K.assistant_name}“</div>
            <small className="brand-sub">{K.privacy_notice}</small>
          </div>
        </div>
        <button className="restart-btn" data-testid="restart-chat" title="Chat neu starten" onClick={restartAll}>↻ Neu starten</button>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <div key={i} className={"msg " + m.role}><div className="bubble">{m.text}</div></div>
        ))}

        <div className="step">
          {sectionLabel(currentStepId) ? <div className="section-label">{sectionLabel(currentStepId)}</div> : null}

          {currentStepId === 35 ? (
            <>
              <h2>Wie viele Prints möchtest du insgesamt?</h2>
              <p className="ask">Wähle bitte die gewünschte Gesamtmenge an Prints: 100, 200, 400 oder 800.</p>
              <div className="info">
                <strong>Empfehlung nach Gästezahl</strong>
                <ul>
                  <li>0–30 Personen: 100 Prints</li>
                  <li>30–50 Personen: 200 Prints</li>
                  <li>50–120 Personen: 400 Prints</li>
                  <li>120–250 Personen: 800 Prints</li>
                  <li>ab 250 Personen: Nach individueller Absprache</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {(current as any)?.title ? <h2>{(current as any).title}</h2> : null}
              {(current as any)?.ask ? <p className="ask">{(current as any).ask}</p> : null}
            </>
          )}

          {currentStepId === 4 ? (
            <div className="info">
              {(stepById(4) as any)?.info ? <p>{(stepById(4) as any).info}</p> : null}
              <ul>
                <li>{(stepById(4) as any)?.change_intervals && (stepById(4) as any).change_intervals["Postkartenformat"]}</li>
                <li>{(stepById(4) as any)?.change_intervals && (stepById(4) as any).change_intervals["Fotostreifenformat"]}</li>
                <li>{(stepById(4) as any)?.change_intervals && (stepById(4) as any).change_intervals["Großbildformat"]}</li>
              </ul>
            </div>
          ) : null}

          {buttons.length > 0 ? (
            <div className="buttons">
              {buttons.map((b) => (
                <button key={typeof b === "string" ? b : b.label} onClick={() => onChoice(typeof b === "string" ? b : b.label)}>
                  {typeof b === "string" ? b : b.label}
                </button>
              ))}
            </div>
          ) : null}

          {currentStepId === 5 ? renderAccessoryButtons(subIndex, stepById(5) as any, onChoice) : null}
        </div>
      </main>

      <footer className="footer"><small>Tonalität: {K.language_tone}</small></footer>
    </div>
  );
};

export default App;


export default App;
