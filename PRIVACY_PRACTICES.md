# Chrome Web Store Privacy Practices - Tabula

## Single Purpose Description

Tabula is a tab management extension that provides a vertical sidebar interface for organizing browser tabs. The extension's single purpose is to help users organize, manage, and access their browser tabs through workspaces, pinned tabs, and favorites. All functionality is focused on tab organization and management within the Chrome browser.

## Permission Justifications

### tabs Permission

**Justification:**
The tabs permission is essential for Tabula's core functionality. Tabula needs to:
- Display all open tabs in the vertical sidebar
- Query tab information (title, URL, favicon, active status)
- Create new tabs when users click on pinned tabs or favorites
- Update tab properties (activate tabs, close tabs)
- Track which tabs are open and their current state
- Manage tab relationships between Chrome tabs and pinned/favorite tabs

Without the tabs permission, Tabula cannot function as it would be unable to access any tab information or perform tab management operations.

### storage Permission

**Justification:**
The storage permission is required to save user data locally on their device. Tabula uses chrome.storage.local to persist:
- Workspace configurations (names, pinned tabs, folders)
- Favorites list
- Tab mappings (which Chrome tabs correspond to which pinned/favorite tabs)
- Current workspace selection
- Folder collapse/expand states

All data is stored locally using Chrome's local storage API. No data is sent to external servers. The storage permission is necessary to maintain user's organization across browser sessions and workspace switches.

### contextMenus Permission

**Justification:**
The contextMenus permission is required to add right-click menu options that allow users to quickly pin tabs or add tabs to favorites. When users right-click on a webpage, Tabula provides menu options such as:
- "Pin Tab" with submenu to select which workspace to pin to
- "Add to Favorites"

These context menu options provide convenient access to Tabula's core features without requiring users to open the sidebar. The contextMenus permission is essential for this user experience enhancement.

### sidePanel Permission

**Justification:**
The sidePanel permission is required to display Tabula's vertical sidebar interface. The sidebar is the primary user interface where users:
- View all their tabs organized by workspace
- See favorites, pinned tabs, and regular tabs
- Switch between workspaces
- Organize tabs into folders
- Access all of Tabula's features

The sidePanel API is the modern Chrome extension method for displaying persistent sidebar interfaces. Without this permission, Tabula cannot display its main user interface.

### host_permissions (<all_urls>)

**Justification:**
The host_permissions with <all_urls> is required to access tab favicons for display in the sidebar. Tabula displays favicons for:
- Pinned tabs
- Favorites
- Regular tabs in the sidebar

To retrieve favicons, Tabula needs access to the tab's URL information. The <all_urls> permission allows Tabula to access favicon URLs from any website the user visits. This is necessary because:
- Users may have tabs open from any website
- Favicons are website-specific and cannot be accessed without host permissions
- Tabula needs to display accurate favicons to help users identify tabs

Tabula does not access page content, modify pages, or inject scripts. It only accesses tab metadata (URL, title, favicon) provided by the Chrome tabs API. No page content is read or modified.

### remote code use

**Justification:**
Tabula does not use remote code. All code is bundled in the extension package and executed locally. Tabula does not:
- Load or execute code from external servers
- Use eval() or similar dynamic code execution
- Fetch and execute scripts from remote URLs
- Use remote configuration files that contain executable code

All functionality is implemented in the extension's local files (background.js, sidepanel.js, sidepanel.html, styles.css) which are included in the extension package.

## Data Usage and Privacy

### Data Collection

Tabula does not collect, transmit, or store any user data on external servers. All data is stored locally on the user's device using Chrome's chrome.storage.local API.

### Data Stored Locally

The following data is stored locally on the user's device:
- Workspace names and configurations
- Pinned tab information (title, URL, saved URL, favicon)
- Favorites list (title, URL, saved URL, favicon)
- Tab mappings (which Chrome tabs correspond to pinned/favorite tabs)
- Current workspace selection
- Folder organization and collapse states

### Data Transmission

Tabula does not transmit any data to external servers. There is no:
- Analytics tracking
- User behavior monitoring
- Data collection
- External API calls
- Network requests (except for favicon loading, which is handled by Chrome)

### Privacy Compliance

Tabula complies with Chrome Web Store Developer Program Policies regarding data usage:
- No user data is collected or transmitted
- All data remains on the user's device
- No third-party services are used
- No tracking or analytics
- No user identification or profiling

### User Control

Users have full control over their data:
- All data is stored locally and can be cleared by uninstalling the extension
- Users can delete workspaces, remove pinned tabs, and clear favorites at any time
- No data persists after extension uninstallation

## Certification

I certify that Tabula's data usage complies with Chrome Web Store Developer Program Policies. Tabula does not collect, transmit, or store user data on external servers. All functionality is performed locally on the user's device, and all data remains under the user's control.

