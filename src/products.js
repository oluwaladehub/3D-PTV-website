const overshirt = {
  family: 'overshirt', name: 'The structured overshirt', code: 'PTV.01', price: 145,
  sheet: '/assets/overshirt-turntable.png', fabric: '420 GSM cotton', fit: 'Relaxed fit',
  description: 'A substantial layer with an effortless shape. Cut from 420 GSM cotton with a washed finish, generous pockets, and an easy, boxy fit.',
  care: 'Heavyweight 420 GSM cotton. Machine wash cold with similar colors. Hang dry. Wear often.',
};

export const products = [
  { ...overshirt, id: 'washed-black', color: 'Washed black', className: 'black', hex: '#373831' },
  { ...overshirt, id: 'stone', color: 'Stone', className: 'stone', hex: '#aaa591' },
  { ...overshirt, id: 'olive', color: 'Field olive', className: 'olive', hex: '#666b45' },
  {
    id: 'heavyweight-tee', family: 'tee', name: 'The heavyweight tee', code: 'PTV.02', price: 55,
    color: 'Bone', className: 'natural', hex: '#ded9c9', sheet: '/assets/tee-turntable.png',
    fabric: '280 GSM cotton', fit: 'Boxy fit',
    description: 'An everyday essential with a little more substance. Heavy cotton, a generous crew neck, and a dropped shoulder. Quiet up front. A statement on the back.',
    care: '280 GSM cotton jersey. Wash inside out on cold. Hang dry. Do not iron directly on the print.',
  },
  {
    id: 'essential-hoodie', family: 'hoodie', name: 'The essential hoodie', code: 'PTV.03', price: 110,
    color: 'Faded charcoal', className: 'natural', hex: '#484a46', sheet: '/assets/hoodie-turntable.png',
    fabric: '460 GSM cotton fleece', fit: 'Oversized fit',
    description: 'Weight you can feel. A generous silhouette, a substantial double-layer hood, and soft brushed cotton on the inside. Your everyday uniform, reconsidered.',
    care: '460 GSM cotton fleece. Machine wash cold with similar colors. Reshape while damp and dry flat.',
  },
  {
    id: 'utility-cargo', family: 'cargo', name: 'The utility cargo', code: 'PTV.04', price: 125,
    color: 'Moss', className: 'natural', hex: '#74765b', sheet: '/assets/cargo-turntable.png',
    fabric: '320 GSM cotton twill', fit: 'Relaxed straight fit',
    description: 'Purpose in every detail. Durable cotton twill, six considered pockets, and an easy straight leg. An adjustable waist moves with you from morning to late.',
    care: '320 GSM cotton twill. Close all fastenings before washing. Machine wash cold and hang dry.',
  },
];

export function artwork(product, extraClass = '', loading = 'lazy') {
  return `<span class="product-art ${product.className} ${extraClass}"><img src="${product.sheet}" alt="${product.name}, ${product.color}, front view" loading="${loading}" draggable="false" /></span>`;
}
