#!/bin/bash

name=$1

if [ -z "$name" ]; then
  echo "Error: App name argument missing."
  exit 1
fi

# Validate Secrets exist in Environment
if [ -z "$ADYEN_CLIENT_KEY" ] || [ -z "$ADYEN_PUBLIC_KEY" ]; then
  echo "Error: ADYEN_CLIENT_KEY and ADYEN_PUBLIC_KEY environment variables are missing."
  exit 1
fi

cd "$name" || exit

echo "== Injecting Secrets"
sed "s|__CLIENT_KEY__|$ADYEN_CLIENT_KEY|g" App.tsx
sed "s|__PUBLIC_KEY__|$ADYEN_PUBLIC_KEY|g" App.tsx