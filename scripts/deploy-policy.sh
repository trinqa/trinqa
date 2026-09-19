#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACT_DIR="$ROOT/contracts/trinqa-policy"
WASM="$CONTRACT_DIR/target/wasm32v1-none/release/trinqa_allocation_policy.wasm"
DEPLOYMENTS="$ROOT/deployments/testnet.json"
SOURCE_ACCOUNT="${POLICY_DEPLOY_SOURCE:-deployer}"
NETWORK="${STELLAR_NETWORK:-testnet}"

if ! command -v stellar >/dev/null; then
  echo "stellar CLI required (https://developers.stellar.org/docs/tools/cli/stellar-cli)" >&2
  exit 1
fi

if ! command -v cargo >/dev/null; then
  echo "Rust/cargo required for contract build" >&2
  exit 1
fi

cd "$CONTRACT_DIR"
BUILD_OUT="$(stellar contract build 2>&1)"
echo "$BUILD_OUT"
WASM_HASH="$(echo "$BUILD_OUT" | sed -n 's/.*Wasm Hash: \([a-f0-9]*\).*/\1/p' | head -1)"

CONTRACT_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  --alias trinqa-policy-testnet | tail -1)"

mkdir -p "$(dirname "$DEPLOYMENTS")"
DEPLOYER_PK="$(stellar keys public-key "$SOURCE_ACCOUNT" | tail -1)"
node <<EOF
const fs = require('fs');
const payload = {
  network: '$NETWORK',
  contractId: '$CONTRACT_ID'.trim(),
  contractName: 'trinqa-allocation-policy',
  wasmHash: '$WASM_HASH',
  deployTxHash: process.env.DEPLOY_TX_HASH || null,
  deployedAt: new Date().toISOString(),
  deployerPublicKey: '$DEPLOYER_PK'.trim(),
};
fs.writeFileSync('$DEPLOYMENTS', JSON.stringify(payload, null, 2) + '\\n');
console.log('Wrote $DEPLOYMENTS', payload);
EOF

echo "Deployed Trinqa allocation policy: $CONTRACT_ID"
