import { Nav } from "../../components/nav";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="mx-auto w-full max-w-3xl px-6 py-10 space-y-8">
        {/* Creator header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-black text-zinc-400">
            {handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">@{handle}</h1>
            <p className="text-sm text-zinc-400">Creator on X</p>
          </div>
        </div>

        {/* Tip CTA */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-purple-200">Support @{handle}</p>
            <p className="text-sm text-purple-300/70">
              Tips go directly to their Solana wallet
            </p>
          </div>
          <button className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500">
            Tip Now
          </button>
        </div>

        {/* Leaderboard */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Top Supporters
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 text-sm"
              >
                <span className="w-6 text-center font-bold text-zinc-600">
                  {i + 1}
                </span>
                <div className="h-8 w-8 rounded-full bg-zinc-700" />
                <span className="text-zinc-500 font-mono text-xs">
                  —
                </span>
                <span className="ml-auto text-zinc-500">—</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Be the first to tip @{handle}
          </p>
        </section>
      </main>
    </div>
  );
}
