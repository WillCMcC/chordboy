#!/bin/bash

# Caprover Deployment Build Script
# This script creates a .tar file ready for Caprover deployment

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="chordboy"
OUTPUT_DIR="./caprover-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TAR_FILE="${APP_NAME}_${TIMESTAMP}.tar"

# Store the original directory
ORIGINAL_DIR=$(pwd)

echo -e "${BLUE}🚀 Starting Caprover deployment build...${NC}"

# Create temporary build directory
echo -e "${BLUE}📦 Creating build directory...${NC}"
mkdir -p "$OUTPUT_DIR"
TEMP_DIR=$(mktemp -d)

echo -e "${BLUE}📋 Copying files to temporary directory...${NC}"

# Copy all necessary files, excluding unnecessary ones
rsync -av \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'caprover-deploy' \
  --exclude '*.tar' \
  --exclude '.DS_Store' \
  ./ "$TEMP_DIR/"

# Navigate to temp directory
cd "$TEMP_DIR"

# Verify required files exist
echo -e "${BLUE}✅ Verifying required files...${NC}"
if [ ! -f "captain-definition" ]; then
    echo -e "${RED}❌ Error: captain-definition file not found!${NC}"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Error: Dockerfile not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ captain-definition found${NC}"
echo -e "${GREEN}✓ Dockerfile found${NC}"
echo -e "${GREEN}✓ Source files found${NC}"

# Create tar file
echo -e "${BLUE}📦 Creating tar archive...${NC}"
tar -cf "$TAR_FILE" ./*

# Move tar file to output directory
mv "$TAR_FILE" "$ORIGINAL_DIR/$OUTPUT_DIR/$TAR_FILE"

# Go back to original directory
cd "$ORIGINAL_DIR"

# Clean up temp directory
echo -e "${BLUE}🧹 Cleaning up...${NC}"
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_DIR/$TAR_FILE" | cut -f1)

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Tar file created: ${NC}$OUTPUT_DIR/$TAR_FILE"
echo -e "${GREEN}📊 File size: ${NC}$FILE_SIZE"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Log into your Caprover dashboard"
echo "2. Go to your app (or create a new one)"
echo "3. Navigate to the 'Deployment' tab"
echo "4. Upload the tar file: $OUTPUT_DIR/$TAR_FILE"
echo "5. Click 'Deploy' and wait for the deployment to complete"
echo ""
echo -e "${GREEN}🎉 Ready to deploy!${NC}"
