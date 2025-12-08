#!/bin/bash
set -e

# Build with current Node version
npm run build

# Deploy using Node 18 (caprover has compatibility issues with Node 24)
source ~/.nvm/nvm.sh
nvm exec 18 node /Users/will/.nvm/versions/node/v24.11.1/lib/node_modules/caprover/built/commands/caprover.js deploy --default -b master
