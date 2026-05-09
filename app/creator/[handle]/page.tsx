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
  const [creatorFound, setCreatorFound] = useState<boolean | null>(null); // null = loading
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [tipCount, setTipCount] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);

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
      .select("wallet_address")
      .eq("x_handle", handle)
      .single()
      .then(({ data }) => {
        setCreatorWallet(data?.wallet_address ?? null);
        setCreatorFound(!!data);
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

      console.log("✅ Tip tx signature:", String(sig));
      const senderAddress = wallet ? String(wallet.account.address) : null;
      if (senderAddress) {
        const { error: dbErr } = await supabase.from("tips_cache").insert({
          creator_handle: handle,
          tipper_wallet: senderAddress,
          amount_usdc: amountUsdc,
          tx_signature: String(sig),
        });
        if (dbErr) console.error("tips_cache insert failed:", dbErr);
      }

      // Mint badge asynchronously (non-blocking)
      if (senderAddress) {
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
          .then((b) => {
            if (b.level) {
              toast.success(`🏅 Badge minted — Level ${b.level} Supporter!`, { duration: 5000 });
            }
          })
          .catch(() => {/* badge is best-effort */});
      }

      toast.success(`$${amountUsdc} USDC sent to @${handle}!`);
      setShowTipModal(false);
      // Reload leaderboard to reflect new tip
      await loadLeaderboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed.");
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

  // Loading state
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

  // Creator not found
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

      <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-400 text-2xl font-black text-white shadow-lg">
            {handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">@{handle}</h1>
            <p className="text-sm text-zinc-400">Creator on X</p>
          </div>
          <div className="ml-auto flex gap-6 text-center">
            <div>
              <p className="text-lg font-black text-green-400">${totalReceived.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">earned</p>
            </div>
            <div>
              <p className="text-lg font-black">{tipCount}</p>
              <p className="text-xs text-zinc-500">tips</p>
            </div>
          </div>
        </div>

        {/* Tip CTA */}
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
          <div>
            <p className="font-semibold text-purple-200">Support @{handle}</p>
            <p className="text-sm text-purple-300/70">
              Tips go directly to their Solana wallet — instant, no fees.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleTipClick}
              className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              Tip Now ⚡
            </button>
            <a
              href={`/tip/${handle}`}
              className="text-xs text-purple-400 hover:text-purple-300 transition"
            >
              Pay from any chain →
            </a>
          </div>
        </div>

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
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.wallet}
                  className="flex items-center gap-4 px-5 py-4 text-sm"
                >
                  <span className="w-6 text-center font-bold text-zinc-500">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                    {entry.xHandle ? entry.xHandle.charAt(0).toUpperCase() : entry.wallet.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-300">
                    {entry.xHandle ? `@${entry.xHandle}` : `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}`}
                  </span>
                  <span className="ml-auto font-semibold text-green-400">
                    ${entry.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
