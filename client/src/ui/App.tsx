// src/ui/App.tsx (repaired minimal version)
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

const GITHUB_RAW =
  "https://raw.githubusercontent.com/Sascha-Fotobox/KI-Agent-Dennis/main/public/knowledge.json";

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

  const priceLines = useMemo(() => {
    if (!K) return [];
    const pricing = K.pricing || {};
    const lines: { label: string; amount: number }[] = [];

    // Grundpaket (immer enthalten)
    if (pricing["Digitalpaket (Fobi Smart)"] != null) {
      lines.push({ label: "Digitalpaket (Fobi Smart)", amount: pricing["Digitalpaket (Fobi Smart)"] });
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

    // Grobe Druckkosten – nur wenn „Digital & Print“ gewählt, ohne Mengen-Automatik
    if (selections.mode === "Digital & Print") {
      // Optionen werden später konkretisiert; hier kein Auto-Mapping des Empfehlungstexts.
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

    // Schritt 3 – Gästezahl → Empfehlungstext
    if (currentStepId === 3) {
      setSelections((p) => ({ ...p, guests: choice }));
      const s3 = stepById(3) as any;
      const eventKey = normalizeEventKey(selections.eventType);
      const spec = s3?.special_contexts?.[eventKey]?.[choice];
      const rec = spec || s3?.recommendations?.[choice] || "";
      setSelections((p) => ({ ...p, printRecommendation: rec }));
      addBot([rec, stepById(4)?.ask ?? "Welches Druckformat?"].join("\n\n"));
      setCurrentStepId(4);
      return;
    }

    // Schritt 4 – Druckformat
    if (currentStepId === 4) {
      const f: Selections["format"] = choice.includes("Streifen")
        ? "Streifen"
        : choice.includes("Groß")
        ? "Großbild"
        : "Postkarte";
      setSelections((p) => ({ ...p, format: f }));

      // Nächster Schritt: Zubehör
      const s5 = stepById(5) as any;
      addBot([s5?.ask ?? "Möchtet ihr Zubehör?", "Wählt gern mehrere aus."].join("\n\n"));
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

    // Preise nur am Ende nennen, wenn policy das verlangt
    if (K?.policy?.prices_at_end) {
      const priceTextLines = [
        "💶 Preise (Übersicht):",
        ...priceLines.map((l) => `• ${l.label}: ${l.amount.toFixed(2)} €`),
        `—\nGesamtsumme (vorbehaltlich genauer Druckwahl): ${total.toFixed(2)} €`,
      ];
      const info = s6?.info?.map((i: any) => `ℹ️ ${i.text}`).join("\n") || "";
      addBot([s6?.ask ?? "Zusammenfassung & Preise", priceTextLines.join("\n"), info].join("\n\n"));
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

  return (
    <div className="app">
      <div className="header"><strong>{K.brand} – {K.assistant_name}</strong></div>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}

        {step && (
          <div className="step">
            {step.title && <div className="ask"><strong>{step.title}</strong></div>}
            <div className="ask">{step.ask}</div>
            <div className="buttons">
              {Array.isArray(step.buttons) &&
                step.buttons.map((b: string) => (
                  <button key={b} onClick={() => handleChoice(b)}>{b}</button>
                ))}
              {currentStepId === 5 && (
                <button onClick={goNextFromAccessories}>Weiter</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="footer">
        <div>Made with Vite + React • Preise vorbehaltlich finaler Abstimmung</div>
      </div>
    </div>
  );
}
