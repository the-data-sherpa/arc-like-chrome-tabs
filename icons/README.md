# Icon Generation Instructions

The extension requires three icon sizes: 16x16, 48x48, and 128x128 pixels.

## Quick Method: Use Online Icon Generator

1. Visit https://www.favicon-generator.org/ or similar icon generator
2. Upload a simple icon image (or use a text-based icon)
3. Download the generated icons
4. Rename and place them as:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

## Alternative: Create Simple Placeholder Icons

You can create simple colored square icons using any image editor:

1. Create a 16x16 pixel image with a solid color (e.g., #4a9eff blue)
2. Add a simple "T" or "A" letter in white
3. Save as PNG
4. Resize to create the three sizes needed

## Using ImageMagick (if installed)

Run these commands in the icons directory:

```bash
# Create a simple blue square with white "T" text
convert -size 128x128 xc:#4a9eff -gravity center -pointsize 80 -fill white -annotate +0+0 "T" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

## Temporary Solution

For immediate testing, you can use any existing PNG files renamed to the required names. The extension will work without icons, but Chrome may show warnings.

