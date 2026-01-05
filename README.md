# ARC-like Chrome Tabs Extension

A Chrome extension that mimics ARC browser's vertical tab sidebar with workspaces, pinned tabs, and favorites. Pinned tabs remember their initial saved state, so they always return to the URL they were pinned from, even after navigation.

## Features

- **Vertical Sidebar**: Clean, modern vertical tab interface
- **Workspaces**: Organize tabs into different workspaces
- **Pinned Tabs**: Pin tabs to workspaces - they remember their initial URL state
- **Favorites**: Global favorites pinned at the top of the sidebar
- **Tab Highlighting**: Active tab is highlighted in the sidebar
- **Smart Close Buttons**: 
  - `-` icon when tab is open (closes the Chrome tab)
  - `x` icon when tab is closed (removes pinned tab/favorite)
- **One-to-One Mapping**: Each pinned tab maps to one Chrome tab

## Installation

### Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `arc-like-chrome-tabs` folder
5. The extension should now appear in your extensions list

### Step 2: Open the Sidebar

1. Click the extension icon in the Chrome toolbar
2. The sidebar will open on the right side of your browser

## Usage

### Creating a Workspace

1. Click the `+` button next to the workspace selector
2. Enter a workspace name
3. Click "Confirm"

### Pinning a Tab

1. Right-click on any Chrome tab
2. Select "Pin Tab" → "Pin to [Workspace Name]"
3. The tab will appear in the Pinned Tabs section

### Adding to Favorites

1. Right-click on any Chrome tab
2. Select "Pin Tab" → "Add to Favorites"
3. The tab will appear in the Favorites section at the top

### Using Pinned Tabs

- **Click a pinned tab**: 
  - If open: Activates the existing Chrome tab
  - If closed: Opens a new tab with the saved URL
- **Close button (`-`)**: Closes the Chrome tab (pinned tab remains)
- **Remove button (`x`)**: Removes the pinned tab from the workspace

### Tab Behavior

- Pinned tabs remember their **initial saved URL** (the URL when they were pinned)
- Even if you navigate away from a pinned tab, closing and reopening it will return to the saved URL
- The active Chrome tab is highlighted in the sidebar
- All Chrome tabs (pinned and normal) are displayed in the sidebar

## File Structure

```
arc-like-chrome-tabs/
├── manifest.json          # Extension manifest (V3)
├── sidepanel.html         # Sidebar UI structure
├── sidepanel.js           # Sidebar logic and interactions
├── background.js          # Service worker (context menus, tab tracking)
├── styles.css             # Modern dark theme styling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── generate-icons.html    # Tool to generate icons in browser
└── README.md              # This file
```

## Technical Details

- **Manifest Version**: 3
- **Storage**: Uses `chrome.storage.local` for persistence
- **Permissions**: `tabs`, `storage`, `contextMenus`, `sidePanel`
- **Tab Mapping**: Bidirectional mapping between pinned tabs and Chrome tabs

## Development

### Regenerating Icons

If you need to regenerate the icons:

1. **Using ImageMagick** (if installed):
   ```bash
   cd icons
   magick -size 128x128 xc:'#4a9eff' -gravity center -pointsize 80 -fill white -font Arial-Bold -annotate +0+0 'A' icon128.png
   magick icon128.png -resize 48x48 icon48.png
   magick icon128.png -resize 16x16 icon16.png
   ```

2. **Using the HTML generator**:
   - Open `generate-icons.html` in a browser
   - Click the download buttons for each size

3. **Manual creation**:
   - Create 16x16, 48x48, and 128x128 PNG images
   - Place them in the `icons/` directory

## Troubleshooting

- **Sidebar not opening**: Make sure you clicked the extension icon in the toolbar
- **Context menu not appearing**: Reload the extension after installation
- **Tabs not saving**: Check that the extension has the required permissions
- **Icons missing**: The extension will work without icons, but Chrome may show warnings

## License

This extension is provided as-is for personal use.

