import { useEffect, useState } from 'react'

export default function Header({ status }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const utc = now.toISOString().slice(11, 19)
  const statusLabel = { nominal: 'All Systems Nominal', warning: 'Anomaly Detected', critical: 'Critical Fault' }[status]

  return (
    <header className="mission-header">
      <div className="mission-brand">
        <span className="mark">
          ASTR<span>AA</span>
        </span>
        <span className="tagline">Autonomous Spacecraft Threat &amp; Recovery AI Assistant</span>
      </div>
      <div className="mission-meta">
        <span>
          MET <span className="mission-clock">{utc}</span> UTC
        </span>
        <span className={`status-pill status-${status}`}>
          <span className="status-dot" />
          {statusLabel}
        </span>
      </div>
    </header>
  )
}
