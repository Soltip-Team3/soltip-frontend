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
type PremiumSettings = { premium_content_uri: string; premium_threshold: number };

const PAGE_BG: React.CSSProperties = {
  background:
    "radial-gradient(ellipse 130% 65% at 50% -5%, rgba(167,139,250,0.50) 0%, rgba(139,92,246,0.22) 45%, transparent 68%)," +
    "radial-gradient(ellipse 80% 50% at -5% 100%, rgba(124,58,237,0.28) 0%, transparent 60%)," +
    "radial-gradient(ellipse 60% 40% at 105% 50%, rgba(139,92,246,0.18) 0%, transparent 55%)," +
    "#1e1b4b",
};

function XAvatar({ handle, size = 14 }: { handle: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const dim = `h-${size} w-${size}`;
  if (!errored) {
    return (
      <img
        src={`https://unavatar.io/twitter/${handle}`}
        alt={handle}
        className={`${dim} rounded-2xl object-cover`}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div className={`${dim} flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-violet-500 text-xl font-black text-white shadow-lg shadow-purple-900/40`}>
      {handle.slice(0, 2).toUpperCase()}
    </div>
  );
}

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
  const [premium, setPremium] = useState<PremiumSettings>({ premium_content_uri: "", premium_threshold: 5 });
  const [premiumLoading, setPremiumLoading] = useState(false);

  const walletAddress = wallet ? String(wallet.account.address) : null;

  useEffect(() => {
    if (!walletAddress) return;
    setChecking(true);
    supabase
      .from("creators")
      .select("x_handle, wallet_address, premium_content_uri, premium_threshold")
      .eq("wallet_address", walletAddress)
      .single()
      .then(({ data }) => {
        setCreator(data ? { x_handle: data.x_handle, wallet_address: data.wallet_address } : null);
        if (data) {
          const row = data as { premium_content_uri?: string; premium_threshold?: number } & typeof data;
          setPremium({
            premium_content_uri: row.premium_content_uri ?? "",
            premium_threshold: row.premium_threshold ?? 5,
          });
        }
        setChecking(false);
      });
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

  async function handleSavePremium(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;
    setPremiumLoading(true);
    const { error } = await supabase
      .from("creators")
      .update({
        premium_content_uri: premium.premium_content_uri.trim() || null,
        premium_threshold: premium.premium_threshold,
      })
      .eq("wallet_address", walletAddress);
    setPremiumLoading(false);
    if (error) {
      toast.error("Failed to save premium settings.");
    } else {
      toast.success("Premium content settings saved!");
    }
  }

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
      <div className="flex flex-col min-h-screen" style={PAGE_BG}>
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-3xl border border-purple-500/20">⚡</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Connect your wallet</h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm">Connect Phantom to access your creator dashboard and view your earnings.</p>
          </div>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex flex-col min-h-screen" style={PAGE_BG}>
        <Nav />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-purple-500" />
            Loading your profile...
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col min-h-screen" style={PAGE_BG}>
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/15 border border-purple-500/20 text-2xl">🎙️</div>
              <h1 className="text-2xl font-bold text-white">Register as a Creator</h1>
              <p className="mt-2 text-sm text-zinc-400">Link your X handle to your Solana wallet so fans can tip you instantly.</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Your X Handle</label>
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 focus-within:border-purple-500 transition backdrop-blur">
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 backdrop-blur">
                <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Receiving wallet</p>
                <p className="font-mono text-xs text-zinc-300 break-all">{walletAddress}</p>
              </div>
              <button
                type="submit"
                disabled={loading || !handle.trim()}
                className="w-full rounded-full bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/40"
              >
                {loading ? "Registering..." : "Register as Creator →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={PAGE_BG}>
      <Nav />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <XAvatar handle={creator.x_handle} size={14} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">@{creator.x_handle}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-sm shadow-green-400/60" />
              <span className="text-xs text-zinc-400">Creator on SolTip</span>
            </div>
          </div>
          <a
            href={`/creator/${creator.x_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-300 backdrop-blur transition hover:border-purple-500/60 hover:text-white"
          >
            View profile →
          </a>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="💰" label="Total Earned" value={statsLoading ? "…" : `$${stats.totalEarned.toFixed(2)}`} sub="USDC on Solana" accent="green" />
          <StatCard icon="⚡" label="Total Tips" value={statsLoading ? "…" : String(stats.tipCount)} sub="transactions" accent="purple" />
          <StatCard icon="👥" label="Supporters" value={statsLoading ? "…" : String(stats.uniqueSupporters)} sub="unique wallets" accent="violet" />
        </div>

        {/* Tip link */}
        <div
          className="rounded-2xl border border-purple-500/25 px-5 py-4"
          style={{ background: "rgba(167,139,250,0.16)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">Your Tip Link</p>
              <p className="text-sm text-purple-100/90 font-mono truncate">
                soltip-frontend.vercel.app/creator/{creator.x_handle}
              </p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.x_handle}`); toast.success("Link copied!"); }}
              className="shrink-0 rounded-full bg-purple-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-purple-500 shadow-md shadow-purple-900/50"
            >
              Copy link
            </button>
          </div>
        </div>

        {/* Premium Content Settings */}
        <form
          onSubmit={handleSavePremium}
          className="rounded-2xl border border-amber-500/25 px-5 py-5 space-y-4"
          style={{ background: "rgba(251,191,36,0.07)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐</span>
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-300">Premium Content</h2>
            <span className="ml-auto text-xs text-amber-500/70">x402 gating</span>
          </div>
          <p className="text-xs text-amber-300/60">
            Set a tip threshold and a content URL. Supporters who tip that amount unlock the link automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Content URL
              </label>
              <input
                type="url"
                value={premium.premium_content_uri}
                onChange={(e) => setPremium((p) => ({ ...p, premium_content_uri: e.target.value }))}
                placeholder="https://notion.so/your-exclusive-post"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/60 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Min Tip to Unlock ($)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={premium.premium_threshold}
                onChange={(e) => setPremium((p) => ({ ...p, premium_threshold: Number(e.target.value) }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60 transition"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={premiumLoading}
            className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {premiumLoading ? "Saving..." : "Save Premium Settings"}
          </button>
        </form>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Tips */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <span className="text-purple-400">⚡</span> Recent Tips
            </h2>
            <div className="rounded-2xl border border-zinc-800/80 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
              {statsLoading ? (
                <div className="p-8 text-center text-sm text-zinc-600">Loading...</div>
              ) : recentTips.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-2xl mb-2">💸</p>
                  <p className="text-sm text-zinc-500">No tips yet — share your link!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {recentTips.map((tip, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 border border-zinc-700/50">
                          {tip.tipper_wallet.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-mono text-zinc-300">{tip.tipper_wallet.slice(0, 6)}…{tip.tipper_wallet.slice(-4)}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {new Date(tip.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-400 text-sm">+${Number(tip.amount_usdc).toFixed(2)}</span>
                        {tip.tx_signature && (
                          <a href={`https://solscan.io/tx/${tip.tx_signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-zinc-600 hover:text-purple-400 transition" title="View on Solscan">↗</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Top Supporters */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <span className="text-yellow-400">🏆</span> Top Supporters
            </h2>
            <div className="rounded-2xl border border-zinc-800/80 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
              {statsLoading ? (
                <div className="p-8 text-center text-sm text-zinc-600">Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-2xl mb-2">👑</p>
                  <p className="text-sm text-zinc-500">Your top supporters will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.wallet} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
                      <span className="w-5 text-center text-sm shrink-0">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : <span className="text-xs font-bold text-zinc-400">{index + 1}</span>}
                      </span>
                      {entry.xHandle ? (
                        <XAvatar handle={entry.xHandle} size={8} />
                      ) : (
                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 border border-zinc-700/50">
                          {entry.wallet.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
                        {entry.xHandle ? `@${entry.xHandle}` : `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}`}
                      </span>
                      <span className="font-bold text-green-400 text-sm shrink-0">${entry.total.toFixed(2)}</span>
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
  icon: string; label: string; value: string; sub: string; accent: "green" | "purple" | "violet";
}) {
  const border = { green: "border-green-500/20", purple: "border-purple-500/20", violet: "border-violet-500/20" };
  const bg = { green: "rgba(255,255,255,0.09)", purple: "rgba(255,255,255,0.09)", violet: "rgba(255,255,255,0.09)" };
  const val = { green: "text-green-400", purple: "text-purple-400", violet: "text-violet-400" };
  return (
    <div className={`rounded-2xl border ${border[accent]} px-5 py-5`} style={{ background: bg[accent], backdropFilter: "blur(8px)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-3xl font-black tabular-nums ${val[accent]}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  );
}
