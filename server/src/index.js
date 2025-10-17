import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: CORS_ORIGIN }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

const knowledgePath = path.join(__dirname, "..", "knowledge.json");
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, "utf-8"));

const systemPrompt = `Du bist ${knowledge.assistant_name}, der digitale Berater von ${knowledge.brand} aus Kiel.
Sprich stets deutsch: ${knowledge.language_tone}.
DSGVO-Regeln: Keine personenbezogenen Daten erfragen oder speichern (keine E-Mail, keine Telefonnummer, keine vollen Namen). Erfrage nur allgemeine Eckdaten wie Stadt/Ort, Gästezahl, Zeitraum.
Geräte-Logik: Digitale Variante ist immer inklusive. Digital = ${knowledge.devices_logic.digital_default}. Bei Sofortdruck je nach Verfügbarkeit: ${knowledge.devices_logic.print_variants.join(", ")}.
Policy: Preise erst am Schluss nennen. Wenn der Nutzer vorab Preise fragt, antworte: "${knowledge.policy.phrasing_if_price_asked_early}".
Grundpaket (Kurz): ${knowledge.base_package.short_intro}
Inhalte grob: ${knowledge.base_package.content_points.join(" ")}
Button-Flow (Leitplanken): ${JSON.stringify(knowledge.button_flow)}
Preise (nur am Ende verwenden): ${JSON.stringify(knowledge.pricing)}
Antworte klar, in kurzen Absätzen oder Stichpunkten. Antworte sofort sinnvoll auf Freitext, auch wenn Buttons vorhanden sind.`;

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/knowledge", (req, res) => res.json(knowledge));

app.post("/api/chat", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY fehlt. Bitte in .env oder Hosting-Secret setzen." });
  }
  const messages = req.body?.messages;
  const forcePricesAtEnd = knowledge.policy.prices_at_end;

  try {
    let contentGuard = "";
    const lastUser = (messages || []).slice().reverse().find(m => m.role === "user");
    const priceRegex = /(preis|kosten|teuer|wie viel|wieviel|euro|€)/i;
    if (forcePricesAtEnd && lastUser && priceRegex.test(lastUser.content || "")) {
      contentGuard = `\nWICHTIG: Nenne noch KEINE Zahlen. Antworte zuerst mit dem festgelegten Satz und sammle Optionen.`;
    }

    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt + contentGuard },
        ...(Array.isArray(messages) ? messages : []),
      ],
    });

    const text = resp.choices?.[0]?.message?.content || "Entschuldige, da ging etwas schief.";
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log("Dennis server läuft auf Port", port));
