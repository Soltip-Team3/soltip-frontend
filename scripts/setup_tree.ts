import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum, createTree } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner, keypairIdentity } from "@metaplex-foundation/umi";

async function main() {
  console.log("Setting up Umi...");
  // Using devnet
  const umi = createUmi("https://api.devnet.solana.com").use(mplBubblegum());

  console.log("Generating a new payer wallet...");
  const payer = generateSigner(umi);
  umi.use(keypairIdentity(payer));

  console.log("\n========================================================");
  console.log("PAYER_PUBLIC_KEY:", payer.publicKey);
  console.log("PAYER_PRIVATE_KEY:", `[${payer.secretKey.toString()}]`);
  console.log("========================================================\n");
  console.log("⚠️ PLEASE AIRDROP SOL TO THE PUBLIC KEY ABOVE BEFORE CONTINUING.");
  console.log("You can use: solana airdrop 2 " + payer.publicKey + " --url devnet");
  console.log("After airdropping, press ENTER to create the tree...");

  // Wait for user input
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });

  console.log("\nGenerating Merkle Tree address...");
  const merkleTree = generateSigner(umi);

  console.log("Creating Merkle Tree on-chain (maxDepth=14, maxBufferSize=64)...");
  console.log("This will cost roughly 0.2 SOL.");
  
  try {
    const builder = await createTree(umi, {
      merkleTree,
      maxDepth: 14,
      maxBufferSize: 64,
    });

    const result = await builder.sendAndConfirm(umi);
    console.log("\n✅ Tree Created Successfully!");
    console.log("Signature:", Buffer.from(result.signature).toString("hex"));
    
    console.log("\n========================================================");
    console.log("ADD THESE TO YOUR soltip-frontend/.env.local:");
    console.log(`NEXT_PUBLIC_PAYER_PRIVATE_KEY=[${payer.secretKey.toString()}]`);
    console.log(`NEXT_PUBLIC_TREE_ADDRESS=${merkleTree.publicKey}`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("❌ Failed to create tree. Did you airdrop SOL to the payer?", err);
  }

  process.exit(0);
}

main().catch(console.error);
