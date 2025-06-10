'use client';

import { Suspense } from 'react';
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AudioProvider } from './contexts/AudioContext';

export function Providers({ children }: { children: React.ReactNode }) {
  
  return (
    <SessionProvider>
      <Suspense fallback={
        <div className="bg-[#000000] h-screen w-full flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      }>
        <AudioProvider>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
        </AudioProvider>
      </Suspense>
    </SessionProvider>
  );
} 