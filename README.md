# Aptfy

![](public/home.png)

DeFi platform on Aptos with keyless accounts. Send APT or USDC via email with Google OAuth authentication—no wallet setup required. Includes P2P lending with dynamic interest rates (0-110% APR), collateralized borrowing at 75% LTV, automated liquidations, vesting streams for salary payments, and escrow contracts with time-locks and third-party arbitration.

**DevNote**: I wanted to name the app Aptospay, but during some market research I found out that there is already an existing Aptospay, so I decided to change the name to Aptfy. There might still be some aptospay fragments in the code, aiming this will clear up confusion if so.

<!-- **Contract Address**: `0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe` -->

Three production smart contracts deployed as modules:
- **Vesting Streams**: [`0x045c65b5...8d9639`](https://explorer.aptoslabs.com/txn/0x045c65b5c3276d25b91a52242136442cbcf8d10a97c4c565e5102e982e8d9639?network=testnet)
- **Escrow V2**: [`0x51ae0b48...aac84a7`](https://explorer.aptoslabs.com/txn/0x51ae0b48fe9b9ef891ee93503dcf7e1caedfc9ec2307c1e35f337ca75aac84a7?network=testnet)
- **P2P Lending**: [`0x76819255...2e2b25`](https://explorer.aptoslabs.com/txn/0x76819255027768f41c8a7eeb5530a1f976c1a989aa5e645fc6c063f763b31881?network=testnet)

## Features

- **Email Payments**: Send to email addresses instead of blockchain addresses
- **Keyless Accounts**: Recipients sign in with Google, no seed phrases or wallet downloads
- **DeFi Primitives**: Vesting streams (salary streaming), enhanced escrow (time locks + arbitration), and P2P lending
- **P2P Lending**: Supply APT to earn interest, borrow against collateral with dynamic rates (0-110% APR)
- **Multi-Token**: APT and USDC (via Fungible Asset standard)
- **Sub-second finality**: Aptos processes transactions in under 1 second
- **Minimal fees**: ~$0.0004 per transaction on testnet

## Technical Overview

### Smart Contracts (Aptos Move)

Three production modules deployed at `0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe`:

**1. Vesting Streams** (`vesting_stream.move`)
- Deployment tx: `0x045c65b5c3276d25b91a52242136442cbcf8d10a97c4c565e5102e982e8d9639`
- Linear token vesting with optional cliff periods
- Supports salary streaming (claim earned tokens anytime)
- Sender can cancel stream and refund unvested tokens

**2. Escrow V2** (`escrow_v2.move`)
- Deployment tx: `0x51ae0b48fe9b9ef891ee93503dcf7e1caedfc9ec2307c1e35f337ca75aac84a7`
- Factory pattern creates 3 escrow types:
  - Standard: Basic lock/release/cancel
  - Time-Locked: Auto-release after deadline, auto-refund on expiry
  - Arbitrated: Third-party can resolve disputes

**3. P2P Lending Protocol** (`p2p_lending.move`)
- Pool-based lending with over-collateralization
- Dynamic interest rates: 0-110% APR based on utilization
- Automated liquidations with 5% bonus
- Parameters:
  - LTV Ratio: 75%
  - Liquidation Threshold: 80%
  - Optimal Utilization: 80%
  - Reserve Factor: 10%

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

![](public/dashboard.png)

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

### Using P2P Lending
**Pool Status**: ✅ Initialized and ready for use
- Pool creation tx: [`0xdf843da6...b780092b`](https://explorer.aptoslabs.com/txn/0xdf843da6f37b6eb4ac524f9bffc6e9c3cf8aec2bddca273aa11820f9b780092b?network=testnet)
- Oracle prices set: APT=$10.00, USDC=$1.00

1. **Supply APT to Earn Interest**:
   - Navigate to `/defi` → P2P Lending tab
   - Enter amount to supply in the Supply form
   - Click "Supply APT" and sign transaction
   - Earn dynamic interest rates (0-110% APR based on utilization)

2. **Borrow APT**:
   - Navigate to Borrow form
   - Enter collateral amount (in APT)
   - Enter borrow amount (max 75% LTV)
   - Example: 20 APT collateral → can borrow up to 7.5 APT
   - Click "Borrow" and sign transaction
   - Monitor health factor (must stay > 1.0)

3. **Repay Loan**:
   - Navigate to Repay form
   - Enter amount to repay (partial or full)
   - Click "Repay" and sign transaction
   - Collateral released after full repayment

4. **View Transactions**:
   - All transactions verified on [Aptos Explorer](https://explorer.aptoslabs.com/?network=testnet)
   - Pool statistics update in real-time
   - Note: Position data display limited (see CLAUDE.md for details)

## Project Structure

```
contracts/
  sources/
    vesting_stream.move     # Salary streaming contract
    escrow_v2.move          # Enhanced escrow with time locks
    payment_escrow.move     # Original escrow
    p2p_lending.move        # P2P lending protocol
  tests/                    # 74 Move unit tests

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

# Run tests (74 total across all modules)
aptos move test

# Deploy to testnet
aptos move publish --named-addresses aptospay=default
```

**Note**: In Aptos Move, all modules in a package deploy to a single account address. The three production contracts (vesting_stream, escrow_v2, p2p_lending) are separate modules under one address.

Gas cost: ~4,500 Octas (~$0.000045) per deployment transaction

## Testing

**Smart Contracts**:
```bash
cd contracts && aptos move test
# Vesting: 13 tests | Escrow V2: 16 tests | Payment: 14 tests | P2P Lending: 31 tests
# Total: 74/74 passing 
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



## Resources

- [Aptos Keyless Accounts](https://aptos.dev/en/build/guides/aptos-keyless)
- [Aptos TypeScript SDK](https://aptos-labs.github.io/aptos-ts-sdk/)
- [Move Language Book](https://move-language.github.io/move/)
- [Explorer (Testnet)](https://explorer.aptoslabs.com/account/0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe?network=testnet)

## Development

Built for CTRL + MOVE Hackathon 2025.

**Status**: Testnet deployment complete, ready for demonstration.
