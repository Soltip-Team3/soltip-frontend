"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { Nav } from "../components/nav";

export default function Dashboard() {
  const { connected } = useWalletConnection();

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

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track your tips and supporters
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Earned" value="$0.00" sub="USDC" />
          <StatCard label="Total Tips" value="0" sub="transactions" />
          <StatCard label="Supporters" value="0" sub="unique wallets" />
        </div>

        {/* Recent tips placeholder */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Recent Tips
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
            No tips yet. Share your creator profile to get started.
          </div>
        </section>

        {/* Top supporters placeholder */}
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
