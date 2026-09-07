"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { setApiTokenGetter } from "@/lib/api";
import { isClerkEnabled } from "@/lib/clerk";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  if (!isClerkEnabled) return children;
  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}

function ClerkAuthGate({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  setApiTokenGetter(() => getToken());
  if (!isLoaded) {
    return <div className="min-h-screen bg-white" />;
  }
  return children;
}
