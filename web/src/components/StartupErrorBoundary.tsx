import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface StartupErrorBoundaryProps {
  children: ReactNode;
}

interface StartupErrorBoundaryState {
  hasError: boolean;
}

export class StartupErrorBoundary extends Component<StartupErrorBoundaryProps, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): StartupErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[startup] HåfaGPT could not render its application providers', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-[100dvh] place-items-center bg-cream-50 px-5 text-brown-900 dark:bg-slate-950 dark:text-white">
        <section
          className="w-full max-w-sm rounded-3xl border border-cream-300 bg-white p-7 text-center shadow-[0_18px_45px_rgba(83,55,34,0.10)] dark:border-slate-700 dark:bg-slate-900"
          role="alert"
        >
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-coral-600 dark:text-ocean-300">
            HåfaGPT
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">This browser needs a quick refresh</h1>
          <p className="mt-3 text-sm leading-relaxed text-brown-600 dark:text-slate-300">
            We could not finish starting the app. Your account and learning progress have not been changed.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-500 dark:hover:bg-ocean-600 dark:focus-visible:ring-offset-slate-900"
            onClick={() => {
              if (window.__hafagptRecoverStaleBuild) {
                void window.__hafagptRecoverStaleBuild();
              } else {
                window.location.reload();
              }
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Repair and reload
          </button>
        </section>
      </main>
    );
  }
}
