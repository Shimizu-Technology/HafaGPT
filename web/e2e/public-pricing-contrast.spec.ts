import { expect, test, type Locator } from '@playwright/test';
async function ratio(locator: Locator) {
  return locator.evaluate((el) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const blend = (top: number[], base: number[]) => top.slice(0, 3).map((v, i) => v * (top[3] ?? 1) + base[i] * (1 - (top[3] ?? 1)));
    const layers = []; let node: Element | null = el;
    while (node) { layers.unshift(rgb(getComputedStyle(node).backgroundColor)); node = node.parentElement; }
    const bg = layers.reduce((base, top) => blend(top, base), [255, 255, 255]);
    const fg = blend(rgb(getComputedStyle(el).color), bg);
    const luminance = (color: number[]) => color.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(fg), b = luminance(bg);
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), foreground: fg, background: bg };
  });
}
for (const theme of ['light', 'dark'] as const) {
  test(`four pricing text roles meet 4.5 contrast (${theme})`, async ({ page }) => {
    await page.route('**/api/**', (route) => route.fulfill({ json: { active: false, theme_active: false } }));
    await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
    await page.goto('/pricing');
    for (const locator of [page.getByText('Start learning Chamorro today'), page.getByText('EARLY ADOPTER PRICING', { exact: true }), page.getByText('Save 33%'), page.getByRole('link', { name: 'support@shimizutechnology.com' })]) {
      await expect(locator).toBeVisible();
      expect((await ratio(locator)).ratio).toBeGreaterThanOrEqual(4.5);
    }
    const contact = page.getByRole('link', { name: 'support@shimizutechnology.com' });
    await contact.hover();
    expect((await ratio(contact)).ratio).toBeGreaterThanOrEqual(4.5);
    await contact.focus();
    expect((await ratio(contact)).ratio).toBeGreaterThanOrEqual(4.5);
  });
}
