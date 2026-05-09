"use client";

import { Nav } from "../../components/nav";
import { TipModal } from "../../components/tip-modal";
import { useWalletConnection, useSplToken } from "@solana/react-hooks";
import { address } from "@solana/kit";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

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
  const [tips, setTips] = useState<
    { tipper_wallet: string; amount_usdc: number }[]
  >([]);

  useEffect(() => {
    supabase
      .from("creators")
      .select("wallet_address")
      .eq("x_handle", handle)
      .single()
      .then(({ data }) => setCreatorWallet(data?.wallet_address ?? null));

    supabase
      .from("tips_cache")
      .select("tipper_wallet, amount_usdc")
      .eq("creator_handle", handle)
      .order("amount_usdc", { ascending: false })
      .limit(10)
      .then(({ data }) => setTips(data ?? []));
  }, [handle]);

  async function handleSendTip(amountUsdc: number) {
    if (!creatorWallet) return;
    try {
      const sig = await send({
        amount: amountUsdc,
        destinationOwner: address(creatorWallet),
      });
      const senderAddress = wallet ? String(wallet.account.address) : null;
      if (senderAddress) {
        await supabase.from("tips_cache").insert({
          creator_handle: handle,
          tipper_wallet: senderAddress,
          amount_usdc: amountUsdc,
          tx_signature: String(sig),
        });
      }
      toast.success(`$${amountUsdc} USDC sent to @${handle}!`);
      setShowTipModal(false);
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

  const leaderboard = Object.values(
    tips
      .reduce((acc, tip) => {
        if (!acc[tip.tipper_wallet]) {
          acc[tip.tipper_wallet] = { wallet: tip.tipper_wallet, total: 0 };
        }
        acc[tip.tipper_wallet].total += Number(tip.amount_usdc);
        return acc;
      }, {} as Record<string, { wallet: string; total: number }>)
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

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
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700 text-2xl font-black text-zinc-400">
            {handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">@{handle}</h1>
            <p className="text-sm text-zinc-400">Creator on X</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
          <div>
            <p className="font-semibold text-purple-200">Support @{handle}</p>
            <p className="text-sm text-purple-300/70">
              Tips go directly to their Solana wallet
            </p>
          </div>
          <button
            onClick={handleTipClick}
            className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            Tip Now
          </button>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Top Supporters
          </h2>
          {leaderboard.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              Be the first to tip @{handle}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.wallet}
                  className="flex items-center gap-4 px-5 py-4 text-sm"
                >
                  <span className="w-6 text-center font-bold text-zinc-600">
                    {index + 1}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-zinc-700" />
                  <span className="font-mono text-xs text-zinc-400">
                    {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
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
