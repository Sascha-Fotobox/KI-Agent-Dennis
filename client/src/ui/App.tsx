import "./App.css";
import React, { useEffect, useMemo, useState } from "react";
import logoUrl from "/fobi-logo.png";
import ConsentDeclined from "./components/ConsentDeclined";
import ConsentGate, { STORAGE_KEY_BASE } from "./components/ConsentGate";


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


// Types
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


// Helpers
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
const btns: string[] = sub.buttons ?? [];
return (
<div className="buttons">
{btns.map((b: any) => (
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
export default App;
