import * as THREE from 'three';

export function initScene(canvas, container, reducedMotion) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x11120f, .038);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 4, 23);
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.AmbientLight(0xa9a78c, .75));
  const keyLight = new THREE.DirectionalLight(0xd5c5a8, 2.2);
  keyLight.position.set(-6, 9, 5);
  scene.add(keyLight);
  const geometry = new THREE.PlaneGeometry(65, 38, 180, 100);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const wave = Math.sin(x * .38 + z * .12) * Math.cos(z * .24) * 1.35;
    const ridge = Math.pow(Math.sin(x * .17 - z * .10), 2) * 2.0;
    const detail = Math.sin(x * 2.1 + z * 1.2) * .11 + Math.cos(z * 3 - x) * .07;
    positions.setY(i, wave + ridge + detail - 6.8);
  }
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: 0x25261f, roughness: .98, metalness: .1, flatShading: true}));
  scene.add(terrain);
  let pointerX = 0, pointerY = 0, visible = true;
  container.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const rect = container.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - .5;
    pointerY = (event.clientY - rect.top) / rect.height - .5;
  });
  container.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.render(scene, camera); }).observe(container);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const targetX = reducedMotion.matches ? 0 : pointerX * 1.3;
    const targetY = reducedMotion.matches ? 4 : 4 + pointerY * .5;
    camera.position.x += (targetX - camera.position.x) * .035;
    camera.position.y += (targetY - camera.position.y) * .035;
    camera.lookAt(0, -1, 0);
    renderer.render(scene, camera);
  });
}
