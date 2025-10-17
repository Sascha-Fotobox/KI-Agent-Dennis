# Dennis – KI‑Assistent (React/TypeScript + Node/Express)

**Erfüllt deine Spezifikation:**  
- Deutschsprachige Web‑App, startet ohne Login direkt mit DSGVO‑Hinweis.  
- Direkt darunter Frage: „Geführte Beratung starten ODER konkrete Frage?“ mit 2 Buttons.  
- Freitext jederzeit möglich (Dennis antwortet sofort).  
- Geführter Button‑Flow (Schritte 1–6) umgesetzt.  
- **Preis‑Policy:** Zahlen erst am Ende. Bei vorzeitiger Preisfrage kommt der Hinweis‑Satz.  
- **Wissen** in `server/server/knowledge.json` hinterlegt und im System‑Prompt verwendet.

## Lokaler Start
### Server
```
cd server
cp .env.example .env   # trage deinen OPENAI_API_KEY ein
npm install
npm run start          # startet auf http://localhost:8787
```
### Client
```
cd client
npm install
npm run dev            # startet auf http://localhost:5173
```
Optional: `.env` im Client mit `VITE_API_BASE=http://localhost:8787` setzen.

## Replit
- Erstelle zwei Repls (server & client) ODER ein Monorepo mit zwei Nix/Run‑Prozessen.
- Setze im Server‑Repl `OPENAI_API_KEY` als Secret.
- Client bauen (`npm run build`) oder direkt dev‑hosten und per `<iframe>` einbinden.

## Pflege
- Preise/Flow/Texte zentral in `server/server/knowledge.json` anpassen.
