# 3BODY Smart Contract Development Makefile
# This Makefile provides common tasks for developing and deploying CosmWasm smart contracts

.PHONY: all build test schema optimize deploy clean start-localnet stop-localnet help

# Default target
all: build test schema

# Build contracts in debug mode
build:
	@echo "Building contracts..."
	cargo build --release --target wasm32-unknown-unknown

# Run unit tests
test:
	@echo "Running tests..."
	cargo test

# Generate JSON schemas for both contracts
schema:
	@echo "Generating schemas..."
	cargo run --bin schema_escrow
	cargo run --bin schema_lp_registry

# Build optimized contracts for deployment (requires Docker)
optimize:
	@echo "Optimizing contracts with Docker..."
	docker run --rm -v "$(PWD)":/code \
		--mount type=volume,source="3body_cache",target=/target \
		--mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
		cosmwasm/optimizer:0.15.0

# Deploy contracts to local testnet
deploy: optimize
	@echo "Deploying to local testnet..."
	./scripts/deploy.sh

# Start local wasmd testnet
start-localnet:
	@echo "Starting local testnet..."
	docker-compose up -d
	@echo "Waiting for chain to start..."
	@sleep 5
	@echo "Local testnet is running!"
	@echo "RPC: http://localhost:26657"
	@echo "REST: http://localhost:1317"

# Stop local testnet
stop-localnet:
	@echo "Stopping local testnet..."
	docker-compose down
	@echo "Local testnet stopped"

# View logs from local testnet
logs:
	docker-compose logs -f wasmd

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean
	rm -rf artifacts/
	rm -rf target/

# Check code formatting and run clippy
check:
	@echo "Checking code formatting..."
	cargo fmt -- --check
	@echo "Running clippy..."
	cargo clippy -- -D warnings

# Format code
fmt:
	@echo "Formatting code..."
	cargo fmt

# Generate TypeScript types from schemas
ts-types: schema
	@echo "Generating TypeScript types..."
	@mkdir -p ../3bodyui/src/types/contracts
	@echo '{"escrow": "' > /tmp/schema_paths.json
	@cat schema/escrow.json >> /tmp/schema_paths.json
	@echo '", "lp_registry": "' >> /tmp/schema_paths.json
	@cat schema/lp_registry.json >> /tmp/schema_paths.json
	@echo '"}' >> /tmp/schema_paths.json
	@echo "TypeScript types would be generated here using json-schema-to-typescript"
	@echo "Schemas are available in schema/ directory"

# Full development workflow: start testnet, deploy, and run integration tests
dev: start-localnet deploy
	@echo "Development environment ready!"
	@echo "LP Registry: $$(cat contract_addresses.json | jq -r '.lp_registry.address')"
	@echo "Escrow: $$(cat contract_addresses.json | jq -r '.escrow.address')"

# Show help
help:
	@echo "3BODY Smart Contract Development Makefile"
	@echo "========================================="
	@echo ""
	@echo "Available targets:"
	@echo "  all             - Build, test, and generate schemas (default)"
	@echo "  build           - Build contracts in release mode"
	@echo "  test            - Run unit tests"
	@echo "  schema          - Generate JSON schemas"
	@echo "  optimize        - Build optimized contracts with Docker"
	@echo "  deploy          - Deploy contracts to local testnet"
	@echo "  start-localnet  - Start local wasmd testnet"
	@echo "  stop-localnet   - Stop local wasmd testnet"
	@echo "  logs            - View local testnet logs"
	@echo "  clean           - Clean build artifacts"
	@echo "  check           - Run formatting and clippy checks"
	@echo "  fmt             - Format code"
	@echo "  ts-types        - Generate TypeScript types from schemas"
	@echo "  dev             - Start testnet and deploy (full dev setup)"
	@echo "  help            - Show this help message"
