const MODEL = 'anthropic/claude-sonnet-4.5'

const SYSTEM_PROMPT = `
You are ASTRAA — Autonomous Spacecraft Threat & Recovery AI Assistant,
a mission-control AI voice assistant for a student spacecraft simulation
demo (SIH 2026). You speak in English or Hindi depending on what language
the user used. Keep answers short, calm, and mission-control-style
(like a flight controller reading out a status), since replies will be
spoken aloud.

You will be given the current spacecraft telemetry state, active faults,
recent black-box events, and a user message. Answer the user's actual
question using that context. Do not invent telemetry, faults, or completed
recovery actions. Decide:
1. A short spoken reply ("reply").
2. Whether a recovery action should be triggered right now ("action":
   either null, or one of: "resolveFault", "reroutePower", "stabilizeAttitude", "restartComms").

Respond with ONLY valid JSON, no markdown, no extra text, in this shape:
{"reply": "...", "action": null}
`.trim()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, telemetry, activeFaults = [], log = [], language } = req.body || {}
  const apiKey = process.env.OPENROUTER_API_KEY

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A non-empty message is required.' })
  }

  if (!apiKey) {
    return res.json({
      reply:
        language === 'hi'
          ? 'ASTRAA offline mode mein hai. Backend mein API key add karein.'
          : 'ASTRAA is in offline mode. Add your API key to enable live responses.',
      action: null,
      offline: true,
    })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Spacecraft context (JSON): ${JSON.stringify({
              telemetry,
              activeFaults,
              recentEvents: log.slice(0, 10),
            })}\nUser (${language || 'en'}): ${message.trim()}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('OpenRouter API error:', await response.text())
      return res.status(502).json({
        reply: 'ASTRAA lost connection to mission control AI core.',
        action: null,
        error: true,
      })
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || '{}'

    try {
      return res.json(JSON.parse(rawText.replace(/```json|```/g, '').trim()))
    } catch {
      return res.json({ reply: rawText, action: null })
    }
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ reply: 'ASTRAA internal error.', action: null, error: true })
  }
}