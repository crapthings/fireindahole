// @refresh reset
import { memo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { World } from '@/World'

const shadows = { type: THREE.PCFShadowMap }
const camera = { position: [0, 1, 9], fov: 48 }
const dpr = [1, 1.75]

export const Scene = memo(function Scene (props) {
  return <Canvas shadows={shadows} dpr={dpr} camera={camera}><World {...props} /></Canvas>
})
