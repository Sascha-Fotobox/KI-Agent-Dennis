import { Slide } from "./SlideEngine";

/**
 * Initial slides based on Sascha's flow:
 * 1) Greeting + Grundpaket
 * 2) Auswahl: Digital vs. Print (nur textlich, Auswahl-Buttons folgen später)
 * 3) Nachfolgende Kapitel wie im bestehenden Projekt aufgebaut (Platzhalter)
 *
 * Design-Note: Wir nutzen die bestehende App-Optik (dunkel, anthrazit), 
 * deshalb hier nur Inhalte – die Styles kommen aus der App-Umgebung.
 */

export const slides: Slide[] = [
  {
    id: "welcome",
    title: "Moin! 👋 Willkommen bei Fobi Fotobox",
    description: "Hier findest du in wenigen Schritten das passende Setup. Los geht’s mit unserem Grundpaket – alles drin, was ihr fürs Event braucht.",
    audioSrc: "/audio/slide-welcome.mp3", // optional, Datei kannst du später hinzufügen
    bullets: [
      "Auf- & Abbau inklusive",
      "Professionelle Kamera & Studioblitz",
      "Online-Galerie & Download",
      "Grundpaket-Preis gemäß deiner aktuellen Preisliste",
    ]
  },
  {
    id: "digital-or-print",
    title: "Digital oder mit Print?",
    description: "Möchtest du eine rein digitale Fotobox (ohne Sofortdruck) – oder direkt mit Fotodrucker vor Ort?",
    audioSrc: "/audio/slide-digital-print.mp3",
    bullets: [
      "Digital: Sofort-Download, Online-Galerie",
      "Print: Sofortdrucke vor Ort (wählbare Druckpakete)",
    ]
  },
  {
    id: "followup-structure",
    title: "Dein Setup – Schritt für Schritt",
    description: "Jetzt gehen wir die gewohnte Reihenfolge durch – so wie es im bisherigen Projekt in den Sprechblasen passiert ist, nur als einzelne Slides.",
    audioSrc: "/audio/slide-structure.mp3",
    bullets: [
      "Gästeanzahl",
      "Event (Hochzeit, Geburtstag, Firmenevent, …)",
      "Zubehör (Requisiten, Hintergrund, Layout)",
      "Preisübersicht",
    ]
  },
];
