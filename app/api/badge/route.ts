import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipper_wallet, creator_handle, tx_signature } = body as {
      tipper_wallet: string;
      creator_handle: string;
      tx_signature: string;
    };

    if (!tipper_wallet || !creator_handle || !tx_signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the tip actually exists in our cache (anti-fraud)
    const { data: tipRow } = await supabase
      .from("tips_cache")
      .select("amount_usdc")
      .eq("tx_signature", tx_signature)
      .eq("tipper_wallet", tipper_wallet)
      .single();

    if (!tipRow) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    // Compute cumulative tips from this supporter for this creator
    const { data: allTips } = await supabase
      .from("tips_cache")
      .select("amount_usdc")
      .eq("creator_handle", creator_handle)
      .eq("tipper_wallet", tipper_wallet);

    const totalUsdc = (allTips ?? []).reduce((s, r) => s + Number(r.amount_usdc), 0);

    // Badge level: 1 = first tip, 2 = $10+, 3 = $20+, 4 = $50+, 5 = $100+
    const level =
      totalUsdc >= 100 ? 5
      : totalUsdc >= 50 ? 4
      : totalUsdc >= 20 ? 3
      : totalUsdc >= 10 ? 2
      : 1;

    const badgeNames: Record<number, string> = {
      1: "Supporter",
      2: "Fan",
      3: "Champion",
      4: "Legend",
      5: "Diamond",
    };

    // Badge metadata (cNFT mint would happen here via Bubblegum on a funded devnet)
    const badgeMetadata = {
      name: `SolTip ${badgeNames[level]} Badge`,
      symbol: "STIP",
      description: `Level ${level} supporter badge for @${creator_handle} on SolTip`,
      image: `https://soltip.app/badges/level-${level}.png`,
      attributes: [
        { trait_type: "Creator", value: creator_handle },
        { trait_type: "Level", value: String(level) },
        { trait_type: "Total Tipped", value: `$${totalUsdc.toFixed(2)}` },
      ],
    };

    return NextResponse.json({ level, badge: badgeMetadata, total_tipped: totalUsdc });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
