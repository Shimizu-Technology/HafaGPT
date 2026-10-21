import '@testing-library/jest-dom/vitest';

// jsdom has no OS appearance API. Individual theme tests can emulate changes.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, dispatchEvent() { return false; },
    }),
  });
}
