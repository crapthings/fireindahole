import { useCallback, useEffect, useRef, useState } from 'react'

// Measured PCM onset / peak: boom 50.5 / 67.4 ms, voice 52.7 / 145.6 ms.
// Keep a few milliseconds before the onset; don't trim speech to its loudest sample.
const playback = { throw: { offset: 0.047, end: 1.74 }, boom: { offset: 0.047, end: 0.28 }, body: { offset: 0, end: 1.749 }, ground1: { offset: 0, end: 0.759 }, ground2: { offset: 0, end: 0.648 }, ground3: { offset: 0, end: 1.377 } }
const audioFiles = { throw: 'fire-in-the-hole.wav', boom: 'dry-fart.wav', body: 'body-impact.wav', ground1: 'ground-boing-1.wav', ground2: 'ground-boing-2.wav', ground3: 'ground-boing-3.wav' }

export function useGameAudio (game) {
  const engine = useRef(null)
  const [loadProgress, setLoadProgress] = useState(0)
  useEffect(() => {
    setLoadProgress(0)
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      setLoadProgress(1)
      return
    }
    const context = new AudioContext({ latencyHint: 'interactive' })
    const master = context.createGain()
    master.gain.value = game.current.muted ? 0 : 1
    master.connect(context.destination)
    const controller = new AbortController()
    const state = { context, master, buffers: {}, sources: {}, disposed: false }
    engine.current = state
    let completed = 0
    state.ready = Promise.all(Object.entries(audioFiles).map(async ([kind, file]) => {
      const request = new AbortController()
      const abort = () => request.abort()
      controller.signal.addEventListener('abort', abort, { once: true })
      let timer
      try {
        const buffer = await Promise.race([
          (async () => {
            const response = await fetch(`${import.meta.env.BASE_URL}audio/${file}`, { signal: request.signal })
            if (!response.ok) throw new Error(`Audio ${file}: ${response.status}`)
            return context.decodeAudioData(await response.arrayBuffer())
          })(),
          new Promise((resolve, reject) => {
            timer = setTimeout(() => {
              request.abort()
              reject(new Error(`Audio ${file}: loading timed out`))
            }, 8000)
          })
        ])
        if (!state.disposed) state.buffers[kind] = buffer
      } catch (error) {
        if (!state.disposed) console.warn('Sound effect could not load', error)
      } finally {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', abort)
        if (!state.disposed) setLoadProgress(++completed / Object.keys(audioFiles).length)
      }
    }))
    return () => {
      state.disposed = true
      controller.abort()
      context.close().catch(() => {})
      if (engine.current === state) engine.current = null
    }
  }, [game])

  const sound = useCallback(function playSound (kind) {
    const state = engine.current
    if (!state || state.disposed || game.current.muted) return
    const { context, master } = state
    if (context.state !== 'running') {
      const requested = performance.now()
      context.resume().then(() => {
        if (kind !== 'wake' && performance.now() - requested < 100 && engine.current === state) playSound(kind)
      }).catch(() => {})
      return
    }
    if (kind === 'wake') return
    let sample = kind
    if (kind === 'ground') {
      const available = ['ground1', 'ground2', 'ground3'].filter(key => state.buffers[key])
      const choices = available.filter(key => key !== state.lastGround)
      const pool = choices.length ? choices : available
      if (!pool.length) return
      sample = pool[Math.floor(Math.random() * pool.length)]
      state.lastGround = sample
    }
    if (playback[sample]) {
      // Preload during mount; never queue a late effect behind network/decode work.
      if (!state.buffers[sample]) return
      state.sources[kind]?.stop()
      const source = context.createBufferSource()
      source.buffer = state.buffers[sample]
      const envelope = context.createGain()
      const { offset, end } = playback[sample]
      const duration = Math.min(end, source.buffer.duration) - offset
      envelope.gain.setValueAtTime(0, context.currentTime)
      envelope.gain.linearRampToValueAtTime(1, context.currentTime + 0.003)
      envelope.gain.setValueAtTime(1, context.currentTime + duration - 0.005)
      envelope.gain.linearRampToValueAtTime(0, context.currentTime + duration)
      source.connect(envelope)
      envelope.connect(master)
      source.onended = () => {
        source.disconnect()
        envelope.disconnect()
        if (state.sources[kind] === source) delete state.sources[kind]
      }
      state.sources[kind] = source
      source.start(context.currentTime, offset, duration)
      return
    }
    if (state.disposed || game.current.muted) return
    const gain = context.createGain()
    gain.connect(master)
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12)
    const oscillator = context.createOscillator()
    oscillator.frequency.setValueAtTime(kind === 'body' ? 95 : kind === 'cloth' ? 150 : 260, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(60, context.currentTime + 0.12)
    oscillator.connect(gain)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)
  }, [game])

  function setAudioMuted (muted) {
    const state = engine.current
    if (!state) return
    state.master.gain.value = muted ? 0 : 1
    if (muted) Object.values(state.sources).forEach(source => source.stop())
  }

  return { sound, setAudioMuted, loadProgress }
}
