import { artwork } from './products.js';
import { createClothMotion } from './cloth-motion.js';

const FRAMES = 12;
const wrap = value => ((value % FRAMES) + FRAMES) % FRAMES;
const viewName = frame => frame === 0 ? 'Front' : frame === 6 ? 'Back' : frame === 3 ? 'Right side' : frame === 9 ? 'Left side' : frame < 3 || frame > 9 ? 'Front angle' : frame > 3 && frame < 9 ? 'Back angle' : 'Side angle';

export function viewerMarkup(product, { compact = false, hero = false } = {}) {
  return `<div class="rotation-viewer ${compact ? 'rotation-compact' : ''} ${hero ? 'rotation-hero' : ''}">
    <div class="rotation-surface" tabindex="0" role="slider" aria-label="Rotate ${product.name}, ${product.color}" aria-valuemin="0" aria-valuemax="330" aria-valuenow="0" aria-valuetext="Front, 0 degrees" aria-orientation="horizontal" aria-description="Drag left or right, or use the arrow keys to rotate. Home shows the front; End shows the back.">
      ${artwork(product, 'rotation-art', hero ? 'eager' : 'lazy')}
      <span class="rotation-loading">Loading views…</span>
    </div>
    <div class="rotation-toolbar"><span class="rotation-hint">↔ <span>Drag to rotate</span></span><span class="rotation-reading">Front · 0°</span><div class="rotation-actions"><button type="button" data-view="0" aria-label="Show front" aria-pressed="true">Front</button><button type="button" data-view="6" aria-label="Show back" aria-pressed="false">Back</button><button type="button" class="rotation-play" aria-label="Start automatic rotation" aria-pressed="false">↻</button></div></div>
  </div>`;
}

export function mountViewer(root, initialProduct) {
  let product = initialProduct, frame = 0, activePointer = null, startX = 0, startY = 0, startFrame = 0;
  let dragging = false, moved = false, playing = false, visible = false, timer = null;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const surface = root.querySelector('.rotation-surface');
  const art = root.querySelector('.rotation-art');
  const image = art.querySelector('img');
  const play = root.querySelector('.rotation-play');
  const reading = root.querySelector('.rotation-reading');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const cloth = createClothMotion(art, image, initialProduct);
  function render(value, animate = true) {
    const previousFrame = frame;
    frame = wrap(Math.round(value));
    cloth.setFrame(frame);
    if (animate && frame !== previousFrame) {
      const step = (frame - previousFrame + 18) % FRAMES - 6;
      cloth.kick(step);
    }
    // One image contains four columns and three rows. Move the full sheet behind a single square window.
    image.style.left = `${-(frame % 4) * 100}%`;
    image.style.top = `${-Math.floor(frame / 4) * 100}%`;
    root.dataset.frame = String(frame);
    surface.setAttribute('aria-valuenow', String(frame * 30));
    surface.setAttribute('aria-valuetext', `${viewName(frame)}, ${frame * 30} degrees`);
    image.alt = `${product.name}, ${product.color}, ${viewName(frame).toLowerCase()} view`;
    reading.textContent = `${viewName(frame)} · ${frame * 30}°`;
    root.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === frame)));
  }
  function schedule() {
    clearInterval(timer); timer = null;
    if (playing && visible && !document.hidden) timer = setInterval(() => render(frame + 1), 300);
  }
  function setPlaying(value) {
    playing = value;
    play.setAttribute('aria-pressed', String(playing));
    play.setAttribute('aria-label', playing ? 'Pause automatic rotation' : 'Start automatic rotation');
    play.textContent = playing ? 'Ⅱ' : '↻';
    schedule();
  }
  function ready() { root.classList.toggle('is-loading', !image.complete); root.classList.toggle('load-failed', image.complete && !image.naturalWidth); }
  image.addEventListener('load', ready, options);
  image.addEventListener('error', () => { root.classList.remove('is-loading'); root.classList.add('load-failed'); root.querySelector('.rotation-loading').textContent = 'Product views could not load. Please refresh.'; }, options);
  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
    activePointer = event.pointerId; startX = event.clientX; startY = event.clientY; startFrame = frame;
    dragging = false; moved = false; setPlaying(false);
    surface.setPointerCapture(event.pointerId);
  }, options);
  surface.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (Math.abs(dx) > 7 || Math.abs(dy) > 7) moved = true;
    if (!dragging && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) dragging = true;
    if (!dragging) return;
    root.classList.add('is-dragging');
    const pixelsPerFrame = Math.max(14, surface.clientWidth * .065);
    render(startFrame + dx / pixelsPerFrame);
  }, options);
  function endPointer(event) {
    if (event.pointerId !== activePointer) return;
    if (event.type === 'pointerup' && !moved) render(frame + 1);
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    activePointer = null; dragging = false; root.classList.remove('is-dragging');
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => surface.addEventListener(name, endPointer, options));
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === ' ') { setPlaying(!playing); return; }
    setPlaying(false);
    render(event.key === 'Home' ? 0 : event.key === 'End' ? 6 : frame + (event.key === 'ArrowRight' ? 1 : -1));
  }, options);
  root.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { setPlaying(false); render(Number(button.dataset.view)); }, options));
  play.addEventListener('click', () => setPlaying(!playing), options);
  document.addEventListener('visibilitychange', schedule, options);
  motionPreference.addEventListener('change', () => { if (motionPreference.matches) setPlaying(false); }, options);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); });
  observer.observe(root);
  function setProduct(next) {
    cloth.setProduct(next);
    product = next; setPlaying(false);
    art.className = `product-art rotation-art ${product.className}`;
    image.src = product.sheet;
    surface.setAttribute('aria-label', `Rotate ${product.name}, ${product.color}`);
    ready(); render(0, false);
  }
  setProduct(initialProduct);
  return {
    setProduct,
    pause: () => { setPlaying(false); cloth.reset(); },
    destroy() { setPlaying(false); cloth.destroy(); observer.disconnect(); controller.abort(); },
  };
}
