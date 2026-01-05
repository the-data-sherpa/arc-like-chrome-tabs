# Tabula

A Chrome extension that brings innovative vertical tab management to Google Chrome. Organize your browsing with workspaces, pinned tabs, and favorites.

![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🗂️ Workspaces
- Create multiple workspaces to organize tabs by project or context
- Workspace isolation - tabs are exclusive to their workspace
- Rename and delete workspaces with ease
- Quick workspace switching from dropdown

### 📌 Pinned Tabs
- Pin important tabs to keep them organized
- Pinned tabs remember their saved URL - always return to where you started
- Organize pinned tabs into folders
- Folders show open tabs even when collapsed

### ⭐ Favorites Bar
- Up to 8 favorite sites displayed as square favicon buttons
- Favorites persist across all workspaces
- Quick access to your most-used sites

### 📥 Import Bookmarks
- Import bookmarks from HTML bookmark files
- Create workspaces from bookmark folders
- Preserve folder structure during import

### 🎨 Modern UI
- Clean, dark theme sidebar
- Visual indicators for active and open tabs
- Drag and drop to organize tabs
- Right-click context menus for quick actions

## 📦 Installation

### From Chrome Web Store
*Coming soon - Search for "Tabula"*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the extension folder
6. Click the extension icon to open the sidebar

## 🚀 Quick Start

1. **Open the sidebar** - Click the extension icon or use `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`)
2. **Create a workspace** - Click the `+` button next to the workspace dropdown
3. **Pin a tab** - Right-click any tab in the sidebar → "Pin to Current Workspace"
4. **Add to favorites** - Right-click any tab → "Add to Favorites"

## 📖 Usage Guide

### Tab Management
| Action | Result |
|--------|--------|
| Click pinned/favorite tab | Opens or activates the tab |
| `-` button (on open tab) | Closes the Chrome tab |
| `×` button (on closed tab) | Removes from pinned/favorites |

### Keyboard Shortcut
- `Ctrl+Shift+E` / `Cmd+Shift+E` - Toggle sidebar

### Context Menu Options
- **Pin to Current Workspace** - Add tab to pinned tabs
- **Add to Favorites** - Add to favorites bar
- **Move to Folder** - Organize pinned tabs into folders
- **Update Saved URL** - Change the URL a pinned tab returns to
- **Close Tab** - Close the Chrome tab
- **Remove from List** - Remove pinned tab or favorite

## 🛠️ Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: 
  - `tabs` - Tab management
  - `storage` - Save workspaces and preferences
  - `contextMenus` - Right-click menus
  - `sidePanel` - Sidebar UI
- **Storage**: Uses `chrome.storage.local` for data persistence

## 📁 Project Structure

```
arc-like-chrome-tabs/
├── manifest.json          # Extension configuration
├── sidepanel.html         # Sidebar UI
├── sidepanel.js           # Sidebar logic
├── background.js          # Service worker
├── styles.css             # Styling
├── icons/                 # Extension icons
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use and modify for your own projects.

## 🙏 Acknowledgments

Tabula - Your organized browsing companion.
