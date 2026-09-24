// ASTRAA anomaly & telemetry simulation engine.
// This stands in for the real downlink / sensor bus. Swap `tick()` for a
// websocket or serial feed from actual flight hardware when available.

export const SUBSYSTEMS = [
  { id: 'power', label: 'Power / EPS' },
  { id: 'thermal', label: 'Thermal Control' },
  { id: 'comms', label: 'Communications' },
  { id: 'propulsion', label: 'Propulsion' },
  { id: 'attitude', label: 'ADCS / Attitude' },
  { id: 'payload', label: 'Payload' },
]

export const FAULT_LIBRARY = [
  {
    id: 'battery-undervoltage',
    subsystem: 'power',
    severity: 'critical',
    title: 'Battery bus undervoltage',
    signature: 'Bus voltage dropped below 26.2V for > 3 telemetry frames.',
    likelyCause: 'Cell imbalance or unexpected high-draw load on Bus B.',
    recovery: [
      'Switch non-essential loads to safe mode.',
      'Isolate Bus B and reroute payload heater to Bus A.',
      'Command a slow charge cycle and monitor cell delta for 10 minutes.',
    ],
    recoveryHi: [
      'गैर-ज़रूरी लोड को सेफ मोड में डालें।',
      'Bus B को आइसोलेट करें और पेलोड हीटर को Bus A पर शिफ्ट करें।',
      'धीमी चार्जिंग साइकल चलाएं और 10 मिनट तक सेल डेल्टा मॉनिटर करें।',
    ],
  },
  {
    id: 'thermal-runaway',
    subsystem: 'thermal',
    severity: 'warning',
    title: 'Payload bay temperature rising',
    signature: 'Payload bay temp trending +0.4°C/min beyond nominal band.',
    likelyCause: 'Radiator louver stuck partially closed, or sun-pointing drift.',
    recovery: [
      'Command radiator louvers to full-open.',
      'Re-check attitude solution against sun vector.',
      'If trend continues past 2 minutes, shed payload duty cycle by 50%.',
    ],
    recoveryHi: [
      'रेडिएटर लूवर को पूरी तरह खोलने का कमांड भेजें।',
      'सूर्य वेक्टर के सापेक्ष attitude सॉल्यूशन दोबारा जांचें।',
      'अगर ट्रेंड 2 मिनट बाद भी जारी रहे तो पेलोड ड्यूटी साइकल 50% घटाएं।',
    ],
  },
  {
    id: 'comms-dropout',
    subsystem: 'comms',
    severity: 'warning',
    title: 'Downlink signal degradation',
    signature: 'Carrier-to-noise ratio fell below link margin threshold.',
    likelyCause: 'Antenna mispointing, ground-station handover, or ionospheric scintillation.',
    recovery: [
      'Trigger onboard antenna re-acquisition sequence.',
      'Fall back to omni antenna and low-rate beacon.',
      'Buffer telemetry to onboard black-box store until link recovers.',
    ],
    recoveryHi: [
      'ऑनबोर्ड एंटीना री-एक्विजिशन सीक्वेंस चलाएं।',
      'ओमनी एंटीना और लो-रेट बीकन पर स्विच करें।',
      'लिंक ठीक होने तक टेलीमेट्री को ऑनबोर्ड ब्लैक-बॉक्स में सेव करें।',
    ],
  },
  {
    id: 'propulsion-thruster-fault',
    subsystem: 'propulsion',
    severity: 'critical',
    title: 'Thruster valve response fault',
    signature: 'Commanded pulse vs. measured chamber pressure mismatch on Thruster 2.',
    likelyCause: 'Sticking valve solenoid or feed-line pressure drop.',
    recovery: [
      'Abort current burn and safe the propulsion subsystem.',
      'Switch to redundant thruster branch.',
      'Run valve cycling diagnostic before re-attempting the maneuver.',
    ],
    recoveryHi: [
      'मौजूदा बर्न को एबॉर्ट करें और प्रोपल्शन सिस्टम को सेफ करें।',
      'रिडंडेंट थ्रस्टर ब्रांच पर स्विच करें।',
      'माने्वर दोबारा करने से पहले वाल्व साइकलिंग डायग्नोस्टिक चलाएं।',
    ],
  },
  {
    id: 'adcs-drift',
    subsystem: 'attitude',
    severity: 'warning',
    title: 'Attitude drift beyond deadband',
    signature: 'Star tracker vs. gyro-propagated attitude diverging past 0.3°.',
    likelyCause: 'Reaction wheel saturation or star tracker blinding by sun/moon.',
    recovery: [
      'Initiate reaction wheel desaturation burn.',
      'Cross-check with sun sensor and switch reference if star tracker is blinded.',
      'Hold in coarse pointing mode until attitude solution re-converges.',
    ],
    recoveryHi: [
      'रिएक्शन व्हील डीसैचुरेशन बर्न शुरू करें।',
      'सन सेंसर से क्रॉस-चेक करें और स्टार ट्रैकर ब्लाइंड होने पर रेफरेंस बदलें।',
      'जब तक attitude सॉल्यूशन दोबारा कन्वर्ज न हो, coarse pointing मोड में रहें।',
    ],
  },
]

export function createInitialTelemetry() {
  return {
    batteryVoltage: 28.4,
    batteryPercent: 87,
    payloadTemp: 21.5,
    busTemp: 18.2,
    linkMargin: 12.4,
    fuelPercent: 76,
    attitudeError: 0.05,
    signalStrength: 92,
    subsystemHealth: Object.fromEntries(SUBSYSTEMS.map((s) => [s.id, 'nominal'])),
  }
}

function jitter(value, amount) {
  return value + (Math.random() - 0.5) * amount
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Advances the simulated telemetry by one tick. Occasionally injects a fault
// from FAULT_LIBRARY so the dashboard has something real to detect and react to.
export function tick(state, { faultChance = 0.045 } = {}) {
  const next = { ...state, subsystemHealth: { ...state.subsystemHealth } }

  next.batteryVoltage = clamp(jitter(state.batteryVoltage, 0.15), 24, 29.5)
  next.batteryPercent = clamp(jitter(state.batteryPercent, 0.6), 0, 100)
  next.payloadTemp = clamp(jitter(state.payloadTemp, 0.3), -10, 55)
  next.busTemp = clamp(jitter(state.busTemp, 0.2), -10, 45)
  next.linkMargin = clamp(jitter(state.linkMargin, 0.5), 0, 20)
  next.fuelPercent = clamp(state.fuelPercent - Math.random() * 0.01, 0, 100)
  next.attitudeError = clamp(jitter(state.attitudeError, 0.03), 0, 2)
  next.signalStrength = clamp(jitter(state.signalStrength, 1.2), 0, 100)

  let newFault = null
  const anyCritical = Object.values(next.subsystemHealth).includes('critical')
  if (!anyCritical && Math.random() < faultChance) {
    const fault = FAULT_LIBRARY[Math.floor(Math.random() * FAULT_LIBRARY.length)]
    next.subsystemHealth[fault.subsystem] = fault.severity
    newFault = fault
    applyFaultToTelemetry(next, fault)
  }

  return { state: next, newFault }
}

function applyFaultToTelemetry(state, fault) {
  switch (fault.id) {
    case 'battery-undervoltage':
      state.batteryVoltage = 25.4
      break
    case 'thermal-runaway':
      state.payloadTemp = 38.5
      break
    case 'comms-dropout':
      state.linkMargin = 1.2
      state.signalStrength = 22
      break
    case 'propulsion-thruster-fault':
      state.attitudeError = 0.9
      break
    case 'adcs-drift':
      state.attitudeError = 1.4
      break
    default:
      break
  }
}

export function clearFault(state, subsystemId) {
  return {
    ...state,
    subsystemHealth: { ...state.subsystemHealth, [subsystemId]: 'nominal' },
  }
}

export function overallStatus(subsystemHealth) {
  const values = Object.values(subsystemHealth)
  if (values.includes('critical')) return 'critical'
  if (values.includes('warning')) return 'warning'
  return 'nominal'
}
