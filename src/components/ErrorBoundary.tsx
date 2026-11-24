import React from 'react';
import { Footer } from './Footer';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          friendlyMessage = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
        }
      } catch {
        // non-JSON error
      }

      return (
        <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
          <main className="flex-1 flex items-center justify-center px-6 py-16">
            <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
              <p className="text-xs font-mono text-red-700 mb-2">System Notice</p>
              <h1 className="text-xl font-semibold text-slate-900 mb-3">
                Unable to load portal data
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {friendlyMessage}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Reload Portal
              </button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return this.props.children;
  }
}
