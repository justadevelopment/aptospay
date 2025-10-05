/**
 * Script to set oracle prices for P2P lending
 * Run: bun run scripts/set-oracle-prices.ts
 */

import { aptos } from "../src/lib/aptos";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const LENDING_CONTRACT = "0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe";

// Prices in 8 decimals (Pyth format)
const APT_PRICE = 1000000000; // $10.00 (10 * 1e8)
const USDC_PRICE = 100000000; // $1.00 (1 * 1e8)

async function setPrices() {
  const privateKeyHex = process.env.ADMIN_PRIVATE_KEY;

  if (!privateKeyHex) {
    console.error("❌ ADMIN_PRIVATE_KEY environment variable not set");
    console.log("\nUsage:");
    console.log("  ADMIN_PRIVATE_KEY=0x... bun run scripts/set-oracle-prices.ts");
    process.exit(1);
  }

  try {
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });

    console.log(`📍 Admin Address: ${account.accountAddress.toString()}`);
    console.log(`📍 Setting Prices:`);
    console.log(`   APT:  $${APT_PRICE / 1e8}`);
    console.log(`   USDC: $${USDC_PRICE / 1e8}`);

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${LENDING_CONTRACT}::p2p_lending::update_price_oracle`,
        functionArguments: [APT_PRICE, USDC_PRICE],
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

    console.log("\n✅ Prices updated successfully!");

    // Fetch and display oracle data
    const oracleResource = await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT,
      resourceType: `${LENDING_CONTRACT}::p2p_lending::PriceOracle`,
    });

    console.log("\n📊 Oracle Data:");
    console.log(JSON.stringify(oracleResource.data, null, 2));

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

setPrices();
