import { EphemeralKeyPair, KeylessAccount } from "@aptos-labs/ts-sdk";
import { aptos } from "./aptos";
import { jwtDecode } from "jwt-decode";

const STORAGE_KEY = "aptos_ephemeral_key_pairs";

export interface StoredEphemeralKeyPair {
  publicKey: string;
  privateKey: string;
  nonce: string;
  expiryDateSecs: number;
  blinder: string;
}

export interface DecodedJWT {
  sub: string;
  aud: string;
  email?: string;
  email_verified?: boolean;
  iss: string;
  exp: number;
  iat: number;
  nonce: string;
}

export function generateEphemeralKeyPair(): EphemeralKeyPair {
  return EphemeralKeyPair.generate();
}

export function storeEphemeralKeyPair(
  ephemeralKeyPair: EphemeralKeyPair
): string {
  const nonce = ephemeralKeyPair.nonce;

  const storedPairs = getStoredEphemeralKeyPairs();

  const serialized: StoredEphemeralKeyPair = {
    publicKey: ephemeralKeyPair.publicKey.toString(),
    privateKey: ephemeralKeyPair.privateKey.toString(),
    nonce: nonce,
    expiryDateSecs: ephemeralKeyPair.expiryDateSecs,
    blinder: Array.from(ephemeralKeyPair.blinder)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
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
    const blinder = new Uint8Array(
      stored.blinder.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return new EphemeralKeyPair({
      privateKey: stored.privateKey,
      publicKey: stored.publicKey,
      expiryDateSecs: stored.expiryDateSecs,
      blinder,
    });
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
  const decodedJwt = jwtDecode<DecodedJWT>(jwt);

  cleanupExpiredKeyPairs();

  const keylessAccount = await aptos.deriveKeylessAccount({
    jwt,
    ephemeralKeyPair,
  });

  return keylessAccount;
}

export function createGoogleAuthUrl(nonce: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Google OAuth configuration is missing");
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