import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SUBSYSTEMS } from '../utils/anomalyEngine'

const HEALTH_COLOR = { nominal: 0x3ed6c4, warning: 0xf2a63d, critical: 0xff5c5c }
const HEALTH_CSS = { nominal: 'nominal', warning: 'warning', critical: 'critical' }

// ---- Unmanned-satellite hull (unchanged from original) ----
function buildSatelliteModel() {
  const craft = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc1a56e, metalness: 0.36, roughness: 0.48 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xb4bec4, metalness: 0.76, roughness: 0.25 })
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x124b8c, metalness: 0.32, roughness: 0.26, emissive: 0x06182e })
  const panelGridMat = new THREE.MeshBasicMaterial({ color: 0x88b7e5, transparent: true, opacity: 0.68 })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 1.7), bodyMat)
  craft.add(body)

  const panelGeo = new THREE.BoxGeometry(2.6, 1.5, 0.05)
  const panelL = new THREE.Mesh(panelGeo, panelMat)
  panelL.position.set(-2.55, 0, 0)
  const panelR = panelL.clone()
  panelR.position.x = 2.55
  craft.add(panelL, panelR)
  ;[panelL, panelR].forEach((p) => {
    for (let i = -2; i <= 2; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.5, 0.052), panelGridMat)
      line.position.set(i * 0.5, 0, 0)
      p.add(line)
    }
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.018, 0.052), panelGridMat)
      line.position.set(0, i * 0.38, 0)
      p.add(line)
    }
  })

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), trimMat)
  mast.position.y = 1.65
  craft.add(mast)
  const dish = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 24), trimMat)
  dish.position.y = 2.25
  dish.rotation.x = Math.PI / 2
  craft.add(dish)

  const attitudeBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), trimMat)
  attitudeBox.position.set(-0.55, 1.05, 0.55)
  craft.add(attitudeBox)

  const payloadBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), trimMat)
  payloadBox.position.set(1.05, 0.15, 0.6)
  craft.add(payloadBox)

  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x9da9a8, metalness: 0.62, roughness: 0.4 })
  )
  radiator.position.set(0, -1.15, 0.65)
  craft.add(radiator)

  const thrusterGeo = new THREE.ConeGeometry(0.22, 0.5, 12)
  const thrusterL = new THREE.Mesh(thrusterGeo, trimMat)
  thrusterL.position.set(-0.4, -1.55, 0)
  thrusterL.rotation.x = Math.PI
  const thrusterR = thrusterL.clone()
  thrusterR.position.x = 0.4
  craft.add(thrusterL, thrusterR)

  const flameMat = new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.58 })
  const flameGeo = new THREE.ConeGeometry(0.12, 0.4, 10)
  const flameL = new THREE.Mesh(flameGeo, flameMat)
  flameL.position.set(-0.4, -2.05, 0)
  const flameR = flameL.clone()
  flameR.position.x = 0.4
  craft.add(flameL, flameR)

  const nodePositions = {
    power: new THREE.Vector3(-3.1, 0, 0),
    attitude: new THREE.Vector3(-0.55, 1.05, 0.55),
    comms: new THREE.Vector3(0, 2.35, 0),
    payload: new THREE.Vector3(1.05, 0.15, 0.6),
    thermal: new THREE.Vector3(0, -1.15, 0.65),
    propulsion: new THREE.Vector3(0, -2.05, 0),
  }

  return { craft, nodePositions, dish, flames: [flameL, flameR] }
}

// ---- Sci-fi cruiser: faceted (hexagonal cross-section) tapered hull,
// swept-back wings, tail fin, angular cockpit canopy, 3-engine cluster ----
function buildSpacecraftModel() {
  const craft = new THREE.Group()
  craft.rotation.x = Math.PI / 2 // lay the tapered cylinder on its side, nose forward

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xc7ced0, metalness: 0.5, roughness: 0.29 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x394853, metalness: 0.72, roughness: 0.27 })
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x3ed6c4 })
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x193a50, metalness: 0.36, roughness: 0.14, emissive: 0x0a1d2c })

  // Faceted main fuselage — low radial segments (6) gives it angled-panel look
  // instead of a smooth round hull
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.78, 3.6, 6), hullMat)
  craft.add(fuselage)

  // Nose cone, same facet count so panel lines continue seamlessly
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 6), hullMat)
  nose.position.y = 2.3
  craft.add(nose)

  // Tail taper toward the engines
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.5, 0.8, 6), hullMat)
  tail.position.y = -2.0
  craft.add(tail)

  // Glowing seam rings where hull sections meet — classic sci-fi detailing
  ;[1.85, -1.6].forEach((y) => {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(y > 0 ? 0.34 : 0.76, 0.02, 6, 6), trimMat)
    seam.position.y = y
    seam.rotation.x = Math.PI / 2
    craft.add(seam)
  })

  // Angular cockpit canopy near the nose, tilted forward
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.55), canopyMat)
  canopy.position.set(0, 1.55, 0.5)
  canopy.rotation.x = -0.35
  craft.add(canopy)

  // Swept-back wings, mounted mid-hull, raked for a fast/aggressive silhouette
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.lineTo(1.9, -0.5)
  wingShape.lineTo(1.6, -0.95)
  wingShape.lineTo(0, -0.35)
  wingShape.closePath()
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false })
  const wingL = new THREE.Mesh(wingGeo, trimMat)
  wingL.position.set(-0.78, -0.15, 0)
  wingL.rotation.set(Math.PI / 2, 0, -Math.PI / 2)
  const wingR = wingL.clone()
  wingR.scale.x = -1
  wingR.position.x = 0.78
  craft.add(wingL, wingR)

  // Wingtip running lights
  ;[-2.6, 2.6].forEach((x) => {
    const lightMat = new THREE.MeshBasicMaterial({ color: x < 0 ? 0xff4a45 : 0x52e28a })
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), lightMat)
    tip.position.set(x, -0.75, 0)
    craft.add(tip)
  })

  // Tail fin — vertical stabilizer, angled back
  const finShape = new THREE.Shape()
  finShape.moveTo(0, 0)
  finShape.lineTo(0.9, 0.55)
  finShape.lineTo(0.75, 0.9)
  finShape.lineTo(0, 0.3)
  finShape.closePath()
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false })
  const fin = new THREE.Mesh(finGeo, trimMat)
  fin.position.set(-0.03, -1.4, -0.35)
  fin.rotation.set(0, 0, 0)
  craft.add(fin)

  // Slim antenna mast on the tail fin, glowing tip instead of a dish
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), trimMat)
  mast.position.set(0, -0.55, -0.75)
  mast.rotation.x = 0.3
  craft.add(mast)
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), glowMat)
  antennaTip.position.set(0, -0.32, -0.85)
  craft.add(antennaTip)

  // Reaction-control thruster pod (attitude), angular block on the flank
  const attitudeBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), trimMat)
  attitudeBox.position.set(0.55, 0.85, 0.15)
  craft.add(attitudeBox)

  // Payload pod slung under the belly, hex-faceted to match the hull
  const payloadPod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 6), trimMat)
  payloadPod.rotation.z = Math.PI / 2
  payloadPod.position.set(0, -0.2, 0.65)
  craft.add(payloadPod)

  // Radiator fin along the belly
  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.7, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x78868a, metalness: 0.52, roughness: 0.44 })
  )
  radiator.position.set(0, -0.9, 0.55)
  craft.add(radiator)

  // Rear engine cluster — 3 faceted nozzles with glowing exhaust
  const engineGeo = new THREE.CylinderGeometry(0.14, 0.22, 0.5, 6)
  const flames = []
  const enginePositions = [
    [0, 0.3],
    [-0.32, -0.15],
    [0.32, -0.15],
  ]
  enginePositions.forEach(([x, z]) => {
    const engine = new THREE.Mesh(engineGeo, trimMat)
    engine.position.set(x, -2.4, z)
    craft.add(engine)
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.4, 6),
      new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.58 })
    )
    flame.position.set(x, -2.85, z)
    craft.add(flame)
    flames.push(flame)
  })

  const nodePositions = {
    power: new THREE.Vector3(2.6, -0.75, 0),
    attitude: new THREE.Vector3(0.55, 0.85, 0.15),
    comms: new THREE.Vector3(0, -0.32, -0.85),
    payload: new THREE.Vector3(0, -0.2, 0.65),
    thermal: new THREE.Vector3(0, -0.9, 0.55),
    propulsion: new THREE.Vector3(0, -2.6, 0),
  }

  return { craft, nodePositions, dish: antennaTip, flames }
}

export default function DigitalTwin({ subsystemHealth }) {
  const mountRef = useRef(null)
  const labelRefs = useRef({})
  const healthRef = useRef(subsystemHealth)
  const [dangerCount, setDangerCount] = useState(0)
  const [craftType, setCraftType] = useState('satellite') // 'satellite' | 'spacecraft'
  healthRef.current = subsystemHealth

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0d16, 0.028)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    camera.position.set(7, 2.4, 10.5)
    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 4
    controls.maxDistance = 30
    controls.minPolarAngle = THREE.MathUtils.degToRad(40)
    controls.maxPolarAngle = THREE.MathUtils.degToRad(75)
    controls.target.set(0, 0.9, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.update()

    scene.add(new THREE.AmbientLight(0x334455, 1.1))
    const key = new THREE.DirectionalLight(0xbfe9ff, 1.4)
    key.position.set(5, 6, 4)
    scene.add(key)
    const rim = new THREE.PointLight(0x3ed6c4, 1.2, 30)
    rim.position.set(-6, 2, -4)
    scene.add(rim)

    const starGeo = new THREE.BufferGeometry()
    const starCount = 260
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 80
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 80
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8fb3c9, size: 0.06 })))

    const radarGroup = new THREE.Group()
    radarGroup.position.y = -3.4
    ;[2, 4, 6, 8].forEach((r) => {
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 65 }, (_, i) => {
            const a = (i / 64) * Math.PI * 2
            return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)
          })
        ),
        new THREE.LineBasicMaterial({ color: 0x3ed6c4, transparent: true, opacity: 0.16 })
      )
      radarGroup.add(ring)
    })
    ;[0, Math.PI / 2].forEach((angle) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * -8, 0, Math.sin(angle) * -8),
        new THREE.Vector3(Math.cos(angle) * 8, 0, Math.sin(angle) * 8),
      ])
      radarGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x3ed6c4, transparent: true, opacity: 0.12 })))
    })
    const sweep = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48, 0, Math.PI / 5),
      new THREE.MeshBasicMaterial({ color: 0x3ed6c4, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    )
    sweep.rotation.x = -Math.PI / 2
    radarGroup.add(sweep)
    scene.add(radarGroup)

    const debris = []
    for (let i = 0; i < 10; i++) {
      const danger = Math.random() < 0.22
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.09 + Math.random() * 0.06, 0),
        new THREE.MeshStandardMaterial({ color: danger ? 0xff5c5c : 0x8a96ab, emissive: danger ? 0x551515 : 0x000000 })
      )
      const radius = 4.2 + Math.random() * 4.2
      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 3.5
      mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      scene.add(mesh)
      debris.push({ mesh, angle, radius, y, speed: (Math.random() - 0.5) * 0.006 + 0.002, danger })
    }
    setDangerCount(debris.filter((d) => d.danger).length)

    const { craft, nodePositions, dish, flames } = craftType === 'spacecraft' ? buildSpacecraftModel() : buildSatelliteModel()
    craft.scale.setScalar(0.82)
    scene.add(craft)

    const nodeMeshes = {}
    SUBSYSTEMS.forEach((s) => {
      const pos = nodePositions[s.id]
      const nodeMat = new THREE.MeshBasicMaterial({ color: HEALTH_COLOR[healthRef.current[s.id]] })
      const nodeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), nodeMat)
      nodeMesh.position.copy(pos)
      craft.add(nodeMesh)
      nodeMeshes[s.id] = nodeMesh
    })

    function resize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    let raf
    const clock = new THREE.Clock()
    function animate() {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      radarGroup.rotation.y = t * 0.35

      craft.position.y = Math.sin(t * 0.4) * 0.09
      craft.rotation.z = Math.sin(t * 0.25) * 0.015
      if (dish) dish.rotation.z = Math.sin(t * 0.6) * 0.08

      flames.forEach((flame, i) => {
        const pulse = 0.4 + Math.abs(Math.sin(t * 9 + i * 0.6)) * 0.4
        flame.material.opacity = pulse
        flame.scale.y = 0.9 + Math.sin(t * 12 + i * 0.6) * 0.15
      })

      debris.forEach((d) => {
        d.angle += d.speed
        d.mesh.position.set(Math.cos(d.angle) * d.radius, d.y + Math.sin(t + d.angle) * 0.15, Math.sin(d.angle) * d.radius)
        d.mesh.rotation.x += 0.01
        d.mesh.rotation.y += 0.01
        if (d.danger) {
          const pulse = 0.5 + Math.sin(t * 4) * 0.3
          d.mesh.material.emissiveIntensity = pulse
        }
      })

      SUBSYSTEMS.forEach((s) => {
        const health = healthRef.current[s.id]
        const mesh = nodeMeshes[s.id]
        mesh.material.color.setHex(HEALTH_COLOR[health])
        const scalePulse = health === 'nominal' ? 1 : 1 + Math.sin(t * 6) * 0.35
        mesh.scale.setScalar(scalePulse)
      })

      const rect = mount.getBoundingClientRect()
      SUBSYSTEMS.forEach((s) => {
        const el = labelRefs.current[s.id]
        if (!el) return
        const worldPos = nodeMeshes[s.id].getWorldPosition(new THREE.Vector3())
        const ndc = worldPos.project(camera)
        const x = (ndc.x * 0.5 + 0.5) * rect.width
        const y = (-ndc.y * 0.5 + 0.5) * rect.height
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
        el.style.opacity = ndc.z > 1 ? '0' : '1'
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [craftType])

  return (
    <div className="panel twin-stage-3d">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="panel-title">
          Digital Twin — Live 3D Model &amp; Proximity Radar
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setCraftType('satellite')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 4,
              border: `1px solid ${craftType === 'satellite' ? 'var(--cyan)' : 'rgba(255,255,255,0.15)'}`,
              background: craftType === 'satellite' ? 'rgba(62,214,196,0.12)' : 'transparent',
              color: craftType === 'satellite' ? 'var(--cyan)' : 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            Satellite
          </button>
          <button
            onClick={() => setCraftType('spacecraft')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 4,
              border: `1px solid ${craftType === 'spacecraft' ? 'var(--cyan)' : 'rgba(255,255,255,0.15)'}`,
              background: craftType === 'spacecraft' ? 'rgba(62,214,196,0.12)' : 'transparent',
              color: craftType === 'spacecraft' ? 'var(--cyan)' : 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            Spacecraft
          </button>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: dangerCount ? 'var(--amber)' : 'var(--text-dim)' }}>
          {dangerCount > 0 ? `${dangerCount} debris flagged` : 'sector clear'} · drag to orbit
        </span>
      </div>
      <div className="panel-body twin3d-body">
        <div ref={mountRef} className="twin3d-canvas-mount" />
        {SUBSYSTEMS.map((s) => (
          <div
            key={s.id}
            ref={(el) => (labelRefs.current[s.id] = el)}
            className={`twin3d-label health-${HEALTH_CSS[subsystemHealth[s.id]]}`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}