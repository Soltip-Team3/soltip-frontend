# SolTip

> Tip X (Twitter) creators instantly in USDC — directly from their posts, no middleman, no fees.

Built for the **Dev3Pack Global Hackathon** · Solana devnet

---

## What It Does

SolTip is a browser-extension + web app tipping platform for X creators:

- **Chrome extension** injects a "Tip ⚡" button on every X post
- **One click** sends USDC to the creator's Solana wallet via SPL token transfer
- **Any chain** — supporters can bridge and tip from Ethereum, BNB, etc. via LI.FI
- **cNFT badges** — supporters earn on-chain compressed NFT badges (Metaplex Bubblegum) based on cumulative tips
- **x402 premium content** — creators lock exclusive content behind a tip threshold; HTTP 402 enforces access
- **Leaderboard** — top supporters ranked with badge tiers (Supporter → Fan → Champion → Legend → Diamond)
- **Creator dashboard** — register on-chain, set premium content, view live stats

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Solana | `@solana/kit` v6 + `@solana/react-hooks` v1 |
| Wallet | Phantom (Devnet) |
| Smart Contract | Anchor — Program ID: `HGT4DoDJ1crx3HM28t1CJBT2KAAzK44y3esrNWCtP1JE` |
| Badges | Metaplex Bubblegum cNFT (`@metaplex-foundation/mpl-bubblegum`) |
| Cross-chain | LI.FI Widget v3 |
| Payment protocol | x402 (HTTP 402 paywall) |
| Database | Supabase PostgreSQL |
| Deployment | Vercel |

---

## Integrations by Bounty

### Solana — USDC Tips + On-chain Creator Registration
- Direct SPL token transfer via `useSplToken` — no custodian, instant settlement
- `register_creator` Anchor instruction creates `CreatorProfile` PDA on devnet
- USDC mint (devnet): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Program ID: `HGT4DoDJ1crx3HM28t1CJBT2KAAzK44y3esrNWCtP1JE`

### Metaplex Bubblegum — cNFT Supporter Badges
- `/api/badge` mints a compressed NFT to the tipper's wallet after each tip
- Badge level scales with cumulative USDC tips:
  - ⭐ Supporter ($0+) → 💜 Fan ($10+) → 🔥 Champion ($20+) → ⚡ Legend ($50+) → 💎 Diamond ($100+)
- Uses Bubblegum `mintV1` with a pre-created merkle tree on devnet

### LI.FI — Cross-chain Tips
- `/tip/[handle]` embeds the LI.FI widget
- Supporters can bridge from any EVM chain directly to Solana USDC and tip

### x402 — Paywalled Premium Content
- Creators set a USDC tip threshold for premium content in their dashboard
- `/api/unlock/[handle]` returns HTTP 402 with `PaymentRequirements` JSON when threshold not met
- Returns `content_uri` on access granted — enforced server-side

---

## Architecture

```
User on X (Twitter)
  │
  ▼
Chrome Extension (content script)
  │  injects "Tip ⚡" button on every post
  │
  ▼
SolTip Web App (Next.js on Vercel)
  │
  ├── /creator/[handle]          Public profile + leaderboard
  │     ├── useSplToken ──────── Solana devnet (USDC SPL transfer)
  │     ├── POST /api/badge ──── Metaplex Bubblegum (cNFT mint)
  │     └── GET  /api/unlock ─── x402 paywall check
  │
  ├── /dashboard                 Creator registration + settings
  │     └── register_creator ─── Anchor ix → CreatorProfile PDA on-chain
  │
  └── /tip/[handle]             Cross-chain tip page
        └── LI.FI Widget ─────── Bridge any chain → Solana USDC

Supabase (PostgreSQL)
  ├── creators     (handle, wallet, premium threshold + URI)
  └── tips_cache   (off-chain index for fast leaderboard reads)
```

---

## Project Structure

```
soltip-web/
  app/
    components/        nav, tip-modal, wallet-button
    creator/[handle]/  public profile + leaderboard + premium unlock
    dashboard/         creator registration + stats + premium settings
    tip/[handle]/      LI.FI cross-chain tip page
    api/
      badge/           POST — cNFT mint (Metaplex Bubblegum)
      unlock/[handle]/ GET  — x402 paywall enforcement
      creator/         GET  — creator wallet lookup
    lib/supabase.ts
```

---

## Local Setup

```bash
git clone https://github.com/Soltip-Team3/soltip-frontend
cd soltip-frontend
bun install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SOLANA_RPC_URL=https://api.devnet.solana.com
BADGE_MERKLE_TREE=your_merkle_tree_address
BADGE_TREE_AUTHORITY_SECRET=[...keypair json array...]
```

```bash
bun dev
```

---

## Live Demo

Deployed: [soltip-web.vercel.app](https://soltip-web.vercel.app)

Demo video: _[coming soon]_

---

## Team — Soltip Team 3

Built at Dev3Pack Global Hackathon · May 2026
