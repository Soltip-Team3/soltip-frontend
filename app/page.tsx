import Link from "next/link";
import { Nav } from "./components/nav";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Hero */}
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Live on Solana Devnet
          </div>

          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Tip creators on{" "}
            <span className="text-purple-400">X</span>
            {" "}with{" "}
            <span className="text-green-400">USDC</span>
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed">
            One click. 400ms. Your favourite creators get paid instantly —
            no bank account, no fees eating their income.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-full bg-purple-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              I&apos;m a Creator →
            </Link>
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Get the Extension
            </a>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24 w-full max-w-4xl">
          <h2 className="mb-10 text-2xl font-bold text-zinc-200">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StepCard
              step="1"
              title="Install the extension"
              description="Get SolTip from the Chrome Web Store. It adds a tip button to every X post."
            />
            <StepCard
              step="2"
              title="Connect Phantom"
              description="Sign in once. Your wallet is ready — no custodians, just your keys."
            />
            <StepCard
              step="3"
              title="Tip in one click"
              description="Click the tip button on any post. USDC lands in the creator's wallet in under a second."
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        Built for the Dev3pack Global Hackathon · Powered by Solana
      </footer>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold">
        {step}
      </div>
      <h3 className="mb-1 font-semibold text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
