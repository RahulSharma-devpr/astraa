import { useCallback, useEffect, useRef, useState } from 'react'
import { answerQuery, detectLanguage } from '../utils/aiResponses'
import { askAstraaAI } from '../utils/llmClient'

const WAKE_PATTERNS = [/hey\s*astraa/i, /wake\s*up\s*astraa/i, /uth\s*jao\s*astraa/i, /namaste\s*astraa/i]

function hasWakeWord(text) {
  return WAKE_PATTERNS.some((re) => re.test(text))
}

function stripWakeWord(text) {
  let out = text
  WAKE_PATTERNS.forEach((re) => {
    out = out.replace(re, '')
  })
  return out.trim()
}

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices() || []
  const wantHindi = lang === 'hi'
  const langPrefix = wantHindi ? 'hi' : 'en'

  const female = voices.find(
    (v) => v.lang.toLowerCase().startsWith(langPrefix) && /female|woman|zira|samantha|google.*(hi|in)/i.test(v.name)
  )
  if (female) return female
  const anyInLang = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))
  if (anyInLang) return anyInLang
  return voices[0] || null
}

export function useVoiceAssistant({ telemetry, activeFaults, log, onTranscriptEntry }) {
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [awake, setAwake] = useState(false)
  const [lastHeard, setLastHeard] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)

  const recognitionRef = useRef(null)
  const awakeTimeoutRef = useRef(null)
  const contextRef = useRef({ lastFaultId: null })
  const stateRef = useRef({ telemetry, activeFaults, log })
  stateRef.current = { telemetry, activeFaults, log }

  const speak = useCallback((text, lang) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utter.pitch = 1.05
    utter.rate = 1
    const voice = pickVoice(lang)
    if (voice) utter.voice = voice
    utter.onstart = () => setSpeaking(true)
    utter.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
  }, [])

  const handleCommand = useCallback(
    async (rawText) => {
      const lang = detectLanguage(rawText)
      setThinking(true)

      try {
        const { telemetry, activeFaults, log } = stateRef.current
        const data = await askAstraaAI({
          message: rawText,
          lang,
          telemetry,
          activeFaults,
          log,
        })

        const reply = data?.reply || (lang === 'hi' ? 'मुझे जवाब नहीं मिला।' : "I couldn't generate a response.")
        contextRef.current = { lastFaultId: data?.faultId ?? contextRef.current.lastFaultId ?? null }
        setThinking(false)
        onTranscriptEntry?.({ from: 'astraa', text: reply, lang })
        speak(reply, lang)
        return
      } catch (error) {
        console.error('ASTRAA backend request failed:', error)
      }

      const delay = 350 + Math.random() * 450
      setTimeout(() => {
        const { telemetry, activeFaults, log } = stateRef.current
        const { text: reply, lastFaultId } = answerQuery({
          text: rawText,
          lang,
          telemetry,
          activeFaults,
          log,
          context: contextRef.current,
        })
        contextRef.current = { lastFaultId }
        setThinking(false)
        onTranscriptEntry?.({ from: 'astraa', text: reply, lang })
        speak(reply, lang)
      }, delay)
    },
    [onTranscriptEntry, speak]
  )

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim()
      if (!transcript) return
      setLastHeard(transcript)

      if (!awake) {
        if (hasWakeWord(transcript)) {
          setAwake(true)
          onTranscriptEntry?.({ from: 'user', text: transcript, lang: detectLanguage(transcript) })
          const remainder = stripWakeWord(transcript)
          const lang = detectLanguage(transcript)
          if (remainder.length > 2) {
            handleCommand(remainder)
          } else {
            const greeting = lang === 'hi' ? 'जी, मैं सुन रही हूं। बताइए।' : "I'm listening. Go ahead."
            onTranscriptEntry?.({ from: 'astraa', text: greeting, lang })
            speak(greeting, lang)
          }
          clearTimeout(awakeTimeoutRef.current)
          awakeTimeoutRef.current = setTimeout(() => setAwake(false), 12000)
        }
        return
      }

      onTranscriptEntry?.({ from: 'user', text: transcript, lang: detectLanguage(transcript) })
      handleCommand(transcript)
      clearTimeout(awakeTimeoutRef.current)
      awakeTimeoutRef.current = setTimeout(() => setAwake(false), 12000)
    }

    recognition.onerror = () => {}

    recognition.onend = () => {
      if (micEnabled) {
        try {
          recognition.start()
        } catch {
          /* already started */
        }
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition
    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled, awake, handleCommand, onTranscriptEntry, speak])

  const enableMic = useCallback(() => {
    if (!recognitionRef.current) return
    setMicEnabled(true)
    setListening(true)
    try {
      recognitionRef.current.start()
    } catch {
      /* already started */
    }
  }, [])

  const disableMic = useCallback(() => {
    setMicEnabled(false)
    setListening(false)
    recognitionRef.current?.stop()
  }, [])

  const askDirectly = useCallback(
    (text) => {
      onTranscriptEntry?.({ from: 'user', text, lang: detectLanguage(text) })
      handleCommand(text)
    },
    [handleCommand, onTranscriptEntry]
  )

  return {
    supported,
    listening,
    awake,
    lastHeard,
    speaking,
    thinking,
    micEnabled,
    enableMic,
    disableMic,
    askDirectly,
  }
}