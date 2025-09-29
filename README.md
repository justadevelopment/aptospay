# AptosPay

A Venmo-style payment application built on Aptos blockchain that enables users to send and receive payments without requiring crypto wallets.

## Features

- **No Wallet Required**: Recipients can claim funds using just their email via Google OAuth
- **Keyless Accounts**: Leverages Aptos Keyless to create blockchain accounts automatically
- **Payment Links**: Generate shareable links for any amount
- **Instant Transfers**: Sub-second finality on Aptos blockchain

## Tech Stack

- Next.js 15.5.4 (App Router)
- TypeScript 5.9.2
- Aptos TypeScript SDK
- Tailwind CSS 4.1.13
- Google OAuth for authentication

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the development server:
```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## How It Works

1. **Create Payment Link**: Enter amount and recipient email
2. **Share Link**: Send the generated link to the recipient
3. **Claim Payment**: Recipient signs in with Google
4. **Auto Account Creation**: Aptos Keyless account created automatically
5. **Instant Transfer**: Funds transferred immediately to the new account

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities and Aptos integration
├── types/            # TypeScript type definitions
└── styles/           # CSS files
```

## Development

This project uses:
- **Bun** as the package manager
- **Turbopack** for fast development builds
- **Aptos Testnet** for blockchain interactions

## License

MIT
