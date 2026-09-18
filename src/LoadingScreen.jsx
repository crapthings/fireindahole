import { useEffect, useRef, useState } from 'react'

export function LoadingScreen ({ progress, onComplete }) {
  const target = useRef(progress)
  const [counter, setCounter] = useState(0)
  const [leaving, setLeaving] = useState(false)
  target.current = progress

  useEffect(() => {
    let frame
    let value = 0
    let last = performance.now()
    const started = last
    function tick (now) {
      const delta = Math.min(now - last, 50)
      last = now
      // Actual readiness sets the ceiling; ease the counter without inventing progress.
      const ceiling = Math.min(target.current * 100, (now - started) / 8)
      value += Math.min(ceiling - value, delta * 0.16)
      setCounter(Math.floor(value))
      if (value >= 100) {
        setLeaving(true)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(onComplete, 450)
    return () => clearTimeout(timer)
  }, [leaving, onComplete])

  return (
    <div className={`loading-screen ${leaving ? 'loading-leaving' : ''}`}>
      <div className='loading-brand'>FIRE IN DA HOLE®</div>
      <div className='loading-content'>
        <div className='loading-caption'>LOADING</div>
        <div className='loading-counter'>{counter}<span>%</span></div>
        <div className='loading-track' role='progressbar' aria-label='Game loading progress' aria-valuemin={0} aria-valuemax={100} aria-valuenow={counter}><div style={{ width: `${counter}%` }} /></div>
      </div>
      <div className='grain' />
    </div>
  )
}
