import { useEffect, useRef, useState } from 'react'

export default function AIAssistant({ voice, transcript }) {
  const [draft, setDraft] = useState('')
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0 })
  }, [transcript])

  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    voice.askDirectly(draft.trim())
    setDraft('')
  }

  return (
    <div className="panel assistant-panel" style={{ borderBottom: 'none' }}>
      <div className="panel-header">
        <span className="panel-title">ASTRAA Assistant</span>
      </div>

      {!voice.supported && (
        <div className="unsupported-note">
          Voice recognition isn't available in this browser. Use Chrome/Edge for hands-free "Hey ASTRAA" mode — the
          text box below still works everywhere.
        </div>
      )}

      <div className="mic-row">
        <button
          className={`mic-button ${voice.listening ? 'listening' : ''} ${voice.awake ? 'awake' : ''}`}
          onClick={voice.micEnabled ? voice.disableMic : voice.enableMic}
          disabled={!voice.supported}
          aria-label={voice.micEnabled ? 'Disable microphone' : 'Enable microphone'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M6 11a6 6 0 0012 0M12 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="mic-status">
          {voice.micEnabled ? (
            <>
              <strong>{voice.awake ? 'Listening for your command…' : 'Say "Hey ASTRAA" or "Wake up ASTRAA"'}</strong>
              <br />
              {voice.speaking
                ? 'Speaking…'
                : voice.thinking
                  ? 'Thinking…'
                  : voice.lastHeard
                    ? `Heard: "${voice.lastHeard}"`
                    : 'Mic is on, standing by.'}
            </>
          ) : (
            'Mic is off — click to enable hands-free mode.'
          )}
        </div>
      </div>

      <div className="quick-actions">
        <button onClick={() => voice.askDirectly('status report')}>Status report</button>
        <button onClick={() => voice.askDirectly('diagnose anomaly')}>Diagnose anomaly</button>
        <button onClick={() => voice.askDirectly('recommend recovery')}>Recovery plan</button>
        <button onClick={() => voice.askDirectly('स्टेटस रिपोर्ट दो')}>हिंदी स्टेटस</button>
      </div>

      <div className="chat-log" ref={logRef} style={{ flexDirection: 'column-reverse' }}>
        {voice.thinking && (
          <div className="chat-bubble astraa typing">
            <span className="who">ASTRAA</span>
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        {[...transcript].reverse().map((m, i) => (
          <div key={i} className={`chat-bubble ${m.from === 'user' ? 'user' : 'astraa'}`}>
            <span className="who">{m.from === 'user' ? 'You' : 'ASTRAA'}</span>
            {m.text}
          </div>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask ASTRAA — English or Hindi…"
          aria-label="Message ASTRAA"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}