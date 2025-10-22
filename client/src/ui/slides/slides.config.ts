import type { Slide } from "./SlideEngine";

export const slides: Slide[] = [
  {
    id: "welcome",
    kind: "info",
    title: "Moin! 👋 Willkommen bei Fobi Fotobox",
    description: "Ich bin Dennis, dein Berater. Hier ist unser Grundpaket – so wie du es aus der Chat-Version kennst:",
    bullets: [
      "Fotobox mit Spiegelreflexkamera, Studioblitz/Beleuchtung, 15\" Touchscreen",
      "Auf- & Abbau inklusive",
      "Online-Galerie mit Download",
      "Service & Support am Eventtag (gemäß deiner Liste)"
    ],
    audioSrc: "/audio/slide-welcome.mp3",
  },
  {
    id: "mode",
    kind: "mode",
    title: "Wie möchtest du starten?",
    description: "Wähle den Modus – rein digital oder mit Sofortdrucken vor Ort.",
    audioSrc: "/audio/slide-digital-print.mp3",
    options: ["Digital", "Digital & Print"]
  },
  {
    id: "event",
    kind: "event",
    title: "Event",
    description: "Welches Event plant ihr?",
    options: ["Hochzeit", "Geburtstag", "Internes Firmenevent", "Abschlussball", "Messe", "Kundenevent", "Sonstiges"],
    audioSrc: "/audio/slide-event.mp3",
  },
  {
    id: "guests",
    kind: "guests",
    title: "Gästezahl",
    description: "Wie viele Gäste erwartet ihr? (relevant für Print)",
    options: ["bis 30", "30–50", "50–120", "120–250", "ab 250"],
    audioSrc: "/audio/slide-guests.mp3",
  },
  {
    id: "format",
    kind: "format",
    title: "Druckformat",
    description: "Welches Druckformat möchtet ihr?",
    options: ["Postkarte", "Streifen", "Postkarte & Streifen", "Großbild"],
    audioSrc: "/audio/slide-format.mp3",
  },
  {
    id: "printpkgs",
    kind: "printpkgs",
    title: "Druckpakete",
    description: "Wähle dein Druckpaket:",
    options: ["100", "200", "400", "800", "802"],
    audioSrc: "/audio/slide-printpkgs.mp3",
  },
  {
    id: "accessories",
    kind: "accessories",
    title: "Zubehör",
    description: "Optional: Requisiten, Hintergrundsystem, Layout, Gala-Paket, Audio-Gästebuch (Mehrfachauswahl möglich)",
    options: ["Requisiten", "Hintergrund", "Layout", "Gala-Paket", "Audio-Gästebuch"],
    multi: true,
    audioSrc: "/audio/slide-accessories.mp3",
  },
  {
    id: "summary",
    kind: "summary",
    title: "Zusammenfassung",
    description: "Überprüfe deine Auswahl. Im nächsten Schritt kommt Preis/Anfrage (folgt).",
    audioSrc: "/audio/slide-summary.mp3",
  },
];
