import React from 'react';
import { useVisionStore } from './store';
import { Landing } from './components/Landing';
import { CommandCenter } from './components/CommandCenter';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const mode = useVisionStore(s => s.mode);

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen flex flex-col bg-[#000000] font-sans text-[#F5F5F5] relative">
        {mode === 'landing' ? <Landing /> : <CommandCenter />}
      </div>
    </ErrorBoundary>
  );
}