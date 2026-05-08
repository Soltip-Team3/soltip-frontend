"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Nav } from "../components/nav";
import { supabase } from "../lib/supabase";

type Creator = {
  x_handle: string;
  wallet_address: string;
};

export default function Dashboard() {
  const { connected, wallet } = useWalletConnection();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [handle, setHandle] = useState("");

  const walletAddress = wallet ? String(wallet.account.address) : null;

  // Check if this wallet is already registered as a creator
  useEffect(() => {
    if (!walletAddress) return;
    setChecking(true);
    supabase
      .from("creators")
      .select("x_handle, wallet_address")
      .eq("wallet_address", walletAddress)
      .single()
      .then(({ data }) => {
        setCreator(data ?? null);
        setChecking(false);
      });
  }, [walletAddress]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress || !handle.trim()) return;

    const cleanHandle = handle.trim().replace(/^@/, "");
    setLoading(true);

    const { error } = await supabase.from("creators").insert({
      x_handle: cleanHandle,
      wallet_address: walletAddress,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("That X handle is already registered.");
      } else {
        toast.error("Registration failed. Try again.");
      }
      return;
    }

    toast.success(`@${cleanHandle} registered! Share your profile link.`);
    setCreator({ x_handle: cleanHandle, wallet_address: walletAddress });
  }

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
          <h1 className="text-2xl font-bold">Connect your wallet</h1>
          <p className="text-zinc-400 text-sm max-w-sm">
            Connect Phantom to access your creator dashboard, view earnings, and
            manage your profile.
          </p>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          Loading your profile...
        </div>
      </div>
    );
  }

  // Not registered yet — show registration form
  if (!creator) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-md space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Register as a Creator</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Link your X handle to your Solana wallet so fans can tip you.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Your X Handle
                </label>
                <div className="flex items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 focus-within:border-purple-500 transition">
                  <span className="text-zinc-500 text-sm">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="yourhandle"
                    className="flex-1 bg-transparent py-3 pl-1 text-sm text-white placeholder-zinc-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-xs text-zinc-500 mb-0.5">Receiving wallet</p>
                <p className="font-mono text-xs text-zinc-300 break-all">
                  {walletAddress}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !handle.trim()}
                className="w-full rounded-full bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Registering..." : "Register as Creator"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Registered — show dashboard
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Creator Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">@{creator.x_handle}</p>
          </div>
          <a
            href={`/creator/${creator.x_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            View public profile →
          </a>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Earned" value="$0.00" sub="USDC" />
          <StatCard label="Total Tips" value="0" sub="transactions" />
          <StatCard label="Supporters" value="0" sub="unique wallets" />
        </div>

        {/* Share link */}
        <section className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-200">Your tip link</p>
            <p className="text-xs text-purple-300/70 mt-0.5">
              {typeof window !== "undefined" ? window.location.origin : ""}/creator/{creator.x_handle}
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/creator/${creator.x_handle}`
              );
              toast.success("Link copied!");
            }}
            className="rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-500"
          >
            Copy link
          </button>
        </section>

        {/* Recent tips */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Recent Tips
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
            No tips yet. Share your profile link to get started.
          </div>
        </section>

        {/* Top supporters */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Top Supporters
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
            Your top supporters will appear here.
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
