// src/lib/query-provider.tsx

"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Create a client instance, managed by useState to ensure it's only created once
// and survives hot module reloading (HMR) in development.
// This ensures that the state is shared across all components.
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // Cache for 5 minutes
            refetchOnWindowFocus: false, 
        },
    },
  }));

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}