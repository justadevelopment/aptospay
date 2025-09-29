import { Account, KeylessAccount } from "@aptos-labs/ts-sdk";
import { aptos, transferAPT, USDC_ADDRESS } from "./aptos";
import type { PaymentLink, PaymentRequest } from "@/types";

export async function createPaymentLink(request: PaymentRequest): PaymentLink {
  const linkId = generateLinkId();

  const paymentLink: PaymentLink = {
    id: linkId,
    amount: request.amount,
    recipient: request.recipientEmail,
    status: "pending",
    createdAt: new Date(),
  };

  storePaymentLink(paymentLink);

  return paymentLink;
}

export async function processPayment(
  sender: Account | KeylessAccount,
  recipientAddress: string,
  amount: number
): Promise<string> {
  try {
    const txHash = await transferAPT(sender, recipientAddress, amount);
    return txHash;
  } catch (error) {
    console.error("Payment processing error:", error);
    throw new Error("Failed to process payment");
  }
}

export async function claimPaymentLink(
  linkId: string,
  claimantAccount: KeylessAccount
): Promise<string> {
  const paymentLink = getStoredPaymentLink(linkId);

  if (!paymentLink) {
    throw new Error("Payment link not found");
  }

  if (paymentLink.status !== "pending") {
    throw new Error("Payment link already claimed or expired");
  }

  paymentLink.status = "claimed";
  paymentLink.claimedAt = new Date();

  updatePaymentLink(paymentLink);

  return claimantAccount.accountAddress.toString();
}

export function generateLinkId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export function generatePaymentUrl(
  amount: number,
  recipientEmail: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/pay/${amount}/to/${recipientEmail}`;
}

export function storePaymentLink(link: PaymentLink): void {
  if (typeof window === "undefined") return;

  const links = getStoredPaymentLinks();
  links[link.id] = link;
  localStorage.setItem("payment_links", JSON.stringify(links));
}

export function getStoredPaymentLink(linkId: string): PaymentLink | null {
  if (typeof window === "undefined") return null;

  const links = getStoredPaymentLinks();
  return links[linkId] || null;
}

export function getStoredPaymentLinks(): Record<string, PaymentLink> {
  if (typeof window === "undefined") return {};

  const stored = localStorage.getItem("payment_links");
  if (!stored) return {};

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing stored payment links:", error);
    return {};
  }
}

export function updatePaymentLink(link: PaymentLink): void {
  const links = getStoredPaymentLinks();
  links[link.id] = link;

  if (typeof window !== "undefined") {
    localStorage.setItem("payment_links", JSON.stringify(links));
  }
}

export function validatePaymentAmount(amount: string): boolean {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= 10000;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}