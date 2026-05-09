# Implement Native @lifi/widget

The user requested to revert the Jumper Exchange redirect and instead natively embed the heavy `@lifi/widget` npm package directly into the application.

## Open Questions
- Installing `@lifi/widget` in a React 19 environment is likely to produce peer-dependency warnings from `wagmi`, `viem`, and `@tanstack/react-query`. We will bypass this using `--legacy-peer-deps`, but please be aware that bundle sizes will increase significantly. Are you okay with this?

## Proposed Changes

### 1. Dependencies
- Install `@lifi/widget` and its required peer dependencies (if missing) in `soltip-frontend`.
- Run: `npm install @lifi/widget --legacy-peer-deps`

### 2. Update `app/tip/[handle]/page.tsx`
#### [MODIFY] `page.tsx`
- Remove the "Open Jumper Exchange" redirect UI.
- Use `next/dynamic` to dynamically import `LiFiWidget` with `ssr: false` to prevent Next.js server-side rendering errors.
- Construct the `WidgetConfig` object to lock the destination chain to Solana, destination token to USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`), and destination address to the creator's wallet.
- Render `<LiFiWidget config={widgetConfig} integrator="soltip" />`.

## Verification Plan
1. Run `npm run build` to ensure the Next.js build passes without choking on the new dependencies.
2. Check `npm install` for any critical unrecoverable errors.
