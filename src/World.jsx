import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Target } from '@/Target'
import { Hand } from '@/Hand'
import { GRAVITY, launchVelocity } from '@/trajectory'
import { ENTRY_DEPTH, entryPosition, targetCrossing } from '@/targetCollision'

function Grenade () {
  return (
    <group>
      <mesh castShadow scale={[0.75, 1, 0.75]}><sphereGeometry args={[0.25, 16, 12]} /><meshStandardMaterial color='#3c4631' roughness={0.65} /></mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i % 8) * Math.PI / 4
        const row = Math.floor(i / 8) - 1
        const radius = row === 0 ? 0.18 : 0.155
        return <mesh key={i} position={[Math.sin(angle) * radius, row * 0.115, Math.cos(angle) * radius]} rotation={[0, angle, 0]}><boxGeometry args={[0.105, 0.095, 0.035]} /><meshStandardMaterial color={i % 5 === 0 ? '#586044' : '#424d34'} roughness={0.87} /></mesh>
      })}
      {[-0.12, 0, 0.12].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[y === 0 ? 0.193 : 0.169, 0.015, 6, 20]} /><meshStandardMaterial color='#252e22' /></mesh>)}
      <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.09, 0.12, 0.13, 12]} /><meshStandardMaterial color='#242a25' metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0.1, 0.16, 0]} rotation={[0, 0, 0.25]}><boxGeometry args={[0.06, 0.35, 0.09]} /><meshStandardMaterial color='#9d9e85' metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[-0.12, 0.29, 0]}><torusGeometry args={[0.07, 0.012, 6, 12]} /><meshStandardMaterial color='#c1c1aa' metalness={0.8} /></mesh>
    </group>
  )
}

export function World ({ game, dragging, onResult, sound, hitLabel, onReady }) {
  const readyFrame = useRef(null)
  useEffect(() => {
    return () => {
      cancelAnimationFrame(readyFrame.current)
      readyFrame.current = null
    }
  }, [])
  const ring = useRef()
  const hand = useRef()
  const held = useRef()
  const motion = useRef({ phase: 'idle', elapsed: 0, open: 0, reload: 0, pull: 0 })
  const projectile = useRef()
  const explosion = useRef()
  const flash = useRef()
  const shot = useRef(null)
  const burst = useRef(null)
  const shake = useRef(0)
  const recoil = useRef(0)
  const impact = useRef(0)
  const guide = useRef()
  const trail = useRef()
  const trailCount = useRef(0)
  const trailPositions = useMemo(() => new Float32Array(1024 * 3), [])
  const particles = useMemo(() => Array.from({ length: 32 }, (_, i) => ({ direction: new THREE.Vector3(Math.sin(i * 9.1), Math.cos(i * 4.2), Math.sin(i * 3.7)).normalize(), speed: 2 + (i % 5) * 0.5 })), [])

  useFrame(({ clock, camera, viewport, size }, delta) => {
    const dt = Math.min(delta, 0.04)
    const current = game.current
    const time = clock.elapsedTime
    const desiredFov = size.width < 700 ? 58 : 48
    if (camera.fov !== desiredFov) {
      camera.fov = desiredFov
      camera.updateProjectionMatrix()
    }
    const previousRing = ring.current.position.clone()
    const previousRotation = ring.current.quaternion.clone()
    const viewWidth = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 1, -3)).width
    const travel = Math.min(2.1, Math.max(0.15, viewWidth / 2 - 2.1))
    ring.current.position.set(Math.sin(time * 0.65) * travel, 1.15 + Math.sin(time * 1.1) * 0.25, -3)
    impact.current = Math.max(0, impact.current - dt * 2)
    ring.current.rotation.z = Math.sin(time * 0.8) * 0.06 + Math.sin(time * 25) * impact.current * 0.08
    ring.current.position.y += impact.current * 0.22
    if (hitLabel.current) {
      const screen = ring.current.position.clone().project(camera)
      hitLabel.current.style.left = `${(screen.x * 0.5 + 0.5) * size.width}px`
      hitLabel.current.style.top = `${(-screen.y * 0.5 + 0.5) * size.height - (burst.current?.age || 0) * 45}px`
      hitLabel.current.style.opacity = burst.current ? Math.max(0, 1 - burst.current.age) : 0
    }
    current.cooldown = Math.max(0, current.cooldown - dt)
    hand.current.position.set(current.aim[0] * 0.16 + (size.width < 700 ? 0.35 : 0.85), -1.05 + current.aim[1] * 0.08 + Math.sin(time * 2) * 0.025, 4.2)
    hand.current.scale.setScalar(size.width < 700 ? 0.78 : 1)
    recoil.current = Math.max(0, recoil.current - dt * 2.5)
    hand.current.rotation.z = THREE.MathUtils.damp(hand.current.rotation.z, dragging ? -0.3 : -0.06 + recoil.current * 0.6, 12, dt)
    hand.current.rotation.x = THREE.MathUtils.damp(hand.current.rotation.x, dragging ? -0.15 : recoil.current * -0.5, 12, dt)
    hand.current.position.y += recoil.current * 0.22
    const animation = motion.current
    animation.pull = THREE.MathUtils.damp(animation.pull, dragging ? 1 : 0, 12, dt)
    animation.reload = THREE.MathUtils.damp(animation.reload, animation.phase === 'recover' ? 1 : 0, 9, dt)
    hand.current.position.y -= animation.pull * 0.08 + animation.reload * 0.2
    hand.current.position.z += animation.pull * 0.16
    animation.elapsed += dt
    if (current.pending && animation.phase !== 'release' && !shot.current) {
      animation.phase = 'release'
      animation.elapsed = 0
      recoil.current = 1
    }
    if (animation.phase === 'release' && animation.elapsed >= 0.09) animation.phase = 'followThrough'
    if (animation.phase === 'followThrough' && animation.elapsed > 0.32) animation.phase = 'recover'
    if (animation.phase === 'recover' && !shot.current && current.cooldown === 0) {
      animation.phase = 'reload'
      animation.elapsed = 0
      current.cooldown = 0.24
    }
    if (animation.phase === 'reload' && animation.elapsed >= 0.24) animation.phase = 'idle'
    if (animation.phase === 'idle' || animation.phase === 'windup') animation.phase = dragging ? 'windup' : 'idle'
    animation.open = THREE.MathUtils.damp(animation.open, animation.phase === 'followThrough' ? 1 : animation.phase === 'recover' ? 0.35 : 0, 18, dt)
    held.current.visible = !shot.current && animation.phase !== 'recover'
    guide.current.visible = dragging && !shot.current
    if (guide.current.visible) {
      hand.current.updateWorldMatrix(true, true)
      const start = held.current.getWorldPosition(new THREE.Vector3())
      const { velocity, duration } = launchVelocity(camera, start, current.previewAim || current.aim, current.previewStrength || 0.85)
      guide.current.children.forEach((dot, i) => {
        const t = duration * i / (guide.current.children.length - 1)
        dot.position.copy(start).addScaledVector(velocity, t)
        dot.position.y -= 0.5 * GRAVITY * t * t
      })
    }
    if (current.pending && !shot.current && animation.phase === 'followThrough') {
      const { aim, strength } = current.pending
      hand.current.updateWorldMatrix(true, true)
      const start = held.current.getWorldPosition(new THREE.Vector3())
      projectile.current.quaternion.copy(held.current.getWorldQuaternion(new THREE.Quaternion()))
      projectile.current.scale.copy(held.current.getWorldScale(new THREE.Vector3()))
      const { velocity } = launchVelocity(camera, start, aim, strength)
      trailCount.current = 1
      start.toArray(trailPositions, 0)
      trail.current.geometry.setDrawRange(0, 1)
      const radius = 0.19 * Math.max(projectile.current.scale.x, projectile.current.scale.y, projectile.current.scale.z)
      shot.current = { position: start, velocity, radius, age: 0, hit: false, resolved: false }
      projectile.current.visible = true
      current.pending = null
      held.current.visible = false
      sound('throw')
    }
    if (shot.current) {
      const item = shot.current
      item.age += dt
      const previous = item.position.clone()
      if (item.entered && !item.hit) {
        item.entryTime += dt
        const progress = Math.min(1, item.entryTime / 0.22)
        const local = item.entryOffset.clone().multiplyScalar(1 - progress * 0.65)
        local.z = ENTRY_DEPTH - progress * 0.68
        item.position.copy(entryPosition(local, ring.current.position, ring.current.quaternion))
        if (item.entryTime >= 0.22) {
          item.hit = true
          item.fuse = 0.25
          item.entered = false
        }
      } else if (!item.hit) {
        item.position.addScaledVector(item.velocity, dt)
        item.position.y -= 0.5 * GRAVITY * dt * dt
        item.velocity.y -= GRAVITY * dt
        const crossing = targetCrossing(previous, item.position, previousRing, ring.current.position, previousRotation, ring.current.quaternion, item.radius)
        if (crossing) {
          if (crossing.fits && !item.resolved) {
            item.entered = true
            item.entryTime = 0
            item.entryOffset = crossing.local
            item.position.copy(entryPosition(crossing.local, ring.current.position, ring.current.quaternion))
          } else if (crossing.body || crossing.legs) {
            const surface = crossing.local.clone()
            surface.z = Math.max(surface.z, (crossing.body ? crossing.surfaceDepth : 0.4) + item.radius * 0.35 / 0.19 + 0.02)
            item.position.copy(entryPosition(surface, ring.current.position, ring.current.quaternion))
            item.velocity.z = Math.abs(item.velocity.z) * 0.45
            item.velocity.x += (item.position.x - ring.current.position.x) * 2
            impact.current = 0.6
            if (crossing.body) item.bouncedOffBody = true
            sound(!crossing.body && crossing.legs ? 'cloth' : 'body')
          }
        }
        if (item.position.y < -2.25) {
          item.position.y = -2.25
          item.velocity.y = Math.abs(item.velocity.y) * 0.4
          item.velocity.x *= 0.75
          item.velocity.z *= 0.75
          if (!item.resolved) { onResult(false); item.resolved = true; sound(item.bouncedOffBody ? 'ground' : 'clink') }
        }
      } else {
        item.fuse -= dt
        projectile.current.visible = false
        if (item.fuse <= 0) {
          burst.current = { position: ring.current.position.clone(), age: 0 }
          shake.current = 0.25
          impact.current = 1
          sound('boom')
          onResult(true)
          shot.current = null
        }
      }
      if (shot.current) {
        if (trailCount.current < 1024 && !item.hit) {
          item.position.toArray(trailPositions, trailCount.current * 3)
          trailCount.current++
          trail.current.geometry.attributes.position.needsUpdate = true
          trail.current.geometry.setDrawRange(0, trailCount.current)
        }
        projectile.current.position.copy(item.position)
        projectile.current.rotation.x += dt * 9
        projectile.current.rotation.z += dt * 4
        if (item.age > 3.2) {
          if (!item.resolved) onResult(false)
          shot.current = null
          projectile.current.visible = false
        }
      }
    }
    if (shot.current) current.cooldown = Math.max(current.cooldown, 0.1)
    explosion.current.visible = !!burst.current
    flash.current.intensity = 0
    if (burst.current) {
      const effect = burst.current
      effect.age += dt
      explosion.current.position.copy(effect.position)
      flash.current.position.copy(effect.position)
      flash.current.intensity = Math.max(0, 12 * (1 - effect.age * 3))
      explosion.current.children.forEach((particle, i) => {
        particle.position.copy(particles[i].direction).multiplyScalar(effect.age * particles[i].speed)
        particle.position.y -= effect.age * effect.age * 1.5
        const smoke = i % 4 === 0
        particle.scale.setScalar(Math.max(0.001, smoke ? 0.12 + effect.age * 0.45 : (1 - effect.age) * (i % 3 === 0 ? 0.4 : 0.13)))
        particle.material.opacity = Math.max(0, (1 - effect.age) * (smoke ? 0.45 : 1))
      })
      if (effect.age > 1) burst.current = null
    }
    shake.current = Math.max(0, shake.current - dt)
    camera.position.x = shake.current ? (Math.random() - 0.5) * shake.current : 0
    camera.position.y = 1 + (shake.current ? (Math.random() - 0.5) * shake.current : 0)
    // Report readiness after a successful simulation frame and the following render.
    if (readyFrame.current === null) readyFrame.current = requestAnimationFrame(onReady)
  })

  return (
    <>
      <color attach='background' args={['#e9e7dd']} />
      <fog attach='fog' args={['#e9e7dd', 14, 38]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#fff5e6', '#a6a18d', 0.8]} />
      <directionalLight castShadow position={[-5, 8, 5]} intensity={2.1} shadow-mapSize={[2048, 2048]} shadow-normalBias={0.03} shadow-radius={4} />
      <directionalLight position={[5, 3, -5]} intensity={1.4} color='#fff1cd' />
      <group ref={ring} position={[0, 1.15, -3]}>
        <Target />
      </group>
      <group ref={hand}><Hand socket={held} motion={motion}><Grenade /></Hand></group>
      <group ref={projectile} visible={false}><Grenade /></group>
      <group ref={guide} visible={false}>
        {Array.from({ length: 30 }, (_, i) => <mesh key={i}><sphereGeometry args={[i === 29 ? 0.065 : 0.024, 8, 6]} /><meshBasicMaterial color='#dc783f' transparent opacity={i === 29 ? 0.95 : 0.65} /></mesh>)}
      </group>
      <line ref={trail} frustumCulled={false}>
        <bufferGeometry drawRange={{ start: 0, count: 0 }}><bufferAttribute attach='attributes-position' args={[trailPositions, 3]} /></bufferGeometry>
        <lineBasicMaterial color='#8d7965' transparent opacity={0.4} depthWrite={false} />
      </line>
      <group ref={explosion} visible={false}>{particles.map((_, i) => <mesh key={i}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial transparent depthWrite={false} color={i % 4 === 0 ? '#8e887f' : i % 3 === 0 ? '#ffbc43' : '#e95421'} /></mesh>)}</group>
      <pointLight ref={flash} color='#ff9f32' intensity={0} distance={12} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color='#e3e0d4' roughness={1} /></mesh>
      <ContactShadows position={[0, -2.53, -3]} opacity={0.3} scale={18} blur={2.5} far={8} resolution={256} />
    </>
  )
}
