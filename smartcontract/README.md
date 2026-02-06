# 3BODY Smart Contracts

A CosmWasm-based smart contract suite for the 3BODY decentralized application. This project includes an escrow system with liquidity provider (LP) registry for secure payment processing.

## Overview

This project contains two main smart contracts:

1. **LP Registry** (`lp_registry/`) - Manages liquidity providers with staking, unstaking, and slashing functionality
2. **Escrow** (`escrow/`) - Handles secure payment escrow between buyers and sellers with LP integration

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Buyer       │────▶│     Escrow      │────▶│   LP Registry   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
   Deposit funds         Confirm payout           Stake/Unstake
   Request refund        Check LP status          Slash LP
```

### Escrow Contract

Manages payment escrow between buyers and sellers:

- **Deposit**: Buyers deposit funds for a specific payment ID
- **Confirm Payout**: Admin confirms payout to LP after checking LP registry
- **Refund**: Buyers can refund after timeout or admin can force refund
- **Cross-contract query**: Validates LP status before payout

### LP Registry Contract

Manages liquidity provider registration and staking:

- **Stake**: LPs stake tokens to become active
- **Unstake**: LPs can unstake their tokens (must be the LP themselves)
- **Slash**: Admin can slash LP stakes for misbehavior
- **Query**: Check if an LP is active

## Prerequisites

- [Rust](https://rustup.rs/) (v1.70.0 or later)
- [Docker](https://docs.docker.com/get-docker/) (for local testnet)
- [wasmd](https://github.com/CosmWasm/wasmd) (for deployment, optional)

## Quick Start

### 1. Install Rust and WASM target

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### 2. Clone and Build

```bash
cd smartcontract
make build
```

### 3. Run Tests

```bash
make test
```

### 4. Start Local Testnet

```bash
make start-localnet
```

This starts a local wasmd chain at:
- RPC: http://localhost:26657
- REST: http://localhost:1317

### 5. Deploy Contracts

```bash
make deploy
```

This will:
1. Build optimized WASM binaries
2. Store contracts on-chain
3. Instantiate contracts
4. Save addresses to `contract_addresses.json`

## Development Workflow

### Building

```bash
# Debug build
cargo build

# Release build (for deployment)
cargo build --release --target wasm32-unknown-unknown

# Optimized build (requires Docker)
make optimize
```

### Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_deposit
```

### Schema Generation

Generate JSON schemas for contract messages:

```bash
make schema
```

Schemas are generated in the `schema/` directory for each contract.

### Code Quality

```bash
# Format code
make fmt

# Run linter
make check
```

## Contract Interactions

### LP Registry

```bash
# Stake as LP
wasmd tx wasm execute <LP_REGISTRY_ADDR> '{"stake":{"lp":"<LP_ADDRESS>"}}' \
  --amount 1000000u3body \
  --from <LP_KEY> \
  --chain-id 3body-local \
  --keyring-backend test

# Unstake
wasmd tx wasm execute <LP_REGISTRY_ADDR> '{"unstake":{"lp":"<LP_ADDRESS>","amount":"500000"}}' \
  --from <LP_KEY> \
  --chain-id 3body-local \
  --keyring-backend test

# Query LP status
wasmd query wasm contract-state smart <LP_REGISTRY_ADDR> '{"get_lp":{"lp":"<LP_ADDRESS>"}}'
```

### Escrow

```bash
# Deposit funds
wasmd tx wasm execute <ESCROW_ADDR> '{"deposit":{"payment_id":"pay_001","seller":"<SELLER_ADDR>"}}' \
  --amount 1000000u3body \
  --from <BUYER_KEY> \
  --chain-id 3body-local \
  --keyring-backend test

# Confirm payout (admin only)
wasmd tx wasm execute <ESCROW_ADDR> '{"confirm_payout":{"payment_id":"pay_001","lp":"<LP_ADDR>"}}' \
  --from admin \
  --chain-id 3body-local \
  --keyring-backend test

# Refund (after timeout or by admin)
wasmd tx wasm execute <ESCROW_ADDR> '{"refund":{"payment_id":"pay_001"}}' \
  --from <BUYER_KEY> \
  --chain-id 3body-local \
  --keyring-backend test

# Query payment
wasmd query wasm contract-state smart <ESCROW_ADDR> '{"get_payment":{"payment_id":"pay_001"}}'
```

## Project Structure

```
smartcontract/
├── Cargo.toml              # Workspace configuration
├── Makefile               # Development commands
├── docker-compose.yml     # Local testnet setup
├── escrow/                # Escrow contract
│   ├── cargo.toml
│   └── src/
│       ├── lib.rs         # Contract logic
│       └── bin/
│           └── schema.rs   # Schema generation
├── lp_registry/           # LP Registry contract
│   ├── cargo.toml
│   └── src/
│       ├── lib.rs         # Contract logic
│       └── bin/
│           └── schema.rs   # Schema generation
├── scripts/
│   └── deploy.sh          # Deployment script
└── schema/                # Generated schemas (after running make schema)
    ├── escrow.json
    └── lp_registry.json
```

## Testing

### Unit Tests

Both contracts have comprehensive unit tests covering:

- Happy path scenarios
- Error cases (unauthorized access, insufficient funds, etc.)
- State transitions
- Edge cases

Run tests:
```bash
cargo test
```

### Integration Testing

For integration tests, use the local testnet:

```bash
# Start testnet
make start-localnet

# Deploy contracts
make deploy

# Interact using CLI or write integration tests
```

## Deployment

### Local Testnet

```bash
make dev  # Starts testnet and deploys contracts
```

### Testnet/Mainnet

1. Update `scripts/deploy.sh` with appropriate chain configuration
2. Ensure you have sufficient funds in your deployer account
3. Run deployment:

```bash
# Set environment variables
export CHAIN_ID="your-chain-id"
export NODE="https://rpc.your-chain.com"
export GAS_PRICES="0.025uatom"

# Run deployment
./scripts/deploy.sh
```

## Security Considerations

1. **Access Control**: Admin functions are restricted to the contract admin
2. **State Validation**: All state transitions are validated
3. **Timeout Protection**: Refunds require timeout period to pass (unless admin)
4. **LP Validation**: Payout only to active LPs from the registry
5. **Reentrancy**: Uses Cosmos SDK's transaction model which prevents reentrancy

## Common Issues

### Build Errors

**Issue**: `could not find wasm32-unknown-unknown target`

**Solution**:
```bash
rustup target add wasm32-unknown-unknown
```

### Docker Issues

**Issue**: Permission denied when running Docker

**Solution**: Ensure your user is in the docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Test Failures

**Issue**: Tests fail with "storage not found"

**Solution**: Ensure you're using the correct mock types:
```rust
use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `make test`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push to branch: `git push origin feature/my-feature`
7. Submit a pull request

## Resources

- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [CosmWasm Academy](https://academy.cosmwasm.com/)
- [Cosmos SDK Documentation](https://docs.cosmos.network/)

## License

[License information here]

## Support

For questions or support, please:
1. Check existing issues
2. Create a new issue with detailed description
3. Join our community chat

---

**Note**: This is a development environment. For production deployment, ensure proper security audits and testing.
