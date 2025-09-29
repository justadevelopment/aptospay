import { validateEnvironmentConfig } from "./validation";

// Check environment configuration on module load
export function checkEnvironment(): void {
  if (typeof window === "undefined") {
    // Server-side environment check
    const validation = validateEnvironmentConfig();

    if (!validation.isValid) {
      console.error("❌ Environment Configuration Error:");
      console.error(validation.error);
      console.error("\nPlease check your .env.local file and ensure all required variables are set correctly.");

      // In development, provide helpful setup instructions
      if (process.env.NODE_ENV === "development") {
        console.error("\n📝 Setup Instructions:");
        console.error("1. Copy .env.local.example to .env.local");
        console.error("2. Set up Google OAuth:");
        console.error("   - Go to https://console.cloud.google.com");
        console.error("   - Create a new project or select existing");
        console.error("   - Enable Google+ API");
        console.error("   - Create OAuth 2.0 credentials");
        console.error("   - Add http://localhost:3000/auth/callback as redirect URI");
        console.error("   - Copy the Client ID to NEXT_PUBLIC_GOOGLE_CLIENT_ID");
        console.error("3. Restart the development server");
      }
    } else {
      console.log("✅ Environment configuration validated successfully");
      console.log(`📍 Network: ${process.env.NEXT_PUBLIC_APTOS_NETWORK}`);
      console.log(`🔗 App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    }
  }
}

// Run the check when this module is imported
checkEnvironment();