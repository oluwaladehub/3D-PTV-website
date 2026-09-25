import './style.css';
import './rotation.css';
import { initScene } from './scene.js';
import { products as finishes, artwork } from './products.js';
import { viewerMarkup, mountViewer } from './rotation.js';

const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m9 6 6 6-6 6"/></svg>',
};
const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
let bag = [];
try { bag = JSON.parse(localStorage.getItem('ptv-bag') || '[]').filter(item => finishes.some(p => p.id === item.id) && ['XS','S','M','L','XL'].includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0).map(item => ({ ...item, quantity: Math.min(item.quantity, 10) })); } catch { bag = []; }
let activeFinish = 0;
let selectedSize = 'M';
let previousFocus;
let detailViewer;

document.querySelector('#app').innerHTML = `
  <a class="skip-link" href="#collection">Skip to collection</a>
  <main class="site-shell">
    <section class="hero" id="home" aria-label="PTV Edition 001">
      <div class="hero-atmosphere" aria-hidden="true"></div>
      <canvas id="landscape" aria-hidden="true"></canvas>
      <div class="grain" aria-hidden="true"></div>
      <header class="header">
        <a href="#home" class="wordmark" aria-label="PTV home">PTV.</a>
        <nav aria-label="Main navigation"><a class="nav-link active" href="#home">Collection</a><a class="nav-link" href="#collection">Shop</a><a class="nav-link" href="#story">Story</a></nav>
        <div class="header-actions"><button class="icon-button search-trigger" aria-label="Search collection">${icons.search}</button><a class="contact-link" href="#story">Studio</a><span class="nav-divider"></span><button class="bag-trigger">Bag (<span class="bag-count">0</span>)</button></div>
      </header>
      <div class="edition-label eyebrow">PTV / 001<br>New perspective<br>Autumn — Winter 2026</div>
      <h1 class="hero-title"><span>PTV.</span><span>CLOTHING</span></h1>
      <div class="garment-stage">${viewerMarkup(finishes[0], { hero: true })}</div>
      <div class="ground-light" aria-hidden="true"></div>
      <div class="hero-copy"><p>Worn different.</p><span>Designed for presence.</span><a class="text-link" href="#collection">Explore the drop ${icons.arrow}</a></div>
      <button class="product-annotation" aria-label="View structured overshirt details"><span class="short-line"></span><b>PTV.01</b><span>Structured overshirt<br>420 GSM · 100% cotton<br>Edition 001</span><span class="annotation-finish">Washed black</span></button>
      <div class="hero-bottom"><a href="#collection" class="scroll-cue">Scroll to discover <span>↓</span></a><span class="hero-caption">Considered form. Uncompromised character.</span><div class="slide-controls"><div class="slide-tabs" role="group" aria-label="Select garment finish">${finishes.map((p,i) => `<button class="slide-tab ${i === 0 ? 'selected' : ''}" data-slide="${i}" aria-label="${p.color}" aria-pressed="${i === 0}">0${i+1}</button>`).join('')}</div><button class="round-button previous" aria-label="Previous finish">${icons.chevron}</button><button class="round-button next" aria-label="Next finish">${icons.chevron}</button></div></div>
    </section>
    <div class="collection-strip"><span><i></i> Edition 001 — now available</span><span>Made to be worn. Made to stay.</span><a href="#collection">Discover the collection ${icons.arrow}</a></div>
    <section class="collection" id="collection"><div class="section-heading"><div><p class="eyebrow">The first chapter / 001</p><h2>Everyday. Anything but ordinary.</h2></div><span class="collection-count">04 silhouettes. Every angle.</span></div><div class="product-grid">${finishes.map((product, index) => `
      <article class="product-card"><div class="product-image-button"><span class="product-index">0${index+1} / ${product.code}</span><span class="card-tag">360° view</span>${viewerMarkup(product, { compact: true })}</div><button class="discover-product" data-product="${index}" aria-label="Shop ${product.name}, ${product.color}">Discover the piece ${icons.arrow}</button><div class="product-info"><div><h3><button data-product="${index}">${product.name}</button></h3><p><span class="swatch" style="--swatch:${product.hex}"></span>${product.color}</p></div><span>${money(product.price)}</span></div></article>`).join('')}</div></section>
    <section class="story" id="story"><div class="story-label"><p class="eyebrow">A different perspective</p><span class="story-symbol" aria-hidden="true">↗</span></div><div class="story-content"><h2>Less noise.<br>More <em>presence.</em></h2><p>Clothing should feel like an extension of you. We work with considered shapes, substantial fabrics, and the details that only get better with time.</p><p>No overstatement. Just pieces with a point of view.</p><a class="text-link" href="#collection">Find your perspective ${icons.arrow}</a></div><span class="story-watermark" aria-hidden="true">PTV.</span></section>
    <footer><a class="wordmark" href="#home">PTV.</a><span>Independent spirit. Everyday uniform.</span><span>© 2026 PTV. Clothing</span><a href="#home">Back to top ↑</a></footer>
  </main>
  <dialog class="product-dialog"><button class="dialog-close icon-button" aria-label="Close product details">${icons.close}</button><div id="product-detail"></div></dialog>
  <dialog class="bag-dialog"><div class="drawer-heading"><h2>Your bag <span class="bag-count">0</span></h2><button class="dialog-close icon-button" aria-label="Close bag">${icons.close}</button></div><div id="bag-content"></div></dialog>
  <dialog class="search-dialog"><div class="drawer-heading"><h2>Find your perspective.</h2><button class="dialog-close icon-button" aria-label="Close search">${icons.close}</button></div><label class="search-field">${icons.search}<input id="search-input" type="search" placeholder="Search the collection…" autocomplete="off" aria-label="Search products" /></label><div id="search-results"></div></dialog>
  <div class="toast" role="status" aria-live="polite"></div>
`;

const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroViewer = mountViewer(document.querySelector('.rotation-hero'), finishes[0]);
const cardViewers = [...document.querySelectorAll('.product-card .rotation-viewer')].map((root, index) => mountViewer(root, finishes[index]));
initScene(document.querySelector('#landscape'), hero, reducedMotion);
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch' || event.target.closest('.rotation-viewer')) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width - .5).toFixed(3));
  hero.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height - .5).toFixed(3));
});
hero.addEventListener('pointerleave', () => { hero.style.setProperty('--pointer-x', 0); hero.style.setProperty('--pointer-y', 0); });

function changeFinish(index) {
  activeFinish = (index + finishes.length) % finishes.length;
  const product = finishes[activeFinish];
  heroViewer.setProduct(product);
  const annotation = document.querySelector('.product-annotation');
  annotation.setAttribute('aria-label', `View ${product.name.replace('The ', '')} details`);
  annotation.querySelector('b').textContent = product.code;
  annotation.querySelector('b + span').innerHTML = `${product.name.replace('The ', '')}<br>${product.fabric}<br>Edition 001`;
  document.querySelector('.annotation-finish').textContent = product.color;
  document.querySelectorAll('.slide-tab').forEach((tab, i) => { tab.classList.toggle('selected', i === activeFinish); tab.setAttribute('aria-pressed', String(i === activeFinish)); });
}
document.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => changeFinish(Number(button.dataset.slide))));
document.querySelector('.previous').addEventListener('click', () => changeFinish(activeFinish - 1));
document.querySelector('.next').addEventListener('click', () => changeFinish(activeFinish + 1));

function openDialog(dialog) {
  heroViewer.pause();
  cardViewers.forEach(viewer => viewer.pause());
  const alreadyOpen = document.querySelector('dialog[open]');
  if (!alreadyOpen) previousFocus = document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(item => item.close());
  dialog.showModal();
  document.body.classList.add('modal-open');
}
function closeDialog(dialog) { detailViewer?.pause(); dialog.close(); document.body.classList.remove('modal-open'); previousFocus?.focus(); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
});

function productDetail(index) {
  const product = finishes[index];
  detailViewer?.destroy();
  document.querySelector('#product-detail').innerHTML = `<div class="detail-image"><span class="eyebrow">Edition 001 / ${product.code}</span>${viewerMarkup(product)}<span class="detail-view-note">A different perspective. From every side.</span></div><div class="detail-copy"><p class="eyebrow">Form meets feeling</p><h2>${product.name}</h2><span class="detail-price">${money(product.price)}</span><p class="detail-description">${product.description}</p><p class="field-label">Finish — ${product.color}</p><div class="finish-options">${finishes.map((p, i) => p.family === product.family ? `<button style="--swatch:${p.hex}" class="finish-swatch ${i === index ? 'chosen' : ''}" data-finish="${i}" aria-label="${p.color}" aria-pressed="${i === index}"></button>` : '').join('')}</div><div class="size-heading"><span class="field-label">Select size</span><span>${product.fit}</span></div><div class="size-options" role="group" aria-label="Select size">${['XS','S','M','L','XL'].map(size => `<button class="${size === selectedSize ? 'chosen' : ''}" data-size="${size}" aria-pressed="${size === selectedSize}">${size}</button>`).join('')}</div><button class="add-button">Add to bag — ${money(product.price)} ${icons.arrow}</button><p class="detail-note">${product.fabric} · Unisex · Designed for everyday</p><details><summary>Fabric & care <span>+</span></summary><p>${product.care}</p></details><details><summary>Size & fit <span>+</span></summary><p>${product.fit}. Choose your usual size for an easy fit or size down for a closer shape. Model-free imagery shows the shape of the garment.</p></details><p class="sample-note">Concept collection. Sample pricing in USD.</p></div>`;
  detailViewer = mountViewer(document.querySelector('.detail-image .rotation-viewer'), product);
  document.querySelectorAll('[data-finish]').forEach(button => button.addEventListener('click', () => productDetail(Number(button.dataset.finish))));
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
    selectedSize = button.dataset.size;
    document.querySelectorAll('[data-size]').forEach(item => { item.classList.toggle('chosen', item.dataset.size === selectedSize); item.setAttribute('aria-pressed', String(item.dataset.size === selectedSize)); });
  }));
  document.querySelector('.add-button').addEventListener('click', () => {
    const existing = bag.find(item => item.id === product.id && item.size === selectedSize);
    if (existing?.quantity >= 10) { toast('Maximum 10 of each size per bag.'); return; }
    if (existing) existing.quantity++; else bag.push({ id: product.id, size: selectedSize, quantity: 1 });
    saveBag();
    closeDialog(document.querySelector('.product-dialog'));
    toast(`${product.color} / ${selectedSize} added to your bag`);
  });
}
function showProduct(index) { productDetail(index); openDialog(document.querySelector('.product-dialog')); }
document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => showProduct(Number(button.dataset.product))));
document.querySelector('.product-annotation').addEventListener('click', () => showProduct(activeFinish));

function saveBag() {
  try { localStorage.setItem('ptv-bag', JSON.stringify(bag)); } catch { /* The bag remains available for this session. */ }
  document.querySelectorAll('.bag-count').forEach(element => element.textContent = bag.reduce((total, item) => total + item.quantity, 0));
}
function renderBag() {
  const content = document.querySelector('#bag-content');
  if (!bag.length) {
    content.innerHTML = `<div class="empty-bag"><span class="empty-symbol">P.</span><h3>A little room for perspective.</h3><p>Your bag is waiting for its first piece.</p><button class="solid-button continue-shopping">Explore the collection ${icons.arrow}</button></div>`;
    content.querySelector('.continue-shopping').addEventListener('click', () => { closeDialog(document.querySelector('.bag-dialog')); document.querySelector('#collection').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' }); });
    return;
  }
  content.innerHTML = `<div class="bag-items">${bag.map((item, i) => {
    const product = finishes.find(p => p.id === item.id);
    return `<article class="bag-item"><div class="bag-item-image">${artwork(product)}</div><div class="bag-item-info"><h3>${product.name}</h3><p>${product.color} / ${item.size}</p><span>${money(product.price)}</span><div class="quantity-controls"><button data-quantity="${i}" data-delta="-1" aria-label="Decrease ${product.color} quantity">−</button><span>${item.quantity}</span><button data-quantity="${i}" data-delta="1" aria-label="Increase ${product.color} quantity" ${item.quantity >= 10 ? 'disabled' : ''}>+</button><button class="remove-item" data-remove="${i}">Remove</button></div></div></article>`;
  }).join('')}</div><div class="bag-summary"><div><span>Subtotal</span><strong>${money(bag.reduce((sum, item) => sum + finishes.find(p => p.id === item.id).price * item.quantity, 0))}</strong></div><p>This is a preview store. Checkout is not available yet, and no payment will be taken.</p><button class="solid-button continue-shopping">Continue exploring ${icons.arrow}</button></div>`;
  content.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.quantity);
    bag[index].quantity += Number(button.dataset.delta);
    bag = bag.filter(item => item.quantity > 0);
    saveBag(); renderBag();
  }));
  content.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { bag.splice(Number(button.dataset.remove), 1); saveBag(); renderBag(); }));
  content.querySelector('.continue-shopping').addEventListener('click', () => closeDialog(document.querySelector('.bag-dialog')));
}
document.querySelector('.bag-trigger').addEventListener('click', () => { renderBag(); openDialog(document.querySelector('.bag-dialog')); });
function renderSearch(query = '') {
  const results = finishes.map((product, index) => ({...product, index})).filter(product => `${product.name} ${product.color} ${product.code} cotton`.toLowerCase().includes(query.toLowerCase().trim()));
  document.querySelector('#search-results').innerHTML = `<p class="eyebrow results-count">${results.length} ${results.length === 1 ? 'piece' : 'pieces'} found</p>${results.length ? results.map(p => `<button class="search-result" data-result="${p.index}"><span class="search-thumb">${artwork(p)}</span><span><strong>${p.name}</strong><small>${p.color}</small></span><span>${money(p.price)}</span>${icons.arrow}</button>`).join('') : '<p class="no-results">No pieces found. Try “overshirt”, “tee”, “hoodie”, or “cargo”.</p>'}`;
  document.querySelectorAll('[data-result]').forEach(button => button.addEventListener('click', () => showProduct(Number(button.dataset.result))));
}
document.querySelector('.search-trigger').addEventListener('click', () => { document.querySelector('#search-input').value = ''; renderSearch(); openDialog(document.querySelector('.search-dialog')); document.querySelector('#search-input').focus(); });
document.querySelector('#search-input').addEventListener('input', event => renderSearch(event.target.value));
let toastTimer;
function toast(message) { const element = document.querySelector('.toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3500); }
const sectionObserver = new IntersectionObserver(entries => { for (const entry of entries) { if (entry.isIntersecting) document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`)); } }, { rootMargin: '-15% 0px -55% 0px' });
['home','collection','story'].forEach(id => sectionObserver.observe(document.getElementById(id)));
saveBag();
