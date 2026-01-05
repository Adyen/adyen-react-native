#!/bin/bash

set -e

# Find the example directory (first match)
EXAMPLE_DIR=$(find . -type d -name example | head -n 1)

if [ -z "$EXAMPLE_DIR" ]; then
  echo "Error: example directory not found." >&2
  exit 1
fi

SECRETS_FILE="$EXAMPLE_DIR/secrets.json"

# Source user profile if present so env vars can be loaded
if [ -f ~/.bash_profile ]; then
  source ~/.bash_profile
fi

# Environment variables expected to be set:
# CLIENT_KEY, DEMO_SERVER_API_KEY, MERCHANT_ACCOUNT, PUBLIC_KEY
# They may be empty; we'll still create the JSON file with whatever values are present.
: "${CLIENT_KEY:=}"
: "${DEMO_SERVER_API_KEY:=}"
: "${MERCHANT_ACCOUNT:=}"
: "${PUBLIC_KEY:=}"

# Try to find Apple merchant ID from any .entitlements file
ENTITLEMENTS_PATH=$(find . -type f -name "*.entitlements" | head -n 1)
APPLE_MERCHANT_ID=""
if [ -n "$ENTITLEMENTS_PATH" ]; then
  # extract first occurrence of merchant.com... (stop at XML tag or whitespace)
  APPLE_MERCHANT_ID=$(grep -oE 'merchant\.com[^<\s]+' "$ENTITLEMENTS_PATH" | head -n 1 || true)
fi

# If none of the variables are set, warn the user
if [ -z "$CLIENT_KEY" ] && [ -z "$DEMO_SERVER_API_KEY" ] && [ -z "$MERCHANT_ACCOUNT" ] && [ -z "$PUBLIC_KEY" ] && [ -z "$APPLE_MERCHANT_ID" ]; then
  echo "Warning: no secrets found in environment; creating secrets.json with empty values."
fi

# Create the JSON file in the example directory. Values are inserted raw from the environment.
# NOTE: If your secrets contain quotes or special characters, consider storing/escaping them appropriately.
cat > "$SECRETS_FILE" <<EOF
{
  "clientKey": "${CLIENT_KEY}",
  "demoServerApiKey": "${DEMO_SERVER_API_KEY}",
  "merchantAccount": "${MERCHANT_ACCOUNT}",
  "publicKey": "${PUBLIC_KEY}",
  "appleMerchantId": "${APPLE_MERCHANT_ID}"
}
EOF

echo "Created $SECRETS_FILE"
