'use client';

import { Suspense } from 'react';
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function Providers({ children }: { children: React.ReactNode }) {
  
  return (
    <SessionProvider>
      <Suspense fallback={
        <div className="bg-[#000000] h-screen w-full flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      }>
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
      </Suspense>
    </SessionProvider>
  );
} 