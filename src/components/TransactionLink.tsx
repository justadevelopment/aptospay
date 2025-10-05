"use client";

interface TransactionLinkProps {
  txHash: string;
  network?: "mainnet" | "testnet" | "devnet";
  className?: string;
  showFullHash?: boolean;
}

export default function TransactionLink({
  txHash,
  network = "testnet",
  className = "",
  showFullHash = false
}: TransactionLinkProps) {
  const explorerUrl = `https://explorer.aptoslabs.com/txn/${txHash}?network=${network}`;

  const truncatedHash = showFullHash
    ? txHash
    : `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:bg-teal/10 border border-teal/30 hover:border-teal ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <svg className="w-4 h-4 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      <span className="text-teal">{truncatedHash}</span>
    </a>
  );
}
