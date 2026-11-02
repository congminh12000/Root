import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { color, light } from '../ui/tokens.ts'

/**
 * Late-afternoon light on a model board (style-guide §4), shared by the game's map and the review pages: a warm low sun
 * with long soft shadows over `half` (half-width, half-depth in world units), a warm sky fill, a soft studio
 * environment for the sheen on painted wood and resin, ACES tone mapping and, with `fog`, warm haze over the distance.
 * Returns the sun, `addEnvironment` (with `deferEnvironment`, call it later) and a dispose for the environment.
 */
export function lightTable(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opts: { shadowSize: number; half: [number, number]; fog?: boolean; deferEnvironment?: boolean }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = light.exposure
  let env: THREE.Texture | null = null
  /** The studio environment: its generator compiles shaders on the main thread, so the game adds it after the first frame. */
  const addEnvironment = () => {
    if (env) return
    performance.mark('map:env-start')
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    env = pmrem.fromScene(room, .04).texture
    scene.environment = env
    scene.environmentIntensity = light.envIntensity
    room.dispose(); pmrem.dispose()
    performance.measure('map:env', 'map:env-start')
  }
  if (!opts.deferEnvironment) addEnvironment()
  if (opts.fog) {
    const base = scene.background instanceof THREE.Color ? scene.background.clone() : new THREE.Color(color.pine)
    scene.fog = new THREE.Fog(base.lerp(new THREE.Color(color.paper), light.fogMix), light.fogNear, light.fogFar)
  }
  scene.add(new THREE.HemisphereLight(light.sky, light.ground, light.skyIntensity))
  const sun = new THREE.DirectionalLight(light.sun, light.sunIntensity)
  sun.position.set(...light.sunAt); sun.castShadow = true
  sun.shadow.mapSize.set(opts.shadowSize, opts.shadowSize)
  const [w, d] = opts.half
  Object.assign(sun.shadow.camera, { left: -w, right: w, top: d, bottom: -d, near: 1, far: 90 })
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03
  scene.add(sun)
  return { sun, addEnvironment, dispose: () => env?.dispose() }
}
