const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api/astraa'

/**
 * Calls the real ASTRAA backend (server/server.js), which proxies to
 * OpenRouter so the browser never sees the API key.
 * @returns {Promise<{ reply: string, action: string|null, faultId: string|null }>}
 */
export async function askAstraaAI({ message, lang, telemetry, activeFaults, log }) {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, telemetry, activeFaults, log, language: lang }),
  })
  if (!res.ok) throw new Error(`Backend responded ${res.status}`)
  return res.json()
}