# Chrome Web Store Submission Guide for Tabula

## 📋 Product Details

### Name
**Tabula**

### Short Description (132 characters max)
```
Vertical tab sidebar with workspaces, pinned tabs, and favorites. Organize your browsing with Tabula.
```

### Category
**Productivity** ⭐ (Recommended)

**Alternative options:**
- **Developer Tools** (if you want to target developers specifically)
- **Accessibility** (helps organize browsing)

**Why Productivity?**
- Helps users organize and manage their browsing
- Improves workflow efficiency
- Fits the category definition of "tools that help users be more productive"

### Detailed Description
See `CHROME_STORE_DESCRIPTION.md` for the full description.

---

## 🖼️ Graphics Assets

Based on [official Chrome Web Store guidelines](https://developer.chrome.com/webstore/images#icons):

### Required Assets

| Asset | Size | Format | Requirements | Status |
|-------|------|--------|--------------|--------|
| **Store Icon** | 128×128 | PNG | Artwork: 96×96 (16px transparent padding), front-facing, works on light/dark backgrounds | ✅ Already have (`icons/icon128.png`) |

**Icon Guidelines:**
- Artwork should be 96×96 pixels centered in 128×128 canvas
- 16 pixels of transparent padding on all sides
- Front-facing perspective (not dramatic angles)
- Works on both light and dark backgrounds
- No edge borders (UI adds edges)
- Avoid large drop shadows
- See [official icon guidelines](https://developer.chrome.com/webstore/images#icons)
| **Screenshot 1** | 1280×800 or 640×400 | JPEG or 24-bit PNG (no alpha) | Square corners, full bleed | ⚠️ Need to create |
| **Small Promo Tile** | 440×280 | JPEG or 24-bit PNG (no alpha) | **REQUIRED** - Avoid text, saturated colors | ✅ Generator created |

### Optional Assets

| Asset | Size | Format | Requirements | Status |
|-------|------|--------|--------------|--------|
| **Screenshots 2-5** | 1280×800 or 640×400 | JPEG or 24-bit PNG (no alpha) | Square corners, full bleed | ⚠️ Optional |
| **Marquee Promo Tile** | 1400×560 | JPEG or 24-bit PNG (no alpha) | For featured placement | ⚠️ Optional |

### How to Create Screenshots

**Requirements:**
- **Size**: 1280×800 (preferred) or 640×400 pixels
- **Format**: JPEG or 24-bit PNG (no alpha channel)
- **Style**: Square corners, no padding (full bleed)
- **Content**: Show actual extension in use

**Steps:**
1. **Open Tabula sidebar** in Chrome
2. **Take screenshots** showing:
   - Main sidebar with workspaces
   - Favorites bar
   - Pinned tabs in folders
   - Workspace switching
   - Right-click context menu

3. **Recommended Screenshots:**
   - Screenshot 1: Main sidebar view with workspaces and pinned tabs
   - Screenshot 2: Favorites bar and folder organization
   - Screenshot 3: Workspace management (rename/delete)

**Note**: If using macOS Screenshot tool, ensure you export as JPEG or convert PNG to remove alpha channel.

### Promo Tile (REQUIRED)

**Small Promo Tile (440×280) - REQUIRED:**
- Open `generate-store-icon.html` in your browser
- Click "Generate Icon" to preview
- Click "Download PNG" to save `tabula-promo-tile-440x280.png`
- The generator creates a 24-bit PNG (no alpha) as required

**Design Guidelines:**
- Avoid text (or use minimal text)
- Use saturated colors
- Fill entire region
- Works when shrunk to half size
- Well-defined edges

**Marquee Promo Tile (1400×560) - Optional:**
- For featured placement in Chrome Web Store
- Same design principles as small promo tile
- Can be created by scaling/adapting the small version

---

## 🔐 Privacy & Permissions

### Single Purpose
Tab management and organization - all tabs are managed locally.

### Permissions Justification

**Required Permissions:**
- `tabs` - Required to display, manage, and organize browser tabs (also provides favicon URLs)
- `storage` - Required to save workspaces, pinned tabs, and favorites locally
- `contextMenus` - Required to provide right-click menu options for pinning tabs
- `sidePanel` - Required to display the vertical sidebar interface

**Note:** Tabula does not require host permissions. All tab information, including favicon URLs, is provided by the Chrome tabs API.

**Privacy Policy:**
- All data stored locally using `chrome.storage.local`
- No data sent to external servers
- No tracking or analytics
- No user data collection

---

## 📝 Store Listing Checklist

- [x] Name: Tabula
- [x] Short description (132 chars)
- [x] Full description
- [x] Category: Productivity
- [x] Store Icon (128×128 PNG) - Artwork 96×96 with 16px padding
- [ ] Screenshot 1 (1280×800 or 640×400, JPEG/24-bit PNG, no alpha)
- [ ] Small Promo Tile (440×280, JPEG/24-bit PNG, no alpha) - **REQUIRED**
- [ ] Screenshot 2-5 (optional)
- [ ] Marquee Promo Tile (1400×560, optional)
- [x] Privacy policy (can use simple statement)
- [x] Permissions justification
- [x] Package file: `tabula-v1.0.0.zip`

---

## 🚀 Submission Steps

1. **Go to** [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **Pay** $5 one-time registration fee (if not already registered)
3. **Click** "New Item"
4. **Upload** `tabula-v1.0.0.zip`
5. **Fill in** all required fields using this guide
6. **Upload** screenshots and promo tile
7. **Review** all information
8. **Submit** for review

---

## ⏱️ Review Timeline

- **Initial review**: 1-3 business days
- **Updates**: Usually faster (same day or next day)
- **You'll receive** email notification when approved/rejected

---

## 💡 Tips for Approval

1. **Clear description** - Explain what the extension does
2. **Good screenshots** - Show the extension in action
3. **Honest permissions** - Only request what's needed (you're good!)
4. **Privacy policy** - Even a simple one helps
5. **No trademark violations** - You're clear (removed ARC references)

---

## 📧 Support

If you need help during submission:
- Chrome Web Store Help: https://support.google.com/chrome_webstore
- Developer Forum: https://groups.google.com/a/chromium.org/g/chromium-extensions

Good luck with your submission! 🎉

