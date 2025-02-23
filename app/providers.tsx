'use client';

import { Suspense } from 'react';
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function Providers({ children }: { children: React.ReactNode }) {
  
  return (
    <SessionProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
      </Suspense>
    </SessionProvider>
  );
} 