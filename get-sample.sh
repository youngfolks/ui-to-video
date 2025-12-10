#!/bin/bash

# Download a sample UI screenshot for testing
echo "📥 Downloading sample UI screenshot..."

# Using a public screenshot of a modern SaaS dashboard
curl -L "https://raw.githubusercontent.com/tailwindlabs/tailwindcss/master/.github/screenshot.png" -o sample-tailwind.png

if [ -f "sample-tailwind.png" ]; then
    echo "✅ Downloaded sample-tailwind.png"
    echo ""
    echo "Now run: npm run detect sample-tailwind.png"
else
    echo "❌ Download failed. Please download a screenshot manually."
    echo ""
    echo "You can:"
    echo "1. Take a screenshot of any website (Cmd+Shift+4 on Mac)"
    echo "2. Save it in this folder as 'screenshot.png'"
    echo "3. Run: npm run detect screenshot.png"
fi
