
#!/bin/bash

CONFIG_PATH=$(find . -name Configuration.js)

echo "Config file found $CONFIG_PATH"

source ~/.bash_profile

# client Key
sed -i '' "s/{YOUR_CLIENT_KEY}/$CLIENT_KEY/g" $CONFIG_PATH

# demo server API key
sed -i '' "s/{YOUR_DEMO_SERVER_API_KEY}/$DEMO_SERVER_API_KEY/g" $CONFIG_PATH

# merchant account
sed -i '' "s/{YOUR_MERCHANT_ACCOUNT}/$MERCHANT_ACCOUNT/g" $CONFIG_PATH

# public key
sed -i '' "s/{YOUR_PUBLIC_KEY}/$PUBLIC_KEY/g" $CONFIG_PATH

# Apple merchant ID
ENTITLEMENTS_PATH=$(find . -type f -name "*.entitlements")
APPLE_MERCHANT_ID=$(grep -Ei 'merchant.com.*<' ENTITLEMENTS_PATH | sed 's/\(.*\)\(merchant.com.*\)\(\<\/string\>\)/\2/')

if [ ! -z $APPLE_MERCHANT_ID ]; then
  sed -i '' "s/{YOUR_APPLE_MERCHANT_ID}/$APPLE_MERCHANT_ID/g" $CONFIG_PATH
fi
