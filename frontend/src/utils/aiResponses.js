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

  if (/bus temperature|avionics temperature|बस तापमान/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `एवियोनिक्स बस का तापमान ${telemetry.busTemp.toFixed(1)} डिग्री है। इसे सामान्य पेलोड तापमान से अलग मापा जाता है।`
        : `Avionics bus temperature is ${telemetry.busTemp.toFixed(1)} degrees. This is measured separately from the payload temperature.`,
      lastFaultId,
    }
  }

  if (/fuel|propellant|ईंधन|प्रणोदक/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `अनुमानित ईंधन ${telemetry.fuelPercent.toFixed(1)} प्रतिशत बचा है। यह सिमुलेशन रीडिंग है, वास्तविक टैंक माप नहीं।`
        : `Estimated fuel remaining is ${telemetry.fuelPercent.toFixed(1)} percent. This is a simulation reading, not a live tank measurement.`,
      lastFaultId,
    }
  }

  if (/attitude|orientation|pointing|姿态|दिशा|अभिविन्यास/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `दिशा त्रुटि ${telemetry.attitudeError.toFixed(2)} डिग्री है। यह मान बताता है कि अंतरिक्ष यान अपने लक्ष्य अभिविन्यास से कितना दूर है।`
        : `Attitude error is ${telemetry.attitudeError.toFixed(2)} degrees. It measures how far the spacecraft is from its commanded orientation.`,
      lastFaultId,
    }
  }

  if (/signal strength|signal percentage|सिग्नल शक्ति|सिग्नल स्तर/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `सिग्नल शक्ति ${telemetry.signalStrength.toFixed(0)} प्रतिशत है। लिंक मार्जिन उपलब्ध संचार गुणवत्ता का अलग माप है।`
        : `Signal strength is ${telemetry.signalStrength.toFixed(0)} percent. Link margin is a separate measure of communications quality.`,
      lastFaultId,
    }
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

  if (/solar array|solar panel|solar cell|सौर पैनल|सौर सरणी/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'सौर पैनल सूर्य के प्रकाश को विद्युत शक्ति में बदलते हैं। इस डेमो में उनका रंग और आकार दृश्य मॉडल है; बैटरी प्रतिशत सिमुलेटेड पावर स्थिति दिखाता है।'
        : 'Solar arrays convert sunlight into electrical power. In this demo their appearance is visual; the battery percentage is the simulated power readout.',
      lastFaultId,
    }
  }

  if (/radiator|thermal control|heat rejection|रेडिएटर|ताप नियंत्रण/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `रेडिएटर अतिरिक्त ऊष्मा बाहर निकालता है। अभी पेलोड ${telemetry.payloadTemp.toFixed(1)} डिग्री और बस ${telemetry.busTemp.toFixed(1)} डिग्री पर है।`
        : `The radiator rejects excess spacecraft heat. Current readings are ${telemetry.payloadTemp.toFixed(1)} degrees at the payload and ${telemetry.busTemp.toFixed(1)} degrees at the bus.`,
      lastFaultId,
    }
  }

  if (/thruster|engine|propulsion|nozzle|थ्रस्टर|इंजन|प्रणोदन/i.test(t)) {
    const propulsionFault = activeFaults.find((fault) => fault.subsystem === 'propulsion')
    return {
      text: propulsionFault
        ? fmtFault(propulsionFault, lang)
        : lang === 'hi'
          ? 'प्रणोदन निगरानी में कोई सक्रिय खराबी नहीं है। मॉडल के पीछे तीन मुख्य इंजन नोज़ल दिखाए गए हैं; अंतरिक्ष में प्रोपेलर का उपयोग नहीं होता।'
          : 'No propulsion fault is active. The model shows three rear engine nozzles; spacecraft use rocket thrust, not propellers.',
      lastFaultId: propulsionFault?.id ?? lastFaultId,
    }
  }

  if (/payload|instrument|पेलोड|उपकरण/i.test(t)) {
    return {
      text: lang === 'hi'
        ? `पेलोड वैज्ञानिक उपकरण है। इसका वर्तमान तापमान ${telemetry.payloadTemp.toFixed(1)} डिग्री है; इस डेमो में पेलोड रीडिंग सिमुलेटेड है।`
        : `The payload is the spacecraft's science instrument. Its current temperature is ${telemetry.payloadTemp.toFixed(1)} degrees; this demo uses simulated readings.`,
      lastFaultId,
    }
  }

  if (/subsystem|system health|health check|सब-सिस्टम|सिस्टम स्वास्थ्य/i.test(t)) {
    const names = {
      power: lang === 'hi' ? 'पावर' : 'power',
      thermal: lang === 'hi' ? 'थर्मल' : 'thermal',
      comms: lang === 'hi' ? 'संचार' : 'communications',
      propulsion: lang === 'hi' ? 'प्रणोदन' : 'propulsion',
      attitude: lang === 'hi' ? 'दिशा नियंत्रण' : 'attitude control',
      payload: lang === 'hi' ? 'पेलोड' : 'payload',
    }
    const summary = Object.entries(telemetry.subsystemHealth)
      .map(([id, health]) => `${names[id] || id}: ${health}`)
      .join(', ')
    return {
      text: lang === 'hi' ? `सब-सिस्टम स्थिति: ${summary}.` : `Subsystem health: ${summary}.`,
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

  if (/safe mode|safe state|emergency mode|सेफ मोड|सुरक्षित मोड/i.test(t)) {
    return {
      text: activeFaults.length
        ? lang === 'hi'
          ? `सेफ मोड पर विचार करें क्योंकि ${activeFaults.length} खराबी सक्रिय ${activeFaults.length === 1 ? 'है' : 'हैं'}। मैंने कोई कमांड निष्पादित नहीं की है।`
          : `${activeFaults.length} active fault${activeFaults.length === 1 ? '' : 's'} detected. Consider safe mode; no command has been executed.`
        : lang === 'hi'
          ? 'अभी कोई सक्रिय खराबी नहीं है। इस सिमुलेशन से सेफ-मोड कमांड निष्पादित नहीं की जा सकती।'
          : 'No active faults are detected. This simulation cannot execute a safe-mode command.',
      lastFaultId: activeFaults[0]?.id ?? lastFaultId,
    }
  }

  if (/spacecraft|satellite|parts|components|अंतरिक्ष यान|उपग्रह|भाग/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'मॉडल में सौर सरणी, संचार एंटीना, पेलोड उपकरण, ताप रेडिएटर, दिशा नियंत्रण जेट और मुख्य इंजन दिखाए गए हैं। रंगीन बिंदु हर सब-सिस्टम की स्थिति बताते हैं।'
        : 'The model includes solar arrays, a communications antenna, payload instrument, thermal radiator, attitude-control jets, and main engine nozzles. Colored markers show subsystem health.',
      lastFaultId,
    }
  }

  if (/debris|asteroid|collision|radar|मलबा|क्षुद्रग्रह|टक्कर/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'रडार दृश्य में सिमुलेटेड मलबा दिखता है। यह वास्तविक ट्रैकिंग डेटा नहीं है; दूरी या टक्कर का जोखिम मिशन सेंसर से सत्यापित नहीं किया जा सकता।'
        : 'The radar view shows simulated debris, not real tracking data. Actual distance and collision risk are not available from this demo telemetry.',
      lastFaultId,
    }
  }

  if (/orbit|orbital path|inclination|कक्षा|कक्षीय/i.test(t)) {
    return {
      text: lang === 'hi'
        ? 'कक्षा की ऊंचाई, झुकाव और वेग इस सिमुलेशन टेलीमेट्री में शामिल नहीं हैं। इसलिए मैं वास्तविक कक्षीय स्थिति की पुष्टि नहीं कर सकती।'
        : 'Orbit altitude, inclination, and velocity are not included in this simulation telemetry, so I cannot confirm a real orbital position.',
      lastFaultId,
    }
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
        ? 'मैं स्थिति, बैटरी, बस और पेलोड तापमान, ईंधन, दिशा त्रुटि, सिग्नल शक्ति, सब-सिस्टम स्वास्थ्य, सौर पैनल, रेडिएटर, थ्रस्टर, मलबा दृश्य, कक्षा डेटा, खराबी, रिकवरी और ब्लैक-बॉक्स लॉग के बारे में जवाब दे सकती हूं।'
        : 'Ask about status, battery, bus or payload temperature, fuel, attitude error, signal strength, subsystem health, solar arrays, radiators, thrusters, debris, orbit data, faults, recovery, or black-box events.',
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