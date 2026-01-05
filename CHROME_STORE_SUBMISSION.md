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

### Required Assets

| Asset | Size | Format | Status |
|-------|------|--------|--------|
| **Icon** | 128×128 | PNG | ✅ Already have (`icons/icon128.png`) |
| **Screenshot 1** | 1280×800 or 640×400 | PNG/JPG | ⚠️ Need to create |
| **Screenshot 2** (optional) | 1280×800 or 640×400 | PNG/JPG | ⚠️ Optional |
| **Promo Tile** (optional) | 440×280 | PNG | ✅ Generator created |

### How to Create Screenshots

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

### Promo Tile
- Open `generate-store-icon.html` in your browser
- Click "Generate Icon" to preview
- Click "Download PNG" to save `tabula-promo-tile-440x280.png`

---

## 🔐 Privacy & Permissions

### Single Purpose
Tab management and organization - all tabs are managed locally.

### Permissions Justification

**Required Permissions:**
- `tabs` - Required to display, manage, and organize browser tabs
- `storage` - Required to save workspaces, pinned tabs, and favorites locally
- `contextMenus` - Required to provide right-click menu options for pinning tabs
- `sidePanel` - Required to display the vertical sidebar interface
- `<all_urls>` - Required to access tab favicons for display

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
- [x] Icon (128×128)
- [ ] Screenshot 1 (1280×800)
- [ ] Screenshot 2 (optional)
- [ ] Promo tile (440×280) - generator ready
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

