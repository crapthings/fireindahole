import * as THREE from 'three'

export const ENTRY_DEPTH = -0.36

// Match Target's rotated, elliptical opening and its angular silhouette.
function targetPoint (point, center, rotation) {
  const local = point.clone().sub(center).applyQuaternion(rotation.clone().invert())
  local.x *= -1
  local.y *= -1
  return local
}

function sectionAt (local, radius) {
  const angle = Math.atan2(local.y / 0.89, local.x)
  const bulge = 1 + 0.1 * Math.cos(angle * 2) + 0.025 * Math.sin(angle * 3)
  const distance = Math.hypot(local.x / bulge, local.y / 0.89)
  // Reserve space for the whole grenade, with a small forgiving rim tolerance.
  const clearance = radius / Math.min(bulge, 0.89)
  const fits = distance + clearance <= 0.85 + 0.025
  const body = distance <= 1.65 + clearance
  const legs = local.y > 0.8 && local.y < 3.2 && Math.abs(local.x) < 1.65 + radius
  const surfaceDepth = Math.sqrt(Math.max(0, 0.43 ** 2 - (distance - 1.22) ** 2)) * (1.25 + 0.18 * Math.cos(angle * 2))
  return { fits, body, legs, surfaceDepth }
}

export function targetCrossing (previous, next, previousCenter, center, previousRotation, rotation, radius) {
  const from = targetPoint(previous, previousCenter, previousRotation)
  const to = targetPoint(next, center, rotation)
  if (to.z >= from.z) return null
  // The spinning grenade's fuse and lever extend beyond its body radius.
  const depthRadius = radius * 0.35 / 0.19
  const steps = Math.max(1, Math.ceil(from.distanceTo(to) / 0.025))
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps
    const local = from.clone().lerp(to, fraction)
    const section = sectionAt(local, radius)
    if (section.fits || (!section.body && !section.legs)) continue
    const contactDepth = (section.body ? section.surfaceDepth : 0.4) + depthRadius + 0.02
    if (local.z <= contactDepth && local.z >= ENTRY_DEPTH - depthRadius) {
      local.z = contactDepth
      return { local, ...section, fraction }
    }
  }
  if (from.z <= ENTRY_DEPTH || to.z > ENTRY_DEPTH) return null
  const fraction = (from.z - ENTRY_DEPTH) / (from.z - to.z)
  const local = from.clone().lerp(to, fraction)
  return { local, ...sectionAt(local, radius), fraction }
}

export function entryPosition (local, center, rotation) {
  return new THREE.Vector3(-local.x, -local.y, local.z).applyQuaternion(rotation).add(center)
}
