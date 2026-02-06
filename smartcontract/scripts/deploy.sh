#!/bin/bash
set -e

# Configuration
CHAIN_ID="3body-local"
NODE="http://localhost:26657"
GAS_PRICES="0.025u3body"
KEYRING_BACKEND="test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}3BODY Smart Contract Deployment Script${NC}"
echo "========================================"

# Check if wasmd is running
if ! curl -s "${NODE}/status" > /dev/null; then
    echo -e "${RED}Error: wasmd is not running on ${NODE}${NC}"
    echo "Start the local testnet with: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}Connected to local testnet${NC}"

# Build contracts
echo -e "\n${YELLOW}Building contracts...${NC}"
cargo wasm

# Optimize contracts for deployment
echo -e "\n${YELLOW}Optimizing contracts...${NC}"
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.15.0

# Store LP Registry contract
echo -e "\n${YELLOW}Storing LP Registry contract...${NC}"
LP_REGISTRY_CODE_ID=$(wasmd tx wasm store artifacts/lp_registry.wasm \
  --from validator \
  --chain-id "${CHAIN_ID}" \
  --node "${NODE}" \
  --gas-prices "${GAS_PRICES}" \
  --gas auto \
  --gas-adjustment 1.3 \
  --keyring-backend "${KEYRING_BACKEND}" \
  -y \
  --output json | jq -r '.logs[0].events[-1].attributes[-1].value')

echo -e "${GREEN}LP Registry code ID: ${LP_REGISTRY_CODE_ID}${NC}"

# Store Escrow contract
echo -e "\n${YELLOW}Storing Escrow contract...${NC}"
ESCROW_CODE_ID=$(wasmd tx wasm store artifacts/escrow.wasm \
  --from validator \
  --chain-id "${CHAIN_ID}" \
  --node "${NODE}" \
  --gas-prices "${GAS_PRICES}" \
  --gas auto \
  --gas-adjustment 1.3 \
  --keyring-backend "${KEYRING_BACKEND}" \
  -y \
  --output json | jq -r '.logs[0].events[-1].attributes[-1].value')

echo -e "${GREEN}Escrow code ID: ${ESCROW_CODE_ID}${NC}"

# Get validator address
VALIDATOR_ADDR=$(wasmd keys show validator --keyring-backend test --address)
echo -e "\n${YELLOW}Validator address: ${VALIDATOR_ADDR}${NC}"

# Instantiate LP Registry
echo -e "\n${YELLOW}Instantiating LP Registry...${NC}"
LP_REGISTRY_INIT="{\"admin\": \"${VALIDATOR_ADDR}\", \"denom\": \"u3body\"}"
LP_REGISTRY_ADDR=$(wasmd tx wasm instantiate "${LP_REGISTRY_CODE_ID}" "${LP_REGISTRY_INIT}" \
  --from validator \
  --chain-id "${CHAIN_ID}" \
  --node "${NODE}" \
  --gas-prices "${GAS_PRICES}" \
  --gas auto \
  --gas-adjustment 1.3 \
  --keyring-backend "${KEYRING_BACKEND}" \
  --label "3body-lp-registry" \
  --no-admin \
  -y \
  --output json | jq -r '.logs[0].events[0].attributes[0].value')

echo -e "${GREEN}LP Registry address: ${LP_REGISTRY_ADDR}${NC}"

# Instantiate Escrow
echo -e "\n${YELLOW}Instantiating Escrow...${NC}"
ESCROW_INIT="{\"admin\": \"${VALIDATOR_ADDR}\", \"refund_timeout_seconds\": 3600, \"denom\": \"u3body\", \"lp_registry\": \"${LP_REGISTRY_ADDR}\"}"
ESCROW_ADDR=$(wasmd tx wasm instantiate "${ESCROW_CODE_ID}" "${ESCROW_INIT}" \
  --from validator \
  --chain-id "${CHAIN_ID}" \
  --node "${NODE}" \
  --gas-prices "${GAS_PRICES}" \
  --gas auto \
  --gas-adjustment 1.3 \
  --keyring-backend "${KEYRING_BACKEND}" \
  --label "3body-escrow" \
  --no-admin \
  -y \
  --output json | jq -r '.logs[0].events[0].attributes[0].value')

echo -e "${GREEN}Escrow address: ${ESCROW_ADDR}${NC}"

# Save contract addresses
cat > contract_addresses.json <<EOF
{
  "chain_id": "${CHAIN_ID}",
  "node": "${NODE}",
  "lp_registry": {
    "code_id": ${LP_REGISTRY_CODE_ID},
    "address": "${LP_REGISTRY_ADDR}"
  },
  "escrow": {
    "code_id": ${ESCROW_CODE_ID},
    "address": "${ESCROW_ADDR}"
  }
}
EOF

echo -e "\n${GREEN}Deployment complete! Contract addresses saved to contract_addresses.json${NC}"
echo -e "${YELLOW}LP Registry: ${LP_REGISTRY_ADDR}${NC}"
echo -e "${YELLOW}Escrow: ${ESCROW_ADDR}${NC}"
