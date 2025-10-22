
import type 
{ Slide } from "./SlideEngine";

export const slides: Slide[] = [
  {
      id: "privacy",
      kind: "consent",
      title: "Moin! Ich bin dein Fotobox-Berater von Fobi Fotobox.",
      description: `Dieses Tool unterstützt dich dabei, das passende Fotobox-Paket zu finden – ganz entspannt und unverbindlich.

Bitte gib hier keine persönlichen Daten ein, wie vollständige Namen, Telefonnummern oder E-Mail-Adressen. Für die Beratung reichen allgemeine Angaben völlig aus – zum Beispiel die Gästezahl oder der Veranstaltungsort.

Mit dem Start erklärst du dich damit einverstanden, dass deine Angaben ausschließlich zur Beratung und Preisfindung verarbeitet werden.`,
      options: ["Ich stimme den Datenschutzbedingungen zu und starte die Beratung"]
    },

  {
    id: "welcome",
    kind: "info",
    title: "Moin! 👋 Willkommen bei Fobi Fotobox",
    description: "Ich bin Dennis, dein Berater. Hier ist unser Grundpaket – so wie du es aus der Chat-Version kennst:",
    sections: [
  {
    title: "Fotobox",
    items: [
      "Ausstattung:",
      "→ Spiegelreflexkamera",
      "→ Studioblitz/Beleuchtung",
      "→ Touchscreen 15\"",
      "Digitale Fotoflat",
      "Videovorschau (du siehst dich selbst)",
      "Fun‑Filter (SW, Sepia, …)",
      "GIF‑Videos & Boomerang‑Videos",
      "Bilderversand an der Fotobox (QR‑Code)"
    ]
  },
  {
    title: "Service",
    items: [
      "Alle Fotos/Videos mit Overlay",
      "Online‑Galerie (mit Passwort)",
      "Vorabgespräch per Telefon oder Videomeeting",
      "24/7 Support",
      "Lieferung/Aufbau/Abbau (20 km inkl., 80 km möglich)"
    ]
  },
  {
    title: "Zubehörpaket",
    items: [
      "Ein kleines Zubehörpaket (Requisiten, Hintergrund oder individuelle Layout‑Gestaltung) ist inklusive. Die konkrete Auswahl triffst du später im Zubehör-Schritt."
    ]
  }
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
    description: "Wie viele Gäste erwartet ihr?",
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
    description: "Wähle dein Druckpaket",
    options: ["100", "200", "400", "800", "802"],
    audioSrc: "/audio/slide-printpkgs.mp3",
  },
  {
    id: "accessories",
    kind: "accessories",
    title: "Zubehör",
    description: "Ein kleines Zubehörpaket (Requisiten, Hintergrundsystem oder individuelle Layout‑Gestaltung) ist inklusive und wird in der Zusammenfassung berücksichtigt.",
    options: ["Requisiten", "Hintergrund", "Layout", "Gala-Paket", "Audio-Gästebuch"],
    multi: true,
    audioSrc: "/audio/slide-accessories.mp3",
  },
  {
    id: "summary",
    kind: "summary",
    title: "Zusammenfassung",
    description: "Überprüfe deine Auswahl. Preis folgt live in der Box darunter.",
    audioSrc: "/audio/slide-summary.mp3",
  },
];
