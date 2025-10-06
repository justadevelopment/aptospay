"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getBalance } from "@/lib/aptos";
import { generateEphemeralKeyPair, storeEphemeralKeyPair, createGoogleAuthUrl } from "@/lib/keyless";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const router = useRouter();

  // Check if user is logged in and fetch balance
  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    const address = sessionStorage.getItem("aptos_address");

    if (email && address) {
      setUserEmail(email);
      setUserAddress(address);
      fetchBalance(address);

      // Auto-refresh balance every 10 seconds
      const intervalId = setInterval(() => {
        fetchBalance(address);
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, []);

  const fetchBalance = async (address: string) => {
    setLoadingBalance(true);
    try {
      const aptBalance = await getBalance(address, 'APT');
      setBalance(aptBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSignIn = () => {
    const ephemeralKeyPair = generateEphemeralKeyPair();
    const nonce = storeEphemeralKeyPair(ephemeralKeyPair);
    const authUrl = createGoogleAuthUrl(nonce);
    window.location.href = authUrl;
  };

  const handleSignOut = () => {
    sessionStorage.clear();
    setUserEmail(null);
    setUserAddress(null);
    setBalance(null);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-lavender-web">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/aptfy.png"
            alt="Aptfy Logo"
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          <span className="text-xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>
            aptfy
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="text-gunmetal hover:text-teal transition-colors font-medium"
              >
                Dashboard
              </Link>

              <Link
                href="/transactions"
                className="text-gunmetal hover:text-teal transition-colors font-medium"
              >
                Transactions
              </Link>

              {/* Balance Display */}
              <div className="px-4 py-2 bg-teal/10 border-2 border-teal/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/aptos-apt-logo.svg"
                    alt="APT"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  {loadingBalance ? (
                    <div className="w-12 h-4 bg-teal/20 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-sm font-bold text-teal">
                      {balance !== null ? `${balance.toFixed(4)} APT` : "-.-- APT"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gunmetal/60">Signed in as</p>
                  <p className="text-sm font-medium text-gunmetal truncate max-w-[150px]">{userEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm border-2 border-lavender-web text-gunmetal rounded-lg hover:bg-lavender-web/30 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/docs"
                className="text-gunmetal hover:text-teal transition-colors font-medium"
              >
                Docs
              </Link>
              <button
                onClick={handleSignIn}
                className="px-6 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all transform hover:scale-105 active:scale-95 font-semibold flex items-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
