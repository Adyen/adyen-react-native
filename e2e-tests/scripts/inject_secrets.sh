#!/bin/bash

set -euo pipefail

# Validate Secrets exist in Environment
if [ -z "$ADYEN_CLIENT_KEY" ] || [ -z "$ADYEN_PUBLIC_KEY" ]; then
  echo "Error: ADYEN_CLIENT_KEY and ADYEN_PUBLIC_KEY environment variables are missing."
  exit 1
fi

echo "== Injecting Secrets"

# Determine the secrets file location based on project type
if [ -f "secrets.js" ]; then
  SECRETS_FILE="secrets.js"
elif [ -f "app/(tabs)/secrets.js" ]; then
  SECRETS_FILE="app/(tabs)/secrets.js"
else
  echo "Error: Could not find secrets.js"
  exit 1
fi

echo "Injecting secrets into $SECRETS_FILE"

# We use '#' as delimiter, so secrets can safely contain '|'.
# Keys are expected to only contain [a-zA-Z0-9_|], so no extra escaping is needed.
sed -e "s#__CLIENT_KEY__#${ADYEN_CLIENT_KEY}#g" \
    -e "s#__PUBLIC_KEY__#${ADYEN_PUBLIC_KEY}#g" \
    "$SECRETS_FILE" > "$SECRETS_FILE.tmp" && mv "$SECRETS_FILE.tmp" "$SECRETS_FILE"
