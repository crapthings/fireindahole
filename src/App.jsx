import { useCallback, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { Scene } from '@/Scene'
import { useGameAudio } from '@/useGameAudio'
import { LoadingScreen } from '@/LoadingScreen'

export function App () {
  const game = useRef({ cooldown: 0, aim: [0, 0], muted: false, throws: 0 })
  const gesture = useRef(null)
  const playfield = useRef(null)
  const { sound, setAudioMuted, loadProgress } = useGameAudio(game)
  const [sceneReady, setSceneReady] = useState(false)
  const [ready, setReady] = useState(false)
  const sceneLoaded = useCallback(() => setSceneReady(true), [])
  const finishLoading = useCallback(() => setReady(true), [])
  const hitLabel = useRef(null)
  const [power, setPower] = useState(0)
  const [stats, setStats] = useState({ score: 0, combo: 0, throws: 0 })
  const [dragging, setDragging] = useState(false)
  const [muted, setMuted] = useState(false)


  function aimAt (x, y) {
    const rect = playfield.current.getBoundingClientRect()
    game.current.aim = [(x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1]
    return rect
  }

  useDrag(({ first, last, canceled, cancel, tap, xy, velocity, direction, delta, movement, event }) => {
    if (first) {
      if (!ready || game.current.cooldown > 0 || game.current.pending) {
        cancel()
        return
      }
      gesture.current = { speed: [0, 0], time: performance.now() }
      setDragging(true)
      setPower(0)
      sound('wake')
    }
    const sample = gesture.current
    if (!sample) return
    if (canceled || event.type === 'pointercancel') {
      gesture.current = null
      setDragging(false)
      setPower(0)
      return
    }
    const rect = aimAt(...xy)
    const now = performance.now()
    if (!last && Math.hypot(...delta) > 0) {
      // Signed recent velocity; aim time before the flick does not dilute power.
      const alpha = 1 - Math.exp(-Math.max(8, now - sample.time) / 35)
      sample.speed = velocity.map((v, i) => sample.speed[i] * (1 - alpha) + v * direction[i] * alpha)
      sample.time = now
    }
    const decay = Math.exp(-Math.max(0, now - sample.time - 90) / 100)
    const normalized = sample.speed.map(v => v * decay * 800 / rect.height)
    const speed = Math.hypot(...normalized)
    const strength = 0.8 + 0.55 * (1 - Math.exp(-speed / 1.2))
    const aim = game.current.aim.map((v, i) => Math.max(-1, Math.min(1, v + Math.max(-0.09, Math.min(0.09, normalized[i] * (i === 0 ? 0.035 : -0.035))))))
    game.current.previewAim = aim
    game.current.previewStrength = strength
    setPower(Math.round((strength - 0.8) / 0.55 * 100))
    if (!last) return
    gesture.current = null
    setDragging(false)
    if (tap || Math.hypot(...movement) < 8) {
      return
    }
    game.current.pending = { aim, strength }
    game.current.cooldown = 0.8
    game.current.throws++
    setStats(previous => ({ ...previous, throws: game.current.throws }))
  }, { target: playfield, pointer: { keys: false }, threshold: 0, preventDefault: true, eventOptions: { passive: false } })

  const result = useCallback((hit) => {
    setStats(previous => ({ score: previous.score + (hit ? 1 : 0), combo: hit ? previous.combo + 1 : 0, throws: game.current.throws }))
  }, [])

  return (
    <main className='game' aria-busy={!ready}>
      <div ref={playfield} className='playfield' onPointerMove={event => { if (!gesture.current) aimAt(event.clientX, event.clientY) }}>
        <Scene game={game} dragging={dragging} onResult={result} sound={sound} hitLabel={hitLabel} onReady={sceneLoaded} />
      </div>
      <header className='topbar'>
        <div className='brand'>FIRE<span className='brand-small'>IN DA</span>HOLE<span className='brand-dot'>®</span></div>
        <button className='sound-button' aria-pressed={!muted} onClick={() => { game.current.muted = !muted; setMuted(!muted); setAudioMuted(!muted) }}>{muted ? 'SOUND OFF ↗' : 'SOUND ON ↗'}</button>
      </header>
      <div className='scoreboard'><span className='eyebrow'>HOLES HIT</span><strong key={stats.score} className={stats.score ? 'score-pop' : ''}>{String(stats.score).padStart(2, '0')}</strong><div className='score-details'><span>THROWS <b>{String(stats.throws).padStart(2, '0')}</b></span><span>STREAK <b>{String(stats.combo).padStart(2, '0')}</b></span></div></div>
      <div ref={hitLabel} className='hit-label' aria-hidden='true'>+1{stats.combo > 1 && <small>{stats.combo} STREAK</small>}</div>
      {dragging && <div className='power-meter' role='meter' aria-label='Throw power' aria-valuemin={0} aria-valuemax={100} aria-valuenow={power}><div><i style={{ width: `${power}%` }} /></div></div>}
      <div className='grain' />
      {!ready && <LoadingScreen progress={(loadProgress * 2 + Number(sceneReady)) / 3} onComplete={finishLoading} />}
    </main>
  )
}
