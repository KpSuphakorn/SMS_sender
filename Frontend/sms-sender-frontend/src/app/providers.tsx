'use client';

import { MantineProvider } from '@mantine/core';
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Disable automatic refetching when window regains focus
      refetchOnWindowFocus={false}
      // Disable automatic periodic refetching (default is 0 which means disabled)
      refetchInterval={0}
      // Disable refetching when going from offline to online
      refetchWhenOffline={false}
    >
      <MantineProvider>
        {children}
      </MantineProvider>
    </SessionProvider>
  );
}