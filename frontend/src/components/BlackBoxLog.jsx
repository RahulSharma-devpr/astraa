export default function BlackBoxLog({ log }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Black Box Recorder</span>
      </div>
      <div className="panel-body">
        {log.map((entry) => (
          <div key={entry.id} className={`log-entry level-${entry.level}`}>
            <span className="log-time">{entry.time.slice(11)}</span>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
