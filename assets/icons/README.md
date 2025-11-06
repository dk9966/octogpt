# Extension Icons

## Current Status

The `icon.svg` file contains a placeholder icon for development.

## TODO: Generate PNG Icons

For production, you need PNG icons in the following sizes:
- 16x16 (icon16.png)
- 48x48 (icon48.png)
- 128x128 (icon128.png)

### Option 1: Using ImageMagick (if installed)
```bash
convert -background none -size 16x16 icon.svg icon16.png
convert -background none -size 48x48 icon.svg icon48.png
convert -background none -size 128x128 icon.svg icon128.png
```

### Option 2: Using an Online Converter
1. Upload `icon.svg` to https://cloudconvert.com/svg-to-png
2. Convert to 16x16, 48x48, and 128x128
3. Download and save as icon16.png, icon48.png, icon128.png

### Option 3: Create Custom Icons
Design custom PNG icons using your preferred graphics tool and replace these placeholders.

## Design Notes

The current icon uses:
- Green background (#10a37f) - matches ChatGPT's brand color
- White elements representing a navigation tree structure
- Gold dot indicating active/current position

