export interface PaymentLink {
  id: string;
  amount: number;
  recipient: string;
  sender?: string;
  status: "pending" | "claimed" | "expired";
  createdAt: Date;
  claimedAt?: Date;
  transactionHash?: string;
}

export interface UserAccount {
  address: string;
  email: string;
  balance: number;
  createdAt: Date;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
  status: "pending" | "confirmed" | "failed";
}

export interface AuthSession {
  jwt: string;
  email: string;
  address: string;
  expiresAt: number;
}

export interface PaymentRequest {
  amount: number;
  recipientEmail: string;
  message?: string;
}

export interface PaymentClaim {
  linkId: string;
  claimantEmail: string;
  claimantAddress: string;
  jwt: string;
}