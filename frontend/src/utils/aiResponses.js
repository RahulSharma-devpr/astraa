// Lightweight intent matcher standing in for a real model call.
// Swap `answerQuery` to call an LLM (Anthropic API, etc.) once you have a
// backend key — the function signature is deliberately model-agnostic.
// It now also returns `lastFaultId` so the caller can remember what was
// last discussed and understand short follow-ups like "fix it".

const HINDI_HINT = /[\u0900-\u097F]|kya|kaise|batao|status\s*kya|thik|kharabi|theek|kro|karo/i

export function detectLanguage(text) {
  return HINDI_HINT.test(text) ? 'hi' : 'en'
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmtFault(fault, lang) {
  const steps = lang === 'hi' ? fault.recoveryHi : fault.recovery
  const numbered = steps.map((s, i) => `${i + 1}. ${s}`).join(' ')
  if (lang === 'hi') {
    const lead = pick([
      `मुझे एक समस्या मिली है — ${fault.title}.`,
      `सावधान, ${fault.title} हो रहा है।`,
      `यह देखिए: ${fault.title}.`,
    ])
    return `${lead} संभावित कारण: ${fault.likelyCause} सुझाई गई रिकवरी: ${numbered}`
  }
  const lead = pick([
    `I'm tracking an issue — ${fault.title}.`,
    `Here's what I found: ${fault.title}.`,
    `Flagging this: ${fault.title}.`,
  ])
  return `${lead} Likely cause: ${fault.likelyCause} Recommended recovery: ${numbered}`
}

function statusReport(telemetry, activeFaults, lang) {
  const health = activeFaults.length === 0 ? (lang === 'hi' ? 'सामान्य' : 'nominal') : (lang === 'hi' ? 'ध्यान देने योग्य' : 'degraded')
  if (lang === 'hi') {
    const lead = pick(['मिशन स्टेटस अपडेट —', 'यह रहा स्टेटस —', 'ठीक है, स्टेटस इस प्रकार है —'])
    return `${lead} स्थिति ${health} है। बैटरी ${telemetry.batteryPercent.toFixed(0)} प्रतिशत, पेलोड तापमान ${telemetry.payloadTemp.toFixed(1)} डिग्री, लिंक मार्जिन ${telemetry.linkMargin.toFixed(1)} डेसिबल। सक्रिय अलर्ट: ${activeFaults.length}.`
  }
  const lead = pick(['Mission status update —', "Here's the current picture —", 'All right, current status —'])
  return `${lead} status is ${health}. Battery at ${telemetry.batteryPercent.toFixed(0)} percent, payload temperature ${telemetry.payloadTemp.toFixed(1)} degrees, link margin ${telemetry.linkMargin.toFixed(1)} decibels. Active alerts: ${activeFaults.length}.`
}

/**
 * @returns {{ text: string, lastFaultId: string|null }}
 */
export function answerQuery({ text, lang, telemetry, activeFaults, log, context = {} }) {
  const t = text.toLowerCase()

  const isFollowUp = /\b(it|that one|isse|ise|uska|isko)\b/i.test(t)
  if (isFollowUp && context.lastFaultId) {
    const fault = activeFaults.find((f) => f.id === context.lastFaultId)
    if (fault) return { text: fmtFault(fault, lang), lastFaultId: fault.id }
  }

  if (/status|report|halat|स्थिति/i.test(t)) {
    return { text: statusReport(telemetry, activeFaults, lang), lastFaultId: context.lastFaultId ?? null }
  }

  if (/diagnos|anomaly|problem|kharabi|खराबी|galat|glt/i.test(t)) {
    if (activeFaults.length === 0) {
      return {
        text: lang === 'hi'
          ? pick(['फिलहाल कोई सक्रिय एनोमली नहीं मिली, सब कुछ nominal है।', 'सब सिस्टम ठीक हैं, कोई अलर्ट नहीं मिला।'])
          : pick(['No active anomalies right now — everything is nominal.', "All clear, I'm not tracking any faults at the moment."]),
        lastFaultId: null,
      }
    }
    return { text: activeFaults.map((f) => fmtFault(f, lang)).join(' '), lastFaultId: activeFaults[0].id }
  }

  if (/recover|fix|solve|thik karo|ठीक करो|repair/i.test(t)) {
    if (activeFaults.length === 0) {
      return {
        text: lang === 'hi'
          ? 'रिकवर करने के लिए कोई सक्रिय फॉल्ट नहीं है, स्पेसक्राफ्ट स्थिर है।'
          : 'Nothing to recover from right now — the spacecraft is stable.',
        lastFaultId: null,
      }
    }
    return { text: fmtFault(activeFaults[0], lang), lastFaultId: activeFaults[0].id }
  }

  if (/log|black\s*box|history|itihas|इतिहास/i.test(t)) {
    const recent = log.slice(0, 3).map((e) => e.message).join('; ')
    return {
      text: lang === 'hi'
        ? `ब्लैक बॉक्स की हाल की एंट्री: ${recent || 'कोई हाल की घटना दर्ज नहीं।'}`
        : `Recent black-box entries: ${recent || 'no recent events logged.'}`,
      lastFaultId: context.lastFaultId ?? null,
    }
  }

  if (/hello|hi astraa|namaste|नमस्ते/i.test(t)) {
    return {
      text: lang === 'hi'
        ? pick(['नमस्ते, मैं ASTRAA हूं। बताइए, क्या जानना चाहेंगे?', 'जी नमस्ते, मैं सुन रही हूं।'])
        : pick(["Hello, I'm ASTRAA. What would you like to know?", "Hi there — I'm listening."]),
      lastFaultId: context.lastFaultId ?? null,
    }
  }

  return {
    text: lang === 'hi'
      ? 'मुझे यह समझ नहीं आया। आप कह सकते हैं: "स्टेटस रिपोर्ट दो", "एनोमली डायग्नोज़ करो", या "रिकवरी सुझाओ"।'
      : 'I didn\'t quite catch that. Try: "status report", "diagnose anomaly", or "recommend recovery".',
    lastFaultId: context.lastFaultId ?? null,
  }
}