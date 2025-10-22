
import React, { useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  sections?: { title: string; items: string[] }[];
  audioSrc?: string;
  kind?: "mode" | "event" | "guests" | "format" | "printpkgs" | "accessories" | "summary" | "info" | "consent" | "general" | "tips";
  options?: string[];
  multi?: boolean;
  eventOptions?: string[];
  guestOptions?: string[];
};

export type Selections = {
  mode?: "Digital" | "Digital & Print";
  event?: string;
  guests?: string;
  format?: string;
  printpkg?: string;
  accessories: string[];
};

type Props = {
  slides: Slide[];
  onFinish?: () => void;
  onChange?: (s: Selections) => void;
};

const BASE_PRICE = 350;
const PRINT_PRICES: Record<string, number> = { "100": 70, "200": 100, "400": 150, "800": 250, "802": 280 };
const SECOND_LAYOUT_FEE = 20;
const ACCESSORY_PRICES: Record<string, number> = {"Requisiten":30,"Hintergrund":30,"Layout":30,"Gala-Paket":80,"Audio-Gästebuch":90};
const SMALL_ZUO: ReadonlyArray<string> = ["Requisiten","Hintergrund","Layout"];

export function pickIncludedSmall(sel: Selections): string | null {
  if (!Array.isArray(sel.accessories)) return null;
  for (const name of SMALL_ZUO) if (sel.accessories.includes(name)) return name;
  return null;
}

function getPrintPrice(sel: Selections): number {
  if (sel.mode !== "Digital & Print" || !sel.printpkg) return 0;
  const raw = parseInt(sel.printpkg, 10);
  const effective = sel.format === "Streifen" ? Math.round(raw/2) : raw;
  return PRINT_PRICES[String(effective)] ?? 0;
}

export function computePrice(sel: Selections) {
  let total = BASE_PRICE;
  total += getPrintPrice(sel);
  if (sel.mode === "Digital & Print" && sel.format === "Postkarte & Streifen") total += SECOND_LAYOUT_FEE;
  let accessoriesTotal = 0;
  if (Array.isArray(sel.accessories)) for (const a of sel.accessories) accessoriesTotal += (ACCESSORY_PRICES[a] || 0);
  const included = pickIncludedSmall(sel); if (included) accessoriesTotal = Math.max(0, accessoriesTotal - 30);
  total += accessoriesTotal;
  return total;
}

export default function SlideEngine({ slides, onFinish, onChange }: Props) {
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<Selections>({ accessories: [] });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = slides[index];
  const isWelcome = current.id === 'welcome';

  const nonConsentSlides = slides.filter(s => s.kind !== 'consent');
  const displayTotal = nonConsentSlides.length;
  const displayIndex = current.kind === 'consent' ? 0 : (nonConsentSlides.findIndex(s => s.id === current.id) + 1);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; setIsPlaying(false); }
  }, [index]);

  useEffect(() => { onChange?.(sel); }, [sel, onChange]);

  const needsChoice = ["mode", "general", "format", "printpkgs"].includes(current.kind || "");
  const hasChoice =
    current.kind === "mode" ? !!sel.mode :
    current.kind === "general" ? (!!sel.event && !!sel.guests) :
    current.kind === "format" ? !!sel.format :
    current.kind === "printpkgs" ? !!sel.printpkg :
    true;

  const canPrev = index > 0;
  function nextIndex(i: number): number {
    let n = Math.min(slides.length - 1, i + 1);
    while (slides[n]?.kind === "printpkgs" && sel.mode === "Digital") n = Math.min(slides.length - 1, n + 1);
    return n;
  }
  const canNext = (index < slides.length - 1) && (!needsChoice || hasChoice);

  function chooseSingle(value: string) {
    switch (current.kind) {
      case "mode": setSel(s => ({ ...s, mode: value as Selections["mode"] })); break;
      case "event": setSel(s => ({ ...s, event: value })); break;
      case "guests": setSel(s => ({ ...s, guests: value })); break;
      case "format": setSel(s => ({ ...s, format: value })); break;
      case "printpkgs": setSel(s => ({ ...s, printpkg: value })); break;
    }
  }
  function toggleMulti(value: string) {
    setSel(s => { const has = s.accessories.includes(value); return { ...s, accessories: has ? s.accessories.filter(x => x !== value) : [...s.accessories, value] }; });
  }

  return (
    <div className={"slideBox"}>
      <div key={current.id} className={isWelcome ? "slideInner" : "slideInner centered"}>
        <div className="sectionTitle">{current.title}</div>
        {current.description && <p className="hint">{current.description}</p>}

        {current.kind === "general" && (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            <div>
              <div className="sectionTitle">Event</div>
              <div className="btnrow wrap">
                {(current.eventOptions || []).map(opt => (
                  <button key={opt} className={sel.event === opt ? "active" : ""} onClick={() => setSel(s => ({ ...s, event: opt }))}>{opt}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="sectionTitle">Gästezahl</div>
              <div className="btnrow wrap">
                {(current.guestOptions || []).map(opt => (
                  <button key={opt} className={sel.guests === opt ? "active" : ""} onClick={() => setSel(s => ({ ...s, guests: opt }))}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {current.sections && current.sections.length > 0 && (
          <div className="sections">
            {current.sections.map((sec, i) => (
              <div className="sectionBlock" key={i}>
                <div className="secTitle">{sec.title}</div>
                <ul className="secList">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        )}

        {/* RENDER TIPS (rich) */}
        {current.kind === "tips" && (
          <div style={{ marginTop: 10 }}>
            {(() => {
              const e = sel.event || "";
              const g = sel.guests || "";

              

const EVENT_TIPS: Record<string, string[]> = {
  "Hochzeit": [
    `Eine Fotobox ist auf Hochzeiten immer ein Highlight – sie sorgt für Spaß, lockere Stimmung und viele tolle Erinnerungen. Eure Gäste können direkt ein Foto mitnehmen, das gleichzeitig ein persönliches Gastgeschenk ist.`,
    `Legt am besten ein Gästebuch neben die Fotobox, damit die Gäste ihr Foto gleich einkleben und euch eine kleine Nachricht hinterlassen können – so entsteht eine bleibende Erinnerung an euren Tag.`,
    `Für Hochzeiten empfehle ich außerdem eine individuelle Layout-Gestaltung, bei der sich das Design an eurer Papeterie oder Einladungskarte orientiert. So fügt sich alles harmonisch ins Gesamtbild eurer Feier ein.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert. Und mit den passenden Requisiten entstehen besonders lustige und kreative Bilder.`
  ],
  "Geburtstag": [
    `Eine Fotobox ist auf Geburtstagsfeiern immer ein Highlight – sie sorgt für Spaß, lockere Stimmung und viele tolle Erinnerungen. Eure Gäste können direkt ein Foto mitnehmen, das gleichzeitig ein persönliches Andenken an die Party ist.`,
    `Wenn du möchtest, kann das Layout individuell gestaltet werden – zum Beispiel mit einem Motto wie 80er-Party, 90er-Revival oder Schlagerabend. Auch bei runden Geburtstagen lässt sich der Anlass wunderbar im Design hervorheben, etwa mit dem Schriftzug „Happy 40th“ oder „Cheers to 30 Years“.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert. Und mit den passenden Requisiten entstehen besonders lustige und kreative Bilder.`
  ],
  "Internes Firmenevent": [
    `Eine Fotobox ist auf Firmenfeiern oder Teamevents immer ein Highlight, weil sie die Mitarbeiter zusammenbringt und für lockere, gemeinsame Momente sorgt. Oft entstehen hier Fotos mit Kolleg:innen, die man sonst kaum trifft – besonders, wenn mehrere Standorte zusammenkommen.`,
    `Ich empfehle bei Firmenevents immer eine Variante mit Sofortdruck, da die Bilder meist am Arbeitsplatz, an Pinnwänden oder im Pausenraum landen und dort noch lange an das Event erinnern.`,
    `Das individuelle Layout kann passend zum Anlass gestaltet werden – zum Beispiel für eine Weihnachtsfeier, ein Sommerfest oder ein Jubiläum. Dabei können Firmenlogo, CI-Farben oder sogar Elemente aus einem Veranstaltungsflyer integriert werden. Wenn gewünscht, kann auch jemand aus dem Unternehmen das Layout selbst gestalten – ich stelle dafür gerne eine passende Vorlage bereit.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert. Und mit den passenden Requisiten entstehen besonders lustige und kreative Bilder.`
  ],
  "Abschlussball": [
    `Eine Fotobox ist auf Abschlussbällen immer etwas Besonderes, denn sie hält den Moment fest, an dem alle noch einmal gemeinsam in festlicher Kleidung zusammenkommen – in eleganten Kleidern, Smokings oder Anzügen. So entstehen bleibende Erinnerungen an einen ganz besonderen Abend.`,
    `Besonders empfehlenswert ist hier eine individuelle Layout-Gestaltung, bei der zum Beispiel das Abi- oder Abschlussmotto integriert werden kann – etwa „Abi Vegas“, „Abifari“ oder „Abitendo“. Damit wird jedes Foto zu einem echten Andenken an den Schulabschluss.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert. Und mit den passenden Requisiten entstehen besonders lustige und kreative Bilder.`
  ],
  "Messe": [
    `Eine Fotobox ist auf Messen ein starkes Marketing-Tool, mit dem sich Besucher aktiv einbinden lassen. Durch die Fotos entsteht eine persönliche Interaktion mit eurer Marke – und die Besucher nehmen gleichzeitig ein Foto als Erinnerung mit nach Hause.`,
    `Sinnvoll ist hier eine Betreuung der Fotobox, entweder durch uns oder durch euer Team, um Besucher gezielt an den Stand zu holen.`,
    `Das Druck-Layout kann individuell an die Firmen-CI oder das Event-Design angepasst werden. So lassen sich Logos, Grafiken oder QR-Codes für weiterführende Aktionen direkt integrieren. Dadurch bleibt eure Marke auch nach der Messe im Gedächtnis, wann immer das Foto angeschaut wird.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert und einen professionellen Eindruck am Messestand hinterlässt.`
  ],
  "Kundenevent": [
    `Eine Fotobox ist bei Kundenevents eine tolle Möglichkeit, Gäste aktiv einzubinden – egal ob bei einer Neueröffnung, einem Tag der offenen Tür oder einem Firmenjubiläum. Die Fotos schaffen eine lockere Atmosphäre und sorgen dafür, dass euer Event positiv in Erinnerung bleibt.`,
    `Das Druck-Layout kann individuell an eure Firmen-CI oder das Event-Design angepasst werden. So lässt sich eure Marke perfekt präsentieren – mit Logo, Grafiken oder QR-Codes für weiterführende Aktionen oder eure Website. Dadurch entsteht ein nachhaltiger Werbeeffekt, da die Gäste ihr Foto als Erinnerung mitnehmen und dabei immer wieder eure Marke sehen.`,
    `Ein Hintergrundsystem ist ebenfalls sehr zu empfehlen, da es die Fotoqualität deutlich verbessert und für einen professionellen Auftritt sorgt.`
  ],
  "Öffentliches Event": [
    `Eine Fotobox ist bei öffentlichen Events ein echter Publikumsmagnet – egal ob Oktoberfest, Halloweenparty, 80er- oder 90er-Party, Schlagerabend oder Sommerfest. Sie sorgt für Spaß, lockere Stimmung und viele tolle Erinnerungen, die Gäste gerne mit nach Hause nehmen.`,
    `Das individuelle Layout kann perfekt an das Event-Motto oder den Veranstaltungsflyer angepasst werden – so bleibt das Branding oder das Motto auf jedem Ausdruck sichtbar.`,
    `Auch beim Hintergrundsystem und den Requisiten kann das Thema des Events aufgegriffen werden. Ob gruselig zu Halloween, zünftig zum Oktoberfest oder sommerlich zur Tropical-Party – mit mottobezogenen Accessoires entstehen besonders kreative und stimmungsvolle Fotos.`
  ],
  "Sonstiges": [
    `Euer Event passt in keine der üblichen Kategorien? Kein Problem!
Wir können gerne telefonisch einen Termin vereinbaren, um euer Vorhaben genauer zu besprechen. So kann ich euch individuell beraten und passende Tipps sowie Erfahrungen aus ähnlichen Veranstaltungen mitgeben.
Gemeinsam finden wir die ideale Lösung – egal ob für ein besonderes Firmenevent, eine private Feier oder etwas ganz anderes.`
  ]
};



              
const GUEST_TIPS: Record<string, string[]> = {
  "bis 30": [
    `Bei kleinen Feiern mit bis zu 30 Gästen reicht in der Regel das kleinste Printpaket mit 100 Prints im Postkartenformat vollkommen aus. Damit seid ihr bestens ausgestattet, ohne Sorge haben zu müssen, dass das Papier leerläuft.`,
    `Wenn ihr euch für das Fotostreifenformat entscheidet, sind automatisch 200 Prints enthalten – also ebenfalls mehr als genug für diese Gästezahl.`,
    `Ein großer Vorteil:
Es ist kein Wechsel des Druckmaterials notwendig – das System läuft durchgängig stabil und wartungsfrei.
Nach jeder Fotosession kann zudem jedes Bild bis zu fünfmal gedruckt werden, sodass bei Gruppenfotos jede Person ein eigenes Exemplar erhält.
Ein Print dauert dabei nur etwa 10 Sekunden, wodurch die Fotobox auch bei vielen Gästen flüssig läuft und keine langen Wartezeiten entstehen.`
  ],
  "30–50": [
    `Bei Feiern mit 30 bis 50 Gästen empfehle ich das Printpaket mit 200 Prints im Postkartenformat. Damit seid ihr auf der sicheren Seite – auch wenn viele Gäste mehrmals an der Fotobox vorbeischauen.`,
    `Beim Fotostreifenformat entspricht ein Print automatisch zwei Fotostreifen, da der Drucker immer ein Postkartenformat druckt und dieses mittig durchschneidet.
Technisch bedeutet das: 100 Prints ergeben 200 Fotostreifen.
Trotzdem empfehle ich auch beim Fotostreifenformat das Printpaket 200, da viele Gäste anfangs nicht wissen, dass ein Print zwei Streifen ergibt und daher häufiger drucken.
Mit 200 Prints stehen euch also 400 Fotostreifen zur Verfügung – das reicht locker für 50 Personen.`,
    `Ein großer Vorteil:
Es ist kein Wechsel des Druckmaterials notwendig – das System läuft durchgängig stabil und wartungsfrei.
Nach jeder Fotosession kann zudem jedes Bild bis zu fünfmal gedruckt werden, sodass bei Gruppenfotos jede Person ein eigenes Exemplar erhält.
Ein Print dauert dabei nur etwa 10 Sekunden, wodurch die Fotobox auch bei vielen Gästen flüssig läuft und keine langen Wartezeiten entstehen.`
  ],
  "50–120": [
    `Bei Feiern mit 50 bis 120 Gästen empfehle ich das Printpaket mit 400 Prints im Postkartenformat. Damit seid ihr bestens ausgestattet, auch wenn viele Gäste mehrfach Fotos machen.`,
    `Für kleinere Runden um die 50 Personen kann das Printpaket 200 noch ausreichen – ab etwa 65–70 Gästen sollten es jedoch unbedingt 400 Prints sein, damit jeder ausreichend Prints erhält und die Box den ganzen Abend über genutzt werden kann.`,
    `Ein großer Vorteil:
Es ist kein Wechsel des Druckmaterials notwendig – das System läuft durchgängig stabil und wartungsfrei.
Nach jeder Fotosession kann zudem jedes Bild bis zu fünfmal gedruckt werden, sodass bei Gruppenfotos jede Person ein eigenes Exemplar erhält.
Ein Print dauert dabei nur etwa 10 Sekunden, wodurch die Fotobox auch bei vielen Gästen flüssig läuft und keine langen Wartezeiten entstehen.`
  ],
  "120–250": [
    `Bei Feiern mit 120 bis 250 Gästen empfehle ich 800 Prints. Damit seid ihr bestens gerüstet – auch für größere Gruppen und längere Veranstaltungen.`,
    `Im Postkartenformat muss nach 400 Prints das Media-Kit gewechselt werden. Alternativ kann auch ein zweiter Drucker eingesetzt werden, sodass bis zu 800 Prints möglich sind, ohne dass jemand eingreifen muss.`,
    `Im Fotostreifenformat kann das Printpaket 400 gewählt werden, da hiermit bis zu 800 Fotostreifen gedruckt werden können. Hier ist kein Wechsel des Druckmaterials notwendig, da der Drucker diese Menge am Stück drucken kann.`,
    `Nach jeder Fotosession kann jedes Bild bis zu fünfmal gedruckt werden, sodass bei Gruppenfotos jede Person ein eigenes Exemplar erhält.
Ein Print dauert dabei nur etwa 10 Sekunden, wodurch die Fotobox auch bei vielen Gästen flüssig läuft und keine langen Wartezeiten entstehen.`
  ],
  "ab 250": [
    `Bei Events mit mehr als 250 Gästen sollten wir die Veranstaltung am besten in einem kurzen Telefonat genauer besprechen. So kann ich die passende Lösung individuell empfehlen und auf die Gegebenheiten vor Ort eingehen.`,
    `Gerade bei großen Events – wie Abschlussbällen oder Firmenevents mit 500 bis 1.000 Personen – kann eine Betreuung der Fotobox vor Ort sinnvoll sein. Hier bieten sich Optionen wie eine Druck-Flat oder eine Abrechnung nach tatsächlich verbrauchtem Material an.`,
    `Nach jeder Fotosession kann jedes Bild bis zu fünfmal gedruckt werden, sodass bei Gruppenfotos jede Person ein eigenes Exemplar erhält.
Ein Print dauert dabei nur etwa 10 Sekunden, wodurch die Fotobox auch bei vielen Gästen flüssig läuft und keine langen Wartezeiten entstehen.
Beim Einsatz von zwei Drucksystemen und einer betreuten Fotobox kann die Druckzeit zusätzlich verkürzt werden, da die Drucker parallel betrieben werden können.`
  ]
};


              const eventLines = EVENT_TIPS[e] || [];
              const guestLines = GUEST_TIPS[g] || [];

              return (
                <div className="sections">
                  {!!eventLines.length && (
                    <div className="sectionBlock">
                      {/* dynamic title per event */}
                      <div className="secTitle">{(() => {
                        const EMOJI: Record<string,string> = {
                          "Hochzeit":"💍","Geburtstag":"🎉","Abschlussball":"🎓","Internes Firmenevent":"💼","Messe":"🧭","Kundenevent":"🤝","Öffentliches Event":"🎪","Sonstiges":"🌟"
                        };
                        const label = sel.event || "Event";
                        return `${EMOJI[label] || "💡"} Tipp für ${label}`;
                      })()}</div>
                      <ul className="secList">{eventLines.map((t, i) => <li key={"e"+i}>{t}</li>)}</ul>
                    </div>
                  )}
                  {!!guestLines.length && (
                    <div className="sectionBlock">
                      <div className="secTitle">Hinweise zur Gästezahl</div>
                      <ul className="secList">{guestLines.map((t, i) => <li key={"g"+i}>{t}</li>)}</ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {current.options && current.options.length > 0 && (
          <div className="btnrow wrap" style={{ marginTop: 12 }}>
            {current.options.map((opt) => {
              const active =
                current.kind === "mode" ? sel.mode === opt :
                current.kind === "event" ? sel.event === opt :
                current.kind === "guests" ? sel.guests === opt :
                current.kind === "format" ? sel.format === opt :
                current.kind === "printpkgs" ? sel.printpkg === opt :
                current.kind === "accessories" ? sel.accessories.includes(opt) : false;
              return (
                <button
                  key={opt}
                  className={(current.kind === "consent" ? "cta" : "") + (active ? " active" : "")}
                  onClick={() => {
                    if (current.kind === "consent") { setIndex(i => Math.min(slides.length - 1, i + 1)); return; }
                    if (current.kind === "accessories" || current.multi) { const has = sel.accessories.includes(opt); setSel(s => ({ ...s, accessories: has ? s.accessories.filter(x => x !== opt) : [...s.accessories, opt] })); }
                    else { chooseSingle(opt); }
                  }}
                >{opt}</button>
              );
            })}
          </div>
        )}

        {/* Audio above nav, centered */}
        {current.audioSrc && (
          <div className="audioInline">
            <div className="sectionTitle" style={{ fontSize: 14, marginBottom: 6, textAlign: "center" }}>Erklärung anhören</div>
            <div className="audioInlineRow">
              <button type="button" className="audioBtn" onClick={() => {
                if (!audioRef.current) return; if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause();
              }}>{isPlaying ? "❚❚ Pause" : "► Abspielen"}</button>
              <audio ref={audioRef} src={current.audioSrc} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
            </div>
          </div>
        )}

        {current.kind !== "consent" ? (
          <div className="navrow">
            <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={!canPrev}>Zurück</button>
            <span className="chip">{displayIndex} von {displayTotal}</span>
            <button onClick={() => { if (index < slides.length - 1) setIndex(i => nextIndex(i)); else onFinish && onFinish(); }} disabled={!canNext}>{index < slides.length - 1 ? "Weiter" : "Fertig"}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
