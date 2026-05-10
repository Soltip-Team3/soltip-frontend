"use client";

import { Nav } from "../../components/nav";
import { TipModal } from "../../components/tip-modal";
import { useWalletConnection, useSplToken } from "@solana/react-hooks";
import { address } from "@solana/kit";
import { use, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

type LeaderEntry = { wallet: string; total: number; xHandle: string | null };
type PremiumStatus = "idle" | "checking" | "locked" | "unlocked";

function badgeInfo(total: number): { emoji: string; label: string; color: string } {
  if (total >= 100) return { emoji: "💎", label: "Diamond", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  if (total >= 50)  return { emoji: "⚡", label: "Legend",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  if (total >= 20)  return { emoji: "🔥", label: "Champion",color: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
  if (total >= 10)  return { emoji: "💜", label: "Fan",     color: "text-purple-400 bg-purple-400/10 border-purple-400/20" };
  return               { emoji: "⭐", label: "Supporter", color: "text-zinc-400 bg-zinc-400/10 border-zinc-700" };
}

export default function CreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const { connected, wallet } = useWalletConnection();
  const { send, isSending } = useSplToken(USDC_DEVNET_MINT);
  const [showTipModal, setShowTipModal] = useState(false);
  const [creatorWallet, setCreatorWallet] = useState<string | null>(null);
  const [creatorFound, setCreatorFound] = useState<boolean | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [premiumThreshold, setPremiumThreshold] = useState<number>(5);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [tipCount, setTipCount] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);

  // x402 premium unlock state
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>("idle");
  const [unlockedUri, setUnlockedUri] = useState<string | null>(null);
  const [remainingUsd, setRemainingUsd] = useState<number>(0);

  const walletAddress = wallet ? String(wallet.account.address) : null;

  const loadLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("tips_cache")
      .select("tipper_wallet, amount_usdc")
      .eq("creator_handle", handle)
      .order("amount_usdc", { ascending: false });

    const rows = data ?? [];
    setTipCount(rows.length);
    setTotalReceived(rows.reduce((s, r) => s + Number(r.amount_usdc), 0));

    const totals: Record<string, number> = {};
    for (const r of rows) {
      totals[r.tipper_wallet] = (totals[r.tipper_wallet] ?? 0) + Number(r.amount_usdc);
    }
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([w, total]) => ({ wallet: w, total, xHandle: null as string | null }));

    if (sorted.length > 0) {
      const { data: creators } = await supabase
        .from("creators")
        .select("wallet_address, x_handle")
        .in("wallet_address", sorted.map((e) => e.wallet));
      const handleMap = Object.fromEntries(
        (creators ?? []).map((c) => [c.wallet_address, c.x_handle])
      );
      sorted.forEach((e) => { e.xHandle = handleMap[e.wallet] ?? null; });
    }
    setLeaderboard(sorted);
  }, [handle]);

  useEffect(() => {
    supabase
      .from("creators")
      .select("wallet_address, premium_threshold, premium_content_uri")
      .eq("x_handle", handle)
      .single()
      .then(({ data }) => {
        setCreatorWallet(data?.wallet_address ?? null);
        setCreatorFound(!!data);
        const row = data as { wallet_address: string; premium_threshold?: number; premium_content_uri?: string } | null;
        setPremiumThreshold(row?.premium_threshold ?? 5);
        setHasPremium(!!row?.premium_content_uri);
      });

    loadLeaderboard();
  }, [handle, loadLeaderboard]);

  async function handleSendTip(amountUsdc: number) {
    if (!creatorWallet || !wallet) return;
    try {
      const sig = await send({
        amount: amountUsdc,
        destinationOwner: address(creatorWallet),
      });

      const senderAddress = walletAddress;
      if (senderAddress) {
        const { error: dbErr } = await supabase.from("tips_cache").insert({
          creator_handle: handle,
          tipper_wallet: senderAddress,
          amount_usdc: amountUsdc,
          tx_signature: String(sig),
        });
        if (dbErr) console.error("tips_cache insert failed:", dbErr);

        // Badge mint — best-effort, non-blocking
        fetch("/api/badge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipper_wallet: senderAddress,
            creator_handle: handle,
            tx_signature: String(sig),
          }),
        })
          .then((r) => r.json())
          .then((b: { level?: number; total_tipped?: number }) => {
            if (b.level) {
              const { emoji, label } = badgeInfo(b.total_tipped ?? amountUsdc);
              toast.success(`${emoji} ${label} badge — Level ${b.level} Supporter!`, { duration: 5000 });
            }
          })
          .catch(() => {/* badge is best-effort */});
      }

      toast.success(`$${amountUsdc} USDC sent to @${handle}!`);
      setShowTipModal(false);
      setPremiumStatus("idle"); // re-check after tip
      await loadLeaderboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed.");
    }
  }

  async function handleUnlockPremium() {
    if (!connected || !walletAddress) {
      toast.error("Connect your wallet to check access.");
      return;
    }
    setPremiumStatus("checking");
    try {
      const res = await fetch(`/api/unlock/${handle}?tipper_wallet=${walletAddress}`);
      const data = await res.json() as {
        unlocked?: boolean;
        content_uri?: string;
        x402?: { extra: { remaining_usd: number } };
      };
      if (res.ok && data.unlocked) {
        setUnlockedUri(data.content_uri ?? null);
        setPremiumStatus("unlocked");
      } else if (res.status === 402) {
        setRemainingUsd(data.x402?.extra?.remaining_usd ?? premiumThreshold);
        setPremiumStatus("locked");
      } else {
        setPremiumStatus("idle");
        toast.error("Could not check premium status.");
      }
    } catch {
      setPremiumStatus("idle");
      toast.error("Could not reach the server.");
    }
  }

  function handleTipClick() {
    if (!connected) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!creatorWallet) {
      toast.error("This creator hasn't registered yet.");
      return;
    }
    setShowTipModal(true);
  }

  if (creatorFound === null) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  if (creatorFound === false) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-5xl">🔍</p>
          <h1 className="text-xl font-bold text-zinc-200">@{handle} hasn&apos;t registered yet</h1>
          <p className="text-sm text-zinc-400 max-w-sm">
            This creator hasn&apos;t set up their SolTip profile. Ask them to visit{" "}
            <a href="/dashboard" className="text-purple-400 hover:underline">
              soltip.app/dashboard
            </a>{" "}
            to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      {showTipModal && (
        <TipModal
          creatorHandle={handle}
          onClose={() => setShowTipModal(false)}
          onSendTip={handleSendTip}
          isSending={isSending}
        />
      )}

      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 sm:px-6 py-10">
        {/* Profile header */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-400 text-2xl font-black text-white shadow-lg">
            {handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">@{handle}</h1>
            <p className="text-sm text-zinc-400">Creator on X</p>
          </div>
          <div className="ml-auto flex gap-4 sm:gap-6 text-center">
            <div>
              <p className="text-lg font-black text-green-400">$ {totalReceived.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">USDC earned</p>
            </div>
            <div>
              <p className="text-lg font-black">{tipCount}</p>
              <p className="text-xs text-zinc-500">tips</p>
            </div>
          </div>
        </div>

        {/* Tip CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 sm:p-6">
          <div>
            <p className="font-semibold text-purple-200">Support @{handle}</p>
            <p className="text-sm text-purple-300/70">
              Tips go directly to their Solana wallet — instant, no fees.
            </p>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={handleTipClick}
              className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              Tip Now ⚡
            </button>
            <a
              href={`/tip/${handle}`}
              className="text-xs text-purple-400 hover:text-purple-300 transition whitespace-nowrap"
            >
              Pay from any chain →
            </a>
          </div>
        </div>

        {/* x402 Premium Content — only shown if creator has it configured */}
        {hasPremium && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg">🔐</span>
              <h2 className="font-semibold text-amber-200">Premium Content</h2>
              <span className="ml-auto text-xs text-amber-400 border border-amber-500/30 rounded-full px-2.5 py-0.5 shrink-0">
                Tip ◎ {premiumThreshold}+ to unlock
              </span>
            </div>

            {premiumStatus === "idle" && (
              <button
                onClick={handleUnlockPremium}
                className="rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25"
              >
                Check Access →
              </button>
            )}

            {premiumStatus === "checking" && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-amber-400" />
                Checking your access...
              </div>
            )}

            {premiumStatus === "locked" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  You need{" "}
                  <span className="font-bold text-amber-200">◎ {remainingUsd.toFixed(2)} more</span>{" "}
                  in tips to unlock this content.
                </div>
                <button
                  onClick={handleTipClick}
                  className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-amber-400"
                >
                  Tip to Unlock ⚡
                </button>
              </div>
            )}

            {premiumStatus === "unlocked" && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
                  <span>✅</span> Access granted!
                </p>
                {unlockedUri ? (
                  <a
                    href={unlockedUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 hover:bg-green-500/20 transition"
                  >
                    <span>🔓</span>
                    <span className="flex-1 truncate">{unlockedUri}</span>
                    <span className="shrink-0">↗</span>
                  </a>
                ) : (
                  <p className="text-sm text-zinc-500">No content URI has been set by this creator yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Top Supporters
          </h2>
          {leaderboard.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              Be the first to tip @{handle} 👑
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900">
              {leaderboard.map((entry, index) => {
                const badge = badgeInfo(entry.total);
                return (
                  <div
                    key={entry.wallet}
                    className="flex items-center gap-3 px-4 sm:px-5 py-4 text-sm"
                  >
                    <span className="w-6 shrink-0 text-center font-bold text-zinc-500">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                      {entry.xHandle ? entry.xHandle.charAt(0).toUpperCase() : entry.wallet.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 min-w-0 text-xs text-zinc-300 truncate">
                      {entry.xHandle ? `@${entry.xHandle}` : `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}`}
                    </span>
                    {/* Badge chip — full label on sm+, emoji only on mobile */}
                    <span
                      className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.color}`}
                    >
                      {badge.emoji} {badge.label}
                    </span>
                    <span className="sm:hidden shrink-0 text-base" title={badge.label}>
                      {badge.emoji}
                    </span>
                    <span className="shrink-0 font-semibold text-green-400">
                      ◎ {entry.total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
