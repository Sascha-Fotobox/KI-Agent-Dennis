import React from "react";
import { Slide } from "./SlideEngine";

export const slides: Slide[] = [
  {
    id: "welcome",
    title: "Moin! 👋 Willkommen bei Fobi Fotobox",
    description:
      "Ich bin Dennis, dein Berater. Kurz zum Grundpaket: Auf- & Abbau, Profi-Kamera & Studioblitz, Touchscreen, Online-Galerie/Download – alles inklusive.",
    bullets: [
      "Auf- & Abbau inklusive",
      "Spiegelreflexkamera + Studioblitz",
      "Touchscreen",
      "Online-Galerie und Downloads",
    ],
    audioSrc: "/audio/slide-welcome.mp3",
  },
  {
    id: "mode",
    title: "Wie möchtest du starten?",
    description: "Wähle den Modus – rein digital oder mit Sofortdrucken vor Ort.",
    audioSrc: "/audio/slide-digital-print.mp3",
    render: ({ mode, setMode }) => (
      <div className="btnrow">
        {(["Digital", "Digital & Print"] as const).map((m) => (
          <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>
    ),
  },
  {
    id: "event",
    title: "Event",
    description: "Hochzeit, Geburtstag, internes Firmenevent, Abschlussball, Messe, Kundenevent – die Auswahl folgt im nächsten Schritt.",
    audioSrc: "/audio/slide-event.mp3",
  },
  {
    id: "guests",
    title: "Gästezahl",
    description: "Wähle die Gäste-Kategorie – relevant besonders bei Print.",
    audioSrc: "/audio/slide-guests.mp3",
    bullets: ["bis 30", "30–50", "50–120", "120–250", "ab 250"],
  },
  {
    id: "format",
    title: "Druckformat",
    description: "Wenn du Print wählst: Postkarte, Streifen, beides oder Großbild.",
    audioSrc: "/audio/slide-format.mp3",
    bullets: ["Postkarte", "Streifen", "Postkarte & Streifen", "Großbild"],
  },
  {
    id: "printpkgs",
    title: "Druckpakete",
    description: "Wähle dein Druckpaket – z. B. 100, 200, 400, 800 oder 802 (mit 2 Druckern).",
    audioSrc: "/audio/slide-printpkgs.mp3",
    bullets: ["100", "200", "400", "800", "802"],
  },
  {
    id: "accessories",
    title: "Zubehör",
    description: "Requisiten, Hintergrundsystem, Layout – die Auswahl erfolgt später im Gespräch; hier nur Grundsatz.",
    audioSrc: "/audio/slide-accessories.mp3",
    bullets: ["Requisiten", "Hintergrund", "Layout", "Gala-Paket", "Audio-Gästebuch"],
  },
  {
    id: "summary",
    title: "Zusammenfassung",
    description: "Hier siehst du deine Auswahl. Im nächsten Ausbau kommt die Preisdarstellung & Anfrage-CTA.",
    audioSrc: "/audio/slide-summary.mp3",
  },
];
