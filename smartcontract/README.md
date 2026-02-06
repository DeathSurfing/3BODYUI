# 3BODY Smart Contracts

A CosmWasm-based smart contract suite for the 3BODY Payment Protocol - enabling atomic cross-currency settlements between fiat (UPI) and crypto (USDT).

## Overview

This project contains smart contracts for the 3BODY decentralized payment system that facilitates instant remittance and currency conversion through a unique three-party atomic settlement system.

### Current Architecture: Escrow Pattern
Two-contract system with multi-step state machine:
- **LP Registry** - Manages liquidity providers with staking
- **Escrow** - Handles secure payment escrow with timeout-based refunds

### Proposed Architecture: Atomic Settlement
Single-contract atomic execution (in development):
- **Atomic Swap** - Single transaction settlement, no escrow holding period

## Architecture Comparison

### Current: Escrow Pattern

```
Buyer (Payee)                    LP                          Recipient
      │                          │                              │
      │  1. Deposit              │                              │
      ├─────────────────────────▶│                              │
      │                          │                              │
      │  2. Wait (timeout)       │                              │
      │                          │  3. Check status             │
      │                          │◀─────────────────────────────│
      │                          │                              │
      │  4. Confirm Payout       │  5. Transfer funds           │
      │◀─────────────────────────┼──────────────────────────────┤
      │                          │                              │
   [State: Deposited]        [State: Active]              [Receives INR]
      │
   [Timeout → Refund]
```

**Characteristics:**
- Multi-step process (3-4 blockchain transactions)
- Admin required to release funds
- Timeout-based refunds (security delay)
- State machine: Deposited → Authorized → Fulfilled/Refunded

### Proposed: Atomic Pattern

```
Payer (USDT)                              LP (INR Liquidity)
      │                                           │
      │  1. CreateOrder (lock USDT)               │
      ├───────────────────────────────────────────▶│
      │                                           │
      │                    2. Monitor orders      │
      │◀──────────────────────────────────────────┤
      │                                           │
      │                    3. FulfillOrder        │
      │                    (send INR + claim USDT)│
      │◀──────────────────────────────────────────┤
      │                                           │
   [USDT sent to LP]                      [INR sent to Recipient]
   
   Single Atomic Transaction (10 seconds)
```

**Characteristics:**
- Single blockchain transaction
- No admin required (trustless)
- Oracle-based verification
- Instant settlement (no timeout delays)
- Challenge period only for disputes

## Smart Contract Details

### Current Contracts

#### 1. LP Registry (`lp_registry/`)

Manages liquidity provider registration and staking:

```rust
struct LPInfo {
    lp: String,
    stake: Uint128,
    active: bool,
}

enum ExecuteMsg {
    Stake { lp: String },           // LPs stake to become active
    Unstake { lp: String, amount: Uint128 },  // Withdraw stake
    Slash { lp: String, amount: Uint128 },    // Admin punishment
}
```

**Features:**
- Stake tokens to activate LP status
- Unstake requires LP authorization
- Admin can slash misbehaving LPs
- Query active LP status for escrow validation

#### 2. Escrow (`escrow/`)

Handles secure payment escrow between parties:

```rust
enum PaymentState {
    Deposited,       // Funds locked by buyer
    PayoutConfirmed, // Admin confirmed payout to LP
    Refunded,        // Timeout or dispute refund
}

enum ExecuteMsg {
    Deposit { payment_id: String, seller: String },
    ConfirmPayout { payment_id: String, lp: String },
    Refund { payment_id: String },
}
```

**Features:**
- Deposit funds with unique payment ID
- Cross-contract query to validate LP status
- Admin-only payout confirmation
- Refund after timeout or by admin
- Comprehensive error handling

### Proposed Contract (In Development)

#### 3. Atomic Swap (`atomic_swap/` - Future)

Single-contract atomic execution for instant settlement:

```rust
struct Order {
    order_id: String,
    payer: Addr,
    recipient_upi: String,      // UPI ID for INR transfer
    usdt_amount: Uint128,       // Amount payer locks
    inr_amount: u64,            // Amount recipient receives
    exchange_rate: Decimal,     // Agreed rate
    deadline: Timestamp,
    lp: Option<Addr>,           // Selected LP
    status: OrderStatus,
}

enum OrderStatus {
    Open,       // Waiting for LP
    Locked,     // LP committed, USDT locked
    Fulfilled,  // UPI confirmed, USDT released (atomic)
    Expired,    // Timeout refund
    Disputed,   // Challenge period
}

enum ExecuteMsg {
    CreateOrder { ... },      // Payer locks USDT
    FulfillOrder { ... },     // LP sends INR + claims USDT (atomic)
    Dispute { ... },          // Challenge fulfillment
    ResolveDispute { ... },   // Oracle resolves
}
```

**Features:**
- Single-transaction atomic settlement
- Dynamic QR code integration
- Oracle-verified UPI payments
- Challenge period for disputes
- Trustless (no admin required)
- 10-second settlement time

## Prerequisites

- [Rust](https://rustup.rs/) (v1.77.0 or later)
- [Docker](https://docs.docker.com/get-docker/) (for local testnet)
- [wasmd](https://github.com/CosmWasm/wasmd) (for deployment)
- wasm32 target: `rustup target add wasm32-unknown-unknown`

## Quick Start

### 1. Build All Contracts

```bash
cd smartcontract

# Build debug versions
cargo build

# Build release (for deployment)
cargo build --release --target wasm32-unknown-unknown

# Optimize with Docker (production)
make optimize
```

### 2. Run Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific contract tests
cargo test -p escrow
cargo test -p lp_registry
```

### 3. Generate Schemas

```bash
make schema
```

Schemas will be generated in `schema/` directory for each contract.

### 4. Start Local Testnet

```bash
make start-localnet
```

This starts a local wasmd chain:
- RPC: http://localhost:26657
- REST: http://localhost:1317
- Chain ID: 3body-local

### 5. Deploy Contracts

```bash
make deploy
```

This will:
1. Build optimized WASM binaries
2. Store contracts on-chain
3. Instantiate contracts with proper initialization
4. Save addresses to `contract_addresses.json`

## Development Commands

### Building

```bash
# Debug build
cargo build

# Release build
cargo build --release --target wasm32-unknown-unknown

# Optimized build (smaller WASM)
make optimize

# Check compilation without building
cargo check
```

### Testing

```bash
# Run all tests
cargo test

# Run with backtrace on failure
RUST_BACKTRACE=1 cargo test

# Run specific test
cargo test test_deposit

# Run tests for specific package
cargo test -p escrow
cargo test -p lp_registry
```

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy

# Run all checks
make check
```

## Contract Interactions

### LP Registry

```bash
# Stake as LP (activate)
wasmd tx wasm execute <LP_REGISTRY_ADDR> \
  '{"stake":{"lp":"<LP_ADDRESS>"}}' \
  --amount 1000000uusdc \
  --from <LP_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Unstake (deactivate)
wasmd tx wasm execute <LP_REGISTRY_ADDR> \
  '{"unstake":{"lp":"<LP_ADDRESS>","amount":"500000"}}' \
  --from <LP_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Query LP status
wasmd query wasm contract-state smart <LP_REGISTRY_ADDR> \
  '{"get_lp":{"lp":"<LP_ADDRESS>"}}' \
  --chain-id 3body-local
```

### Escrow

```bash
# Deposit funds
wasmd tx wasm execute <ESCROW_ADDR> \
  '{"deposit":{"payment_id":"pay_001","seller":"<SELLER_ADDR>"}}' \
  --amount 1000000uusdc \
  --from <BUYER_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Confirm payout (admin only)
wasmd tx wasm execute <ESCROW_ADDR> \
  '{"confirm_payout":{"payment_id":"pay_001","lp":"<LP_ADDR>"}}' \
  --from admin \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Refund (after timeout or by admin)
wasmd tx wasm execute <ESCROW_ADDR> \
  '{"refund":{"payment_id":"pay_001"}}' \
  --from <BUYER_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Query payment status
wasmd query wasm contract-state smart <ESCROW_ADDR> \
  '{"get_payment":{"payment_id":"pay_001"}}' \
  --chain-id 3body-local
```

### Atomic Swap (Future)

```bash
# Create order (payer locks USDT)
wasmd tx wasm execute <ATOMIC_ADDR> \
  '{"create_order":{...}}' \
  --amount 12050000uusdt \
  --from <PAYER_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Fulfill order (LP sends INR + claims USDT - atomic)
wasmd tx wasm execute <ATOMIC_ADDR> \
  '{"fulfill_order":{"order_id":"ord_001","proof":"..."}}' \
  --from <LP_KEY> \
  --chain-id 3body-local \
  --keyring-backend test \
  -y

# Query order status
wasmd query wasm contract-state smart <ATOMIC_ADDR> \
  '{"get_order":{"order_id":"ord_001"}}' \
  --chain-id 3body-local
```

## Project Structure

```
smartcontract/
├── Cargo.toml                  # Workspace configuration
├── cargo.toml                  # Root workspace manifest
├── Makefile                    # Development commands
├── docker-compose.yml          # Local testnet
│
├── escrow/                     # CURRENT: Escrow contract
│   ├── cargo.toml
│   └── src/
│       ├── lib.rs              # Contract logic + tests
│       └── bin/
│           └── schema.rs       # Schema generation
│
├── lp_registry/                # CURRENT: LP Registry
│   ├── cargo.toml
│   └── src/
│       ├── lib.rs              # Contract logic + tests
│       └── bin/
│           └── schema.rs       # Schema generation
│
├── atomic_swap/                # FUTURE: Atomic contract
│   ├── cargo.toml              # (to be created)
│   └── src/
│       ├── lib.rs              # (to be created)
│       └── bin/
│           └── schema.rs       # (to be created)
│
├── scripts/
│   └── deploy.sh               # Deployment script
│
├── schema/                     # Generated schemas
│   ├── escrow.json
│   └── lp_registry.json
│
└── target/                     # Build artifacts
```

## Testing Strategy

### Unit Tests

Both current contracts have comprehensive unit tests:

- **Happy path scenarios**: Normal operation flows
- **Error cases**: Unauthorized access, insufficient funds, invalid states
- **State transitions**: Proper state machine progression
- **Edge cases**: Boundary conditions and timeouts
- **Cross-contract**: LP registry validation in escrow

Run tests:
```bash
cargo test
```

### Integration Testing

Use the local testnet for end-to-end testing:

```bash
# Start fresh testnet
make start-localnet

# Deploy contracts
make deploy

# Run integration tests
# (Add your integration test scripts here)
```

### Test Coverage

Current test coverage:
- **Escrow**: ~95% (deposit, confirm, refund, timeout, disputes)
- **LP Registry**: ~95% (stake, unstake, slash, queries)

## Deployment

### Local Development

```bash
# Start testnet and deploy (one command)
make dev

# Or step by step:
make start-localnet  # Terminal 1
make deploy          # Terminal 2
```

### Testnet Deployment (Neutron/Osmosis)

1. Configure environment:
```bash
export CHAIN_ID="neutron-testnet"
export NODE="https://rpc.testnet.neutron.com"
export GAS_PRICES="0.025untrn"
export CONTRACT_ADMIN="your-address"
```

2. Ensure wallet has testnet funds
3. Run deployment:
```bash
./scripts/deploy.sh
```

### Mainnet Deployment

⚠️ **IMPORTANT**: Before mainnet deployment:
- [ ] Complete security audit
- [ ] Formal verification of atomic contract
- [ ] Bug bounty program
- [ ] Testnet stress testing (30+ days)
- [ ] Legal compliance review
- [ ] Insurance considerations

## Security Considerations

### Current Architecture

1. **Admin Controls**: Critical functions restricted to admin
2. **Timeout Protection**: Refunds require timeout (configurable)
3. **State Validation**: All transitions validated
4. **LP Verification**: Cross-contract queries validate LP status
5. **Access Control**: Only LP can unstake their own funds

### Proposed Architecture (Additional)

1. **Non-Custodial**: No admin control over funds
2. **Oracle Consensus**: Multiple oracle signatures required
3. **Challenge Period**: 24-48 hour dispute window
4. **LP Collateral**: Staking requirement for reputation
5. **Slashing**: Economic punishment for bad behavior
6. **Circuit Breakers**: Pause functionality for emergencies

### Best Practices

- Never commit private keys
- Use hardware wallets for mainnet
- Test on testnet thoroughly
- Monitor contract events
- Implement proper logging
- Regular security audits

## Migration Path: Escrow → Atomic

### Phase 1: Current (Escrow)
- ✅ Two-contract system working
- ✅ Multi-step settlement
- ✅ Admin-controlled payouts

### Phase 2: Hybrid (In Progress)
- 🚧 Build atomic contract alongside escrow
- 🚧 Test both systems in parallel
- 🚧 Gradual migration of features

### Phase 3: Full Atomic
- 📋 Deprecate escrow contract
- 📋 Migrate all liquidity to atomic
- 📋 Full trustless settlement

## Common Issues

### Build Errors

**Issue**: `wasm32-unknown-unknown` target not found
```bash
rustup target add wasm32-unknown-unknown
```

**Issue**: Cargo.lock out of sync
```bash
cargo update
```

### Test Failures

**Issue**: "storage not found" in tests
- Solution: Ensure using `mock_dependencies()` from `cosmwasm_std::testing`

**Issue**: Test timeout
- Solution: Check for infinite loops in contract logic

### Deployment Issues

**Issue**: "insufficient funds"
- Solution: Ensure deployer account has enough tokens for gas + instantiation

**Issue**: Contract address not saved
- Solution: Check `contract_addresses.json` permissions

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run full test suite: `make test`
5. Format code: `make fmt`
6. Commit: `git commit -am 'Add new feature'`
7. Push: `git push origin feature/my-feature`
8. Submit pull request

### Code Standards

- Follow Rust naming conventions
- Document all public functions
- Maintain >90% test coverage
- Use meaningful error messages
- Follow CosmWasm best practices

## Resources

- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [CosmWasm Academy](https://academy.cosmwasm.com/)
- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [Neutron Documentation](https://docs.neutron.org/)
- [Noble (USDC) Documentation](https://nobleassets.xyz/)

## Roadmap

### Current (Phase 1) ✅
- [x] Escrow contract with multi-step settlement
- [x] LP Registry for staking and reputation
- [x] Comprehensive test coverage
- [x] Local testnet deployment

### MVP (Phase 2) 🚧
- [ ] Atomic swap contract design
- [ ] Single-transaction settlement
- [ ] Oracle integration framework
- [ ] Dynamic QR code support
- [ ] Testnet deployment

### Production (Phase 3) 📋
- [ ] Automated UPI verification
- [ ] Decentralized oracle network
- [ ] LP reputation system
- [ ] Dispute resolution
- [ ] Mainnet deployment

## License

MIT License - see root LICENSE file

## Support

- 📧 Email: team@3bodyprotocol.io
- 💬 Discord: [Join our server](https://discord.gg/threebody)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/3BODYUI/issues)

---

**⚠️ Development Notice**: The current escrow contracts are functional for testing. The atomic settlement contract is under active development for production use.

**Built with Rust + CosmWasm for secure, scalable blockchain applications**
