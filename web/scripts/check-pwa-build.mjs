import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(webRoot, '..');

const [builtHtml, serviceWorker, legacyRecovery, sourceHtml, netlifyConfig] = await Promise.all([
  readFile(path.join(webRoot, 'dist/index.html'), 'utf8'),
  readFile(path.join(webRoot, 'dist/sw.js'), 'utf8'),
  readFile(path.join(webRoot, 'dist/stale-build-recovery.js'), 'utf8'),
  readFile(path.join(webRoot, 'index.html'), 'utf8'),
  readFile(path.join(repositoryRoot, 'netlify.toml'), 'utf8'),
]);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(
  !serviceWorker.includes('"index.html"'),
  'The service worker must not precache index.html.',
);
assert(
  !serviceWorker.includes('createHandlerBoundToURL'),
  'The service worker must not provide a cached navigation fallback.',
);
assert(
  serviceWorker.includes('skipWaiting'),
  'The service worker must activate automatically to migrate older installations.',
);
assert(
  (builtHtml.match(/<link rel="manifest"/g) || []).length === 1,
  'The built page must contain exactly one PWA manifest link.',
);
assert(
  builtHtml.includes('hafagpt:stale-build-recovery'),
  'The built page must include the stale-build recovery bootstrap.',
);
assert(
  !sourceHtml.includes("navigator.serviceWorker.register('/sw.js')"),
  'index.html must not register a second service worker.',
);
assert(
  legacyRecovery.includes('hafagpt:stale-build-recovery')
    && legacyRecovery.includes('navigator.serviceWorker.getRegistrations()')
    && legacyRecovery.includes("name.startsWith('workbox-precache')")
    && legacyRecovery.includes('window.location.replace'),
  'The stable legacy-profile recovery module must remain data-safe and functional.',
);

const assetRuleIndex = netlifyConfig.indexOf('from = "/assets/*"');
const spaRuleIndex = netlifyConfig.indexOf('from = "/*"');
assert(assetRuleIndex >= 0, 'Netlify must define a missing-asset rule.');
assert(spaRuleIndex >= 0, 'Netlify must define the SPA fallback.');
assert(
  assetRuleIndex >= 0 && spaRuleIndex >= 0 && assetRuleIndex < spaRuleIndex,
  'The Netlify missing-asset rule must come before the SPA fallback.',
);
const assetRuleEnd = netlifyConfig.indexOf('[[redirects]]', assetRuleIndex + 1);
const assetRule = netlifyConfig.slice(
  assetRuleIndex,
  assetRuleEnd >= 0 ? assetRuleEnd : netlifyConfig.length,
);
assert(
  assetRule.includes('to = "/stale-build-recovery.js"') && assetRule.includes('status = 200'),
  'Missing build assets must execute the stable legacy-profile recovery module.',
);

if (failures.length > 0) {
  console.error('PWA build checks failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PWA build checks passed: fresh HTML, one registration, legacy migration bridge, and bounded startup recovery.');
