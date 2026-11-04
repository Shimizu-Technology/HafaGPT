import { readFileSync } from 'node:fs';
import palette from '../tailwind.config.js';

// Build-time only: no auth snapshot, API data, or additional runtime dependency.
export function publicFirstPaint() {
  return {
    name: 'public-first-paint',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        let shell = readFileSync(new URL('../src/public-first-paint.html', import.meta.url), 'utf8');
        const colors = palette.theme.extend.colors;
        for (const [token, value] of Object.entries({ ground: colors.cream[50], card: '#ffffff', ink: colors.brown[950], darkGround: colors.brown[950], darkCard: colors.brown[900], darkInk: colors.cream[100] })) {
          shell = shell.replaceAll(`{{${token}}}`, value);
        }
        const font = Object.keys(context.bundle ?? {}).find(name => /literata-latin-wght-normal.*\.woff2$/.test(name));
        if (font) html = html.replace('</head>', `<link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin></head>`);
        return html.replace('<div id="root"></div>', `<div id="root">${shell}</div>`);
      },
    },
  };
}
