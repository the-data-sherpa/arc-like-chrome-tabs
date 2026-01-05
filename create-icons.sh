#!/bin/bash
# Simple script to create placeholder icons using sips (macOS) or ImageMagick

cd "$(dirname "$0")/icons"

# Create a simple 128x128 blue square using sips (macOS)
if command -v sips &> /dev/null; then
    # Create a temporary colored image
    echo "Creating icons using sips..."
    
    # Create 128x128 blue PNG
    sips -z 128 128 --setProperty format png /System/Library/CoreServices/DefaultDesktop.heic --out icon128.png 2>/dev/null || \
    python3 -c "
from PIL import Image
img = Image.new('RGB', (128, 128), color='#4a9eff')
img.save('icon128.png')
print('Created icon128.png')
" 2>/dev/null || \
    echo "Please install PIL: pip3 install Pillow, or use generate-icons.html"
    
    # Resize to other sizes
    if [ -f icon128.png ]; then
        sips -z 48 48 icon128.png --out icon48.png
        sips -z 16 16 icon128.png --out icon16.png
        echo "Icons created successfully!"
    fi
else
    echo "sips not found. Please:"
    echo "1. Open generate-icons.html in a browser and download the icons, OR"
    echo "2. Install Pillow: pip3 install Pillow, then run this script again, OR"
    echo "3. Create simple colored square PNGs manually (16x16, 48x48, 128x128)"
fi

