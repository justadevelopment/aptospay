/**
 * Payment processing functions for AptosPay
 * Handles payment creation, claiming, and recipient resolution
 */

import { KeylessAccount } from "@aptos-labs/ts-sdk";

// In-memory storage for email to address mapping
// In production, this should be a database
const emailToAddressMap = new Map<string, string>();

/**
 * Payment link data structure
 */
export interface PaymentLink {
  id: string;
  amount: number;
  recipientEmail: string;
  senderAddress?: string;
  status: "pending" | "claimed" | "expired";
  createdAt: Date;
  claimedAt?: Date;
  transactionHash?: string;
}

// In-memory storage for payment links
// In production, use a database
const paymentLinks = new Map<string, PaymentLink>();

/**
 * Create a payment link
 */
export function createPaymentLink(
  amount: number,
  recipientEmail: string,
  senderAddress?: string
): PaymentLink {
  const id = generatePaymentId();

  const payment: PaymentLink = {
    id,
    amount,
    recipientEmail: recipientEmail.toLowerCase(),
    senderAddress,
    status: "pending",
    createdAt: new Date(),
  };

  paymentLinks.set(id, payment);

  // Store in sessionStorage for persistence during session
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("payment_links") || "{}";
    const links = JSON.parse(stored);
    links[id] = payment;
    sessionStorage.setItem("payment_links", JSON.stringify(links));
  }

  return payment;
}

/**
 * Get payment link by ID
 */
export function getPaymentLink(id: string): PaymentLink | null {
  // Check in-memory first
  if (paymentLinks.has(id)) {
    return paymentLinks.get(id) || null;
  }

  // Check sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("payment_links");
    if (stored) {
      const links = JSON.parse(stored);
      if (links[id]) {
        paymentLinks.set(id, links[id]);
        return links[id];
      }
    }
  }

  return null;
}

/**
 * Register email to address mapping
 */
export function registerEmailAddress(email: string, address: string): void {
  const normalizedEmail = email.toLowerCase();
  emailToAddressMap.set(normalizedEmail, address);

  // Store in sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("email_addresses") || "{}";
    const addresses = JSON.parse(stored);
    addresses[normalizedEmail] = address;
    sessionStorage.setItem("email_addresses", JSON.stringify(addresses));
  }
}

/**
 * Resolve address from email
 */
export function resolveAddressFromEmail(email: string): string | null {
  const normalizedEmail = email.toLowerCase();

  // Check in-memory
  if (emailToAddressMap.has(normalizedEmail)) {
    return emailToAddressMap.get(normalizedEmail) || null;
  }

  // Check sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("email_addresses");
    if (stored) {
      const addresses = JSON.parse(stored);
      if (addresses[normalizedEmail]) {
        emailToAddressMap.set(normalizedEmail, addresses[normalizedEmail]);
        return addresses[normalizedEmail];
      }
    }
  }

  return null;
}

/**
 * Process payment claim
 */
export async function claimPayment(
  paymentId: string,
  recipient: KeylessAccount,
  recipientEmail: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const payment = getPaymentLink(paymentId);

    if (!payment) {
      return { success: false, error: "Payment link not found" };
    }

    if (payment.status !== "pending") {
      return { success: false, error: "Payment already claimed or expired" };
    }

    // Register the email to address mapping
    registerEmailAddress(recipientEmail, recipient.accountAddress.toString());

    // Check if sender has set up the payment with funds
    if (payment.senderAddress) {
      try {
        // In a real implementation, funds would be held in escrow
        // For now, we'll just mark as successful for demo
        // To actually transfer, you'd need the sender's KeylessAccount object
        const transactionHash = `demo_tx_${Date.now()}`;

        // Update payment status
        payment.status = "claimed";
        payment.claimedAt = new Date();
        payment.transactionHash = transactionHash;

        // Update storage
        paymentLinks.set(paymentId, payment);
        updatePaymentInStorage(paymentId, payment);

        return {
          success: true,
          transactionHash: transactionHash
        };
      } catch (txError) {
        console.error("Transaction error:", txError);
        return {
          success: false,
          error: "Transaction failed. Sender may not have sufficient funds."
        };
      }
    }

    // If no sender, just mark as claimed (for demo purposes)
    payment.status = "claimed";
    payment.claimedAt = new Date();

    paymentLinks.set(paymentId, payment);
    updatePaymentInStorage(paymentId, payment);

    return {
      success: true,
      transactionHash: "demo_tx_" + Date.now()
    };
  } catch (error) {
    console.error("Claim payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim payment"
    };
  }
}

/**
 * Send payment to email recipient
 */
export async function sendPaymentToEmail(
  sender: KeylessAccount,
  recipientEmail: string,
  amount: number
): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
  try {
    const recipientAddress = resolveAddressFromEmail(recipientEmail);

    if (recipientAddress) {
      // Recipient already has an account, send directly
      // Note: In production, use the actual transfer function
      // For demo, we'll simulate the transfer
      const txHash = `demo_direct_tx_${Date.now()}`;

      return {
        success: true,
        paymentLink: `Direct transfer completed: ${txHash}`
      };
    } else {
      // Create payment link for recipient to claim
      const payment = createPaymentLink(
        amount,
        recipientEmail,
        sender.accountAddress.toString()
      );

      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/$${amount}/to/${recipientEmail}?id=${payment.id}`;

      return {
        success: true,
        paymentLink: paymentUrl
      };
    }
  } catch (error) {
    console.error("Send payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send payment"
    };
  }
}

/**
 * Get transaction history for an address
 */
export async function getTransactionHistory(address: string): Promise<PaymentLink[]> {
  try {
    // This would fetch from Aptos indexer in production
    // For now, return mock data
    const stored = sessionStorage.getItem("payment_links");
    if (!stored) return [];

    const links = JSON.parse(stored) as Record<string, PaymentLink>;
    const transactions = Object.values(links).filter((payment: PaymentLink) =>
      payment.senderAddress === address ||
      resolveAddressFromEmail(payment.recipientEmail) === address
    );

    return transactions;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
}

/**
 * Fund account from testnet faucet
 */
export async function fundAccountFromFaucet(address: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://faucet.testnet.aptoslabs.com/mint?amount=100000000&address=${address}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error("Faucet error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to fund account from faucet:", error);
    return false;
  }
}

// Helper functions

function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function updatePaymentInStorage(id: string, payment: PaymentLink): void {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("payment_links") || "{}";
    const links = JSON.parse(stored);
    links[id] = payment;
    sessionStorage.setItem("payment_links", JSON.stringify(links));
  }
}

// Initialize from storage on load
if (typeof window !== "undefined") {
  // Load payment links
  const storedLinks = sessionStorage.getItem("payment_links");
  if (storedLinks) {
    const links = JSON.parse(storedLinks);
    Object.entries(links).forEach(([id, payment]) => {
      paymentLinks.set(id, payment as PaymentLink);
    });
  }

  // Load email addresses
  const storedAddresses = sessionStorage.getItem("email_addresses");
  if (storedAddresses) {
    const addresses = JSON.parse(storedAddresses);
    Object.entries(addresses).forEach(([email, address]) => {
      emailToAddressMap.set(email, address as string);
    });
  }
}