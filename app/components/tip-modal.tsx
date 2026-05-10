"use client";

import { useState } from "react";

interface TipModalProps {
  creatorHandle: string;
  onClose: () => void;
  onSendTip: (amountUsdc: number) => Promise<void>;
  isSending: boolean;
}

const PRESET_AMOUNTS = [1, 5, 20];

export function TipModal({
  creatorHandle,
  onClose,
  onSendTip,
  isSending,
}: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(5);
  const [customAmount, setCustomAmount] = useState("10");

  const amountUsdc =
    selectedAmount === "custom" ? Number(customAmount) : selectedAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-white">Tip @{creatorHandle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setSelectedAmount(amount)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedAmount === amount
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              ${amount} USDC
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedAmount("custom")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              selectedAmount === "custom"
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Custom
          </button>
        </div>

        {selectedAmount === "custom" && (
          <div className="mt-4">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="Enter amount in USDC"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => onSendTip(amountUsdc)}
          disabled={isSending || !Number.isFinite(amountUsdc) || amountUsdc <= 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isSending ? "Sending..." : `Send $${amountUsdc} USDC`}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-500">
          Paid in USDC on Solana · instant &amp; no platform fees
        </p>
      </div>
    </div>
  );
}
