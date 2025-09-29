"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getEphemeralKeyPair, deriveKeylessAccount } from "@/lib/keyless";
import { validateJWT, validateNonce } from "@/lib/validation";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get("id_token");

        if (!idToken) {
          throw new Error("No ID token received from Google");
        }

        // Validate JWT
        const jwtValidation = validateJWT(idToken);
        if (!jwtValidation.isValid) {
          throw new Error(`Invalid JWT: ${jwtValidation.error}`);
        }

        const decodedToken = JSON.parse(atob(idToken.split(".")[1]));
        const nonce = decodedToken.nonce;

        if (!nonce) {
          throw new Error("No nonce found in token");
        }

        // Validate nonce
        const nonceValidation = validateNonce(nonce);
        if (!nonceValidation.isValid) {
          throw new Error(`Invalid nonce: ${nonceValidation.error}`);
        }

        setStatus("Retrieving ephemeral key...");
        const ephemeralKeyPair = getEphemeralKeyPair(nonce);

        if (!ephemeralKeyPair) {
          throw new Error("Ephemeral key pair not found");
        }

        setStatus("Creating Aptos account...");
        const keylessAccount = await deriveKeylessAccount(idToken, ephemeralKeyPair);

        setStatus("Account created successfully!");

        const paymentAmount = sessionStorage.getItem("payment_amount");
        const paymentRecipient = sessionStorage.getItem("payment_recipient");

        sessionStorage.setItem("aptos_address", keylessAccount.accountAddress.toString());
        sessionStorage.setItem("user_email", decodedToken.email || "");

        if (paymentAmount && paymentRecipient) {
          sessionStorage.removeItem("payment_amount");
          sessionStorage.removeItem("payment_recipient");
          router.push(`/claim/success?amount=${paymentAmount}&email=${paymentRecipient}`);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    processCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full px-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Image
              src="/aptospay.png"
              alt="AptosPay Logo"
              width={48}
              height={48}
              className="h-12 w-12"
              priority
            />
            <span className="text-3xl font-semibold text-gunmetal leading-none" style={{ fontFamily: "'Outfit', sans-serif", marginTop: "2px" }}>aptospay</span>
          </div>

          {/* Error Card */}
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4 mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gunmetal text-center mb-3">Authentication Failed</h1>
            <p className="text-gunmetal/60 text-center mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full px-6">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/aptospay.png"
              alt="AptosPay Logo"
              width={48}
              height={48}
              className="h-12 w-12"
              priority
            />
            <span className="text-3xl font-semibold text-gunmetal leading-none" style={{ fontFamily: "'Outfit', sans-serif", marginTop: "2px" }}>aptospay</span>
          </div>

          {/* Loading State */}
          <div className="w-16 h-16 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium text-gunmetal">{status}</p>
          <p className="text-sm text-gunmetal/60 mt-2">Please wait while we set up your account...</p>
        </div>
      </div>
    </div>
  );
}