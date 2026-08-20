(function () {
  // Current pages already have the fuller startup recovery bootstrap. Reuse it
  // when a lazy chunk disappears instead of starting a competing recovery.
  if (typeof window.__hafagptRecoverStaleBuild === 'function') {
    void window.__hafagptRecoverStaleBuild();
    return;
  }

  // This stable module is also returned for a retired hashed asset. That path
  // reaches browser profiles whose cached, pre-migration index.html predates
  // the inline recovery bootstrap and can no longer load its old entry module.
  const recoveryKey = 'hafagpt:stale-build-recovery';
  const recoveryParam = '__hafagpt_recovery';

  function renderStatus(title, detail, allowRetry) {
    const render = function () {
      const shell = document.createElement('main');
      shell.dataset.hafagptStartupStatus = 'true';
      shell.setAttribute('role', allowRetry ? 'alert' : 'status');
      shell.setAttribute('aria-live', allowRetry ? 'assertive' : 'polite');
      shell.style.cssText = 'position:fixed;inset:0;z-index:2147483647;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#fdf8f3;color:#3a2a1d;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';

      const card = document.createElement('section');
      card.style.cssText = 'width:min(100%,420px);padding:28px;border:1px solid #ead7c4;border-radius:20px;background:#fffaf5;box-shadow:0 18px 45px rgba(83,55,34,.10);text-align:center;';

      const brand = document.createElement('p');
      brand.textContent = 'HåfaGPT';
      brand.style.cssText = 'margin:0 0 18px;color:#e85d4b;font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;';

      const heading = document.createElement('h1');
      heading.textContent = title;
      heading.style.cssText = 'margin:0;font-size:24px;line-height:1.2;';

      const message = document.createElement('p');
      message.textContent = detail;
      message.style.cssText = 'margin:12px 0 0;color:#6b5d52;font-size:16px;line-height:1.6;';

      card.append(brand, heading, message);

      if (allowRetry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Try again';
        button.style.cssText = 'min-height:44px;margin-top:20px;padding:10px 20px;border:0;border-radius:12px;background:#e85d4b;color:white;font:inherit;font-weight:700;cursor:pointer;';
        button.addEventListener('click', function () {
          try { sessionStorage.removeItem(recoveryKey); } catch (_) { /* Storage may be unavailable. */ }
          const retryUrl = new URL(window.location.href);
          retryUrl.searchParams.delete(recoveryParam);
          window.location.assign(retryUrl.toString());
        });
        card.append(button);
      }

      shell.append(card);
      const existingStatus = document.querySelector('[data-hafagpt-startup-status]');
      if (existingStatus) existingStatus.remove();
      document.body.append(shell);
    };

    if (document.body) render();
    else window.addEventListener('DOMContentLoaded', render, { once: true });
  }

  let alreadyAttempted = false;
  try {
    alreadyAttempted = sessionStorage.getItem(recoveryKey) === '1';
  } catch (_) {
    // The URL marker still bounds recovery when storage is unavailable.
  }

  const currentUrl = new URL(window.location.href);
  alreadyAttempted = alreadyAttempted || currentUrl.searchParams.has(recoveryParam);

  if (alreadyAttempted) {
    renderStatus(
      'HåfaGPT could not start',
      'Please try again. If the problem continues, close this tab and reopen HåfaGPT.',
      true,
    );
    return;
  }

  try { sessionStorage.setItem(recoveryKey, '1'); } catch (_) { /* Storage may be unavailable. */ }
  renderStatus('Updating HåfaGPT', 'Getting the newest version ready. This should only take a moment.', false);

  const cleanupTasks = [];

  if ('serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations()
        .then(function (registrations) {
          return Promise.all(registrations.map(function (registration) {
            return registration.unregister();
          }));
        })
        .catch(function (error) {
          console.warn('[legacy-startup] Could not unregister the obsolete service worker:', error);
        }),
    );
  }

  if ('caches' in window) {
    cleanupTasks.push(
      caches.keys()
        .then(function (cacheNames) {
          const obsoleteAppCaches = cacheNames.filter(function (name) {
            return name.startsWith('workbox-precache') || name.startsWith('hafagpt-');
          });
          return Promise.all(obsoleteAppCaches.map(function (name) {
            return caches.delete(name);
          }));
        })
        .catch(function (error) {
          console.warn('[legacy-startup] Could not clear the obsolete app cache:', error);
        }),
    );
  }

  Promise.all(cleanupTasks).then(function () {
    currentUrl.searchParams.set(recoveryParam, String(Date.now()));
    window.location.replace(currentUrl.toString());
  });
})();
