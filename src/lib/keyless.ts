import { EphemeralKeyPair, KeylessAccount, Serializer } from "@aptos-labs/ts-sdk";
import { aptos } from "./aptos";

const STORAGE_KEY = "aptos_ephemeral_key_pairs";

export interface StoredEphemeralKeyPair {
  bytes: string; // Hex string of serialized bytes
  nonce: string;
  expiryDateSecs: number;
}

export function generateEphemeralKeyPair(): EphemeralKeyPair {
  // Set expiry to 30 days from now (extended from default 2 weeks to reduce logouts)
  const expiryDateSecs = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  return EphemeralKeyPair.generate({ expiryDateSecs });
}

export function storeEphemeralKeyPair(
  ephemeralKeyPair: EphemeralKeyPair
): string {
  const nonce = ephemeralKeyPair.nonce;
  const storedPairs = getStoredEphemeralKeyPairs();

  // Serialize the ephemeral key pair to bytes
  const serializer = new Serializer();
  ephemeralKeyPair.serialize(serializer);
  const bytes = serializer.toUint8Array();

  const serialized: StoredEphemeralKeyPair = {
    bytes: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''),
    nonce: nonce,
    expiryDateSecs: ephemeralKeyPair.expiryDateSecs,
  };

  storedPairs[nonce] = serialized;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPairs));
  }

  return nonce;
}

export function getStoredEphemeralKeyPairs(): Record<string, StoredEphemeralKeyPair> {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing stored ephemeral key pairs:", error);
    return {};
  }
}

export function getEphemeralKeyPair(nonce: string): EphemeralKeyPair | null {
  const storedPairs = getStoredEphemeralKeyPairs();
  const stored = storedPairs[nonce];

  if (!stored) {
    return null;
  }

  try {
    // Convert hex string back to bytes
    const bytes = new Uint8Array(
      stored.bytes.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // Deserialize from bytes
    return EphemeralKeyPair.fromBytes(bytes);
  } catch (error) {
    console.error("Error reconstructing ephemeral key pair:", error);
    return null;
  }
}

export function cleanupExpiredKeyPairs(): void {
  const storedPairs = getStoredEphemeralKeyPairs();
  const now = Math.floor(Date.now() / 1000);

  const validPairs: Record<string, StoredEphemeralKeyPair> = {};

  for (const [nonce, pair] of Object.entries(storedPairs)) {
    if (pair.expiryDateSecs > now) {
      validPairs[nonce] = pair;
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validPairs));
  }
}

export async function deriveKeylessAccount(
  jwt: string,
  ephemeralKeyPair: EphemeralKeyPair
): Promise<KeylessAccount> {
  cleanupExpiredKeyPairs();

  const keylessAccount = await aptos.deriveKeylessAccount({
    jwt,
    ephemeralKeyPair,
  });

  return keylessAccount;
}

/**
 * Get the correct redirect URI based on the current domain.
 * Supports multiple production domains and localhost.
 */
function getRedirectUri(): string {
  // Only run on client side
  if (typeof window === "undefined") {
    // Server-side fallback (won't be used for OAuth flow which is client-side)
    return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
           `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  }

  const origin = window.location.origin;

  // Allowed domains
  const allowedDomains = [
    'https://aptfy.xyz',
    'https://www.aptfy.xyz',
    'https://aptfy.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Check if current origin is in allowed list
  if (allowedDomains.includes(origin)) {
    return `${origin}/auth/callback`;
  }

  // Fallback to env variable or localhost
  return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
         'http://localhost:3000/auth/callback';
}

export function createGoogleAuthUrl(nonce: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = getRedirectUri();

  if (!clientId) {
    throw new Error("Google OAuth Client ID is missing. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  }

  const params = new URLSearchParams({
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    redirect_uri: redirectUri,
    client_id: clientId,
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Store KeylessAccount for session persistence
export function storeKeylessAccount(account: KeylessAccount): void {
  if (typeof window === "undefined") return;

  // Store account address for quick access
  sessionStorage.setItem("aptos_keyless_account", account.accountAddress.toString());
}

// Retrieve stored KeylessAccount address
export function getStoredKeylessAccount(): string | null {
  if (typeof window === "undefined") return null;

  return sessionStorage.getItem("aptos_keyless_account");
}

// Reconstruct KeylessAccount from session storage (for client-side transactions)
export async function getKeylessAccount(): Promise<KeylessAccount | null> {
  if (typeof window === "undefined") return null;

  try {
    const jwt = sessionStorage.getItem("id_token");
    const nonce = sessionStorage.getItem("auth_nonce");

    if (!jwt || !nonce) {
      return null;
    }

    const ephemeralKeyPair = getEphemeralKeyPair(nonce);
    if (!ephemeralKeyPair) {
      return null;
    }

    const keylessAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);
    return keylessAccount;
  } catch (error) {
    console.error("Error reconstructing keyless account:", error);
    return null;
  }
}