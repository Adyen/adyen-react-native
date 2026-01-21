#!/bin/bash

set -euo pipefail

# Validate Secrets exist in Environment
if [ -z "$ADYEN_CLIENT_KEY" ] || [ -z "$ADYEN_PUBLIC_KEY" ]; then
  echo "Error: ADYEN_CLIENT_KEY and ADYEN_PUBLIC_KEY environment variables are missing."
  exit 1
fi

echo "== Injecting Secrets"

# We use '#' as delimiter, so secrets can safely contain '|'.
# Keys are expected to only contain [a-zA-Z0-9_|], so no extra escaping is needed.
sed -e "s#__CLIENT_KEY__#${ADYEN_CLIENT_KEY}#g" \
    -e "s#__PUBLIC_KEY__#${ADYEN_PUBLIC_KEY}#g" \
    App.tsx > App.tsx.tmp && mv App.tsx.tmp App.tsx
