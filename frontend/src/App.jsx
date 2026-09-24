import { useCallback, useState } from 'react'
import Header from './components/Header'
import BlackBoxLog from './components/BlackBoxLog'
import DigitalTwin from './components/DigitalTwin'
import TelemetryPanel from './components/TelemetryPanel'
import AIAssistant from './components/AIAssistant'
import { useTelemetry } from './hooks/useTelemetry'
import { useVoiceAssistant } from './hooks/useVoiceAssistant'

export default function App() {
  const { telemetry, activeFaults, log, status, cloudStatus, resolveFault } = useTelemetry()
  const [transcript, setTranscript] = useState([
    {
      from: 'astraa',
      text: "ASTRAA online. Say \"Hey ASTRAA\" any time, or type a question below — I can report status, diagnose anomalies, and recommend recovery actions in English or Hindi.",
    },
  ])

  const onTranscriptEntry = useCallback((entry) => {
    setTranscript((prev) => [...prev, entry])
  }, [])

  const voice = useVoiceAssistant({ telemetry, activeFaults, log, onTranscriptEntry })

  return (
    <div className="app-shell">
      <Header status={status} cloudStatus={cloudStatus} />
      <div className="mission-grid">
        <BlackBoxLog log={log} />

        <div className="center-column">
          <DigitalTwin subsystemHealth={telemetry.subsystemHealth} />
        </div>

        <div className="right-column">
          <TelemetryPanel telemetry={telemetry} activeFaults={activeFaults} onResolve={resolveFault} />
          <AIAssistant voice={voice} transcript={transcript} />
        </div>
      </div>
    </div>
  )
}