#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUDFLARE_PURGE="$HOME/code/caprover-control/scripts/cloudflare-purge.sh"

source ~/.nvm/nvm.sh

# Build with Node 20 (required by Vite 7)
nvm use 20
npm run build

# Deploy using Node 18 (caprover has compatibility issues with newer Node)
nvm exec 18 node /Users/will/.nvm/versions/node/v18.20.8/lib/node_modules/caprover/built/commands/caprover.js deploy --default -b master

# Purge Cloudflare cache
echo ""
if [[ -x "$CLOUDFLARE_PURGE" ]]; then
    "$CLOUDFLARE_PURGE" chordboy.com /sw.js /index.html || echo "⚠️  Cache purge failed (continuing anyway)"
else
    echo "⚠️  Cloudflare purge script not found, skipping cache purge"
fi

# Verify deployment
echo ""
echo "Verifying deployment..."
sleep 15

if curl -sf https://chordboy.com/ > /dev/null; then
    echo "✅ Site responding"

    # Verify sw.js and index.html have matching asset hashes
    HTML_ASSETS=$(curl -s https://chordboy.com/ | grep -oE 'index-[a-zA-Z0-9_-]+\.(js|css)' | sort -u)
    SW_ASSETS=$(curl -s https://chordboy.com/sw.js | grep -oE 'index-[a-zA-Z0-9_-]+\.(css|js)' | sort -u)

    if [ "$HTML_ASSETS" = "$SW_ASSETS" ]; then
        echo "✅ Service worker assets match HTML"
    else
        echo "⚠️  Asset mismatch detected!"
        echo "HTML references: $HTML_ASSETS"
        echo "SW caches: $SW_ASSETS"
    fi
else
    echo "❌ Site not responding"
    exit 1
fi
