@AGENTS.md

# SolTip — Project Context

## What This Is
X-native USDC tipping platform. Chrome extension injects tip buttons into X posts. Creators register once, supporters tip in one click. Built for Dev3pack Global Hackathon (deadline: 2026-05-11 08:00 UTC).

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4
- **Solana:** `@solana/kit` v6, `@solana/react-hooks` v1 — NOT `@solana/web3.js`, NOT `@coral-xyz/anchor`
- **Wallet:** `SolanaProvider` from `@solana/react-hooks`, cluster = `devnet`, Phantom
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js` v2
- **Toasts:** `sonner` — `<Toaster />` already mounted in `providers.tsx`
- **No** `@solana/wallet-adapter-react` — use `useWalletConnection()` from `@solana/react-hooks`

## Anchor Program
- **Program ID:** `HGT4DoDJ1crx3HM28t1CJBT2KAAzK44y3esrNWCtP1JE`
- **Cluster:** devnet
- **Instructions:** `register_creator`, `send_tip`, `set_premium_content`, `update_creator`
- **PDAs:**
  - `CreatorProfile` — seeds: `["creator", x_handle_hash]`
  - `TipRecord` — seeds: `["tip", creator_pda, tweet_id, tipper_pubkey]`
  - `SupporterStats` — seeds: `["supporter", creator_pda, tipper_pubkey]`

## Supabase Schema
```sql
-- creators table
id uuid primary key
x_handle text unique not null
wallet_address text not null
created_at timestamptz default now()

-- tips_cache table (off-chain index for fast reads)
id uuid primary key
creator_handle text not null
tipper_wallet text not null
amount_usdc numeric not null
tweet_id text
tx_signature text
created_at timestamptz default now()
```

## Folder Structure
```
soltip-web/
  app/
    components/
      nav.tsx          — top nav with wallet connect button
      wallet-button.tsx
    creator/[handle]/
      page.tsx         — public profile + Tip Now button + leaderboard (shell)
    dashboard/
      page.tsx         — creator dashboard with stats (shell, hardcoded zeros)
    lib/
      supabase.ts      — supabase client (env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
    globals.css
    layout.tsx
    page.tsx           — landing page (done)
    providers.tsx      — SolanaProvider + Toaster wrapper
```

## Wallet Pattern
```tsx
import { useWalletConnection } from "@solana/react-hooks";
const { connected, wallet } = useWalletConnection();
const walletAddress = wallet ? String(wallet.account.address) : null;
```

## Current Status
| Feature | Status |
|---|---|
| Landing page | Done |
| Wallet connection | Done |
| Creator registration | Done (Supabase only) |
| Public profile `/creator/[handle]` | Shell — Tip Now button not wired |
| Creator dashboard | Shell — hardcoded zeros |
| **Tip Now → sends USDC** | **TODO — next priority** |
| Real leaderboard data | TODO — after tips work |
| Dashboard real stats | TODO — after tips work |

## Coding Standards
- `"use client"` only when using hooks/browser APIs
- Server components by default in App Router pages
- Tailwind only — no CSS modules, no inline styles
- No `any` types
- Use `toast.success()` / `toast.error()` from `sonner` for user feedback
- USDC mint on devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
