import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {this.props.fallbackTitle || 'Component Encountered an Issue'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mb-4">
            {this.props.fallbackMessage ||
              'A recoverable error occurred in this workspace view. You can reload this view without losing saved records.'}
          </p>
          {this.state.error && (
            <pre className="text-xs bg-slate-100 text-slate-700 p-3 rounded mb-4 max-w-lg overflow-x-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded shadow transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
