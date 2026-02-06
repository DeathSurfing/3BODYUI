# 3 Body Payment Protocol

> A decentralized tri-party settlement protocol enabling atomic cross-currency exchanges via smart contracts and the HTTP 402 payment protocol.

[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://github.com/yourusername/3BODYUI)
[![Tech Stack](https://img.shields.io/badge/stack-Next.js%2016%20%7C%20React%2019%20%7C%20Tauri%20v2%20%7C%20Rust%20%7C%20CosmWasm-orange)](https://github.com/yourusername/3BODYUI)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

3 Body Payment facilitates instant remittance and currency conversion through a unique three-party atomic settlement system. Unlike traditional exchanges that require multiple steps and custody risks, 3 Body Payment enables:

- **Fiat → Crypto**: INR/USD to USDT/BTC
- **Crypto → Fiat**: USDT/BTC to INR/USD  
- **Crypto → Crypto**: Cross-chain atomic swaps

All in **a single blockchain transaction** with no escrow holding period.

## The Problem

Current remittance and currency conversion flows are inefficient:

```
Traditional Flow:
USDT → Exchange (KYC, fees, delay)
   ↓
Bank Account (2-3 days)
   ↓
UPI Wallet (instant)
   ↓
Recipient (INR)

Total: 4 steps, 2-3 days, multiple fees
```

## The Solution

```
3 Body Payment Flow:
Payer scans QR → Pays USDT → Recipient receives INR instantly

Total: 1 step, 10 seconds, single fee
```

## Architecture

### Current Architecture (Implemented)

The current implementation uses a **multi-step escrow pattern** with X402-style payment flows:

```
┌─────────────────────────────────────────────────────────────┐
│                    3 BODY PAYMENT SYSTEM                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PAYEE      │────▶│   MERCHANT   │────▶│   LIQUIDITY  │
│  (Sender)    │◄────│ (Coordinator)│◄────│  PROVIDER    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │                     │
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│              X402 Payment Flow (HTTP 402)                 │
├──────────────────────────────────────────────────────────┤
│  1. Payee initiates request                               │
│  2. Merchant returns HTTP 402 (Payment Required)          │
│  3. Payee authorizes payment                              │
│  4. Liquidity Provider fulfills order                     │
│  5. Atomic settlement via CosmWasm escrow                 │
└──────────────────────────────────────────────────────────┘
```

**Flow Details:**

1. **Initiation**: Payee creates a swap request (e.g., USD → USDT)
2. **HTTP 402 Response**: Merchant responds with payment requirements
3. **Authorization**: Payee confirms and locks funds in escrow
4. **Fulfillment**: LP picks up the order and provides liquidity
5. **Settlement**: Escrow releases funds to all parties

**Components:**

- **Frontend (Next.js + Tauri)**: Role-based dashboards, X402 flow UI, network visualization
- **Smart Contracts (CosmWasm)**: 
  - `escrow/`: Holds funds during settlement with multi-step state machine
  - `lp_registry/`: Manages LP registration, staking, and reputation
- **API Layer**: RESTful endpoints for transaction coordination

### Proposed Architecture (Future)

The proposed architecture eliminates the escrow holding period and enables **true atomic settlement** in a single transaction:

```
┌─────────────────────────────────────────────────────────────────┐
│          ATOMIC 3-BODY SETTLEMENT (No Escrow)                   │
└─────────────────────────────────────────────────────────────────┘

    PAYER (USDT)                           RECIPIENT (INR)
         │                                       ▲
         │  ┌─────────────────────────────────┐  │
         └──┤     DYNAMIC QR CODE             ├──┘
            │  - UPI ID                       │
            │  - INR Amount                   │
            │  - Exchange Rate                │
            │  - Order ID                     │
            │  - Expiration                   │
            └─────────────────────────────────┘
                         │
                         ▼
            ┌───────────────────────────────┐
            │   SMART CONTRACT (Atomic)     │
            │                               │
            │  1. Lock USDT from Payer      │
            │  2. Wait for UPI proof        │
            │  3. Verify oracle signature   │
            │  4. Release USDT to LP        │
            │  5. Confirm INR to Recipient  │
            └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────────┐
         │      LIQUIDITY PROVIDER BOT           │
         │                                       │
         │  - Monitors open orders               │
         │  - Calculates arbitrage opportunities │
         │  - Auto-sends UPI payment             │
         │  - Claims USDT with proof             │
         └───────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────────┐
         │      UPI ORACLE SERVICE               │
         │                                       │
         │  - Receives UPI webhooks              │
         │  - Validates payment matches          │
         │  - Signs blockchain proof             │
         │  - Handles disputes                   │
         └───────────────────────────────────────┘
```

**Key Improvements:**

1. **Single Transaction Settlement**: All parties settle atomically in one blockchain transaction (10 seconds vs. minutes)
2. **Dynamic QR System**: Each payment generates a unique QR code with embedded order details
3. **Automated LP Marketplace**: Permissionless LPs compete on exchange rates via auction or first-come-first-served
4. **Decentralized Oracle Network**: Multiple nodes verify UPI payments and provide cryptographic proof
5. **Non-Custodial Design**: Merchant never holds funds; trustless settlement between Payer, LP, and Recipient

## Example Use Case

### Scenario: Pay INR via USDT

**Current Pain Point:**
- Alice has USDT, wants to pay Bob in INR
- Traditional: Sell USDT → Bank transfer (2 days) → UPI → Bob
- Fees: Exchange spread + bank fees + time cost

**3 Body Payment Solution:**

```
Step 1: QR Generation
─────────────────────
Bob generates QR for ₹1000
QR contains: UPI ID, amount, rate (₹83/USDT), order ID

Step 2: Scan & Pay
──────────────────
Alice scans QR with 3 Body app
Sees: Pay 12.05 USDT → Bob receives ₹1000 instantly
Confirms transaction

Step 3: Atomic Settlement (Single Transaction)
──────────────────────────────────────────────
1. Contract locks Alice's 12.05 USDT
2. LP bot detects opportunity (rate ₹83 vs market ₹82.5 = 0.6% profit)
3. LP sends ₹1000 to Bob's UPI ID
4. UPI Oracle receives webhook, validates payment
5. Oracle signs proof and submits to blockchain
6. Contract releases 12.05 USDT to LP
7. All happens in ONE atomic blockchain transaction (10 seconds)

Step 4: Complete
────────────────
✅ Bob has ₹1000 in his UPI wallet instantly
✅ Alice's 12.05 USDT transferred to LP
✅ LP earned ₹6 arbitrage profit (0.6%)
✅ No funds held in escrow at any point
```

## Technology Stack

### Current Implementation

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, TypeScript | Web UI, role dashboards |
| Styling | Tailwind CSS 4 | Responsive design |
| Desktop | Tauri 2.0 (Rust) | Native app wrapper |
| Smart Contracts | CosmWasm (Rust) | Blockchain logic |
| State | In-memory mock | Development/testing |

### Proposed Implementation

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | CosmWasm (single atomic contract) | Atomic settlement |
| Oracle | Go/Rust microservice | UPI payment verification |
| LP Bot | Node.js/Python | Automated order fulfillment |
| QR Service | Next.js API + QR generation | Dynamic payment codes |
| Blockchain | Cosmos (Noble USDC) | Native stablecoin support |
| Bridge | Axelar | USDT from Ethereum when needed |

## Smart Contract Architecture

### Current: Escrow Pattern (Multi-Step)

```rust
// Two-contract system with state machine

// escrow/src/lib.rs
enum PaymentState {
    Deposited,       // Step 1: Payee locked funds
    Authorized,      // Step 2: Payee confirmed intent
    PayoutConfirmed, // Step 3: LP fulfilled, admin releases
    Refunded,        // Alternative: Timeout or dispute
}

struct PaymentInfo {
    payment_id: String,
    seller: Addr,
    amount: Uint128,
    state: PaymentState,
    created_at: Timestamp,
    deadline: Timestamp,
    lp: Option<String>,
}

// lp_registry/src/lib.rs  
struct LPInfo {
    lp: String,
    stake: Uint128,
    active: bool,
}
```

**Characteristics:**
- Multi-step process (Deposited → Authorized → Fulfilled)
- Admin required to release funds
- Timeout-based refunds
- Multiple blockchain transactions

### Proposed: Atomic Pattern (Single Transaction)

```rust
// Single contract - everything in one atomic execution

struct Order {
    order_id: String,
    payer: Addr,
    recipient_upi: String,
    usdt_amount: Uint128,
    inr_amount: u64,
    exchange_rate: Decimal,
    deadline: Timestamp,
    lp: Option<Addr>,
    status: OrderStatus,
}

enum OrderStatus {
    Open,           // Waiting for LP to pick up
    Locked,         // USDT locked, LP committed
    Fulfilled,      // UPI confirmed, USDT released (atomic)
    Expired,        // Timeout, refund to payer
    Disputed,       // Challenge period for disputes
}

// Single execute message handles everything
enum ExecuteMsg {
    CreateOrder { ... },     // Payer locks USDT
    FulfillOrder { ... },    // LP sends INR + claims USDT (atomic)
    Dispute { ... },         // Challenge fulfillment
    ResolveDispute { ... },  // Oracle resolves
}
```

**Characteristics:**
- Single transaction settlement
- No admin required (trustless)
- Oracle-based verification
- Challenge period for disputes
- Instant finality (10 seconds)

## Architecture Comparison

| Feature | Current (Escrow) | Proposed (Atomic) |
|---------|-----------------|-------------------|
| **Settlement Time** | 2-5 minutes (multi-step) | 10 seconds (single tx) |
| **Blockchain Txs** | 3-4 transactions | 1 transaction |
| **Custody Risk** | Escrow holds funds | Non-custodial |
| **Trust Required** | Admin + LP | Oracle + LP (trustless) |
| **LP Model** | Admin-curated | Permissionless marketplace |
| **UPI Verification** | N/A (mock) | Automated oracle + webhooks |
| **QR Codes** | Static merchant codes | Dynamic per-payment |
| **Dispute Resolution** | Manual admin refund | Automated + challenge period |
| **Decentralization** | Partial (admin control) | Full (oracle consensus) |
| **User Experience** | Multi-step confirmation | Scan → Pay → Done |
| **LP Incentive** | Fixed fees | Rate arbitrage (market-driven) |

## Project Structure

```
3BODYUI/
├── 3bodyui/                    # Next.js frontend application
│   ├── app/                    # App router
│   │   ├── api/               # API routes
│   │   │   ├── transactions/  # Transaction endpoints
│   │   │   ├── merchants/     # Merchant endpoints
│   │   │   └── liquidity/     # LP endpoints
│   │   └── page.tsx           # Main dashboard
│   ├── components/
│   │   └── roles/             # Role-based dashboards
│   │       ├── payee/         # Payee dashboard (X402 flow)
│   │       ├── merchant/      # Merchant dashboard
│   │       └── liquidityProvider/ # LP dashboard
│   ├── lib/
│   │   ├── services/          # Business logic (mock)
│   │   │   └── mockService.ts # X402 mock implementation
│   │   ├── tauri/            # Tauri native integrations
│   │   └── types.ts          # TypeScript definitions
│   └── services/
│       └── blockchainService.ts # Mock blockchain
│
├── smartcontract/              # CosmWasm smart contracts
│   ├── escrow/                # Current: Escrow contract
│   │   └── src/lib.rs        # Multi-step state machine
│   ├── lp_registry/           # Current: LP registry
│   │   └── src/lib.rs        # Staking and reputation
│   └── atomic_swap/           # Future: Atomic contract
│       └── src/lib.rs        # Single-tx settlement
│
├── src-tauri/                 # Tauri desktop/mobile app
│   ├── src/
│   │   ├── lib.rs            # Tauri commands (Rust)
│   │   └── main.rs           # Entry point
│   └── Cargo.toml
│
├── docs/                      # Documentation
│   ├── SETUP.md              # Environment setup
│   ├── ARCHITECTURE.md       # System architecture
│   └── ...
│
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ with npm/bun
- [Rust](https://rustup.rs/) 1.77+
- [Cargo](https://doc.rust-lang.org/cargo/) for smart contracts

### Frontend Development

```bash
cd 3bodyui

# Install dependencies
bun install

# Run Next.js dev server
bun run dev

# Run Tauri desktop app
bun run tauri:dev

# Run on iOS simulator
bun run tauri:dev:ios

# Run on Android emulator
bun run tauri:dev:android
```

### Smart Contract Development

```bash
cd smartcontract

# Build contracts
cargo build --release --target wasm32-unknown-unknown

# Run tests
cargo test

# Generate schema
cargo run --bin schema

# Deploy (requires local Cosmos node)
# See smartcontract/README.md for details
```

## Roadmap

### Phase 1: Current (Completed) ✅
- [x] X402 payment flow implementation
- [x] Three-role dashboard system (Payee, Merchant, LP)
- [x] CosmWasm escrow contracts (multi-step)
- [x] Mock blockchain service
- [x] Tauri desktop wrapper (iOS, Android, Desktop)
- [x] Network visualization UI

### Phase 2: MVP (In Progress) 🚧
- [ ] Single atomic smart contract (no escrow)
- [ ] Dynamic QR code generation system
- [ ] Manual UPI oracle (admin verification for MVP)
- [ ] Basic LP marketplace (first-come-first-served)
- [ ] Testnet deployment (Neutron/Osmosis)
- [ ] Fiat on-ramp integration (MoonPay/Transak)

### Phase 3: Production 🎯
- [ ] Automated UPI API integration (Razorpay/Cashfree)
- [ ] Decentralized oracle network (multiple validators)
- [ ] LP reputation and staking system
- [ ] Automated dispute resolution
- [ ] Rate auction system (LPs bid on orders)
- [ ] Mobile app polish (Tauri mobile)
- [ ] Mainnet deployment

### Phase 4: Scale 🚀
- [ ] Multi-chain support (EVM via Axelar, Solana)
- [ ] Additional fiat rails (SEPA, ACH, GCash)
- [ ] AI-powered LP routing (optimal rate matching)
- [ ] Institutional API and white-label
- [ ] Cross-border B2B payments
- [ ] Regulatory compliance frameworks

## User Roles

### Payee (Sender)
- Initiates cross-currency payments
- Scans dynamic QR codes
- Locks crypto funds in smart contract
- Receives fiat via UPI instantly

### Liquidity Provider (LP)
- Supplies fiat/crypto liquidity
- Competes on exchange rates
- Earns arbitrage from rate spreads
- Stakes collateral for reputation

### Merchant (Protocol)
- Coordinates the marketplace
- Maintains UPI oracle infrastructure
- Earns protocol fees
- Ensures regulatory compliance

### Recipient
- Provides UPI ID for payment
- Receives fiat instantly
- No app installation required
- Standard UPI experience

## Security Considerations

### Current Implementation
- 🔐 Platform-native secure storage (Tauri)
- 🛡️ Content Security Policy (CSP)
- ✅ Code signing on all platforms
- 🔒 HTTPS-only network requests

### Proposed Implementation
- 🔐 Non-custodial smart contracts (no admin keys)
- 🛡️ Multi-sig oracle consensus
- ✅ Challenge period for disputes (24-48 hours)
- 🔒 LP staking/slashing for fraud prevention
- 📋 Formal verification of atomic contract
- 🔄 Rate limiters and circuit breakers

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow conventional commits format
- Test on multiple platforms when possible
- Update documentation for new features
- Ensure security best practices
- Run `cargo test` for smart contracts
- Run `bun run lint` for frontend

## Documentation

- **[SETUP.md](docs/SETUP.md)** - Complete environment setup
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed system architecture
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Development workflow
- **[BUILD.md](docs/BUILD.md)** - Production build instructions
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Distribution guide
- **[SECURITY.md](docs/SECURITY.md)** - Security guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: team@3bodyprotocol.io
- 💬 Discord: [Join our server](https://discord.gg/threebody)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/3BODYUI/issues)
- 🐦 Twitter: [@3bodyprotocol](https://twitter.com/3bodyprotocol)

## Acknowledgments

- [Tauri](https://tauri.app/) - Native app framework
- [Next.js](https://nextjs.org/) - React framework
- [CosmWasm](https://cosmwasm.com/) - Smart contract platform
- [Cosmos SDK](https://cosmos.network/) - Blockchain framework
- [Noble](https://nobleassets.xyz/) - Native USDC on Cosmos

---

**Built with ❤️ for seamless cross-border payments**

*"Making money move at the speed of light"*
