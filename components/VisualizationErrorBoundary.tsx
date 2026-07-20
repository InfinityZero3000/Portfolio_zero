import React from 'react';

interface VisualizationErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface VisualizationErrorBoundaryState {
  error: Error | null;
}

class VisualizationErrorBoundary extends React.Component<
  VisualizationErrorBoundaryProps,
  VisualizationErrorBoundaryState
> {
  state: VisualizationErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VisualizationErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
        <div className="max-w-md border border-brand-600/40 bg-dark-900/90 p-6 text-center shadow-2xl backdrop-blur-md">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Visualization offline</p>
          <h2 className="mb-3 text-2xl font-extrabold text-white">Unable to initialize the scene</h2>
          <p className="mb-5 text-sm text-gray-400">Please retry to load the interactive visualization.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-brand-600 bg-brand-600 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-dark-900"
          >
            Retry visualization
          </button>
        </div>
      </div>
    );
  }
}

export default VisualizationErrorBoundary;
