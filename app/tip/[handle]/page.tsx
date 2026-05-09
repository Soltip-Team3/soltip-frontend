"use client";

import { useEffect, useState, use } from "react";
import { Nav } from "../../components/nav";
import { supabase } from "../../lib/supabase";

/**
 * Cross-chain tip page powered by Jumper Exchange (built on LI.FI).
 * No npm dependency required — uses the hosted widget via iframe.
 * Docs: https://docs.jumper.exchange/widget/iframe
 */

// Jumper Exchange base URL
const JUMPER_BASE = "https://jumper.exchange";

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
  const [iframeLoaded, setIframeLoaded] = useState(false);

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

  // Build Jumper Exchange URL:
  // - toChain=SOL, toToken=USDC, toAddress=creator wallet
  // - theme=dark
  const params_url = new URLSearchParams({
    toChain: "SOL",
    toToken: USDC_SOL_MAINNET,
    toAddress: creatorWallet,
    theme: "dark",
    variant: "compact",
    expandInformation: "false",
  });
  const widgetUrl = `${JUMPER_BASE}/?${params_url.toString()}`;

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="mx-auto w-full max-w-2xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            Cross-Chain via LI.FI / Jumper
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

        {/* Step pills */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { n: "1", label: "Choose source token & chain" },
            { n: "2", label: "LI.FI bridges to Solana USDC" },
            { n: "3", label: "Creator receives instantly" },
          ].map(({ n, label }) => (
            <div key={n} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3">
              <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                {n}
              </div>
              <p className="text-xs text-zinc-400 leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* Jumper Exchange iframe */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900" style={{ minHeight: 600 }}>
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
              <p className="text-xs text-zinc-500">Loading Jumper Exchange…</p>
            </div>
          )}
          <iframe
            src={widgetUrl}
            width="100%"
            height="600"
            style={{ border: "none", display: iframeLoaded ? "block" : "none" }}
            title="Jumper Exchange — Cross-Chain Tip"
            onLoad={() => setIframeLoaded(true)}
            allow="clipboard-write"
          />
        </div>

        {/* Footer note */}
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-600">
            Powered by{" "}
            <a
              href="https://li.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              LI.FI
            </a>
            {" "}via{" "}
            <a
              href="https://jumper.exchange"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              Jumper Exchange
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
