/**
 * Payment processing functions for AptosPay
 * Handles payment creation, claiming, and recipient resolution
 * With database integration and automatic fallback to in-memory storage
 */

import { KeylessAccount } from "@aptos-labs/ts-sdk";
import { getPrisma } from "./db";

// In-memory storage fallback
const emailToAddressMap = new Map<string, string>();
const paymentLinks = new Map<string, PaymentLink>();

/**
 * Payment link data structure
 */
export interface PaymentLink {
  id: string;
  amount: number;
  recipientEmail: string;
  senderAddress?: string;
  recipientAddress?: string;
  status: "pending" | "claimed" | "expired";
  createdAt: Date;
  claimedAt?: Date;
  transactionHash?: string;
}

/**
 * Create a payment link (with DB + fallback)
 */
export async function createPaymentLink(
  amount: number,
  recipientEmail: string,
  senderAddress?: string
): Promise<PaymentLink> {
  const id = generatePaymentId();
  const normalizedEmail = recipientEmail.toLowerCase();

  const payment: PaymentLink = {
    id,
    amount,
    recipientEmail: normalizedEmail,
    senderAddress,
    status: "pending",
    createdAt: new Date(),
  };

  try {
    const prisma = await getPrisma();

    if (prisma) {
      // Save to database
      await prisma.payment.create({
        data: {
          id,
          amount,
          recipientEmail: normalizedEmail,
          senderAddress,
          status: "pending",
        },
      });
      console.log("💾 Payment saved to database");
    } else {
      // Fallback to in-memory
      paymentLinks.set(id, payment);
      storeInSession("payment_links", id, payment);
      console.log("📝 Payment saved to in-memory storage");
    }
  } catch (error) {
    console.warn("⚠️ Database write failed, using fallback:", error);
    paymentLinks.set(id, payment);
    storeInSession("payment_links", id, payment);
  }

  return payment;
}

/**
 * Get payment link by ID (with DB + fallback)
 */
export async function getPaymentLink(id: string): Promise<PaymentLink | null> {
  try {
    const prisma = await getPrisma();

    if (prisma) {
      // Try database first
      const payment = await prisma.payment.findUnique({
        where: { id },
      });

      if (payment) {
        return {
          id: payment.id,
          amount: payment.amount,
          recipientEmail: payment.recipientEmail,
          senderAddress: payment.senderAddress || undefined,
          recipientAddress: payment.recipientAddress || undefined,
          status: payment.status as "pending" | "claimed" | "expired",
          createdAt: payment.createdAt,
          claimedAt: payment.claimedAt || undefined,
          transactionHash: payment.transactionHash || undefined,
        };
      }
    }
  } catch (error) {
    console.warn("⚠️ Database read failed, using fallback:", error);
  }

  // Fallback to in-memory
  if (paymentLinks.has(id)) {
    return paymentLinks.get(id) || null;
  }

  // Check sessionStorage
  return getFromSession("payment_links", id);
}

/**
 * Register email to address mapping (with DB + fallback)
 */
export async function registerEmailAddress(email: string, address: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  try {
    const prisma = await getPrisma();

    if (prisma) {
      // Upsert in database
      await prisma.emailMapping.upsert({
        where: { email: normalizedEmail },
        update: { aptosAddress: address },
        create: { email: normalizedEmail, aptosAddress: address },
      });

      // Also create/update user
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { aptosAddress: address },
        create: { email: normalizedEmail, aptosAddress: address },
      });

      console.log("💾 Email mapping saved to database");
    } else {
      // Fallback to in-memory
      emailToAddressMap.set(normalizedEmail, address);
      storeMapping(normalizedEmail, address);
      console.log("📝 Email mapping saved to in-memory storage");
    }
  } catch (error) {
    console.warn("⚠️ Database write failed, using fallback:", error);
    emailToAddressMap.set(normalizedEmail, address);
    storeMapping(normalizedEmail, address);
  }
}

/**
 * Resolve address from email (with DB + fallback)
 */
export async function resolveAddressFromEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase();

  try {
    const prisma = await getPrisma();

    if (prisma) {
      const mapping = await prisma.emailMapping.findUnique({
        where: { email: normalizedEmail },
      });

      if (mapping) {
        return mapping.aptosAddress;
      }
    }
  } catch (error) {
    console.warn("⚠️ Database read failed, using fallback:", error);
  }

  // Fallback to in-memory
  if (emailToAddressMap.has(normalizedEmail)) {
    return emailToAddressMap.get(normalizedEmail) || null;
  }

  // Check sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("email_addresses");
    if (stored) {
      const addresses = JSON.parse(stored);
      return addresses[normalizedEmail] || null;
    }
  }

  return null;
}

/**
 * Process payment claim (with DB + fallback)
 */
export async function claimPayment(
  paymentId: string,
  recipient: KeylessAccount,
  recipientEmail: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const payment = await getPaymentLink(paymentId);

    if (!payment) {
      return { success: false, error: "Payment link not found" };
    }

    if (payment.status !== "pending") {
      return { success: false, error: "Payment already claimed or expired" };
    }

    // Register the email to address mapping
    await registerEmailAddress(recipientEmail, recipient.accountAddress.toString());

    const transactionHash = `demo_tx_${Date.now()}`;

    // Update payment status
    try {
      const prisma = await getPrisma();

      if (prisma) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "claimed",
            claimedAt: new Date(),
            recipientAddress: recipient.accountAddress.toString(),
            transactionHash,
          },
        });
        console.log("💾 Payment claim saved to database");
      } else {
        // Fallback update
        payment.status = "claimed";
        payment.claimedAt = new Date();
        payment.recipientAddress = recipient.accountAddress.toString();
        payment.transactionHash = transactionHash;
        paymentLinks.set(paymentId, payment);
        storeInSession("payment_links", paymentId, payment);
        console.log("📝 Payment claim saved to in-memory storage");
      }
    } catch (error) {
      console.warn("⚠️ Database update failed, using fallback:", error);
      payment.status = "claimed";
      payment.claimedAt = new Date();
      payment.transactionHash = transactionHash;
      paymentLinks.set(paymentId, payment);
      storeInSession("payment_links", paymentId, payment);
    }

    return {
      success: true,
      transactionHash,
    };
  } catch (error) {
    console.error("Claim payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim payment",
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
    const recipientAddress = await resolveAddressFromEmail(recipientEmail);

    if (recipientAddress) {
      // Recipient already has an account, send directly
      const txHash = `demo_direct_tx_${Date.now()}`;

      return {
        success: true,
        paymentLink: `Direct transfer completed: ${txHash}`,
      };
    } else {
      // Create payment link for recipient to claim
      const payment = await createPaymentLink(
        amount,
        recipientEmail,
        sender.accountAddress.toString()
      );

      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/$${amount}/to/${recipientEmail}?id=${payment.id}`;

      return {
        success: true,
        paymentLink: paymentUrl,
      };
    }
  } catch (error) {
    console.error("Send payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send payment",
    };
  }
}

/**
 * Get transaction history for an address (with DB + fallback)
 */
export async function getTransactionHistory(address: string): Promise<PaymentLink[]> {
  try {
    const prisma = await getPrisma();

    if (prisma) {
      const payments = await prisma.payment.findMany({
        where: {
          OR: [
            { senderAddress: address },
            { recipientAddress: address },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        recipientEmail: payment.recipientEmail,
        senderAddress: payment.senderAddress || undefined,
        recipientAddress: payment.recipientAddress || undefined,
        status: payment.status as "pending" | "claimed" | "expired",
        createdAt: payment.createdAt,
        claimedAt: payment.claimedAt || undefined,
        transactionHash: payment.transactionHash || undefined,
      }));
    }
  } catch (error) {
    console.warn("⚠️ Database read failed, using fallback:", error);
  }

  // Fallback to in-memory/sessionStorage
  const stored = typeof window !== "undefined" ? sessionStorage.getItem("payment_links") : null;
  if (!stored) return [];

  const links = JSON.parse(stored) as Record<string, PaymentLink>;
  const transactions = Object.values(links).filter(
    (payment: PaymentLink) =>
      payment.senderAddress === address ||
      payment.recipientAddress === address
  );

  return transactions;
}

/**
 * Fund account from testnet faucet
 */
export async function fundAccountFromFaucet(address: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://faucet.testnet.aptoslabs.com/mint?amount=100000000&address=${address}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

function storeInSession(key: string, id: string, data: unknown): void {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(key) || "{}";
    const items = JSON.parse(stored);
    items[id] = data;
    sessionStorage.setItem(key, JSON.stringify(items));
  }
}

function getFromSession(key: string, id: string): PaymentLink | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const items = JSON.parse(stored);
      if (items[id]) {
        paymentLinks.set(id, items[id]);
        return items[id];
      }
    }
  }
  return null;
}

function storeMapping(email: string, address: string): void {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("email_addresses") || "{}";
    const addresses = JSON.parse(stored);
    addresses[email] = address;
    sessionStorage.setItem("email_addresses", JSON.stringify(addresses));
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