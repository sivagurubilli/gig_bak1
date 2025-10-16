#!/bin/bash

# Cashfree Environment Switcher
# Usage: ./switch-cashfree-env.sh [sandbox|production]

if [ $# -eq 0 ]; then
    echo "Current Cashfree Environment: ${CASHFREE_ENVIRONMENT:-production}"
    echo ""
    echo "Usage: ./switch-cashfree-env.sh [sandbox|production]"
    echo ""
    echo "Available environments:"
    echo "  sandbox    - Use Cashfree sandbox/test environment"
    echo "  production - Use Cashfree live/production environment"
    exit 1
fi

ENVIRONMENT=$1

if [ "$ENVIRONMENT" != "sandbox" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid options: sandbox, production"
    exit 1
fi

# Export the environment variable
export CASHFREE_ENVIRONMENT=$ENVIRONMENT

echo "Switched to Cashfree $ENVIRONMENT environment"
echo "Environment variable set: CASHFREE_ENVIRONMENT=$ENVIRONMENT"
echo ""
echo "Please restart the application for changes to take effect:"
echo "  npm run dev"
echo ""

# Show which credentials will be used
if [ "$ENVIRONMENT" = "sandbox" ]; then
    echo "Using SANDBOX credentials:"
    echo "  App ID: TEST10729899d689890fed5ed40670e099892701"
    echo "  API URL: https://sandbox.cashfree.com"
else
    echo "Using PRODUCTION credentials:"
    echo "  App ID: ${CASHFREE_APP_ID:-103010300e742ec607e793c54cb3010301}"
    echo "  API URL: https://api.cashfree.com"
fi