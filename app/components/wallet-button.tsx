"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useState } from "react";

export function WalletButton() {
  const { connectors, connect, disconnect, connected, wallet } =
    useWalletConnection();
  const [open, setOpen] = useState(false);

  if (connected && wallet) {
    const addr = String(wallet.account.address);
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
    return (
      <button
        onClick={disconnect}
        className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
      >
        {short}
      </button>
    );
  }

  const supported = connectors.filter((c) => c.isSupported());

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-purple-500"
      >
        Connect Wallet
      </button>

      {open && supported.length > 0 && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
          {supported.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                connect(c.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-800"
            >
              {c.icon && (
                <img src={c.icon} alt={c.name} className="h-5 w-5 rounded" />
              )}
              {c.name}
            </button>
          ))}
        </div>
      )}

      {open && supported.length === 0 && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400 shadow-xl">
          No wallets detected. Install Phantom to continue.
        </div>
      )}
    </div>
  );
}
