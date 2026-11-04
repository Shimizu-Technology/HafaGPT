import { readFileSync } from 'node:fs';
import palette from '../tailwind.config.js';

// Build-time only: no auth snapshot, API data, or additional runtime dependency.
// The shell is disposable: createRoot replaces it and never hydrates it.
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
        if (!html.includes('<div id="root"></div>')) throw new Error('First paint: <div id="root"></div> is missing from index.html');
        if (context.bundle) {
          const font = Object.keys(context.bundle).find(name => /literata-latin-wght-normal.*\.woff2$/.test(name));
          if (!font) throw new Error('First paint: the Literata font to preload is missing from the build');
          html = html.replace('</head>', `<link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin></head>`);
        }
        return html.replace('<div id="root"></div>', `<div id="root">${shell}</div>`);
      },
    },
  };
}
