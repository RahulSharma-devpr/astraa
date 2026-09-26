// Local trigger-and-response rules keep chat available without an API.

const HINDI_HINT = /[\u0900-\u097F]|kya|kaise|batao|status\s*kya|thik|kharabi|theek|kro|karo/i

export function detectLanguage(text) {
  return HINDI_HINT.test(text) ? 'hi' : 'en'
}

function fmtFault(fault, lang) {
  const steps = lang === 'hi' ? fault.recoveryHi : fault.recovery
  const numbered = steps.map((s, i) => `${i + 1}. ${s}`).join(' ')
  if (lang === 'hi') {
    return `सक्रिय समस्या: ${fault.title}. संभावित कारण: ${fault.likelyCause} रिकवरी: ${numbered}`
  }
  return `Active issue: ${fault.title}. Likely cause: ${fault.likelyCause} Recommended recovery: ${numbered}`
}

function statusReport(telemetry, activeFaults, lang) {
  const health = activeFaults.length === 0 ? (lang === 'hi' ? 'सामान्य' : 'nominal') : (lang === 'hi' ? 'ध्यान देने योग्य' : 'degraded')
  if (lang === 'hi') {
    return `मिशन स्थिति ${health} है। बैटरी ${telemetry.batteryPercent.toFixed(0)} प्रतिशत, पेलोड तापमान ${telemetry.payloadTemp.toFixed(1)} डिग्री, लिंक मार्जिन ${telemetry.linkMargin.toFixed(1)} डेसिबल। सक्रिय अलर्ट: ${activeFaults.length}.`
  }
  return `Mission status is ${health}. Battery at ${telemetry.batteryPercent.toFixed(0)} percent, payload temperature ${telemetry.payloadTemp.toFixed(1)} degrees, link margin ${telemetry.linkMargin.toFixed(1)} decibels. Active alerts: ${activeFaults.length}.`
}

/**
 * @returns {{ text: string, lastFaultId: string|null }}
 */
export function answerQuery({ text, lang, telemetry, activeFaults, log = [], context = {} }) {
  const t = text.toLowerCase()
  const lastFaultId = context.lastFaultId ?? null

  const isFollowUp = /\b(it|that one|isse|ise|uska|isko)\b/i.test(t)
  if (isFollowUp && context.lastFaultId) {
    const fault = activeFaults.find((f) => f.id === context.lastFaultId)
    if (fault) return { text: fmtFault(fault, lang), lastFaultId: fault.id }
  }

  if (/battery|charge|voltage|बैटरी|चार्ज/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `बैटरी चार्ज ${telemetry.batteryPercent.toFixed(0)} प्रतिशत है।`
        : `Battery charge is ${telemetry.batteryPercent.toFixed(0)} percent.`,
      lastFaultId,
    }
  }

  if (/temperature|thermal|heat|तापमान|गर्मी/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `पेलोड तापमान ${telemetry.payloadTemp.toFixed(1)} डिग्री है।`
        : `Payload temperature is ${telemetry.payloadTemp.toFixed(1)} degrees.`,
      lastFaultId,
    }
  }

  if (/link|signal|communication|comms|antenna|लिंक|सिग्नल|संचार/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `संचार लिंक मार्जिन ${telemetry.linkMargin.toFixed(1)} डेसिबल है।`
        : `Communications link margin is ${telemetry.linkMargin.toFixed(1)} decibels.`,
      lastFaultId,
    }
  }

  if (/status|report|halat|स्थिति|स्टेटस/i.test(t)) {
    return { text: statusReport(telemetry, activeFaults, lang), lastFaultId }
  }

  if (/diagnos|anomaly|problem|fault|alert|issue|kharabi|खराबी|galat|glt|अलर्ट|समस्या/i.test(t)) {
    if (activeFaults.length === 0) {
      return {
        text: lang === 'hi' ? 'कोई सक्रिय खराबी नहीं है। सभी सिस्टम सामान्य हैं।' : 'No active faults. All systems are nominal.',
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
      lastFaultId,
    }
  }

  if (/\b(hello|hi|hey|namaste)\b|नमस्ते/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'नमस्ते, मैं ASTRAA हूं। स्टेटस, बैटरी, तापमान, संचार या रिकवरी के बारे में पूछें।'
        : 'Hello, I am ASTRAA. Ask me about status, battery, temperature, communications, faults, or recovery.',
      lastFaultId,
    }
  }

  if (/help|what can you do|commands|मदद|क्या पूछ/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'मैं मिशन स्थिति, बैटरी, तापमान, संचार लिंक, सक्रिय खराबी, रिकवरी और ब्लैक-बॉक्स लॉग बता सकती हूं।'
        : 'I can report mission status, battery, temperature, communications, active faults, recovery steps, and recent black-box events.',
      lastFaultId,
    }
  }

  return {
    text: lang === 'hi'
      ? 'यह अनुरोध समझ नहीं आया। मदद, स्टेटस, बैटरी, तापमान, खराबी या रिकवरी पूछें।'
      : 'I did not recognize that request. Try help, status, battery, temperature, diagnose faults, or recovery.',
    lastFaultId,
  }
}