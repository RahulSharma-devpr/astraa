import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "anthropic/claude-sonnet-4.5";

const SYSTEM_PROMPT = `
You are ASTRAA — Autonomous Spacecraft Threat & Recovery AI Assistant,
a mission-control AI voice assistant for a student spacecraft simulation
demo (SIH 2026). You speak in English or Hindi depending on what language
the user used. Keep answers short, calm, and mission-control-style
(like a flight controller reading out a status), since replies will be
spoken aloud.

You will be given the current spacecraft telemetry state and a user
message. Decide:
1. A short spoken reply ("reply").
2. Whether a recovery action should be triggered right now ("action":
   either null, or one of: "resolveFault", "reroutePower", "stabilizeAttitude", "restartComms").

Respond with ONLY valid JSON, no markdown, no extra text, in this shape:
{"reply": "...", "action": null}
`.trim();

app.post("/api/astraa", async (req, res) => {
  try {
    const { message, telemetry, language } = req.body;

    if (!API_KEY) {
      return res.json({
        reply:
          language === "hi"
            ? "ASTRAA offline mode mein hai. Backend mein API key add karein."
            : "ASTRAA is in offline mode. Add your API key to the backend to enable live responses.",
        action: null,
        offline: true,
      });
    }

    const userContent = `Telemetry: ${JSON.stringify(telemetry)}\nUser (${
      language || "en"
    }): ${message}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API error:", errText);
      return res.status(502).json({
        reply: "ASTRAA lost connection to mission control AI core.",
        action: null,
        error: true,
      });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { reply: rawText, action: null };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ reply: "ASTRAA internal error.", action: null, error: true });
  }
});

app.listen(PORT, () => {
  console.log(`ASTRAA backend running on http://localhost:${PORT}`);
});