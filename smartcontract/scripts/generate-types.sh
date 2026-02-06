#!/bin/bash
# Generate TypeScript types from contract schemas

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_DIR="$PROJECT_ROOT/schema"
TYPES_DIR="$PROJECT_ROOT/../3bodyui/src/types/contracts"

echo "Generating TypeScript types from schemas..."

# Check if schemas exist
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "Error: Schema directory not found. Run 'make schema' first."
    exit 1
fi

# Create types directory if it doesn't exist
mkdir -p "$TYPES_DIR"

# Generate types for each contract
for contract in escrow lp_registry; do
    if [ -f "$SCHEMA_DIR/$contract.json" ]; then
        echo "Processing $contract..."
        
        # Create TypeScript file
        cat > "$TYPES_DIR/$contract.ts" <<EOF
// Auto-generated from $contract.json
// Do not edit manually

export interface InstantiateMsg {
  // Add fields based on your contract
}

export type ExecuteMsg = 
  | { deposit: { payment_id: string; seller: string } }
  | { confirm_payout: { payment_id: string; lp: string } }
  | { refund: { payment_id: string } };

export interface QueryMsg {
  get_payment?: { payment_id: string };
}

// Re-export contract addresses
export const CONTRACT_ADDRESSES = {
  local: {
    codeId: 0,
    address: '',
  },
  testnet: {
    codeId: 0,
    address: '',
  },
  mainnet: {
    codeId: 0,
    address: '',
  },
};
EOF
        
        echo "Generated $TYPES_DIR/$contract.ts"
    fi
done

echo "TypeScript types generated successfully!"
echo "Location: $TYPES_DIR"
echo ""
echo "Note: This is a basic template. Consider using json-schema-to-typescript"
echo "for automatic type generation from JSON schemas:"
echo "  npm install -g json-schema-to-typescript"
echo "  json2ts schema/escrow.json > src/types/contracts/escrow.ts"
