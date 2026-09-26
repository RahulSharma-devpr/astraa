# ASTRAA
**Autonomous Spacecraft Threat & Recovery AI Assistant**
SIH 2026 · Theme: Student Innovation in Space Technology

ASTRAA is a spacecraft "black box" cockpit: a live digital twin, a fault/black-box
recorder, and a voice-driven recovery advisor, wrapped in one mission-control
dashboard. This repo is a fully working front-end prototype — everything runs
in the browser with a simulated telemetry feed, so you can demo it with no
backend or real hardware.

## What's inside

- **Digital twin** — an animated SVG spacecraft (solar panels, antenna, thrusters,
  radiator, reaction wheel, payload) whose subsystem nodes glow cyan / amber / red
  based on live simulated health.
- **Proximity radar** — a sweeping radar with simulated tracked objects, flags
  ones that look like a collision risk.
- **Black-box recorder** — a timestamped, append-only event log of every fault
  and recovery action, exactly like a flight data recorder.
- **Telemetry panel** — battery, thermal, comms, fuel, and attitude readouts
  with live bar gauges, plus one-click "Execute Recovery" on active faults.
- **ASTRAA voice assistant** — say **"Hey ASTRAA"** or **"Wake up ASTRAA"** and
  ask it things like "status report", "diagnose anomaly", or "recommend
  recovery" — in **English or Hindi**. It answers out loud with a female voice
  and also logs the conversation as chat bubbles. A text box works as a
  fallback wherever the mic API isn't available.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in **Chrome or
Edge** — the voice features use the Web Speech API, which only ships in
Chromium browsers today. The dashboard itself (twin, radar, telemetry, log,
text chat) works in any modern browser; only the mic/wake-word path needs
Chromium.

The browser will ask for microphone permission the first time you click the
mic button — allow it, then say "Hey ASTRAA" followed by your question.

## How the simulation works

`src/utils/anomalyEngine.js` is the stand-in for your real downlink. Every
~1.2 seconds it nudges telemetry values with small random jitter, and every
so often injects one fault from a small fault library (battery undervoltage,
thermal runaway, comms dropout, thruster valve fault, attitude drift). Each
fault carries a likely cause and a step-by-step recovery procedure in both
English and Hindi — this is what the AI assistant reads back to you and what
the "Execute Recovery" button resolves.

**To wire this up to a real spacecraft / satellite feed**, replace the `tick()`
calls in `src/hooks/useTelemetry.js` with a WebSocket or serial subscription
that pushes real telemetry frames, and feed real anomaly-detector output into
`setActiveFaults` the same way faults are injected here.

## How the AI assistant works

Chat requests go through `/api/astraa` to the backend, which calls OpenRouter
without exposing the API key to the browser. Set `OPENROUTER_API_KEY` in
`backend/.env` for local use; the Vite dev server proxies `/api` to the
backend on port 5000. GitHub Pages hosts only the frontend, so deploy the
backend separately. The root `render.yaml` can create it on Render; set
`OPENROUTER_API_KEY` as a secret in the Render service environment. Then add a
GitHub Actions repository variable named `VITE_BACKEND_URL` with the backend
endpoint, for example `https://your-service.onrender.com/api/astraa`, and
rerun the Pages deployment workflow. The Pages workflow embeds this URL during
the frontend build. The model receives the user's question, current telemetry,
active faults, and recent black-box events, then returns a spoken reply and an
optional recovery action. `src/hooks/useVoiceAssistant.js` handles wake-word
detection, language detection, and bilingual text-to-speech. `src/utils/
aiResponses.js` remains the local intent-matching fallback when the backend
cannot be reached.

## Project structure

```
src/
  components/
    Header.jsx           mission clock + overall status pill
    DigitalTwin.jsx       animated spacecraft SVG
    RadarDisplay.jsx      proximity radar sweep
    BlackBoxLog.jsx       black-box event log
    TelemetryPanel.jsx    live gauges + active fault cards
    AIAssistant.jsx       chat log, mic button, quick actions
  hooks/
    useTelemetry.js       simulation tick, fault state, black-box log
    useVoiceAssistant.js  wake word, speech recognition, speech synthesis
  utils/
    anomalyEngine.js      telemetry simulation + fault library
    aiResponses.js        bilingual intent-matching "AI" advisor
```

## Talking points for your SIH pitch

- **Black box**: every anomaly and every recovery action is timestamped and
  kept in `log` — this is your post-mission investigation trail, the same
  idea as a flight data recorder, just for a spacecraft.
- **Digital twin**: the SVG model isn't decorative — each glowing node is
  bound to real subsystem health state, so judges watching the screen see
  the same fault the AI is about to talk about.
- **Recovery advisor**: recovery steps are structured data (`FAULT_LIBRARY`),
  not free text — this is what lets you swap in a real model later without
  re-architecting anything.
- **Bilingual, voice-first**: ground-station engineers can query it hands-free
  in Hindi or English during an active anomaly, which matters when their
  hands are busy on other consoles.

## Next steps if you have more time before the demo

1. Swap the simulated `tick()` engine for real/replayed satellite telemetry.
2. Replace `answerQuery()` with a real LLM call for open-ended questions.
3. Add a "mission replay" mode that scrubs through black-box history.
4. Persist the black-box log (e.g. to IndexedDB or a small backend) so it
   survives a page reload — real black boxes must survive worse than that.
