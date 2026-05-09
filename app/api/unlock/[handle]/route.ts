import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// Minimum tip threshold in USD to unlock premium content (default $5)
const DEFAULT_THRESHOLD = 5;

/**
 * GET  /api/unlock/[handle]
 * If the caller has not paid, return HTTP 402 with payment requirements.
 * The client should tip first, then call POST with the tx_signature.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const { searchParams } = new URL(request.url);
  const tipperWallet = searchParams.get("tipper_wallet");

  // Fetch creator to get premium threshold + content URI
  const { data: creator } = await supabase
    .from("creators")
    .select("wallet_address, premium_threshold, premium_content_uri")
    .eq("x_handle", handle)
    .single();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const threshold = creator.premium_threshold ?? DEFAULT_THRESHOLD;
  const creatorWallet = creator.wallet_address;

  // If no tipper wallet provided → always 402
  if (!tipperWallet) {
    return paymentRequired(handle, creatorWallet, threshold);
  }

  // Check if tipper has tipped enough cumulatively
  const { data: tips } = await supabase
    .from("tips_cache")
    .select("amount_usdc")
    .eq("creator_handle", handle)
    .eq("tipper_wallet", tipperWallet);

  const totalTipped = (tips ?? []).reduce((s, r) => s + Number(r.amount_usdc), 0);

  if (totalTipped < threshold) {
    return paymentRequired(handle, creatorWallet, threshold, totalTipped);
  }

  // Access granted — return the gated content URI
  return NextResponse.json({
    unlocked: true,
    content_uri: creator.premium_content_uri ?? null,
    total_tipped: totalTipped,
  });
}

function paymentRequired(
  handle: string,
  recipientWallet: string,
  thresholdUsd: number,
  currentUsd = 0
) {
  // x402 PaymentRequirements format
  const paymentRequirements = {
    scheme: "exact",
    network: "solana-devnet",
    maxAmountRequired: String(Math.round((thresholdUsd - currentUsd) * 1_000_000)),
    resource: `https://soltip.app/api/unlock/${handle}`,
    description: `Tip @${handle} at least $${thresholdUsd} USDC to unlock premium content`,
    mimeType: "application/json",
    payTo: recipientWallet,
    asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC devnet mint
    outputSchema: null,
    extra: {
      current_tipped_usd: currentUsd,
      threshold_usd: thresholdUsd,
      remaining_usd: Math.max(0, thresholdUsd - currentUsd),
    },
  };

  return NextResponse.json(
    {
      error: "Payment required",
      unlocked: false,
      x402: paymentRequirements,
    },
    {
      status: 402,
      headers: {
        "X-Payment-Required": Buffer.from(JSON.stringify(paymentRequirements)).toString("base64"),
      },
    }
  );
}
