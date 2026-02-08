#!/bin/bash

# Quick GIF creation script for ReefLab tank animation
# Requires: ffmpeg, gifsicle (optional for optimization)

set -e

echo "🎬 ReefLab Tank Animation GIF Creator"
echo "====================================="
echo ""

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo ""
    echo "Install ffmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    echo ""
    exit 1
fi

# Check if input file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <input-video-file>"
    echo ""
    echo "Example:"
    echo "  $0 tank-recording.mov"
    echo "  $0 ~/Videos/recording.mp4"
    echo ""
    echo "Steps:"
    echo "1. Start your dev server: cd frontend && npm run dev"
    echo "2. Record the tank animation with screen recording software"
    echo "3. Run this script with your recording file"
    echo ""
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_DIR="$(dirname "$0")/../docs/images"
OUTPUT_FILE="$OUTPUT_DIR/tank-animation.gif"
TEMP_FILE="$OUTPUT_DIR/tank-animation-temp.gif"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file not found: $INPUT_FILE"
    exit 1
fi

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"

echo "📥 Input:  $INPUT_FILE"
echo "📤 Output: $OUTPUT_FILE"
echo ""

# Convert to GIF
echo "🎨 Converting to GIF..."
ffmpeg -i "$INPUT_FILE" \
    -vf "fps=15,scale=800:-1:flags=lanczos" \
    -c:v gif \
    -y \
    "$TEMP_FILE" 2>&1 | grep -E "Duration|time=" || true

echo "✅ Conversion complete!"
echo ""

# Optimize if gifsicle is available
if command -v gifsicle &> /dev/null; then
    echo "🔧 Optimizing GIF with gifsicle..."

    ORIGINAL_SIZE=$(du -h "$TEMP_FILE" | cut -f1)

    gifsicle -O3 --colors 256 "$TEMP_FILE" -o "$OUTPUT_FILE"
    rm "$TEMP_FILE"

    OPTIMIZED_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

    echo "   Original:  $ORIGINAL_SIZE"
    echo "   Optimized: $OPTIMIZED_SIZE"
    echo "✅ Optimization complete!"
else
    mv "$TEMP_FILE" "$OUTPUT_FILE"
    echo "⚠️  gifsicle not found - skipping optimization"
    echo "   Install with: brew install gifsicle (macOS)"
    echo "                 sudo apt install gifsicle (Ubuntu)"
fi

echo ""
echo "🎉 Done!"
echo ""
echo "GIF saved to: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Next steps:"
echo "1. Open $OUTPUT_FILE to preview"
echo "2. If satisfied, update README.md to reference the GIF"
echo "3. Commit and push: git add docs/images/tank-animation.gif && git commit -m 'Add tank animation GIF'"
echo ""
