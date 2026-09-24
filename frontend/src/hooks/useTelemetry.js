import { useEffect, useRef, useState, useCallback } from 'react'
import { createInitialTelemetry, tick, clearFault, overallStatus, FAULT_LIBRARY } from '../utils/anomalyEngine'

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export function useTelemetry({ intervalMs = 1200 } = {}) {
  const [telemetry, setTelemetry] = useState(createInitialTelemetry)
  const [activeFaults, setActiveFaults] = useState([])
  const [log, setLog] = useState([
    { id: 0, time: timestamp(), level: 'info', message: 'ASTRAA black-box recorder initialized. Mission clock started.' },
  ])
  const idRef = useRef(1)

  const pushLog = useCallback((level, message) => {
    setLog((prev) => [{ id: idRef.current++, time: timestamp(), level, message }, ...prev].slice(0, 200))
  }, [])

  const applyTick = useCallback(
    (options) => {
      setTelemetry((prev) => {
        const { state, newFault } = tick(prev, options)
        if (newFault) {
          setActiveFaults((faults) => {
            if (faults.some((f) => f.id === newFault.id)) return faults
            return [...faults, newFault]
          })
          pushLog(newFault.severity === 'critical' ? 'critical' : 'warning', `${newFault.title} — ${newFault.signature}`)
        }
        return state
      })
    },
    [pushLog]
  )

  useEffect(() => {
    const id = setInterval(() => applyTick(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, applyTick])

  const resolveFault = useCallback(
    (faultId) => {
      const fault = FAULT_LIBRARY.find((f) => f.id === faultId)
      if (!fault) return
      setTelemetry((prev) => clearFault(prev, fault.subsystem))
      setActiveFaults((prev) => prev.filter((f) => f.id !== faultId))
      pushLog('info', `${fault.title} — recovery sequence executed, subsystem restored to nominal.`)
    },
    [pushLog]
  )

  const injectRandomFault = useCallback(() => {
    applyTick({ faultChance: 1 })
  }, [applyTick])

  return {
    telemetry,
    activeFaults,
    log,
    status: overallStatus(telemetry.subsystemHealth),
    resolveFault,
    injectRandomFault,
    pushLog,
  }
}
