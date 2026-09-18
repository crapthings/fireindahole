import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const skin = '#d6a582'

// Each digit has a continuous tapered surface; its root is buried in the palm.
function digitGeometry (points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)))
  const geometry = new THREE.TubeGeometry(curve, 32, 1, 12, false)
  const positions = geometry.attributes.position
  const point = new THREE.Vector3()
  for (let row = 0; row <= 32; row++) {
    const t = row / 32
    const center = curve.getPointAt(t)
    const tip = Math.sqrt(Math.max(0, 1 - THREE.MathUtils.smoothstep(t, 0.83, 1) ** 2))
    const thickness = radius * (1 - 0.2 * t) * tip
    for (let column = 0; column <= 12; column++) {
      const i = row * 13 + column
      point.fromBufferAttribute(positions, i).sub(center).multiplyScalar(thickness).add(center)
      positions.setXYZ(i, point.x, point.y, point.z)
    }
  }
  geometry.computeVertexNormals()
  return { geometry, curve }
}

function Digit ({ grip, released, radius, motion, index = 0 }) {
  const mesh = useRef()
  const nail = useRef()
  const shape = useMemo(() => {
    const closed = digitGeometry(grip, radius)
    const open = digitGeometry(released, radius)
    closed.geometry.morphAttributes.position = [open.geometry.attributes.position.clone()]
    closed.geometry.morphAttributes.normal = [open.geometry.attributes.normal.clone()]
    open.geometry.dispose()
    return {
      geometry: closed.geometry,
      closedNail: closed.curve.getPointAt(0.89),
      openNail: open.curve.getPointAt(0.89)
    }
  }, [grip, released, radius])
  useEffect(() => () => shape.geometry.dispose(), [shape])
  useFrame((_, delta) => {
    const target = THREE.MathUtils.clamp((motion.current.open - index * 0.035) * 1.15, 0, 1)
    const amount = THREE.MathUtils.damp(mesh.current.morphTargetInfluences[0], target, 22, delta)
    mesh.current.morphTargetInfluences[0] = amount
    nail.current.position.copy(shape.closedNail).lerp(shape.openNail, amount)
    nail.current.position.z += radius * 0.67
    nail.current.rotation.z = -0.45 + amount * 0.7
  })
  return (
    <group>
      <mesh ref={mesh} args={[shape.geometry]} castShadow><meshStandardMaterial color={skin} roughness={0.87} /></mesh>
      <mesh ref={nail} scale={[radius * 0.57, radius * 0.72, 0.006]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color='#e9c7af' roughness={0.73} /></mesh>
    </group>
  )
}

export function Hand ({ socket, motion, children }) {
  const palm = useMemo(() => {
    // Continuous forearm → narrow wrist → broad palm, with no cut at the wrist.
    const profile = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.19, -1.3, 0.145),
      new THREE.Vector3(0.16, -0.8, 0.125),
      new THREE.Vector3(0.125, -0.38, 0.09),
      new THREE.Vector3(0.15, -0.23, 0.105),
      new THREE.Vector3(0.215, -0.065, 0.12),
      new THREE.Vector3(0.21, 0.09, 0.108),
      new THREE.Vector3(0.15, 0.22, 0.075),
      new THREE.Vector3(0.025, 0.285, 0.025)
    ])
    const positions = []
    const indices = []
    for (let row = 0; row <= 64; row++) {
      const section = profile.getPoint(row / 64)
      const centerX = 0.095 + THREE.MathUtils.smoothstep(section.y, -0.3, 0.05) * 0.04
      for (let i = 0; i <= 40; i++) {
        const angle = i / 40 * Math.PI * 2
        positions.push(centerX + Math.cos(angle) * section.x, section.y, -0.1 + Math.sin(angle) * section.z)
        if (row < 64 && i < 40) {
          const a = row * 41 + i
          indices.push(a, a + 41, a + 1, a + 1, a + 41, a + 42)
        }
      }
    }
    for (const row of [0, 64]) {
      const section = profile.getPoint(row / 64)
      const centerX = 0.095 + THREE.MathUtils.smoothstep(section.y, -0.3, 0.05) * 0.04
      const center = positions.length / 3
      positions.push(centerX, section.y, -0.1)
      for (let i = 0; i < 40; i++) {
        const a = row * 41 + i
        if (row === 0) indices.push(center, a, a + 1)
        else indices.push(center, a + 1, a)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const normals = geometry.attributes.normal
    const seamNormal = new THREE.Vector3()
    const otherNormal = new THREE.Vector3()
    for (let row = 0; row <= 64; row++) {
      const first = row * 41
      const last = first + 40
      seamNormal.fromBufferAttribute(normals, first)
      otherNormal.fromBufferAttribute(normals, last)
      seamNormal.add(otherNormal).normalize()
      normals.setXYZ(first, seamNormal.x, seamNormal.y, seamNormal.z)
      normals.setXYZ(last, seamNormal.x, seamNormal.y, seamNormal.z)
    }
    return geometry
  }, [])
  useEffect(() => () => palm.dispose(), [palm])
  const digits = useMemo(() => [0, 1, 2, 3].map(index => {
    const y = 0.25 - index * 0.107
    const side = index === 0 ? -0.23 : index === 3 ? -0.215 : -0.255
    return {
      grip: [[0.08, y - 0.02, -0.105], [-0.12, y, -0.09], [side, y + 0.015, 0.005], [side, y + 0.025, 0.12], [side + 0.075, y - 0.003, 0.195]],
      released: [[0.08, y - 0.02, -0.105], [-0.12, y, -0.09], [-0.23, y + 0.05, -0.025], [-0.31, y + 0.13, 0.025], [-0.35, y + 0.21, 0.055]]
    }
  }), [])
  const thumb = useMemo(() => ({
    grip: [[0.255, -0.11, -0.045], [0.29, 0.015, 0.025], [0.285, 0.15, 0.065], [0.21, 0.26, 0.115], [0.105, 0.285, 0.17]],
    released: [[0.255, -0.11, -0.045], [0.31, 0.015, 0.025], [0.37, 0.12, 0.055], [0.4, 0.22, 0.085], [0.39, 0.3, 0.1]]
  }), [])
  return (
    <group rotation={[0, 0.12, -0.15]}>
      <mesh geometry={palm} castShadow><meshStandardMaterial color={skin} roughness={0.89} /></mesh>
      <mesh position={[0.095, -1.13, -0.1]} scale={[1, 1, 0.79]}><cylinderGeometry args={[0.186, 0.2, 0.28, 32]} /><meshStandardMaterial color='#354035' roughness={1} /></mesh>
      <mesh position={[0.095, -0.997, -0.1]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.79, 1]}><torusGeometry args={[0.183, 0.012, 8, 32]} /><meshStandardMaterial color='#58634c' roughness={1} /></mesh>
      <group ref={socket} position={[-0.025, 0.145, 0.045]} rotation={[0, 0, -0.035]}>{children}</group>
      {digits.map((digit, i) => <Digit key={i} {...digit} index={i} radius={0.058 - i * 0.003} motion={motion} />)}
      <Digit {...thumb} radius={0.084} motion={motion} />
    </group>
  )
}
