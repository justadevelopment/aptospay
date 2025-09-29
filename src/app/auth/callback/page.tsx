"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEphemeralKeyPair, deriveKeylessAccount } from "@/lib/keyless";

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

        const decodedToken = JSON.parse(atob(idToken.split(".")[1]));
        const nonce = decodedToken.nonce;

        if (!nonce) {
          throw new Error("No nonce found in token");
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
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">{status}</p>
        </div>
      </div>
    </div>
  );
}