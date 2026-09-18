import * as THREE from 'three'

export const GRAVITY = 9.8

export function launchVelocity (camera, start, aim, strength) {
  const direction = new THREE.Vector3(aim[0], aim[1], 0.5).unproject(camera).sub(camera.position).normalize()
  const target = camera.position.clone().addScaledVector(direction, (-3 - camera.position.z) / direction.z)
  const duration = 0.8 / strength
  const velocity = target.sub(start).divideScalar(duration)
  velocity.y += 0.5 * GRAVITY * duration
  return { velocity, duration }
}
