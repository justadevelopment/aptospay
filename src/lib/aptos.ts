import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  EphemeralKeyPair,
  KeylessAccount,
  ProofFetcher
} from "@aptos-labs/ts-sdk";

const APTOS_NETWORK = (process.env.NEXT_PUBLIC_APTOS_NETWORK || "testnet") as Network;

const config = new AptosConfig({
  network: APTOS_NETWORK,
});

export const aptos = new Aptos(config);

export const USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";

export async function getBalance(address: string): Promise<number> {
  try {
    const resources = await aptos.getAccountResources({
      accountAddress: address,
    });

    const coinStore = resources.find(
      (r) => r.type === `0x1::coin::CoinStore<${USDC_ADDRESS}>`
    );

    if (coinStore && "data" in coinStore) {
      const data = coinStore.data as { coin: { value: string } };
      return parseInt(data.coin.value) / 1000000;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
}

export async function transferAPT(
  from: Account | KeylessAccount,
  to: string,
  amount: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: from.accountAddress,
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [to, Math.floor(amount * 100000000)],
    },
  });

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: from,
    transaction,
  });

  const committedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
  });

  return committedTransaction.hash;
}

export { Network, Account, EphemeralKeyPair, KeylessAccount, type ProofFetcher };