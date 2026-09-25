import { test, expect } from '@playwright/test';

test('desktop storefront, finish selection, search, and persistent bag', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.rotation-hero img')).toBeVisible();
  await expect(page.locator('.rotation-hero img')).toHaveJSProperty('complete', true);
  expect(await page.locator('.rotation-hero img').evaluate(image => image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('.rotation-hero .rotation-toolbar')).toBeHidden();
  await expect(page.locator('.hero-copy')).toBeVisible();
  expect(await page.locator('.rotation-hero img').evaluate(image => image.naturalWidth >= image.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Next finish' }).click();
  await expect(page.locator('.annotation-finish')).toHaveText('Stone');
  await page.getByRole('button', { name: 'View structured overshirt details' }).click();
  await page.getByRole('button', { name: 'L', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.locator('.header .bag-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.header .bag-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Bag (1)' }).click();
  await expect(page.locator('.bag-item')).toContainText('Stone / L');
  await page.getByRole('button', { name: 'Increase Stone quantity' }).click();
  await expect(page.locator('.bag-summary strong')).toHaveText('$290');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('.empty-bag')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Search collection' }).click();
  await page.getByRole('searchbox').fill('olive');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page.locator('.detail-copy')).toContainText('Field olive');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass('modal-open');
  expect(errors).toEqual([]);
});

async function dragToBack(page, viewer) {
  const surface = viewer.getByRole('slider');
  await surface.press('Home');
  const box = await surface.boundingBox();
  const startX = box.x + box.width * .2;
  const y = box.y + box.height * .5;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + Math.max(14, box.width * .065) * 6, y, { steps: 12 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('aria-valuetext', 'Back, 180 degrees');
  expect(await viewer.locator('img').evaluate(img => img.style.left)).toBe('-200%');
}

test('all silhouettes rotate in cards and product popups without breaking shopping', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  const hero = page.locator('.rotation-hero');
  await dragToBack(page, hero);
  await hero.getByRole('slider').press('Home');
  await expect(hero).toHaveAttribute('data-frame', '0');
  await hero.getByRole('slider').press('ArrowLeft');
  await expect(hero).toHaveAttribute('data-frame', '11');
  await hero.getByRole('slider').press('ArrowRight');
  await expect(hero).toHaveAttribute('data-frame', '0');
  for (const [index, family] of [[0, 'overshirt'], [3, 'tee'], [4, 'hoodie'], [5, 'cargo']]) {
    const card = page.locator('.product-card').nth(index);
    await card.scrollIntoViewIfNeeded();
    await dragToBack(page, card.locator('.rotation-viewer'));
    await card.locator('.discover-product').click();
    const viewer = page.locator('.detail-image .rotation-viewer');
    await expect(viewer.locator('img')).toHaveAttribute('src', `/assets/${family}-turntable.png`);
    await dragToBack(page, viewer);
    await expect(viewer.locator('img')).toHaveAttribute('alt', /back view/);
    await viewer.getByRole('button', { name: 'Show front', exact: true }).click();
    await expect(viewer).toHaveAttribute('data-frame', '0');
    if (family === 'tee') await page.screenshot({ path: 'test-results/tee-popup.png' });
    await page.getByRole('button', { name: 'Add to bag' }).click();
  }
  await page.getByRole('button', { name: 'Bag (4)' }).click();
  await expect(page.locator('.bag-item')).toHaveCount(4);
  await expect(page.locator('.bag-summary strong')).toHaveText('$435');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Search collection' }).click();
  await page.getByRole('searchbox').fill('cargo');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await expect(page.locator('.search-result img')).toHaveAttribute('src', '/assets/cargo-turntable.png');
  expect(errors).toEqual([]);
});

test('mobile touch rotation preserves scrolling and supports front/back controls', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');
  const card = page.locator('.product-card').nth(4);
  await card.locator('.discover-product').click();
  const viewer = page.locator('.detail-image .rotation-viewer');
  const slider = viewer.getByRole('slider');
  const box = await slider.boundingBox();
  const client = await context.newCDPSession(page);
  const x = box.x + box.width * .2, y = box.y + box.height * .5;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + box.width * .39 * step / 12, y }] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(slider).toHaveAttribute('aria-valuetext', 'Back, 180 degrees');
  await expect(viewer.locator('.rotation-art')).toHaveClass(/cloth-active/);
  await expect(slider).toHaveCSS('touch-action', 'pan-y');
  await page.screenshot({ path: 'test-results/mobile-hoodie-back.png' });
  await viewer.getByRole('button', { name: 'Show front', exact: true }).tap();
  await expect(viewer).toHaveAttribute('data-frame', '0');
  await viewer.getByRole('button', { name: 'Show back', exact: true }).tap();
  await expect(viewer).toHaveAttribute('data-frame', '6');
  await page.getByRole('button', { name: 'Close product details' }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('automatic rotation pauses on interaction and when a product closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.discover-product').nth(3).click();
  const viewer = page.locator('.detail-image .rotation-viewer');
  await viewer.getByRole('button', { name: 'Start automatic rotation' }).click();
  await expect(viewer).not.toHaveAttribute('data-frame', '0');
  await viewer.getByRole('button', { name: 'Show back', exact: true }).click();
  await expect(viewer.getByRole('button', { name: 'Start automatic rotation' })).toHaveAttribute('aria-pressed', 'false');
  await viewer.getByRole('button', { name: 'Start automatic rotation' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.rotation-play[aria-pressed="true"]')).toHaveCount(0);
});

test('fabric motion follows rotation, settles, and respects reduced motion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  for (const index of [0, 3, 4, 5]) {
    await page.locator('.discover-product').nth(index).click();
    const viewer = page.locator('.detail-image .rotation-viewer');
    const art = viewer.locator('.rotation-art');
    await expect(viewer.locator('img')).toHaveJSProperty('complete', true);
    await viewer.getByRole('slider').press('ArrowRight');
    await expect(art).toHaveClass(/cloth-active/);
    const hasProductPixels = await viewer.locator('canvas').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 128) opaque++;
      return opaque > canvas.width * canvas.height * .05;
    });
    expect(hasProductPixels).toBe(true);
    if (index === 5) await page.screenshot({ path: 'test-results/cargo-fabric-motion.png' });
    await expect(art).not.toHaveClass(/cloth-active/, { timeout: 4000 });
    await expect(viewer).toHaveAttribute('data-frame', '1');
    await viewer.getByRole('button', { name: 'Show back', exact: true }).click();
    await expect(art).toHaveClass(/cloth-active/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cloth-active')).toHaveCount(0);
  }
  await page.locator('.discover-product').nth(5).click();
  const viewer = page.locator('.detail-image .rotation-viewer');
  await viewer.getByRole('slider').press('ArrowRight');
  await expect(viewer.locator('.rotation-art')).toHaveClass(/cloth-active/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(viewer.locator('.rotation-art')).not.toHaveClass(/cloth-active/);
  await viewer.getByRole('button', { name: 'Show back', exact: true }).click();
  await expect(viewer).toHaveAttribute('data-frame', '6');
  await expect(viewer.locator('.rotation-art')).not.toHaveClass(/cloth-active/);
  await expect(viewer.locator('img')).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('mobile layout and keyboard-friendly shopping', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('.hero-copy')).toBeHidden();
  await expect(page.locator('.rotation-hero .rotation-toolbar')).toBeHidden();
  await page.getByRole('link', { name: 'Shop', exact: true }).click();
  await expect(page.locator('#collection')).toBeInViewport();
  await page.locator('[data-product="0"]').first().click();
  await expect(page.locator('.product-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'XS', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await page.getByRole('button', { name: 'Bag (1)' }).click();
  await expect(page.locator('.bag-item')).toContainText('Washed black / XS');
  await page.screenshot({ path: 'test-results/mobile-bag.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Search collection' }).click();
  await page.getByRole('searchbox').fill('<script>missing</script>');
  await expect(page.locator('.no-results')).toBeVisible();
});
