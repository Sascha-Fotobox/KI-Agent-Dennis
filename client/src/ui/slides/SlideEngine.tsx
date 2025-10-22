
import React, { useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  sections?: { title: string; items: string[] }[];
  audioSrc?: string;
  kind?: "mode" | "event" | "guests" | "format" | "printpkgs" | "accessories" | "summary" | "info" | "consent" | "general" | "tips" | "tipsprint";
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

type Props = { slides: Slide[]; onFinish?: () => void; onChange?: (s: Selections) => void; onShowSummary?: (show: boolean) => void; };

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

export default function SlideEngine({ slides, onFinish, onChange, onShowSummary }: Props) {
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<Selections>({ accessories: [] });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = slides[index];
  useEffect(() => { onShowSummary?.(current.kind !== "consent"); }, [index]);
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

        {
        {/* Event-only tips */}
        {current.kind === "tips" && (
          <div style={{ marginTop: 10 }}>
            {(() => {
              const e = sel.event || "";
              const lines = (e && (EVENT_TIPS as any)[e]) || [];
              return (
                <div className="sections">
                  {!!lines.length && (
                    <div className="sectionBlock">
                      <div className="secTitle">{(() => {
                        const EMOJI: Record<string,string> = {
                          "Hochzeit":"💍","Geburtstag":"🎉","Abschlussball":"🎓","Internes Firmenevent":"💼","Messe":"🧭","Kundenevent":"🤝","Öffentliches Event":"🎪","Sonstiges":"🌟"
                        };
                        const label = sel.event || "Event";
                        return `${EMOJI[label] || "💡"} Tipp für ${label}`;
                      })()}</div>
                      <ul className="secList">{lines.map((t: string, i: number) => <li key={"e"+i}>{t}</li>)}</ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tips for print & guests */}
        {current.kind === "tipsprint" && (
          <div style={{ marginTop: 10 }}>
            {(() => {
              const g = sel.guests || "";
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
              const guestLines = (g && (GUEST_TIPS as any)[g]) || [];
              return (
                <div className="sections">
                  {!!guestLines.length && (
                    <div className="sectionBlock">
                      <div className="secTitle">Empfehlungen zu Druck & Gästeanzahl</div>
                      <ul className="secList">{guestLines.map((t: string, i: number) => <li key={"pg"+i}>{t}</li>)}</ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Options (with printpkgs customization) */}
        {current.options && current.options.length > 0 && (
          current.kind === "printpkgs" ? (
            <div className="btnrow wrap" style={{ marginTop: 12 }}>
              {(current.options || []).filter(pkg => {
                const isStreifen = sel.format === "Streifen";
                return !(isStreifen && pkg === "100"); // no 100 Streifen
              }).map(pkg => {
                const isPost = sel.format === "Postkarte" || !sel.format;
                const isStrip = sel.format === "Streifen";
                const isLarge = sel.format === "Großbild";

                let label = "";
                if (pkg === "802") {
                  const streifen = 1600;
                  const gross = 400;
                  label = isStrip ? `${streifen} Prints im Fotostreifenformat (Printpaket 802)`
                        : isLarge ? `${gross} Prints im Großbildformat (Printpaket 802)`
                        : `800 Prints im Postkartenformat mit 2 Druckern (Printpaket 802)`;
                } else {
                  const n = parseInt(pkg,10);
                  const streifen = n * 2;
                  const gross = Math.floor(n * 0.5);
                  label = isStrip ? `${streifen} Prints im Fotostreifenformat (Printpaket ${n})`
                        : isLarge ? `${gross} Prints im Großbildformat (Printpaket ${n})`
                        : `${n} Prints im Postkartenformat (Printpaket ${n})`;
                }

                const active = sel.printpkg === pkg;
                return (
                  <button key={pkg} className={active ? "active" : ""} onClick={() => setSel(s => ({ ...s, printpkg: pkg }))}>
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
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
          )
        )}
/* Audio above nav, centered */}
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
