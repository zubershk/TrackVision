import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Report to error tracking service if needed
    // logErrorToService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#000000] text-[#F5F5F5] p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 text-[#F5F5F5]">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-[#F5F5F5] mb-4">Something went wrong</h2>
            <p className="text-[#B8B8B8] mb-6">
              An unexpected error occurred. The error has been logged.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#F5F5F5] text-[#000000] px-6 py-3 rounded-sm font-medium tracking-wide hover:bg-[#D4D4D4] transition-colors"
            >
              Reload Application
            </button>
            <details className="mt-6 text-left">
              <summary className="text-[#777777] cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-3 bg-[#050505] border border-[#1A1A1A] rounded-sm text-[11px] text-[#777777] overflow-auto max-h-40">
                {this.state.error?.message}
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}