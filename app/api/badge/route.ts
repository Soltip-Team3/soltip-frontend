import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum, mintV1 } from "@metaplex-foundation/mpl-bubblegum";
import { keypairIdentity, publicKey, createSignerFromKeypair } from "@metaplex-foundation/umi";

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

    // --- cNFT Minting via Bubblegum ---
    const PAYER_PRIVATE_KEY = process.env.NEXT_PUBLIC_PAYER_PRIVATE_KEY || process.env.PAYER_PRIVATE_KEY;
    const TREE_ADDRESS = process.env.NEXT_PUBLIC_TREE_ADDRESS || process.env.TREE_ADDRESS;

    if (PAYER_PRIVATE_KEY && TREE_ADDRESS) {
      try {
        const umi = createUmi("https://api.devnet.solana.com").use(mplBubblegum());
        const secretKey = new Uint8Array(JSON.parse(PAYER_PRIVATE_KEY));
        const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
        const signer = createSignerFromKeypair(umi, keypair);
        umi.use(keypairIdentity(signer));

        await mintV1(umi, {
          leafOwner: publicKey(tipper_wallet),
          merkleTree: publicKey(TREE_ADDRESS),
          metadata: {
            name: badgeMetadata.name,
            uri: badgeMetadata.image, // For a hackathon, we can use the image URL as the metadata URI
            sellerFeeBasisPoints: 0,
            collection: { key: publicKey(TREE_ADDRESS), verified: false },
            creators: [{ address: signer.publicKey, verified: true, share: 100 }],
          },
        }).sendAndConfirm(umi);
        console.log(`Successfully minted cNFT Level ${level} to ${tipper_wallet}`);
      } catch (mintErr) {
        console.error("Failed to mint cNFT:", mintErr);
      }
    }

    return NextResponse.json({ level, badge: badgeMetadata, total_tipped: totalUsdc });
  } catch (err) {
    console.error("Badge route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
