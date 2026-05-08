"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider
      config={{ cluster: "devnet", walletConnectors: "default" }}
      walletPersistence={{ autoConnect: true }}
    >
      {children}
      <Toaster richColors position="bottom-right" />
    </SolanaProvider>
  );
}
