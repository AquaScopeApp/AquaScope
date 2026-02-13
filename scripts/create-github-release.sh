#!/bin/bash

# Create GitHub Release for v1.2.0
# Requires: gh CLI (GitHub CLI)

set -e

VERSION="v1.2.0"
RELEASE_NOTES_FILE="docs/RELEASE-v1.2.0.md"

echo "🚀 Creating GitHub Release for $VERSION"
echo "======================================="
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo ""
    echo "Install options:"
    echo "  macOS:   brew install gh"
    echo "  Ubuntu:  sudo apt install gh"
    echo "  Windows: choco install gh"
    echo ""
    echo "Or create the release manually:"
    echo "1. Go to: https://github.com/AquaScopeApp/AquaScope/releases/new"
    echo "2. Tag: $VERSION"
    echo "3. Title: ReefLab $VERSION - Enhanced Tank Management Hub"
    echo "4. Description: Copy content from $RELEASE_NOTES_FILE"
    echo "5. Click 'Publish release'"
    exit 1
fi

# Check if release notes file exists
if [ ! -f "$RELEASE_NOTES_FILE" ]; then
    echo "❌ Release notes file not found: $RELEASE_NOTES_FILE"
    exit 1
fi

# Check if tag exists
if ! git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo "❌ Git tag $VERSION does not exist"
    echo "Create it with: git tag -a $VERSION -m 'Release $VERSION'"
    exit 1
fi

# Check authentication
if ! gh auth status >/dev/null 2>&1; then
    echo "❌ Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

echo "✓ Prerequisites checked"
echo ""

# Create the release
echo "Creating release $VERSION..."

gh release create "$VERSION" \
    --title "ReefLab $VERSION - Enhanced Tank Management Hub" \
    --notes-file "$RELEASE_NOTES_FILE" \
    --verify-tag

echo ""
echo "✅ Release created successfully!"
echo ""
echo "View the release at:"
echo "https://github.com/AquaScopeApp/AquaScope/releases/tag/$VERSION"
echo ""
echo "Next steps:"
echo "1. Review the release on GitHub"
echo "2. Share with the reef keeping community"
echo "3. Update any deployment documentation"
