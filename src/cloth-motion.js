import * as THREE from 'three';

// One shared renderer deforms the existing product image. No extra image assets
// or per-product WebGL contexts are needed. Only moving, visible viewers draw.
let pipeline;
let unavailable = false;
let animation = 0;
const active = new Set();
const textures = new Map();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function getPipeline() {
  if (pipeline || unavailable) return pipeline;
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-.5, .5, .5, -.5, .1, 10);
    camera.position.z = 2;
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: {
        sheet: { value: null }, frame: { value: 0 }, family: { value: 0 },
        sway: { value: 0 }, flutter: { value: 0 }, time: { value: 0 },
      },
      vertexShader: `
        uniform float frame, family, sway, flutter, time;
        varying vec2 garmentUv;
        void main() {
          garmentUv = uv;
          vec3 p = position;
          float down = 1.0 - uv.y;
          float side = smoothstep(0.12, 0.33, abs(p.x));
          float lower = smoothstep(0.30, 0.91, down);
          float angle = frame * 0.523598776;
          float facing = 0.30 + 0.70 * abs(cos(angle));
          float left = 1.0 - smoothstep(-0.05, 0.05, p.x);
          float wave = sin(time * 7.0 - down * 3.2 + left * 1.6);
          float sleeve = side * smoothstep(0.16, 0.55, down);
          float hem = smoothstep(0.70, 0.94, down);
          if (family > 1.5) {
            // Pin the waistband; two legs lag independently toward the hems.
            float legs = smoothstep(0.28, 0.93, down);
            p.x += legs * (sway * 0.024 + flutter * wave * 0.010);
            p.y += legs * flutter * sin(time * 6.0 + left * 2.0) * 0.004;
          } else {
            // Collars remain anchored. Side sleeves move more than the torso.
            float shortSleeve = family > 0.5 ? 0.60 : 1.0;
            p.x += sway * (sleeve * 0.020 * shortSleeve * facing + lower * 0.004);
            p.x += flutter * wave * (sleeve * 0.008 * shortSleeve * facing + hem * 0.003);
            p.y += flutter * sin(time * 6.4 + left * 1.8) * sleeve * 0.003 * facing;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D sheet;
        uniform float frame;
        varying vec2 garmentUv;
        void main() {
          float col = mod(frame, 4.0);
          float row = floor(frame / 4.0);
          // Keep atlas samples inside the selected view, including at its edges.
          vec2 localUv = clamp(garmentUv, vec2(0.001), vec2(0.999));
          vec2 atlasUv = vec2((col + localUv.x) / 4.0, (2.0 - row + localUv.y) / 3.0);
          gl_FragColor = texture2D(sheet, atlasUv);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 36, 42), material));
    pipeline = { renderer, scene, camera, material, size: 0 };
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); unavailable = true;
      [...active].forEach(motion => motion.reset());
    });
    return pipeline;
  } catch {
    unavailable = true;
    return null;
  }
}

function animate(now) {
  animation = 0;
  for (const motion of active) motion.tick(now);
  if (active.size) animation = requestAnimationFrame(animate);
}

export function createClothMotion(art, image, product) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cloth-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  art.append(canvas);
  const context = canvas.getContext('2d');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let currentProduct = product, frame = 0, enabled = true, visible = false;
  let displacement = 0, velocity = 0, energy = 0, lastTime = 0, phase = 0, size = 0;

  function reset() {
    active.delete(api);
    displacement = velocity = energy = lastTime = phase = 0;
    art.classList.remove('cloth-active');
    if (!active.size && animation) { cancelAnimationFrame(animation); animation = 0; }
  }
  function draw() {
    const gpu = getPipeline();
    if (!gpu || !context || !image.complete || !image.naturalWidth) { reset(); return; }
    let texture = textures.get(image.src);
    if (!texture) {
      texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      textures.set(image.src, texture);
    }
    if (gpu.size !== size) { gpu.renderer.setSize(size, size, false); gpu.size = size; }
    const uniforms = gpu.material.uniforms;
    uniforms.sheet.value = texture;
    uniforms.frame.value = frame;
    uniforms.family.value = currentProduct.family === 'cargo' ? 2 : currentProduct.family === 'tee' ? 1 : 0;
    uniforms.sway.value = displacement;
    uniforms.flutter.value = energy;
    uniforms.time.value = phase;
    gpu.renderer.render(gpu.scene, gpu.camera);
    context.clearRect(0, 0, size, size);
    context.drawImage(gpu.renderer.domElement, 0, 0);
    art.classList.add('cloth-active');
  }
  const api = {
    kick(amount) {
      // A just-opened dialog can receive input before IntersectionObserver runs.
      if (!visible) {
        const bounds = art.getBoundingClientRect();
        visible = bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0 && bounds.top < innerHeight && bounds.left < innerWidth;
      }
      if (!enabled || !visible || document.hidden || preference.matches || unavailable || !context || !image.complete || !image.naturalWidth || !amount) return;
      if (!active.has(api)) {
        size = Math.max(1, Math.min(900, Math.round(art.clientWidth * Math.min(devicePixelRatio || 1, 1.5))));
        canvas.width = canvas.height = size;
        lastTime = performance.now();
      }
      velocity = clamp(velocity + clamp(amount, -2, 2) * 2.8, -7, 7);
      energy = Math.min(1, energy + Math.min(Math.abs(amount), 2) * .22);
      active.add(api);
      if (!animation) animation = requestAnimationFrame(animate);
    },
    tick(now) {
      if (!enabled || !visible || document.hidden || preference.matches || !art.isConnected) { reset(); return; }
      const dt = Math.min((now - lastTime) / 1000, .035);
      lastTime = now; phase += dt;
      // Damped spring: fast drags create more lag, then sleeves/legs settle.
      velocity += (-95 * displacement - 9 * velocity) * dt;
      displacement = clamp(displacement + velocity * dt, -.85, .85);
      energy *= Math.exp(-3.5 * dt);
      if (energy < .003 && Math.abs(displacement) < .001 && Math.abs(velocity) < .01) { reset(); return; }
      draw();
    },
    setFrame(value) { frame = value; if (active.has(api)) draw(); },
    setProduct(value) { reset(); currentProduct = value; },
    reset,
    destroy() { reset(); enabled = false; observer.disconnect(); preference.removeEventListener('change', onPreference); document.removeEventListener('visibilitychange', onVisibility); canvas.remove(); },
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) reset(); });
  observer.observe(art);
  const onPreference = () => { if (preference.matches) reset(); };
  const onVisibility = () => { if (document.hidden) reset(); };
  preference.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);
  return api;
}
