import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-dark-900">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-4 border-brand-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
    </div>
  </div>
);

export default LoadingSpinner;
