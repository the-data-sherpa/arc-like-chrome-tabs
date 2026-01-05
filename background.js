// Background service worker for ARC-like Chrome Tabs extension

// Default favicon as a data URI (simple gray globe icon)
const DEFAULT_FAVICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEuNSIvPjxwYXRoIGQ9Ik04IDFjMi41IDAgNC41IDMuMSA0LjUgN3MtMiA3LTQuNSA3LTQuNS0zLjEtNC41LTcgMi03IDQuNS03eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEuNSIvPjxwYXRoIGQ9Ik0xIDhoMTQiIHN0cm9rZT0iIzg4OCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz4=';

// Get safe favicon URL
function getSafeFavicon(url, favIconUrl) {
  // If we have a valid favicon URL from Chrome, use it
  if (favIconUrl && !favIconUrl.startsWith('chrome://')) {
    return favIconUrl;
  }
  
  // Don't try to load favicons for chrome:// URLs
  if (url && url.startsWith('chrome://')) {
    return DEFAULT_FAVICON;
  }
  
  // For regular URLs, use the favicon URL if available
  if (favIconUrl) {
    return favIconUrl;
  }
  
  // Fallback to default
  return DEFAULT_FAVICON;
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  initializeContextMenus();
  initializeStorage();
  
  // Set side panel to open when extension icon is clicked
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Note: Chrome's security model prevents auto-opening the side panel on startup.
// The sidePanel.open() API requires a user gesture (click or keyboard shortcut).
// Users can open the panel by:
// 1. Clicking the extension icon
// 2. Using the keyboard shortcut (Ctrl+Shift+E / Cmd+Shift+E)

// Initialize context menus
function initializeContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create parent menu for pinning tabs
    chrome.contextMenus.create({
      id: 'pin-tab-parent',
      title: 'Pin Tab',
      contexts: ['page']
    });

    // Create menu for adding to favorites
    chrome.contextMenus.create({
      id: 'add-to-favorites',
      title: 'Add to Favorites',
      contexts: ['page'],
      parentId: 'pin-tab-parent'
    });

    // Create separator
    chrome.contextMenus.create({
      id: 'pin-separator',
      type: 'separator',
      contexts: ['page'],
      parentId: 'pin-tab-parent'
    });

    // Dynamic workspace menus will be added when workspaces are created
    updateWorkspaceMenus();
  });
}

// Update workspace context menus
async function updateWorkspaceMenus() {
  const data = await chrome.storage.local.get(['workspaces']);
  const workspaces = data.workspaces || {};

  // Remove existing workspace menus
  chrome.contextMenus.removeAll(() => {
    // Recreate parent menu
    chrome.contextMenus.create({
      id: 'pin-tab-parent',
      title: 'Pin Tab',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'add-to-favorites',
      title: 'Add to Favorites',
      contexts: ['page'],
      parentId: 'pin-tab-parent'
    });

    chrome.contextMenus.create({
      id: 'pin-separator',
      type: 'separator',
      contexts: ['page'],
      parentId: 'pin-tab-parent'
    });

    // Add workspace menus
    Object.values(workspaces).forEach(workspace => {
      chrome.contextMenus.create({
        id: `pin-to-workspace-${workspace.id}`,
        title: `Pin to "${workspace.name}"`,
        contexts: ['page'],
        parentId: 'pin-tab-parent'
      });
    });
  });
}

// Initialize storage with default values
async function initializeStorage() {
  const data = await chrome.storage.local.get(['workspaces', 'favorites', 'currentWorkspace', 'tabMapping']);
  
  if (!data.workspaces) {
    await chrome.storage.local.set({ workspaces: {} });
  }
  
  if (!data.favorites) {
    await chrome.storage.local.set({ favorites: [] });
  }
  
  if (!data.currentWorkspace) {
    await chrome.storage.local.set({ currentWorkspace: '' });
  }
  
  if (!data.tabMapping) {
    await chrome.storage.local.set({ tabMapping: {} });
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-favorites') {
    await addToFavorites(tab);
  } else if (info.menuItemId.startsWith('pin-to-workspace-')) {
    const workspaceId = info.menuItemId.replace('pin-to-workspace-', '');
    await pinTabToWorkspace(tab, workspaceId);
  }
});

// Add tab to favorites
async function addToFavorites(tab) {
  try {
    const data = await chrome.storage.local.get(['favorites', 'tabMapping']);
    const favorites = data.favorites || [];
    const tabMapping = data.tabMapping || {};

    // Check if already in favorites
    const existingIndex = favorites.findIndex(f => f.chromeTabId === tab.id);
    if (existingIndex !== -1) {
      console.log('Tab already in favorites');
      return;
    }

    // Get favicon
    const favicon = getSafeFavicon(tab.url, tab.favIconUrl);

    // Create favorite entry
    const favorite = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      savedUrl: tab.url || '', // Initial URL when pinned
      favicon: favicon,
      createdAt: Date.now(),
      chromeTabId: tab.id || null
    };

    favorites.push(favorite);

    // Update tab mapping
    if (tab.id) {
      tabMapping[tab.id] = {
        pinnedTabId: null,
        favoriteId: favorite.id,
        isNormalTab: false
      };
    }

    await chrome.storage.local.set({ favorites, tabMapping });

    // Notify sidepanel to update
    notifySidepanelUpdate();
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
}

// Pin tab to workspace
async function pinTabToWorkspace(tab, workspaceId) {
  try {
    const data = await chrome.storage.local.get(['workspaces', 'tabMapping']);
    const workspaces = data.workspaces || {};
    const tabMapping = data.tabMapping || {};

    if (!workspaces[workspaceId]) {
      console.error('Workspace not found:', workspaceId);
      return;
    }

    const workspace = workspaces[workspaceId];
    const pinnedTabs = workspace.pinnedTabs || [];

    // Check if already pinned in this workspace
    const existingIndex = pinnedTabs.findIndex(pt => pt.chromeTabId === tab.id);
    if (existingIndex !== -1) {
      console.log('Tab already pinned in this workspace');
      return;
    }

    // Get favicon
    const favicon = getSafeFavicon(tab.url, tab.favIconUrl);

    // Create pinned tab entry
    const pinnedTab = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      savedUrl: tab.url || '', // Initial URL when pinned
      favicon: favicon,
      createdAt: Date.now(),
      chromeTabId: tab.id || null
    };

    pinnedTabs.push(pinnedTab);
    workspace.pinnedTabs = pinnedTabs;
    workspaces[workspaceId] = workspace;

    // Update tab mapping
    if (tab.id) {
      tabMapping[tab.id] = {
        pinnedTabId: pinnedTab.id,
        favoriteId: null,
        isNormalTab: false
      };
    }

    await chrome.storage.local.set({ workspaces, tabMapping });

    // Notify sidepanel to update
    notifySidepanelUpdate();
  } catch (error) {
    console.error('Error pinning tab to workspace:', error);
  }
}

// Track tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  // Tab mapping will be updated when sidepanel opens the tab
  notifySidepanelUpdate();
});

// Track tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const data = await chrome.storage.local.get(['workspaces', 'favorites', 'tabMapping']);
    const workspaces = data.workspaces || {};
    const favorites = data.favorites || [];
    const tabMapping = data.tabMapping || {};

    let modified = false;

    // Always scan all pinned tabs and favorites to clear matching chromeTabId
    // This ensures we catch tabs even if tabMapping is out of sync
    for (const workspaceId in workspaces) {
      const pinnedTabs = workspaces[workspaceId].pinnedTabs || [];
      pinnedTabs.forEach(pt => {
        if (pt.chromeTabId === tabId) {
          pt.chromeTabId = null;
          modified = true;
        }
      });
    }

    // Clear from favorites
    favorites.forEach(f => {
      if (f.chromeTabId === tabId) {
        f.chromeTabId = null;
        modified = true;
      }
    });

    // Also clear from normalTabs arrays
    for (const workspaceId in workspaces) {
      if (workspaces[workspaceId].normalTabs) {
        const before = workspaces[workspaceId].normalTabs.length;
        workspaces[workspaceId].normalTabs = workspaces[workspaceId].normalTabs.filter(id => id !== tabId);
        if (workspaces[workspaceId].normalTabs.length !== before) {
          modified = true;
        }
      }
    }

    // Remove from tab mapping
    if (tabMapping[tabId]) {
      delete tabMapping[tabId];
      modified = true;
    }

    // Only save if something actually changed
    if (modified) {
      await chrome.storage.local.set({ workspaces, favorites, tabMapping });
    }
    notifySidepanelUpdate();
  } catch (error) {
    console.error('Error handling tab removal:', error);
  }
});

// Track tab activation
chrome.tabs.onActivated.addListener(() => {
  notifySidepanelUpdate();
});

// Track tab updates (URL changes, title changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only notify on significant changes
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
    notifySidepanelUpdate();
  }
});

// Notify sidepanel to update
function notifySidepanelUpdate() {
  // Send message to sidepanel if it's open
  chrome.runtime.sendMessage({ type: 'updateSidepanel' }).catch(() => {
    // Sidepanel might not be open, ignore error
  });
}

// Handle messages from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'workspaceCreated' || message.type === 'workspaceDeleted') {
    updateWorkspaceMenus();
  }
  
  if (message.type === 'updateTabMapping') {
    updateTabMapping(message.pinnedTabId, message.favoriteId, message.chromeTabId);
  }

  sendResponse({ success: true });
});

// Update tab mapping when sidepanel opens a pinned tab
async function updateTabMapping(pinnedTabId, favoriteId, chromeTabId) {
  try {
    const data = await chrome.storage.local.get(['workspaces', 'favorites', 'tabMapping']);
    const workspaces = data.workspaces || {};
    const favorites = data.favorites || [];
    const tabMapping = data.tabMapping || {};

    if (pinnedTabId) {
      // Update pinned tab's chromeTabId
      for (const workspaceId in workspaces) {
        const pinnedTabs = workspaces[workspaceId].pinnedTabs || [];
        const pinnedTab = pinnedTabs.find(pt => pt.id === pinnedTabId);
        if (pinnedTab) {
          pinnedTab.chromeTabId = chromeTabId;
          break;
        }
      }

      // Update tab mapping
      if (chromeTabId) {
        tabMapping[chromeTabId] = {
          pinnedTabId: pinnedTabId,
          favoriteId: null,
          isNormalTab: false
        };
      }
    }

    if (favoriteId) {
      // Update favorite's chromeTabId
      const favorite = favorites.find(f => f.id === favoriteId);
      if (favorite) {
        favorite.chromeTabId = chromeTabId;
      }

      // Update tab mapping
      if (chromeTabId) {
        tabMapping[chromeTabId] = {
          pinnedTabId: null,
          favoriteId: favoriteId,
          isNormalTab: false
        };
      }
    }

    await chrome.storage.local.set({ workspaces, favorites, tabMapping });
  } catch (error) {
    console.error('Error updating tab mapping:', error);
  }
}

// Open side panel when extension icon is clicked
// Note: With setPanelBehavior({ openPanelOnActionClick: true }), this may not be needed
// but we keep it as a fallback
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.log('Could not open side panel:', error.message);
  }
});


