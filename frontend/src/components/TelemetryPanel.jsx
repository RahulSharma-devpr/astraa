function fillClass(value, warnBelow, critBelow, invert = false) {
  const bad = invert ? value > warnBelow : value < warnBelow
  const worse = invert ? value > critBelow : value < critBelow
  if (worse) return 'fill-critical'
  if (bad) return 'fill-warning'
  return 'fill-nominal'
}

function Readout({ label, value, unit, percent, cls }) {
  return (
    <div className="readout">
      <div className="readout-top">
        <span className="readout-label">{label}</span>
        <span className="readout-value">
          {value}
          {unit}
        </span>
      </div>
      <div className="readout-bar-track">
        <div className={`readout-bar-fill ${cls}`} style={{ width: `${Math.min(100, Math.max(2, percent))}%` }} />
      </div>
    </div>
  )
}

export default function TelemetryPanel({ telemetry, activeFaults, onResolve, lang }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Telemetry</span>
      </div>
      <div className="panel-body">
        <Readout
          label="Battery Voltage"
          value={telemetry.batteryVoltage.toFixed(1)}
          unit="V"
          percent={((telemetry.batteryVoltage - 24) / (29.5 - 24)) * 100}
          cls={fillClass(telemetry.batteryVoltage, 26.5, 25.5)}
        />
        <Readout
          label="Battery Charge"
          value={telemetry.batteryPercent.toFixed(0)}
          unit="%"
          percent={telemetry.batteryPercent}
          cls={fillClass(telemetry.batteryPercent, 35, 15)}
        />
        <Readout
          label="Payload Temp"
          value={telemetry.payloadTemp.toFixed(1)}
          unit="°C"
          percent={((telemetry.payloadTemp + 10) / 65) * 100}
          cls={fillClass(telemetry.payloadTemp, 32, 40, true)}
        />
        <Readout
          label="Bus Temp"
          value={telemetry.busTemp.toFixed(1)}
          unit="°C"
          percent={((telemetry.busTemp + 10) / 55) * 100}
          cls={fillClass(telemetry.busTemp, 30, 38, true)}
        />
        <Readout
          label="Link Margin"
          value={telemetry.linkMargin.toFixed(1)}
          unit=" dB"
          percent={(telemetry.linkMargin / 20) * 100}
          cls={fillClass(telemetry.linkMargin, 4, 2)}
        />
        <Readout
          label="Signal Strength"
          value={telemetry.signalStrength.toFixed(0)}
          unit="%"
          percent={telemetry.signalStrength}
          cls={fillClass(telemetry.signalStrength, 40, 20)}
        />
        <Readout
          label="Fuel Remaining"
          value={telemetry.fuelPercent.toFixed(1)}
          unit="%"
          percent={telemetry.fuelPercent}
          cls={fillClass(telemetry.fuelPercent, 25, 10)}
        />
        <Readout
          label="Attitude Error"
          value={telemetry.attitudeError.toFixed(2)}
          unit="°"
          percent={100 - (telemetry.attitudeError / 2) * 100}
          cls={fillClass(telemetry.attitudeError, 0.5, 1, true)}
        />

        {activeFaults.length > 0 && (
          <div className="active-faults">
            <div className="panel-title" style={{ marginBottom: 10 }}>
              Active Alerts
            </div>
            {activeFaults.map((fault) => (
              <div key={fault.id} className={`fault-card ${fault.severity}`}>
                <div className="fault-title">{fault.title}</div>
                <div className="fault-cause">{fault.likelyCause}</div>
                <button onClick={() => onResolve(fault.id)}>Execute Recovery</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
