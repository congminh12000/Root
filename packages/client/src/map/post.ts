import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js'
import { LABEL_LAYER as LABELS } from '../board/toon.ts'
import { grade } from '../ui/tokens.ts'
import type { Quality } from './quality.ts'

/**
 * The photo treatment of the tabletop look (style-guide §4): contact shadows (GTAO) where pieces and trees meet the
 * board, a tilt-shift blur away from the middle band that grows as you zoom in (a macro lens on a miniature, capped so
 * pieces stay readable), then a warm print grade with a vignette and a little grain. Labels (sprites, layer 1) are
 * drawn afterwards, sharp and untouched. Loaded after the first frame; its shaders compile off the main thread first.
 */
const n = (v: number) => v.toFixed(4)
export const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, seed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float seed; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb * vec3(${grade.warm.map(n).join(', ')});
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, ${n(grade.saturation)});
      c *= mix(${n(grade.vignette)}, 1.0, smoothstep(.95, ${n(grade.vignetteFrom)}, distance(vUv, vec2(.5))));
      c += (hash(vUv * 900.0) - .5) * ${n(grade.grain)};
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
}

/** Blur in px for a camera zoom (zoom 1 is the whole board). */
export const tiltBlur = (zoom: number) => Math.min(grade.tiltMax, grade.tiltBase + grade.tiltPerZoom * zoom)

export interface Post { render(): void; setSize(w: number, h: number): void; setAO(enabled: boolean): void; dispose(): void }

export async function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera, quality: Quality): Promise<Post> {
  performance.mark('map:post-start')
  const size = renderer.getSize(new THREE.Vector2())
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  const gtao = quality.ao ? new GTAOPass(scene, camera, size.x, size.y) : null
  if (gtao) {
    gtao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1 })
    composer.addPass(gtao)
  }
  const tiltH = new ShaderPass(HorizontalTiltShiftShader), tiltV = new ShaderPass(VerticalTiltShiftShader)
  composer.addPass(tiltH); composer.addPass(tiltV)
  const graded = new ShaderPass(GradeShader)
  composer.addPass(graded)
  composer.addPass(new OutputPass())
  composer.setSize(size.x, size.y)

  // Compile the passes' own shaders off the main thread, like the scene's (map/stage.ts).
  const shaders = new THREE.Scene(), quad = new THREE.PlaneGeometry(1, 1)
  for (const pass of composer.passes) for (const value of Object.values(pass)) if (value instanceof THREE.Material) shaders.add(new THREE.Mesh(quad, value))
  try { await renderer.compileAsync(shaders, camera) } catch { /* the page went away */ }
  quad.dispose()
  performance.measure('map:post', 'map:post-start')

  return {
    render() {
      const blur = tiltBlur(camera.zoom), s = renderer.getSize(new THREE.Vector2())
      tiltH.uniforms.h!.value = blur / s.x; tiltV.uniforms.v!.value = blur / s.y
      tiltH.uniforms.r!.value = tiltV.uniforms.r!.value = .5
      graded.uniforms.seed!.value = 0
      camera.layers.set(0)
      composer.render()
      // Labels on top: no clear and no background, so the treated image stays underneath.
      const background = scene.background
      scene.background = null; camera.layers.set(LABELS); renderer.autoClear = false
      renderer.render(scene, camera)
      scene.background = background; camera.layers.enableAll(); renderer.autoClear = true
    },
    setAO(enabled) { if (gtao) gtao.enabled = enabled },
    setSize(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); gtao?.setSize(w, h) },
    dispose() { for (const pass of composer.passes) pass.dispose(); composer.dispose(); target.dispose() },
  }
}
