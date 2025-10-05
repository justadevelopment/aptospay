/**
 * Script to create the APT lending pool
 * Run: bun run scripts/create-lending-pool.ts
 */

import { aptos } from "../src/lib/aptos";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const LENDING_CONTRACT = "0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe";

async function createPool() {
  // Get private key from environment
  const privateKeyHex = process.env.ADMIN_PRIVATE_KEY;

  if (!privateKeyHex) {
    console.error("❌ ADMIN_PRIVATE_KEY environment variable not set");
    console.log("\nUsage:");
    console.log("  ADMIN_PRIVATE_KEY=0x... bun run scripts/create-lending-pool.ts");
    process.exit(1);
  }

  try {
    // Create admin account from private key
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });

    console.log(`📍 Admin Address: ${account.accountAddress.toString()}`);
    console.log(`📍 Contract: ${LENDING_CONTRACT}`);

    // Check if pool already exists
    try {
      const poolResource = await aptos.getAccountResource({
        accountAddress: LENDING_CONTRACT,
        resourceType: `${LENDING_CONTRACT}::p2p_lending::LendingPool`,
      });
      console.log("\n✅ Pool already exists!");
      console.log(JSON.stringify(poolResource.data, null, 2));
      return;
    } catch {
      console.log("\n📝 Pool does not exist yet, creating...");
    }

    // Create the pool
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${LENDING_CONTRACT}::p2p_lending::create_apt_pool`,
        functionArguments: [],
      },
    });

    console.log("\n🔄 Submitting transaction...");
    const pendingTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log(`📤 Transaction Hash: ${pendingTxn.hash}`);
    console.log(`🔗 Explorer: https://explorer.aptoslabs.com/txn/${pendingTxn.hash}?network=testnet`);

    console.log("\n⏳ Waiting for confirmation...");
    await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });

    console.log("\n✅ Pool created successfully!");

    // Fetch and display pool details
    const poolResource = await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT,
      resourceType: `${LENDING_CONTRACT}::p2p_lending::LendingPool`,
    });

    console.log("\n📊 Pool Details:");
    console.log(JSON.stringify(poolResource.data, null, 2));

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

createPool();
