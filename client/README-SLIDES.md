# Client (Slides Version)

Dieses Verzeichnis enthält die **Slide-basierte** Version deiner App im **schwarz–goldenen Original-Design**.

## Wichtig
- **Design & Theme** stammen aus `src/ui/App.css` und `public/knowledge.json` (Theme: bg/text/brand/accent).
- **Slides** liegen unter `src/ui/slides/SlideEngine.tsx` (Renderer) und `src/ui/slides/slides.config.ts` (Inhalte/Reihenfolge).
- **Audio**: MP3-Dateien optional in `public/audio/` ablegen und in `slides.config.ts` verlinken.

## Start
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Struktur
- `index.html`, `vite.config.ts`, `tsconfig.json`
- `public/` (inkl. `knowledge.json`, optional `audio/`)
- `src/` (React + TS, `ui/App.tsx`, `ui/App.css`, `ui/slides/...`)
