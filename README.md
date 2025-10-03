# AptosPay

Email-to-crypto payment system on Aptos. Send APT or USDC to anyone with an email—no wallet required. Recipients authenticate with Google OAuth and Aptos derives their account address deterministically.

**Testnet Deployment**: `0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe`

## Features

- **Email Payments**: Send to email addresses instead of blockchain addresses
- **Keyless Accounts**: Recipients sign in with Google, no seed phrases or wallet downloads
- **DeFi Primitives**: Vesting streams (salary streaming) and enhanced escrow (time locks + arbitration)
- **Multi-Token**: APT and USDC (via Fungible Asset standard)
- **Sub-second finality**: Aptos processes transactions in under 1 second
- **Minimal fees**: ~$0.0004 per transaction on testnet

## Technical Overview

### Smart Contracts (Aptos Move)

Three deployed modules at `0x2b68...660efe`:

**1. Vesting Streams** (`vesting_stream.move`)
- Linear token vesting with optional cliff periods
- Supports salary streaming (claim earned tokens anytime)
- Sender can cancel stream and refund unvested tokens
- 13/13 tests passing

**2. Enhanced Escrow V2** (`escrow_v2.move`)
- Factory pattern creates 3 escrow types:
  - Standard: Basic lock/release/cancel
  - Time-Locked: Auto-release after deadline, auto-refund on expiry
  - Arbitrated: Third-party can resolve disputes
- 16/16 tests passing

**3. Payment Escrow** (`payment_escrow.move`)
- Original escrow for simple payment holds
- Backward compatible with V1
- 14/14 tests passing

**Total**: 43/43 tests passing

### Architecture

**Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS v4
**Backend**: PostgreSQL + Prisma (email→address mappings, transaction history)
**Blockchain**: Aptos TypeScript SDK 1.33.1

### Authentication Flow

1. User clicks "Sign in with Google"
2. Google OAuth returns JWT containing nonce
3. Ephemeral key pair retrieved from browser storage
4. Aptos SDK derives deterministic account: `jwt + ephemeralKeyPair → KeylessAccount`
5. Same Google account always produces same Aptos address

Code:
```typescript
const keylessAccount = await aptos.deriveKeylessAccount({
  jwt,              // Google ID token
  ephemeralKeyPair  // Stored in browser
});
```

## Installation

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations (if using PostgreSQL)
bunx prisma migrate dev

# Start dev server
bun run dev
```

### Environment Variables

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXT_PUBLIC_ESCROW_MODULE_ADDRESS=0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe
```

## Usage

### Creating Payment Link
1. Sign in with Google
2. Enter amount and recipient email
3. Select token (APT or USDC)
4. Generate link and share

### Creating Vesting Stream
1. Navigate to `/defi`
2. Select "Vesting Streams" tab
3. Enter recipient address, amount, schedule (start/end/cliff)
4. Transaction creates on-chain stream
5. Recipient can claim vested tokens anytime

### Creating Escrow
1. Navigate to `/defi`
2. Select "Escrow V2" tab
3. Choose escrow type:
   - **Standard**: Manual release by recipient
   - **Time-Locked**: Set release time and expiry deadline
   - **Arbitrated**: Add third-party arbitrator address
4. Transaction locks funds on-chain

## Project Structure

```
contracts/
  sources/
    vesting_stream.move     # Salary streaming contract
    escrow_v2.move          # Enhanced escrow with time locks
    payment_escrow.move     # Original escrow
  tests/                    # 43 Move unit tests

src/
  app/
    api/                    # REST endpoints
    auth/callback/          # OAuth handler
    dashboard/              # User dashboard
    defi/                   # DeFi features (vesting + escrow)
    deck/                   # Pitch presentation
    pay/[...params]/        # Payment claim flow
  lib/
    keyless.ts              # Account derivation
    aptos.ts                # Blockchain client
    vesting.ts              # Vesting stream integration
    escrow_v2.ts            # Escrow v2 integration
    payments.ts             # Payment processing
  prisma/
    schema.prisma           # Database schema
```

## API Endpoints

**Payments**
- `POST /api/payments/create` - Generate payment link
- `POST /api/payments/execute` - Execute transfer
- `POST /api/payments/send-direct` - Direct wallet transfer

**User Management**
- `POST /api/register-user` - Register email→address mapping
- `POST /api/resolve-email` - Lookup address by email

**Transactions**
- `GET /api/transactions` - Transaction history

## Smart Contract Deployment

```bash
cd contracts

# Compile
aptos move compile

# Run tests
aptos move test

# Deploy to testnet
aptos move publish --named-addresses aptospay=default
```

Gas cost: ~4,500 Octas (~$0.000045) per contract deployment

## Testing

**Smart Contracts**:
```bash
cd contracts && aptos move test
# Output: Test result: OK. Total tests: 43; passed: 43; failed: 0
```

**Frontend Build**:
```bash
bun run build
# Output: ✓ Compiled successfully
```

## Performance Metrics (Testnet)

| Operation | Gas (Octas) | USD Equivalent | Finality |
|-----------|-------------|----------------|----------|
| Create vesting stream | 4,500 | $0.000045 | < 1s |
| Claim vested tokens | 3,200 | $0.000032 | < 1s |
| Create standard escrow | 3,800 | $0.000038 | < 1s |
| Create time-locked escrow | 4,100 | $0.000041 | < 1s |
| Release escrow | 2,900 | $0.000029 | < 1s |

## Known Limitations

1. **Testnet only** - No mainnet deployment yet
2. **Google OAuth dependency** - Single auth provider (could add Apple, GitHub, etc.)
3. **Account recovery** - If user loses Google account access, funds are lost (same as losing seed phrase)
4. **Ephemeral key expiry** - Keys expire after 30 days, requires re-authentication
5. **Inefficient queries** - Loops through escrow/stream IDs instead of using Aptos indexer (works fine for < 1000 items)

## Security

**Smart Contracts**:
- Access control enforced (only sender can cancel, only recipient can claim)
- Time validation prevents invalid streams/escrows
- Arithmetic overflow protection via u128 intermediate calculations
- State checks prevent double-release/double-cancel

**Application**:
- JWT validation with nonce verification (prevents replay attacks)
- Input sanitization (address format, amount validation)
- Session storage for sensitive data (cleared on logout)
- No private key storage (accounts derived from OAuth)

**Audit Status**: Internal audit completed (see `submissionanddeployment.md`). Third-party audit required before mainnet.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Move (Aptos) |
| Frontend | Next.js 15 + React 19 |
| Styling | Tailwind CSS v4 |
| Blockchain SDK | Aptos TS SDK 1.33.1 |
| Database | PostgreSQL + Prisma |
| Auth | Google OAuth (Keyless) |
| Runtime | Bun |

## Documentation

- `CLAUDE.md` - Project instructions and development notes
- `docs.md` - DeFi research and implementation details
- `submissionanddeployment.md` - Security audit and deployment readiness
- `script.md` - Demo script for presentation
- `script11.md` - Narration script for voice generation

## Resources

- [Aptos Keyless Accounts](https://aptos.dev/en/build/guides/aptos-keyless)
- [Aptos TypeScript SDK](https://aptos-labs.github.io/aptos-ts-sdk/)
- [Move Language Book](https://move-language.github.io/move/)
- [Explorer (Testnet)](https://explorer.aptoslabs.com/account/0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe?network=testnet)

## Development

Built for CTRL + MOVE Hackathon 2025.

**Status**: Testnet deployment complete, ready for demonstration.
