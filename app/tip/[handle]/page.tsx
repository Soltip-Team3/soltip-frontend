"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import type { ChainType } from "@lifi/sdk";
import { Nav } from "../../components/nav";
import { supabase } from "../../lib/supabase";

// Dynamically import LiFiWidget with SSR disabled
const LiFiWidget = dynamic(
  () => import("@lifi/widget").then((module) => module.LiFiWidget),
  { ssr: false, loading: () => <div className="animate-pulse flex h-[600px] items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">Loading LI.FI Widget...</div> }
);

// USDC mint addresses
const USDC_SOL_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export default function CrossChainTipPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const [creatorWallet, setCreatorWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("creators")
      .select("wallet_address")
      .eq("x_handle", handle)
      .single()
      .then(({ data }) => {
        setCreatorWallet(data?.wallet_address ?? null);
        setLoading(false);
      });
  }, [handle]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          Loading…
        </div>
      </div>
    );
  }

  if (!creatorWallet) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <p className="text-4xl">🔍</p>
          <h1 className="text-xl font-bold">@{handle} hasn&apos;t registered yet</h1>
          <p className="text-sm text-zinc-400">
            This creator doesn&apos;t have a SolTip profile.
          </p>
        </div>
      </div>
    );
  }

  // Configure the widget
  const widgetConfig = {
    integrator: "soltip",
    theme: {
      palette: {
        mode: "dark" as const,
        primary: { main: "#9333ea" }, // Purple 600
        background: { default: "#18181b", paper: "#27272a" },
      },
      shape: { borderRadius: 16 },
    },
    toChain: 1151111081099710, // Solana chain ID in LI.FI
    toToken: USDC_SOL_MAINNET,
    toAddress: {
      address: creatorWallet,
      chainType: "SVM" as ChainType,
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="mx-auto w-full max-w-2xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            Cross-Chain via LI.FI Widget
          </div>
          <h1 className="text-2xl font-bold">
            Tip{" "}
            <span className="text-purple-400">@{handle}</span>
            {" "}from any chain
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Pay with ETH, USDC, or any token on Ethereum, Base, Arbitrum, Polygon…
            LI.FI bridges it to Solana USDC automatically.
          </p>
        </div>

        {/* Creator wallet display */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Tip destination (Solana)</p>
            <p className="font-mono text-xs text-zinc-300 mt-0.5">
              {creatorWallet.slice(0, 12)}…{creatorWallet.slice(-8)}
            </p>
          </div>
          <span className="text-xs text-green-400 font-semibold">✓ @{handle}</span>
        </div>

        {/* Native @lifi/widget */}
        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl shadow-purple-900/10">
          <LiFiWidget config={widgetConfig} integrator="soltip" />
        </div>

        {/* Footer note */}
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-600">
            Powered natively by{" "}
            <a
              href="https://li.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              LI.FI
            </a>
          </p>
          <p className="text-xs text-zinc-700">
            After bridging, return to{" "}
            <a href={`/creator/${handle}`} className="text-zinc-500 hover:text-zinc-400 transition">
              @{handle}&apos;s profile
            </a>{" "}
            to complete your tip on Solana.
          </p>
        </div>
      </main>
    </div>
  );
}
