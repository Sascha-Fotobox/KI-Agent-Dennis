
import type { Slide } from "./SlideEngine";

export const slides: Slide[] = [{
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
    title: "Willkommen – unser Grundpaket",
    sections: [
      {
        title: "Fotobox",
        items: [
          "Ausstattung:",
          "→ Spiegelreflexkamera",
          "→ Studioblitz/Beleuchtung",
          "→ Touchscreen 15 Zoll",
          "Digitale Fotoflat",
          "Videovorschau (du siehst dich selbst)",
          "Fun‑Filter (SW, Sepia, …)",
          "GIF‑Videos & Boomerang‑Videos",
          "Bilderversand an der Fotobox (QR‑Code)"
        ]
      },
  {
    id: "general",
    kind: "general",
    title: "Allgemeine Angaben",
    description: "Was plant ihr – und mit wie vielen Gästen?",
    eventOptions: ["Hochzeit","Geburtstag","Abschlussball","Internes Firmenevent","Messe","Kundenevent","Öffentliches Event","Sonstiges"],
    guestOptions: ["bis 30","30–50","50–120","120–250","ab 250"],
    audioSrc: "/audio/slide-general.mp3"
  },
  {
    id: "tips",
    kind: "tips",
    title: "Tipps zu deiner Auswahl",
    description: "Kurze Empfehlungen passend zu deinem Event und eurer Gästezahl.",
    audioSrc: "/audio/slide-tips.mp3"
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
    id: "tipsprint",
    kind: "tipsprint",
    title: "Empfehlungen zu Druck & Gästeanzahl",
    description: "Passend zu eurer Gästezahl – Hinweise für die richtige Druckmenge.",
    audioSrc: "/audio/slide-tipsprint.mp3"
  },
  {
    id: "format",
    kind: "format",
    title: "Druckformat",
    description: "Welches Druckformat möchtet ihr?",
    options: ["Postkarte", "Streifen", "Postkarte & Streifen", "Großbild"],
    audioSrc: "/audio/slide-format.mp3"
  },
  {
    id: "printpkgs",
    kind: "printpkgs",
    title: "Druckpakete",
    description: "Wähle dein Druckpaket",
    options: ["100", "200", "400", "800", "802"],
    audioSrc: "/audio/slide-printpkgs.mp3"
  },
  {
    id: "accessories",
    kind: "accessories",
    title: "Zubehör",
    description: "Ein kleines Zubehörpaket (Requisiten, Hintergrundsystem oder individuelle Layout‑Gestaltung) ist inklusive und wird in der Zusammenfassung berücksichtigt.",
    options: ["Requisiten", "Hintergrund", "Layout", "Gala-Paket", "Audio-Gästebuch"],
    multi: true,
    audioSrc: "/audio/slide-accessories.mp3"
  },
  {
    id: "summary",
    kind: "summary",
    title: "Zusammenfassung",
    description: "Überprüfe deine Auswahl. Preis folgt live in der Box daneben.",
    audioSrc: "/audio/slide-summary.mp3"
  }
];