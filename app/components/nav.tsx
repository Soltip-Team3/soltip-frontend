"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./wallet-button";

export function Nav() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SolTip" width={32} height={32} className="rounded-md" />
          <span className="text-sm font-bold tracking-tight text-white">Sol<span className="text-purple-400">Tip</span></span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            Dashboard
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
