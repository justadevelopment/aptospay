"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { jwtDecode } from "jwt-decode";
import Lottie from "lottie-react";
import spinningLoader from "../../../../public/SpinningLoader.json";
import { getEphemeralKeyPair, deriveKeylessAccount, storeKeylessAccount } from "@/lib/keyless";
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

        // Decode JWT properly
        const decodedToken = jwtDecode<{
          nonce: string;
          email?: string;
          sub: string;
          aud: string;
          iss: string;
        }>(idToken);
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

        // Store the keyless account for session persistence
        storeKeylessAccount(keylessAccount);

        // Store credentials needed for executing transactions
        sessionStorage.setItem("aptos_address", keylessAccount.accountAddress.toString());
        sessionStorage.setItem("user_email", decodedToken.email || "");
        sessionStorage.setItem("id_token", idToken);
        sessionStorage.setItem("jwt_token", idToken); // Also store as jwt_token for backward compatibility
        sessionStorage.setItem("auth_nonce", nonce);

        setStatus("Account created successfully!");

        // Register user in database (always, for email-to-address mapping)
        if (decodedToken.email) {
          try {
            await fetch("/api/register-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: decodedToken.email,
                aptosAddress: keylessAccount.accountAddress.toString(),
              }),
            });
          } catch (registerError) {
            console.error("User registration error:", registerError);
            // Don't block flow if registration fails
          }
        }

        const paymentId = sessionStorage.getItem("payment_id");

        if (paymentId && decodedToken.email) {
          // This is a payment claim - register recipient via API
          setStatus("Registering payment claim...");

          try {
            const claimResponse = await fetch("/api/payments/claim", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paymentId,
                recipientEmail: decodedToken.email,
                recipientAddress: keylessAccount.accountAddress.toString(),
              }),
            });

            const claimData = await claimResponse.json();

            if (!claimResponse.ok) {
              throw new Error(claimData.error || "Failed to claim payment");
            }

            sessionStorage.removeItem("payment_id");

            // Redirect to waiting page - payment is NOT complete yet!
            router.push(`/claim/waiting?id=${paymentId}`);
          } catch (claimError) {
            console.error("Claim error:", claimError);
            setError(claimError instanceof Error ? claimError.message : "Failed to claim payment");
          }
        } else {
          // Regular sign-in
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
          <div className="flex items-center justify-center gap-2 mb-8">
            <Image
              src="/aptfy.png"
              alt="AptosPay Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-2xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>aptospay</span>
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
          <div className="flex items-center gap-2 mb-8">
            <Image
              src="/aptfy.png"
              alt="AptosPay Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-2xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>aptospay</span>
          </div>

          {/* Loading State */}
          <div className="w-40 h-40 mb-4">
            <Lottie
              animationData={spinningLoader}
              loop={true}
              autoplay={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <p className="text-lg font-medium text-gunmetal">{status}</p>
          <p className="text-sm text-gunmetal/60 mt-2">Please wait while we set up your account...</p>
        </div>
      </div>
    </div>
  );
}