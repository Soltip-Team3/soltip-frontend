"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Nav } from "../components/nav";
import { supabase } from "../lib/supabase";

type Creator = { x_handle: string; wallet_address: string };
type TipRow = { tipper_wallet: string; amount_usdc: number; tx_signature: string | null; created_at: string };
type Stats = { totalEarned: number; tipCount: number; uniqueSupporters: number };
type LeaderEntry = { wallet: string; total: number; xHandle: string | null };

export default function Dashboard() {
  const { connected, wallet } = useWalletConnection();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [handle, setHandle] = useState("");
  const [stats, setStats] = useState<Stats>({ totalEarned: 0, tipCount: 0, uniqueSupporters: 0 });
  const [recentTips, setRecentTips] = useState<TipRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const walletAddress = wallet ? String(wallet.account.address) : null;

  useEffect(() => {
    if (!walletAddress) return;
    setChecking(true);
    supabase
      .from("creators")
      .select("x_handle, wallet_address")
      .eq("wallet_address", walletAddress)
      .single()
      .then(({ data }) => { setCreator(data ?? null); setChecking(false); });
  }, [walletAddress]);

  useEffect(() => {
    if (!creator) return;
    async function loadStats() {
      setStatsLoading(true);
      const { data } = await supabase
        .from("tips_cache")
        .select("tipper_wallet, amount_usdc, tx_signature, created_at")
        .eq("creator_handle", creator!.x_handle)
        .order("created_at", { ascending: false });

      const rows: TipRow[] = data ?? [];
      const totalEarned = rows.reduce((s, r) => s + Number(r.amount_usdc), 0);
      const tipCount = rows.length;
      const uniqueSupporters = new Set(rows.map((r) => r.tipper_wallet)).size;
      setStats({ totalEarned, tipCount, uniqueSupporters });
      setRecentTips(rows.slice(0, 10));

      const totals: Record<string, number> = {};
      for (const r of rows) totals[r.tipper_wallet] = (totals[r.tipper_wallet] ?? 0) + Number(r.amount_usdc);
      const sorted = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([w, total]) => ({ wallet: w, total, xHandle: null as string | null }));

      if (sorted.length > 0) {
        const { data: creatorRows } = await supabase
          .from("creators").select("wallet_address, x_handle")
          .in("wallet_address", sorted.map((e) => e.wallet));
        const hMap = Object.fromEntries((creatorRows ?? []).map((c) => [c.wallet_address, c.x_handle]));
        sorted.forEach((e) => { e.xHandle = hMap[e.wallet] ?? null; });
      }
      setLeaderboard(sorted);
      setStatsLoading(false);
    }
    loadStats();
  }, [creator]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress || !handle.trim()) return;
    const cleanHandle = handle.trim().replace(/^@/, "");
    setLoading(true);
    const { error } = await supabase.from("creators").insert({ x_handle: cleanHandle, wallet_address: walletAddress });
    setLoading(false);
    if (error) {
      toast.error(error.code === "23505" ? "That X handle is already registered." : "Registration failed. Try again.");
      return;
    }
    toast.success(`@${cleanHandle} registered! Share your profile link.`);
    setCreator({ x_handle: cleanHandle, wallet_address: walletAddress });
  }

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-3xl">⚡</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Connect your wallet</h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm">
              Connect Phantom to access your creator dashboard, view earnings, and manage your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950">
        <Nav />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            Loading your profile...
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950">
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/20 text-2xl">🎙️</div>
              <h1 className="text-2xl font-bold text-white">Register as a Creator</h1>
              <p className="mt-2 text-sm text-zinc-400">Link your X handle to your Solana wallet so fans can tip you instantly.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Your X Handle</label>
                <div className="flex items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 focus-within:border-purple-500 transition">
                  <span className="text-zinc-500 text-sm font-medium">@</span>
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
                <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Receiving wallet</p>
                <p className="font-mono text-xs text-zinc-300 break-all">{walletAddress}</p>
              </div>

              <button
                type="submit"
                disabled={loading || !handle.trim()}
                className="w-full rounded-full bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Registering..." : "Register as Creator →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const initials = creator.x_handle.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <Nav />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 text-xl font-black text-white shadow-lg shadow-purple-900/40">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">@{creator.x_handle}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-zinc-400">Creator on SolTip</span>
            </div>
          </div>
          <a
            href={`/creator/${creator.x_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-purple-500 hover:text-white"
          >
            View profile →
          </a>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon="💰"
            label="Total Earned"
            value={statsLoading ? "…" : `$${stats.totalEarned.toFixed(2)}`}
            sub="USDC on Solana"
            accent="green"
          />
          <StatCard
            icon="⚡"
            label="Total Tips"
            value={statsLoading ? "…" : String(stats.tipCount)}
            sub="transactions"
            accent="purple"
          />
          <StatCard
            icon="👥"
            label="Supporters"
            value={statsLoading ? "…" : String(stats.uniqueSupporters)}
            sub="unique wallets"
            accent="blue"
          />
        </div>

        {/* Share link */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">Your Tip Link</p>
              <p className="text-sm text-purple-100 font-mono truncate">
                soltip-frontend.vercel.app/creator/{creator.x_handle}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.x_handle}`);
                toast.success("Link copied!");
              }}
              className="shrink-0 rounded-full bg-purple-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-purple-500"
            >
              Copy link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent tips */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <span>⚡</span> Recent Tips
            </h2>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              {statsLoading ? (
                <div className="p-8 text-center text-sm text-zinc-600">Loading...</div>
              ) : recentTips.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-600">No tips yet — share your link!</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {recentTips.map((tip, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                          {tip.tipper_wallet.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-mono text-zinc-300">
                            {tip.tipper_wallet.slice(0, 6)}…{tip.tipper_wallet.slice(-4)}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {new Date(tip.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-400 text-sm">+${Number(tip.amount_usdc).toFixed(2)}</span>
                        {tip.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${tip.tx_signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-600 hover:text-purple-400 transition"
                            title="View on Solscan"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Top supporters */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <span>🏆</span> Top Supporters
            </h2>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              {statsLoading ? (
                <div className="p-8 text-center text-sm text-zinc-600">Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-600">Your top supporters will appear here.</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.wallet} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition">
                      <span className="w-5 text-center text-sm">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : <span className="text-xs font-bold text-zinc-600">{index + 1}</span>}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-400 text-xs font-bold text-white">
                        {(entry.xHandle ?? entry.wallet).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        {entry.xHandle ? `@${entry.xHandle}` : `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}`}
                      </span>
                      <span className="font-bold text-green-400 text-sm">${entry.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string; sub: string; accent: "green" | "purple" | "blue";
}) {
  const colors = {
    green: "border-green-500/20 bg-green-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
  };
  const valueColors = { green: "text-green-400", purple: "text-purple-400", blue: "text-blue-400" };
  return (
    <div className={`rounded-2xl border ${colors[accent]} px-5 py-5`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-3xl font-black tabular-nums ${valueColors[accent]}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{sub}</p>
    </div>
  );
}
