import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A rubbery cartoon prop with a deliberately oversized, non-anatomical opening.
export function Target () {
  // A bent, elliptical torso receding away from the viewer. The hip mesh stays fixed.
  const torso = useMemo(() => {
    const positions = []
    const indices = []
    const colors = []
    for (let row = 0; row <= 40; row++) {
      const t = row / 40
      const neck = THREE.MathUtils.smoothstep(t, 0.83, 1)
      const width = (1.12 + Math.sin(t * Math.PI) * 0.1 - t * 0.12) * (1 - neck * 0.64)
      const thickness = 0.34 + Math.sin(t * Math.PI) * 0.13 - neck * 0.08
      const y = -1.14 - t * 0.94 - Math.sin(t * Math.PI) * 0.15
      const z = -0.55 - t * 2.25
      for (let column = 0; column <= 64; column++) {
        const angle = column / 64 * Math.PI * 2
        const fold = Math.sin(angle * 5 + t * 12) * 0.009 * Math.sin(t * Math.PI)
        positions.push(Math.cos(angle) * (width + fold), y - Math.sin(angle) * thickness * 0.92, z + Math.sin(angle) * thickness * 0.39)
        const color = new THREE.Color('#697d66').lerp(new THREE.Color('#82917a'), (Math.sin(angle) + 1) * 0.28)
        colors.push(color.r, color.g, color.b)
        if (row < 40 && column < 64) {
          const a = row * 65 + column
          indices.push(a, a + 65, a + 1, a + 1, a + 65, a + 66)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const arms = useMemo(() => [-1, 1].map(side => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.92, -1.99, -2.3),
      new THREE.Vector3(side * 1.65, -1.17, -0.85),
      new THREE.Vector3(side * 1.52, -0.72, 0.3),
      new THREE.Vector3(side * 1.44, -0.49, 0.56)
    ])
    const geometry = new THREE.TubeGeometry(curve, 48, 1, 20, false)
    const positions = geometry.attributes.position
    const colors = []
    for (let row = 0; row <= 48; row++) {
      const t = row / 48
      const center = curve.getPointAt(t)
      const blend = THREE.MathUtils.smoothstep(t, 0.65, 1)
      const radius = THREE.MathUtils.lerp(0.18, 0.09, blend)
      const color = new THREE.Color('#dca486').lerp(new THREE.Color('#e0aa8d'), blend)
      for (let column = 0; column <= 20; column++) {
        const index = row * 21 + column
        const vertex = new THREE.Vector3().fromBufferAttribute(positions, index).sub(center).multiplyScalar(radius).add(center)
        positions.setXYZ(index, vertex.x, vertex.y, vertex.z)
        colors.push(color.r, color.g, color.b)
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    return geometry
  }), [])
  const lining = useMemo(() => {
    const positions = []
    const indices = []
    const colors = []
    const profile = [[1.1, -0.2], [0.85, -0.36], [0.78, -0.65], [0.72, -1.26]]
    profile.forEach(([radius, depth], row) => {
      for (let i = 0; i <= 96; i++) {
        const angle = i / 96 * Math.PI * 2
        const bulge = 1 + 0.1 * Math.cos(angle * 2) + 0.025 * Math.sin(angle * 3)
        positions.push(Math.cos(angle) * radius * bulge, Math.sin(angle) * radius * 0.89, depth)
        const color = new THREE.Color('#b95950').lerp(new THREE.Color('#302828'), row / 3)
        colors.push(color.r, color.g, color.b)
        if (row < profile.length - 1 && i < 96) {
          const a = row * 97 + i
          indices.push(a, a + 1, a + 97, a + 1, a + 98, a + 97)
        }
      }
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const legs = useRef([])
  useFrame(({ clock }) => {
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = -0.32 + Math.sin(clock.elapsedTime * 1.5 + i * 0.9) * 0.035
    })
  })
  const body = useMemo(() => {
    const geometry = new THREE.TorusGeometry(1.22, 0.43, 40, 96)
    const positions = geometry.attributes.position
    const colors = []
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      const angle = Math.atan2(y, x)
      const bulge = 1 + 0.1 * Math.cos(angle * 2) + 0.025 * Math.sin(angle * 3)
      positions.setXYZ(i, x * bulge, y * 0.89, z * (1.25 + 0.18 * Math.cos(angle * 2)))
      const color = new THREE.Color('#dfa083').lerp(new THREE.Color('#edbaa0'), 0.35 + 0.25 * Math.sin(angle + 0.4))
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const denim = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.39, 0.43, 0.72, 40, 24)
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      const angle = Math.atan2(z, x)
      const fold = 1 + 0.065 * Math.sin(y * 29 + angle * 2) + 0.025 * Math.cos(angle * 7 - y * 11)
      positions.setXYZ(i, x * fold, y, z * fold)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const hairs = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const angle = i * 2.39996
    const radius = 1.22 + Math.sin(i * 7.3) * 0.22
    const x = Math.cos(angle) * radius * (1 + 0.1 * Math.cos(angle * 2) + 0.025 * Math.sin(angle * 3))
    const y = Math.sin(angle) * radius * 0.89
    const z = Math.sqrt(0.43 ** 2 - (radius - 1.22) ** 2) * (1.25 + 0.18 * Math.cos(angle * 2))
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + Math.sin(i) * 0.045, y + 0.055, z + 0.06),
      new THREE.Vector3(x + Math.sin(i) * 0.085, y + 0.09 + 0.03 * Math.cos(i), z + 0.04)
    ])
  }), [])

  return (
    <group rotation={[0, 0, Math.PI]}>
      <mesh castShadow geometry={torso}>
        <meshStandardMaterial vertexColors roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh castShadow position={[0, -2.11, -2.83]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.23, 0.28, 8, 20]} /><meshStandardMaterial color='#d8a082' roughness={0.9} /></mesh>
      <mesh castShadow position={[0, -2.23, -3.17]} scale={[0.38, 0.36, 0.44]}><sphereGeometry args={[1, 28, 24]} /><meshStandardMaterial color='#d8a082' roughness={0.9} /></mesh>
      <mesh castShadow position={[0, -2.34, -3.13]} scale={[0.39, 0.3, 0.43]}><sphereGeometry args={[1, 28, 24]} /><meshStandardMaterial color='#34302b' roughness={0.92} /></mesh>
      {[-1, 1].map(side => (
        <group key={`arm-${side}`}>
          <mesh castShadow position={[side * 0.94, -1.97, -2.25]} rotation={[0, 0, side * -0.35]} scale={[0.3, 0.29, 0.35]}><sphereGeometry args={[1, 24, 20]} /><meshStandardMaterial color='#71826c' roughness={0.95} /></mesh>
          <mesh castShadow geometry={arms[side === -1 ? 0 : 1]}>
            <meshStandardMaterial vertexColors roughness={0.86} />
          </mesh>
          <mesh castShadow position={[side * 1.42, -0.42, 0.59]} rotation={[0, 0, side * -0.3]} scale={[0.2, 0.27, 0.105]}><sphereGeometry args={[1, 24, 20]} /><meshStandardMaterial color='#e0aa8d' roughness={0.86} /></mesh>
          {[0, 1, 2, 3].map(i => <mesh key={i} castShadow position={[side * (1.27 + i * 0.09), -0.2 + i * 0.025, 0.59]} rotation={[0.2, 0, side * -0.2]}><capsuleGeometry args={[0.041, 0.19 - Math.abs(i - 1) * 0.025, 8, 12]} /><meshStandardMaterial color='#e0aa8d' roughness={0.86} /></mesh>)}
        </group>
      ))}
      <mesh geometry={lining}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} /></mesh>
      <mesh position={[0, 0, -1.25]} scale={[1.12, 0.89, 1]}><circleGeometry args={[0.8, 96]} /><meshBasicMaterial color='#302828' /></mesh>
      <mesh castShadow geometry={body}>
        <meshStandardMaterial vertexColors roughness={0.78} />
      </mesh>
      {[-1, 1].map(side => (
        <group key={side}>
          <group ref={node => { legs.current[side === -1 ? 0 : 1] = node }} position={[side * 1.05, 1.12, -0.17]} rotation={[0, 0, side * -0.13]}>
            <mesh castShadow position={[0, 0.48, 0]}>
              <capsuleGeometry args={[0.32, 0.95, 12, 24]} />
              <meshStandardMaterial color='#e5a182' roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, 1.02, 0]} scale={[1, 1, 0.9]} geometry={denim}>
              <meshStandardMaterial color='#365572' roughness={1} />
            </mesh>
            {[0.69, 1.35].map((y, i) => (
              <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, i * 0.05, 0]} scale={[1, 0.9, 1]}>
                <torusGeometry args={[0.405, 0.027, 8, 24]} />
                <meshStandardMaterial color={i === 1 ? '#365774' : '#6087a6'} roughness={1} />
              </mesh>
            ))}
            <mesh position={[side * 0.25, 1.02, 0.29]} rotation={[0, 0, side * 0.09]}>
              <boxGeometry args={[0.018, 0.48, 0.018]} />
              <meshStandardMaterial color='#d9ba7e' roughness={1} />
            </mesh>
            <mesh position={[0, 1.05, 0.375]} rotation={[0, 0, side * 0.07]}>
              <boxGeometry args={[0.27, 0.26, 0.025]} />
              <meshStandardMaterial color='#4a6a85' roughness={1} />
            </mesh>
            {[-0.11, 0.11].map(x => <mesh key={x} position={[x, 0.95, 0.4]}><sphereGeometry args={[0.018, 8, 6]} /><meshStandardMaterial color='#bb9462' metalness={0.5} roughness={0.55} /></mesh>)}
            <mesh castShadow position={[0, 1.52, 0]}>
              <capsuleGeometry args={[0.23, 0.25, 8, 16]} />
              <meshStandardMaterial color='#e5a182' roughness={0.9} />
            </mesh>
            <mesh castShadow position={[side * 0.07, 1.82, -0.23]} scale={[0.3, 0.2, 0.5]}>
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial color='#3d3832' roughness={0.85} />
            </mesh>
            <mesh position={[side * 0.07, 1.95, -0.23]} scale={[0.31, 0.06, 0.51]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color='#b8ad94' roughness={0.95} /></mesh>
          </group>
        </group>
      ))}
      <mesh castShadow position={[0, 2.03, -0.2]} scale={[1, 0.53, 0.8]}>
        <torusGeometry args={[0.95, 0.15, 12, 40, Math.PI]} />
        <meshStandardMaterial color='#365572' roughness={1} />
      </mesh>
      <mesh position={[0.12, 2.5, -0.06]}>
        <boxGeometry args={[0.16, 0.13, 0.06]} />
        <meshStandardMaterial color='#c3a475' roughness={0.6} />
      </mesh>
      {hairs.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 8, 0.007, 5, false]} />
          <meshStandardMaterial color='#29221e' roughness={1} />
        </mesh>
      ))}
    </group>
  )
}
