// Sidepanel script for ARC-like Chrome Tabs extension

let workspaces = {};
let favorites = [];
let currentWorkspace = '';
let tabMapping = {};
let allChromeTabs = [];
let activeTabId = null;

// Context menu state
let contextMenuTarget = null;
let contextMenuType = null;

// Folder state
let collapsedFolders = new Set();
let folderModalMode = 'create'; // 'create' or 'rename'
let folderToEdit = null;
let tabToMove = null;

// Import state
let parsedBookmarks = null;
let selectedImportFolders = new Set();

// Drag and drop state
let draggedItem = null;
let draggedType = null;
let draggedData = null;
let dropZonesInitialized = false;

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

// Initialize sidepanel
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await loadChromeTabs();
  setupEventListeners();
  setupContextMenu();
  renderUI();
  setupChromeTabListeners();
});

// Load data from storage
async function loadData() {
  try {
    const data = await chrome.storage.local.get([
      'workspaces',
      'favorites',
      'currentWorkspace',
      'tabMapping'
    ]);

    workspaces = data.workspaces || {};
    favorites = data.favorites || [];
    currentWorkspace = data.currentWorkspace || '';
    tabMapping = data.tabMapping || {};

    // If no current workspace but workspaces exist, select first one
    if (!currentWorkspace && Object.keys(workspaces).length > 0) {
      currentWorkspace = Object.keys(workspaces)[0];
      await chrome.storage.local.set({ currentWorkspace });
    }

    // Ensure workspaces have required arrays
    Object.keys(workspaces).forEach(wsId => {
      if (!workspaces[wsId].normalTabs) {
        workspaces[wsId].normalTabs = [];
      }
      if (!workspaces[wsId].folders) {
        workspaces[wsId].folders = [];
      }
      // Collapse all folders by default
      workspaces[wsId].folders.forEach(folder => {
        collapsedFolders.add(folder.id);
      });
    });
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Load all Chrome tabs
async function loadChromeTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    allChromeTabs = tabs;
    
    // Get active tab
    const activeTabs = tabs.filter(t => t.active);
    if (activeTabs.length > 0) {
      activeTabId = activeTabs[0].id;
    }
  } catch (error) {
    console.error('Error loading Chrome tabs:', error);
  }
}

// Setup Chrome tab event listeners
function setupChromeTabListeners() {
  // Listen for tab updates
  chrome.tabs.onCreated.addListener(async (tab) => {
    // Assign new tab to current workspace
    await assignTabToWorkspace(tab.id, currentWorkspace);
    await loadChromeTabs();
    renderUI();
  });

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    // Remove from workspace normal tabs
    await removeTabFromAllWorkspaces(tabId);
    await loadChromeTabs();
    renderUI();
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    activeTabId = activeInfo.tabId;
    renderUI();
  });

  chrome.tabs.onUpdated.addListener(() => {
    loadChromeTabs().then(renderUI);
  });

  // Listen for storage changes (from background script)
  chrome.storage.onChanged.addListener(() => {
    loadData().then(() => {
      loadChromeTabs().then(renderUI);
    });
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'updateSidepanel') {
      loadData().then(() => {
        loadChromeTabs().then(renderUI);
      });
    }
  });
}

// Assign tab to workspace
async function assignTabToWorkspace(tabId, workspaceId) {
  if (!workspaceId || !workspaces[workspaceId]) return;
  
  // Check if tab is already assigned somewhere
  const mapping = tabMapping[tabId];
  if (mapping && (mapping.pinnedTabId || mapping.favoriteId)) {
    // Tab is a pinned or favorite, don't assign as normal tab
    return;
  }

  // Initialize normalTabs if needed
  if (!workspaces[workspaceId].normalTabs) {
    workspaces[workspaceId].normalTabs = [];
  }

  // Add to workspace normal tabs if not already there
  if (!workspaces[workspaceId].normalTabs.includes(tabId)) {
    workspaces[workspaceId].normalTabs.push(tabId);
    await chrome.storage.local.set({ workspaces });
  }

  // Update tab mapping
  if (!tabMapping[tabId]) {
    tabMapping[tabId] = {
      pinnedTabId: null,
      favoriteId: null,
      workspaceId: workspaceId
    };
    await chrome.storage.local.set({ tabMapping });
  }
}

// Remove tab from all workspaces
async function removeTabFromAllWorkspaces(tabId) {
  Object.keys(workspaces).forEach(wsId => {
    if (workspaces[wsId].normalTabs) {
      workspaces[wsId].normalTabs = workspaces[wsId].normalTabs.filter(id => id !== tabId);
    }
  });
  
  // Remove from tab mapping
  delete tabMapping[tabId];
  
  await chrome.storage.local.set({ workspaces, tabMapping });
}

// Setup event listeners
function setupEventListeners() {
  // Workspace selector
  const workspaceSelector = document.getElementById('workspace-selector');
  workspaceSelector.addEventListener('change', async (e) => {
    currentWorkspace = e.target.value;
    await chrome.storage.local.set({ currentWorkspace });
    renderUI();
  });

  // Add workspace button
  const addWorkspaceBtn = document.getElementById('add-workspace-btn');
  addWorkspaceBtn.addEventListener('click', showAddWorkspaceModal);

  // Modal buttons
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const workspaceNameInput = document.getElementById('workspace-name-input');
  const modal = document.getElementById('workspace-modal');

  modalCancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    workspaceNameInput.value = '';
  });

  modalConfirmBtn.addEventListener('click', async () => {
    const name = workspaceNameInput.value.trim();
    if (name) {
      await createWorkspace(name);
      modal.classList.add('hidden');
      workspaceNameInput.value = '';
    }
  });

  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      workspaceNameInput.value = '';
    }
  });

  // Enter key in input
  workspaceNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      modalConfirmBtn.click();
    }
  });

  // Close context menu on outside click
  document.addEventListener('click', hideContextMenu);

  // New Tab button
  const newTabBtn = document.getElementById('new-tab-btn');
  newTabBtn.addEventListener('click', async () => {
    await chrome.tabs.create({ url: 'chrome://newtab' });
  });

  // Add Folder button
  const addFolderBtn = document.getElementById('add-folder-btn');
  addFolderBtn.addEventListener('click', () => {
    showFolderModal('create');
  });

  // Folder Modal
  const folderModal = document.getElementById('folder-modal');
  const folderNameInput = document.getElementById('folder-name-input');
  const folderModalCancelBtn = document.getElementById('folder-modal-cancel-btn');
  const folderModalConfirmBtn = document.getElementById('folder-modal-confirm-btn');

  folderModalCancelBtn.addEventListener('click', () => {
    folderModal.classList.add('hidden');
    folderNameInput.value = '';
  });

  folderModalConfirmBtn.addEventListener('click', async () => {
    const name = folderNameInput.value.trim();
    if (name) {
      if (folderModalMode === 'create') {
        await createFolder(name);
      } else if (folderModalMode === 'rename') {
        await renameFolder(folderToEdit, name);
      }
      folderModal.classList.add('hidden');
      folderNameInput.value = '';
    }
  });

  folderModal.addEventListener('click', (e) => {
    if (e.target === folderModal) {
      folderModal.classList.add('hidden');
      folderNameInput.value = '';
    }
  });

  folderNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      folderModalConfirmBtn.click();
    }
  });

  // Move to Folder Modal
  const moveFolderModal = document.getElementById('move-folder-modal');
  const folderSelect = document.getElementById('folder-select');
  const moveFolderCancelBtn = document.getElementById('move-folder-cancel-btn');
  const moveFolderConfirmBtn = document.getElementById('move-folder-confirm-btn');

  moveFolderCancelBtn.addEventListener('click', () => {
    moveFolderModal.classList.add('hidden');
    tabToMove = null;
  });

  moveFolderConfirmBtn.addEventListener('click', async () => {
    const folderId = folderSelect.value;
    if (tabToMove) {
      await moveTabToFolder(tabToMove.itemId, tabToMove.type, folderId);
      moveFolderModal.classList.add('hidden');
      tabToMove = null;
    }
  });

  moveFolderModal.addEventListener('click', (e) => {
    if (e.target === moveFolderModal) {
      moveFolderModal.classList.add('hidden');
      tabToMove = null;
    }
  });

  // Folder context menu
  const folderContextMenu = document.getElementById('folder-context-menu');
  folderContextMenu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    
    await handleFolderContextMenuAction(action);
    hideFolderContextMenu();
  });

  // Import button and modal
  setupImportListeners();
}

// Setup context menu
function setupContextMenu() {
  const contextMenu = document.getElementById('tab-context-menu');
  
  contextMenu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (!action || e.target.classList.contains('disabled')) return;
    
    await handleContextMenuAction(action);
    hideContextMenu();
  });
}

// Show context menu
function showContextMenu(e, target, type) {
  e.preventDefault();
  
  const contextMenu = document.getElementById('tab-context-menu');
  contextMenuTarget = target;
  contextMenuType = type;
  
  // Position the menu
  const x = e.clientX;
  const y = e.clientY;
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  
  // Adjust position if menu goes off screen
  const menuRect = contextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    contextMenu.style.left = `${x - menuRect.width}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    contextMenu.style.top = `${y - menuRect.height}px`;
  }
  
  // Update menu items based on context
  updateContextMenuItems(type);
}

// Hide context menu
function hideContextMenu() {
  const contextMenu = document.getElementById('tab-context-menu');
  contextMenu.classList.add('hidden');
  contextMenuTarget = null;
  contextMenuType = null;
  
  // Also hide folder context menu
  hideFolderContextMenu();
}

// Update context menu items based on tab type
function updateContextMenuItems(type) {
  const pinItem = document.querySelector('[data-action="pin"]');
  const favoriteItem = document.querySelector('[data-action="favorite"]');
  const moveToFolderItem = document.querySelector('[data-action="move-to-folder"]');
  const updateSavedItem = document.querySelector('[data-action="update-saved"]');
  const closeItem = document.querySelector('[data-action="close"]');
  const removeItem = document.querySelector('[data-action="remove"]');
  
  // Reset all items
  [pinItem, favoriteItem, moveToFolderItem, updateSavedItem, closeItem, removeItem].forEach(item => {
    if (item) item.classList.remove('disabled');
  });
  
  if (type === 'pinned') {
    // Already pinned - disable pin option
    pinItem.classList.add('disabled');
  } else if (type === 'favorite') {
    // Already favorite - disable favorite option, move to folder not applicable
    favoriteItem.classList.add('disabled');
    if (moveToFolderItem) moveToFolderItem.classList.add('disabled');
  } else if (type === 'normal') {
    // Normal tab - disable update saved and move to folder (not applicable)
    updateSavedItem.classList.add('disabled');
    if (moveToFolderItem) moveToFolderItem.classList.add('disabled');
  }
}

// Handle context menu action
async function handleContextMenuAction(action) {
  if (!contextMenuTarget) return;
  
  switch (action) {
    case 'pin':
      await pinTab(contextMenuTarget, contextMenuType);
      break;
    case 'favorite':
      await addToFavorites(contextMenuTarget, contextMenuType);
      break;
    case 'update-saved':
      await updateSavedUrl(contextMenuTarget, contextMenuType);
      break;
    case 'move-to-folder':
      showMoveToFolderModal(contextMenuTarget.itemId, contextMenuType);
      return; // Don't render UI yet, wait for modal
    case 'close':
      await closeTabFromContext(contextMenuTarget, contextMenuType);
      break;
    case 'remove':
      await removeTabFromContext(contextMenuTarget, contextMenuType);
      break;
  }
  
  renderUI();
}

// Pin a tab to current workspace
async function pinTab(target, type) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) {
    alert('Please select a workspace first');
    return;
  }
  
  let tabInfo;
  
  if (type === 'normal') {
    // Get tab info from Chrome
    const tab = allChromeTabs.find(t => t.id === target.tabId);
    if (!tab) return;
    
    tabInfo = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      savedUrl: tab.url || '',
      favicon: getSafeFavicon(tab.url, tab.favIconUrl),
      createdAt: Date.now(),
      chromeTabId: tab.id
    };
    
    // Remove from normal tabs
    const workspace = workspaces[currentWorkspace];
    if (workspace.normalTabs) {
      workspace.normalTabs = workspace.normalTabs.filter(id => id !== tab.id);
    }
  } else if (type === 'favorite') {
    // Move from favorites to pinned
    const favorite = favorites.find(f => f.id === target.itemId);
    if (!favorite) return;
    
    tabInfo = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: favorite.title,
      url: favorite.url,
      savedUrl: favorite.savedUrl,
      favicon: favorite.favicon,
      createdAt: Date.now(),
      chromeTabId: favorite.chromeTabId
    };
    
    // Remove from favorites
    favorites = favorites.filter(f => f.id !== target.itemId);
  } else {
    return; // Already pinned
  }
  
  // Add to pinned tabs
  const workspace = workspaces[currentWorkspace];
  if (!workspace.pinnedTabs) {
    workspace.pinnedTabs = [];
  }
  workspace.pinnedTabs.push(tabInfo);
  
  // Update tab mapping
  if (tabInfo.chromeTabId) {
    tabMapping[tabInfo.chromeTabId] = {
      pinnedTabId: tabInfo.id,
      favoriteId: null,
      workspaceId: currentWorkspace
    };
  }
  
  await chrome.storage.local.set({ workspaces, favorites, tabMapping });
}

// Add tab to favorites
async function addToFavorites(target, type) {
  let tabInfo;
  
  if (type === 'normal') {
    // Get tab info from Chrome
    const tab = allChromeTabs.find(t => t.id === target.tabId);
    if (!tab) return;
    
    tabInfo = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      savedUrl: tab.url || '',
      favicon: getSafeFavicon(tab.url, tab.favIconUrl),
      createdAt: Date.now(),
      chromeTabId: tab.id
    };
    
    // Remove from workspace normal tabs
    if (currentWorkspace && workspaces[currentWorkspace]) {
      const workspace = workspaces[currentWorkspace];
      if (workspace.normalTabs) {
        workspace.normalTabs = workspace.normalTabs.filter(id => id !== tab.id);
      }
    }
  } else if (type === 'pinned') {
    // Move from pinned to favorites
    const workspace = workspaces[currentWorkspace];
    if (!workspace) return;
    
    const pinnedTab = workspace.pinnedTabs.find(pt => pt.id === target.itemId);
    if (!pinnedTab) return;
    
    tabInfo = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: pinnedTab.title,
      url: pinnedTab.url,
      savedUrl: pinnedTab.savedUrl,
      favicon: pinnedTab.favicon,
      createdAt: Date.now(),
      chromeTabId: pinnedTab.chromeTabId
    };
    
    // Remove from pinned tabs
    workspace.pinnedTabs = workspace.pinnedTabs.filter(pt => pt.id !== target.itemId);
  } else {
    return; // Already favorite
  }
  
  // Add to favorites
  favorites.push(tabInfo);
  
  // Update tab mapping
  if (tabInfo.chromeTabId) {
    tabMapping[tabInfo.chromeTabId] = {
      pinnedTabId: null,
      favoriteId: tabInfo.id,
      workspaceId: null
    };
  }
  
  await chrome.storage.local.set({ workspaces, favorites, tabMapping });
}

// Update saved URL for pinned tab or favorite
async function updateSavedUrl(target, type) {
  if (type === 'pinned') {
    const workspace = workspaces[currentWorkspace];
    if (!workspace) return;
    
    const pinnedTab = workspace.pinnedTabs.find(pt => pt.id === target.itemId);
    if (!pinnedTab || !pinnedTab.chromeTabId) return;
    
    // Get current URL from Chrome tab
    const tab = allChromeTabs.find(t => t.id === pinnedTab.chromeTabId);
    if (!tab) return;
    
    pinnedTab.savedUrl = tab.url;
    pinnedTab.title = tab.title;
    pinnedTab.favicon = tab.favIconUrl || pinnedTab.favicon;
    
    await chrome.storage.local.set({ workspaces });
  } else if (type === 'favorite') {
    const favorite = favorites.find(f => f.id === target.itemId);
    if (!favorite || !favorite.chromeTabId) return;
    
    // Get current URL from Chrome tab
    const tab = allChromeTabs.find(t => t.id === favorite.chromeTabId);
    if (!tab) return;
    
    favorite.savedUrl = tab.url;
    favorite.title = tab.title;
    favorite.favicon = tab.favIconUrl || favorite.favicon;
    
    await chrome.storage.local.set({ favorites });
  }
}

// Close tab from context menu
async function closeTabFromContext(target, type) {
  let tabId;
  
  if (type === 'normal') {
    tabId = target.tabId;
  } else if (type === 'pinned') {
    const workspace = workspaces[currentWorkspace];
    const pinnedTab = workspace?.pinnedTabs.find(pt => pt.id === target.itemId);
    tabId = pinnedTab?.chromeTabId;
  } else if (type === 'favorite') {
    const favorite = favorites.find(f => f.id === target.itemId);
    tabId = favorite?.chromeTabId;
  }
  
  if (tabId) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }
}

// Remove tab from context menu
async function removeTabFromContext(target, type) {
  if (type === 'normal') {
    // Close the tab
    if (target.tabId) {
      try {
        await chrome.tabs.remove(target.tabId);
      } catch (error) {
        console.error('Error closing tab:', error);
      }
    }
  } else if (type === 'pinned') {
    await removeTab(target.itemId, 'pinned');
  } else if (type === 'favorite') {
    await removeTab(target.itemId, 'favorite');
  }
}

// Render UI
function renderUI() {
  renderWorkspaceSelector();
  renderFavorites();
  renderPinnedTabs();
  renderNormalTabs();
  
  // Mark drop zones as initialized after first render
  if (!dropZonesInitialized) {
    dropZonesInitialized = true;
  }
}

// Render workspace selector
function renderWorkspaceSelector() {
  const selector = document.getElementById('workspace-selector');
  selector.innerHTML = '<option value="">Select Workspace</option>';

  Object.values(workspaces).forEach(workspace => {
    const option = document.createElement('option');
    option.value = workspace.id;
    option.textContent = workspace.name;
    if (workspace.id === currentWorkspace) {
      option.selected = true;
    }
    selector.appendChild(option);
  });
}

// Render favorites
function renderFavorites() {
  const container = document.getElementById('favorites-list');
  container.innerHTML = '';
  
  // Add drop zone handlers only once
  if (!dropZonesInitialized) {
    setupDropZone(container, 'favorite');
  }

  if (favorites.length === 0) {
    container.innerHTML = '<div class="empty-state">No favorites yet</div>';
    return;
  }

  favorites.forEach(favorite => {
    const tabItem = createTabItem(favorite, 'favorite', favorite.id);
    container.appendChild(tabItem);
  });
}

// Render pinned tabs with folders
function renderPinnedTabs() {
  const container = document.getElementById('pinned-tabs-list');
  container.innerHTML = '';
  
  // Add drop zone handlers only once
  if (!dropZonesInitialized) {
    setupDropZone(container, 'pinned');
  }

  if (!currentWorkspace || !workspaces[currentWorkspace]) {
    container.innerHTML = '<div class="empty-state">Select a workspace</div>';
    return;
  }

  const workspace = workspaces[currentWorkspace];
  const pinnedTabs = workspace.pinnedTabs || [];
  const folders = workspace.folders || [];

  if (pinnedTabs.length === 0 && folders.length === 0) {
    container.innerHTML = '<div class="empty-state">No pinned tabs yet</div>';
    return;
  }

  // Render folders first
  folders.forEach(folder => {
    const folderElement = createFolderElement(folder, pinnedTabs);
    container.appendChild(folderElement);
  });

  // Render pinned tabs not in any folder (root level)
  const rootTabs = pinnedTabs.filter(pt => !pt.folderId);
  rootTabs.forEach(pinnedTab => {
    const tabItem = createTabItem(pinnedTab, 'pinned', pinnedTab.id);
    container.appendChild(tabItem);
  });

  // Show empty state if only folders exist but no root tabs
  if (rootTabs.length === 0 && folders.length === 0) {
    container.innerHTML = '<div class="empty-state">No pinned tabs yet</div>';
  }
}

// Create folder element
function createFolderElement(folder, pinnedTabs) {
  const isCollapsed = collapsedFolders.has(folder.id);
  const tabsInFolder = pinnedTabs.filter(pt => pt.folderId === folder.id);
  
  const folderItem = document.createElement('div');
  folderItem.className = `folder-item ${isCollapsed ? 'collapsed' : ''}`;
  folderItem.dataset.folderId = folder.id;

  // Folder header
  const folderHeader = document.createElement('div');
  folderHeader.className = 'folder-header';
  
  const folderIcon = document.createElement('span');
  folderIcon.className = 'folder-icon';
  folderIcon.textContent = '▼';
  
  const folderName = document.createElement('span');
  folderName.className = 'folder-name';
  folderName.textContent = folder.name;
  
  const folderCount = document.createElement('span');
  folderCount.className = 'folder-count';
  folderCount.textContent = `(${tabsInFolder.length})`;
  
  folderHeader.appendChild(folderIcon);
  folderHeader.appendChild(folderName);
  folderHeader.appendChild(folderCount);
  
  // Click to toggle
  folderHeader.addEventListener('click', () => {
    toggleFolder(folder.id);
  });
  
  // Right-click for context menu
  folderHeader.addEventListener('contextmenu', (e) => {
    showFolderContextMenu(e, folder.id);
  });
  
  // Folder drop handlers
  folderHeader.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    folderHeader.classList.add('drag-over');
  });
  
  folderHeader.addEventListener('dragleave', (e) => {
    // Only remove if we're leaving to an element outside this folder header
    if (!folderHeader.contains(e.relatedTarget)) {
      folderHeader.classList.remove('drag-over');
    }
  });
  
  folderHeader.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    folderHeader.classList.remove('drag-over');
    if (draggedData) {
      await handleDropOnFolder(draggedData, folder.id);
    }
  });
  
  folderItem.appendChild(folderHeader);

  // Folder contents
  const folderContents = document.createElement('div');
  folderContents.className = 'folder-contents';
  
  // Folder contents drop zone
  folderContents.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    folderContents.classList.add('drag-over');
  });
  
  folderContents.addEventListener('dragleave', (e) => {
    if (!folderContents.contains(e.relatedTarget)) {
      folderContents.classList.remove('drag-over');
    }
  });
  
  folderContents.addEventListener('drop', async (e) => {
    e.preventDefault();
    folderContents.classList.remove('drag-over');
    if (draggedData) {
      await handleDropOnFolder(draggedData, folder.id);
    }
  });
  
  tabsInFolder.forEach(pinnedTab => {
    const tabItem = createTabItem(pinnedTab, 'pinned', pinnedTab.id);
    folderContents.appendChild(tabItem);
  });
  
  folderItem.appendChild(folderContents);
  
  return folderItem;
}

// Render normal tabs - shows all Chrome tabs that aren't pinned or favorites
function renderNormalTabs() {
  const container = document.getElementById('normal-tabs-list');
  container.innerHTML = '';

  // Build a set of chromeTabIds that are linked to pinned tabs or favorites
  const linkedTabIds = new Set();
  
  // Add chromeTabIds from all pinned tabs (across all workspaces)
  Object.values(workspaces).forEach(ws => {
    (ws.pinnedTabs || []).forEach(pt => {
      if (pt.chromeTabId) {
        linkedTabIds.add(pt.chromeTabId);
      }
    });
  });
  
  // Add chromeTabIds from favorites
  favorites.forEach(f => {
    if (f.chromeTabId) {
      linkedTabIds.add(f.chromeTabId);
    }
  });
  
  // Filter to get only tabs that aren't linked to pinned/favorites
  const normalTabs = allChromeTabs.filter(tab => {
    return !linkedTabIds.has(tab.id);
  });

  if (normalTabs.length === 0) {
    container.innerHTML = '<div class="empty-state">No other tabs</div>';
    return;
  }

  normalTabs.forEach(tab => {
    const tabItem = createChromeTabItem(tab);
    container.appendChild(tabItem);
  });
}

// Create tab item element
function createTabItem(item, type, itemId) {
  const isOpen = item.chromeTabId !== null && item.chromeTabId !== undefined;
  const isActive = activeTabId === item.chromeTabId;

  console.log('[CREATE TAB ITEM] Creating tab item:', { 
    title: item.title, 
    type, 
    itemId, 
    isOpen, 
    chromeTabId: item.chromeTabId,
    savedUrl: item.savedUrl 
  });

  const tabItem = document.createElement('div');
  tabItem.className = `tab-item ${isActive ? 'active' : ''} ${type}`;
  tabItem.dataset.itemId = itemId;
  tabItem.dataset.type = type;

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = item.favicon || DEFAULT_FAVICON;
  favicon.alt = '';
  favicon.onerror = function() {
    this.src = DEFAULT_FAVICON;
  };

  // Title
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = item.title || 'Untitled';
  title.title = item.title || 'Untitled';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = `tab-close-btn ${isOpen ? 'close-icon' : 'remove-icon'}`;
  closeBtn.title = isOpen ? 'Close tab' : 'Remove';
  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (isOpen) {
      await closeTab(item.chromeTabId);
    } else {
      await removeTab(itemId, type);
    }
  });

  tabItem.appendChild(favicon);
  tabItem.appendChild(title);
  tabItem.appendChild(closeBtn);

  // Make draggable
  tabItem.draggable = true;
  
  // Drag handlers
  tabItem.addEventListener('dragstart', (e) => {
    draggedItem = tabItem;
    draggedType = type;
    draggedData = { itemId, item, type };
    tabItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  });
  
  tabItem.addEventListener('dragend', () => {
    tabItem.classList.remove('dragging');
    draggedItem = null;
    draggedType = null;
    draggedData = null;
    clearAllDragOverStates();
  });
  
  tabItem.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  
  tabItem.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (draggedItem !== tabItem) {
      tabItem.classList.add('drag-over');
    }
  });
  
  tabItem.addEventListener('dragleave', (e) => {
    // Only remove if we're leaving to an element outside this tab item
    if (!tabItem.contains(e.relatedTarget)) {
      tabItem.classList.remove('drag-over');
    }
  });
  
  tabItem.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    tabItem.classList.remove('drag-over');
    if (draggedData && draggedItem !== tabItem) {
      const dataToProcess = draggedData;
      draggedData = null;
      await handleTabDrop(dataToProcess, type, itemId, item.folderId);
    }
  });

  // Click handler
  tabItem.addEventListener('click', async (e) => {
    console.log('[TAB CLICK] Event triggered', { 
      target: e.target.className, 
      type, 
      itemId,
      isCloseBtn: e.target === closeBtn 
    });
    if (e.target === closeBtn) {
      console.log('[TAB CLICK] Clicked on close button, ignoring');
      return;
    }
    console.log('[TAB CLICK] Calling handleTabClick with item:', item);
    await handleTabClick(item, type, itemId);
  });

  // Right-click handler for context menu
  tabItem.addEventListener('contextmenu', (e) => {
    showContextMenu(e, { itemId, chromeTabId: item.chromeTabId }, type);
  });

  return tabItem;
}

// Create Chrome tab item element
function createChromeTabItem(tab) {
  const isActive = activeTabId === tab.id;

  const tabItem = document.createElement('div');
  tabItem.className = `tab-item ${isActive ? 'active' : ''}`;
  tabItem.dataset.tabId = tab.id;

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = getSafeFavicon(tab.url, tab.favIconUrl);
  favicon.alt = '';
  favicon.onerror = function() {
    this.src = DEFAULT_FAVICON;
  };

  // Title
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';
  title.title = tab.title || 'Untitled';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close-btn close-icon';
  closeBtn.title = 'Close tab';
  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await chrome.tabs.remove(tab.id);
  });

  tabItem.appendChild(favicon);
  tabItem.appendChild(title);
  tabItem.appendChild(closeBtn);

  // Make draggable
  tabItem.draggable = true;
  
  // Drag handlers
  tabItem.addEventListener('dragstart', (e) => {
    draggedItem = tabItem;
    draggedType = 'normal';
    draggedData = { tabId: tab.id, tab, type: 'normal' };
    tabItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id.toString());
  });
  
  tabItem.addEventListener('dragend', () => {
    tabItem.classList.remove('dragging');
    draggedItem = null;
    draggedType = null;
    draggedData = null;
    clearAllDragOverStates();
  });

  // Click handler
  tabItem.addEventListener('click', async (e) => {
    if (e.target === closeBtn) return;
    await chrome.tabs.update(tab.id, { active: true });
  });

  // Right-click handler for context menu
  tabItem.addEventListener('contextmenu', (e) => {
    showContextMenu(e, { tabId: tab.id }, 'normal');
  });

  return tabItem;
}

// Handle tab click
async function handleTabClick(item, type, itemId) {
  console.log('[HANDLE TAB CLICK] Called with:', { 
    item, 
    type, 
    itemId,
    chromeTabId: item.chromeTabId,
    savedUrl: item.savedUrl 
  });
  
  try {
    let tabExists = false;
    
    // Check if tab actually exists
    if (item.chromeTabId && item.chromeTabId !== null) {
      try {
        const existingTab = await chrome.tabs.get(item.chromeTabId);
        tabExists = !!existingTab;
        console.log('[HANDLE TAB CLICK] Tab exists check:', tabExists);
      } catch (e) {
        // Tab doesn't exist
        console.log('[HANDLE TAB CLICK] Tab no longer exists, will open new one');
        tabExists = false;
        
        // Clear the stale chromeTabId
        item.chromeTabId = null;
        await updateItemChromeTabId(item, type, itemId, null);
      }
    }
    
    if (tabExists) {
      // Tab is open, activate it
      console.log('[HANDLE TAB CLICK] Tab is open, activating chromeTabId:', item.chromeTabId);
      await chrome.tabs.update(item.chromeTabId, { active: true });
      console.log('[HANDLE TAB CLICK] Tab activated successfully');
    } else {
      // Tab is closed, open it with savedUrl
      console.log('[HANDLE TAB CLICK] Tab is closed, opening savedUrl:', item.savedUrl);
      const newTab = await chrome.tabs.create({ url: item.savedUrl });
      console.log('[HANDLE TAB CLICK] New tab created:', newTab.id);
      
      // Update item's chromeTabId
      item.chromeTabId = newTab.id;

      // Update storage
      if (type === 'favorite') {
        const index = favorites.findIndex(f => f.id === itemId);
        if (index !== -1) {
          favorites[index] = item;
          await chrome.storage.local.set({ favorites });
        }
      } else if (type === 'pinned') {
        const workspace = workspaces[currentWorkspace];
        if (workspace) {
          const index = workspace.pinnedTabs.findIndex(pt => pt.id === itemId);
          if (index !== -1) {
            workspace.pinnedTabs[index] = item;
            workspaces[currentWorkspace] = workspace;
            await chrome.storage.local.set({ workspaces });
          }
        }
      }

      // Update tab mapping
      tabMapping[newTab.id] = {
        pinnedTabId: type === 'pinned' ? itemId : null,
        favoriteId: type === 'favorite' ? itemId : null,
        workspaceId: type === 'pinned' ? currentWorkspace : null
      };
      await chrome.storage.local.set({ tabMapping });

      // Notify background script
      chrome.runtime.sendMessage({
        type: 'updateTabMapping',
        pinnedTabId: type === 'pinned' ? itemId : null,
        favoriteId: type === 'favorite' ? itemId : null,
        chromeTabId: newTab.id
      });

      // Update active tab
      activeTabId = newTab.id;
      renderUI();
    }
  } catch (error) {
    console.error('[HANDLE TAB CLICK] Error:', error);
    console.error('[HANDLE TAB CLICK] Error details:', error.message, error.stack);
  }
}

// Helper to update chromeTabId in storage
async function updateItemChromeTabId(item, type, itemId, newChromeTabId) {
  try {
    if (type === 'favorite') {
      const index = favorites.findIndex(f => f.id === itemId);
      if (index !== -1) {
        favorites[index].chromeTabId = newChromeTabId;
        await chrome.storage.local.set({ favorites });
      }
    } else if (type === 'pinned') {
      const workspace = workspaces[currentWorkspace];
      if (workspace) {
        const index = workspace.pinnedTabs.findIndex(pt => pt.id === itemId);
        if (index !== -1) {
          workspace.pinnedTabs[index].chromeTabId = newChromeTabId;
          workspaces[currentWorkspace] = workspace;
          await chrome.storage.local.set({ workspaces });
        }
      }
    }
    
    // Update tab mapping
    if (newChromeTabId) {
      tabMapping[newChromeTabId] = {
        pinnedTabId: type === 'pinned' ? itemId : null,
        favoriteId: type === 'favorite' ? itemId : null,
        workspaceId: type === 'pinned' ? currentWorkspace : null
      };
    }
    await chrome.storage.local.set({ tabMapping });
  } catch (error) {
    console.error('Error updating chromeTabId:', error);
  }
}

// Close tab
async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error('Error closing tab:', error);
  }
}

// Remove pinned tab or favorite
async function removeTab(itemId, type) {
  try {
    if (type === 'favorite') {
      // Get chromeTabId before removing
      const favorite = favorites.find(f => f.id === itemId);
      if (favorite && favorite.chromeTabId) {
        delete tabMapping[favorite.chromeTabId];
      }
      
      favorites = favorites.filter(f => f.id !== itemId);
      await chrome.storage.local.set({ favorites, tabMapping });
    } else if (type === 'pinned') {
      const workspace = workspaces[currentWorkspace];
      if (workspace) {
        // Get chromeTabId before removing
        const pinnedTab = workspace.pinnedTabs.find(pt => pt.id === itemId);
        if (pinnedTab && pinnedTab.chromeTabId) {
          delete tabMapping[pinnedTab.chromeTabId];
        }
        
        workspace.pinnedTabs = workspace.pinnedTabs.filter(pt => pt.id !== itemId);
        workspaces[currentWorkspace] = workspace;
        await chrome.storage.local.set({ workspaces, tabMapping });
      }
    }
    renderUI();
  } catch (error) {
    console.error('Error removing tab:', error);
  }
}

// Create workspace
async function createWorkspace(name) {
  try {
    const workspaceId = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workspace = {
      id: workspaceId,
      name: name,
      pinnedTabs: [],
      normalTabs: [],
      folders: []
    };

    workspaces[workspaceId] = workspace;
    await chrome.storage.local.set({ workspaces });

    // Update context menus
    chrome.runtime.sendMessage({ type: 'workspaceCreated' });

    // Select new workspace
    currentWorkspace = workspaceId;
    await chrome.storage.local.set({ currentWorkspace });

    renderUI();
  } catch (error) {
    console.error('Error creating workspace:', error);
  }
}

// Show add workspace modal
function showAddWorkspaceModal() {
  const modal = document.getElementById('workspace-modal');
  const modalTitle = document.getElementById('modal-title');
  const workspaceNameInput = document.getElementById('workspace-name-input');
  
  modalTitle.textContent = 'Add Workspace';
  workspaceNameInput.value = '';
  modal.classList.remove('hidden');
  workspaceNameInput.focus();
}

// ========== FOLDER FUNCTIONS ==========

// Show folder modal
function showFolderModal(mode, folderId = null) {
  const modal = document.getElementById('folder-modal');
  const modalTitle = document.getElementById('folder-modal-title');
  const folderNameInput = document.getElementById('folder-name-input');
  const confirmBtn = document.getElementById('folder-modal-confirm-btn');
  
  folderModalMode = mode;
  folderToEdit = folderId;
  
  if (mode === 'create') {
    modalTitle.textContent = 'New Folder';
    confirmBtn.textContent = 'Create';
    folderNameInput.value = '';
  } else if (mode === 'rename') {
    modalTitle.textContent = 'Rename Folder';
    confirmBtn.textContent = 'Rename';
    const workspace = workspaces[currentWorkspace];
    const folder = workspace?.folders.find(f => f.id === folderId);
    folderNameInput.value = folder?.name || '';
  }
  
  modal.classList.remove('hidden');
  folderNameInput.focus();
}

// Create folder
async function createFolder(name) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) {
    alert('Please select a workspace first');
    return;
  }
  
  const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const folder = {
    id: folderId,
    name: name,
    tabs: [] // Pinned tab IDs in this folder
  };
  
  const workspace = workspaces[currentWorkspace];
  if (!workspace.folders) {
    workspace.folders = [];
  }
  workspace.folders.push(folder);
  
  // Start new folders collapsed
  collapsedFolders.add(folderId);
  
  await chrome.storage.local.set({ workspaces });
  renderUI();
}

// Rename folder
async function renameFolder(folderId, newName) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) return;
  
  const workspace = workspaces[currentWorkspace];
  const folder = workspace.folders.find(f => f.id === folderId);
  if (folder) {
    folder.name = newName;
    await chrome.storage.local.set({ workspaces });
    renderUI();
  }
}

// Delete folder
async function deleteFolder(folderId) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) return;
  
  const workspace = workspaces[currentWorkspace];
  const folder = workspace.folders.find(f => f.id === folderId);
  
  if (folder) {
    // Move tabs from folder back to root
    // (they stay in pinnedTabs, just remove folder reference)
    workspace.pinnedTabs.forEach(pt => {
      if (pt.folderId === folderId) {
        pt.folderId = null;
      }
    });
    
    // Remove folder
    workspace.folders = workspace.folders.filter(f => f.id !== folderId);
    
    await chrome.storage.local.set({ workspaces });
    renderUI();
  }
}

// Move tab to folder
async function moveTabToFolder(itemId, type, folderId) {
  if (type !== 'pinned') return;
  if (!currentWorkspace || !workspaces[currentWorkspace]) return;
  
  const workspace = workspaces[currentWorkspace];
  const pinnedTab = workspace.pinnedTabs.find(pt => pt.id === itemId);
  
  if (pinnedTab) {
    pinnedTab.folderId = folderId || null;
    await chrome.storage.local.set({ workspaces });
    renderUI();
  }
}

// Reorder pinned tab - move source to position of target
async function reorderPinnedTab(sourceItemId, targetItemId, targetFolderId) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) return;
  
  const workspace = workspaces[currentWorkspace];
  const pinnedTabs = workspace.pinnedTabs;
  
  // Find source and target indices
  const sourceIndex = pinnedTabs.findIndex(pt => pt.id === sourceItemId);
  const targetIndex = pinnedTabs.findIndex(pt => pt.id === targetItemId);
  
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return;
  }
  
  // Remove source item
  const [sourceItem] = pinnedTabs.splice(sourceIndex, 1);
  
  // Update folder if target has a different folder
  if (targetFolderId !== undefined) {
    sourceItem.folderId = targetFolderId || null;
  }
  
  // Calculate new target index (may have shifted after removal)
  const newTargetIndex = pinnedTabs.findIndex(pt => pt.id === targetItemId);
  
  // Insert after target (or at target position if target was removed scenario)
  if (newTargetIndex !== -1) {
    // Insert after the target item
    pinnedTabs.splice(newTargetIndex + 1, 0, sourceItem);
  } else {
    // Target was the source, just append
    pinnedTabs.push(sourceItem);
  }
  
  workspace.pinnedTabs = pinnedTabs;
  await chrome.storage.local.set({ workspaces });
}

// Reorder favorite - move source to position of target
async function reorderFavorite(sourceItemId, targetItemId) {
  // Find source and target indices
  const sourceIndex = favorites.findIndex(f => f.id === sourceItemId);
  const targetIndex = favorites.findIndex(f => f.id === targetItemId);
  
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return;
  }
  
  // Remove source item
  const [sourceItem] = favorites.splice(sourceIndex, 1);
  
  // Calculate new target index (may have shifted after removal)
  const newTargetIndex = favorites.findIndex(f => f.id === targetItemId);
  
  // Insert after target
  if (newTargetIndex !== -1) {
    favorites.splice(newTargetIndex + 1, 0, sourceItem);
  } else {
    favorites.push(sourceItem);
  }
  
  await chrome.storage.local.set({ favorites });
}

// Show move to folder modal
function showMoveToFolderModal(itemId, type) {
  if (type !== 'pinned') {
    alert('Only pinned tabs can be moved to folders');
    return;
  }
  
  const modal = document.getElementById('move-folder-modal');
  const folderSelect = document.getElementById('folder-select');
  
  tabToMove = { itemId, type };
  
  // Populate folder select
  folderSelect.innerHTML = '<option value="">No Folder (Root)</option>';
  
  const workspace = workspaces[currentWorkspace];
  if (workspace && workspace.folders) {
    workspace.folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.name;
      folderSelect.appendChild(option);
    });
  }
  
  // Select current folder
  const pinnedTab = workspace?.pinnedTabs.find(pt => pt.id === itemId);
  if (pinnedTab && pinnedTab.folderId) {
    folderSelect.value = pinnedTab.folderId;
  }
  
  modal.classList.remove('hidden');
}

// Toggle folder collapsed state
function toggleFolder(folderId) {
  if (collapsedFolders.has(folderId)) {
    collapsedFolders.delete(folderId);
  } else {
    collapsedFolders.add(folderId);
  }
  renderUI();
}

// Show folder context menu
let folderContextMenuTarget = null;

function showFolderContextMenu(e, folderId) {
  e.preventDefault();
  e.stopPropagation();
  
  const contextMenu = document.getElementById('folder-context-menu');
  folderContextMenuTarget = folderId;
  
  const x = e.clientX;
  const y = e.clientY;
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  
  // Hide other context menus
  document.getElementById('tab-context-menu').classList.add('hidden');
}

function hideFolderContextMenu() {
  const contextMenu = document.getElementById('folder-context-menu');
  contextMenu.classList.add('hidden');
  folderContextMenuTarget = null;
}

// Handle folder context menu action
async function handleFolderContextMenuAction(action) {
  if (!folderContextMenuTarget) return;
  
  switch (action) {
    case 'rename-folder':
      showFolderModal('rename', folderContextMenuTarget);
      break;
    case 'delete-folder':
      if (confirm('Delete this folder? Tabs will be moved to root.')) {
        await deleteFolder(folderContextMenuTarget);
      }
      break;
  }
}

// ========== DRAG AND DROP FUNCTIONS ==========

// Setup drop zone for a container
function setupDropZone(container, targetType) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.classList.add('drag-over');
  });
  
  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
    }
  });
  
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
    if (draggedData) {
      const dataToProcess = draggedData;
      draggedData = null;
      await handleDropOnSection(dataToProcess, targetType);
    }
  });
}

// Clear all drag-over states
function clearAllDragOverStates() {
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

// Handle dropping a tab on a section (favorites or pinned)
async function handleDropOnSection(data, targetType) {
  const sourceType = data.type;
  
  // Normal tab dropped on favorites
  if (sourceType === 'normal' && targetType === 'favorite') {
    await convertNormalToFavorite(data.tab);
    renderUI();
    return;
  }
  
  // Normal tab dropped on pinned
  if (sourceType === 'normal' && targetType === 'pinned') {
    await convertNormalToPinned(data.tab);
    renderUI();
    return;
  }
  
  // Pinned tab dropped on favorites
  if (sourceType === 'pinned' && targetType === 'favorite') {
    await convertPinnedToFavorite(data.itemId);
    renderUI();
    return;
  }
  
  // Favorite dropped on pinned
  if (sourceType === 'favorite' && targetType === 'pinned') {
    await convertFavoriteToPinned(data.itemId);
    renderUI();
    return;
  }
  
  // Pinned tab dropped on pinned (remove from folder)
  if (sourceType === 'pinned' && targetType === 'pinned') {
    await moveTabToFolder(data.itemId, 'pinned', null);
    renderUI();
    return;
  }
}

// Handle dropping a tab on a folder
async function handleDropOnFolder(data, folderId) {
  const sourceType = data.type;
  
  // Normal tab dropped on folder - pin it first, then add to folder
  if (sourceType === 'normal') {
    const newPinnedTab = await convertNormalToPinned(data.tab);
    if (newPinnedTab) {
      await moveTabToFolder(newPinnedTab.id, 'pinned', folderId);
    }
    renderUI();
    return;
  }
  
  // Pinned tab dropped on folder
  if (sourceType === 'pinned') {
    await moveTabToFolder(data.itemId, 'pinned', folderId);
    renderUI();
    return;
  }
  
  // Favorite dropped on folder - convert to pinned, then add to folder
  if (sourceType === 'favorite') {
    const newPinnedTab = await convertFavoriteToPinned(data.itemId);
    if (newPinnedTab) {
      await moveTabToFolder(newPinnedTab.id, 'pinned', folderId);
    }
    renderUI();
    return;
  }
}

// Handle dropping on another tab (reordering)
async function handleTabDrop(data, targetType, targetItemId, targetFolderId) {
  const sourceType = data.type;
  
  // If dropping pinned on pinned, reorder and/or move to folder
  if (sourceType === 'pinned' && targetType === 'pinned') {
    await reorderPinnedTab(data.itemId, targetItemId, targetFolderId);
    renderUI();
    return;
  }
  
  // If dropping favorite on favorite, reorder
  if (sourceType === 'favorite' && targetType === 'favorite') {
    await reorderFavorite(data.itemId, targetItemId);
    renderUI();
    return;
  }
  
  // If dropping normal on pinned/favorite tab
  if (sourceType === 'normal') {
    if (targetType === 'pinned') {
      const newPinnedTab = await convertNormalToPinned(data.tab);
      if (newPinnedTab && targetFolderId) {
        await moveTabToFolder(newPinnedTab.id, 'pinned', targetFolderId);
      }
    } else if (targetType === 'favorite') {
      await convertNormalToFavorite(data.tab);
    }
    renderUI();
    return;
  }
  
  // Cross-section drops
  if (sourceType === 'pinned' && targetType === 'favorite') {
    await convertPinnedToFavorite(data.itemId);
    renderUI();
    return;
  }
  
  if (sourceType === 'favorite' && targetType === 'pinned') {
    const newPinnedTab = await convertFavoriteToPinned(data.itemId);
    if (newPinnedTab && targetFolderId) {
      await moveTabToFolder(newPinnedTab.id, 'pinned', targetFolderId);
    }
    renderUI();
    return;
  }
}

// Convert normal Chrome tab to favorite
async function convertNormalToFavorite(tab) {
  const favorite = {
    id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    savedUrl: tab.url || '',
    favicon: getSafeFavicon(tab.url, tab.favIconUrl),
    createdAt: Date.now(),
    chromeTabId: tab.id
  };
  
  favorites.push(favorite);
  
  // Update tab mapping
  tabMapping[tab.id] = {
    pinnedTabId: null,
    favoriteId: favorite.id,
    workspaceId: null
  };
  
  await chrome.storage.local.set({ favorites, tabMapping });
  return favorite;
}

// Convert normal Chrome tab to pinned tab
async function convertNormalToPinned(tab) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) {
    alert('Please select a workspace first');
    return null;
  }
  
  // Check if tab is already pinned to prevent duplicates
  const workspace = workspaces[currentWorkspace];
  if (!workspace.pinnedTabs) {
    workspace.pinnedTabs = [];
  }
  
  // Check by chromeTabId to catch duplicates
  const alreadyPinned = workspace.pinnedTabs.some(pt => pt.chromeTabId === tab.id);
  if (alreadyPinned) {
    return null;
  }
  
  const pinnedTab = {
    id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    savedUrl: tab.url || '',
    favicon: getSafeFavicon(tab.url, tab.favIconUrl),
    createdAt: Date.now(),
    chromeTabId: tab.id,
    folderId: null
  };
  
  workspace.pinnedTabs.push(pinnedTab);
  
  // Update tab mapping
  tabMapping[tab.id] = {
    pinnedTabId: pinnedTab.id,
    favoriteId: null,
    workspaceId: currentWorkspace
  };
  await chrome.storage.local.set({ workspaces, tabMapping });
  return pinnedTab;
}

// Convert pinned tab to favorite
async function convertPinnedToFavorite(pinnedTabId) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) return null;
  
  const workspace = workspaces[currentWorkspace];
  const pinnedTabIndex = workspace.pinnedTabs.findIndex(pt => pt.id === pinnedTabId);
  if (pinnedTabIndex === -1) return null;
  
  const pinnedTab = workspace.pinnedTabs[pinnedTabIndex];
  
  // Create favorite
  const favorite = {
    id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: pinnedTab.title,
    url: pinnedTab.url,
    savedUrl: pinnedTab.savedUrl,
    favicon: pinnedTab.favicon,
    createdAt: Date.now(),
    chromeTabId: pinnedTab.chromeTabId
  };
  
  favorites.push(favorite);
  
  // Remove from pinned
  workspace.pinnedTabs.splice(pinnedTabIndex, 1);
  
  // Update tab mapping
  if (pinnedTab.chromeTabId) {
    tabMapping[pinnedTab.chromeTabId] = {
      pinnedTabId: null,
      favoriteId: favorite.id,
      workspaceId: null
    };
  }
  
  await chrome.storage.local.set({ workspaces, favorites, tabMapping });
  return favorite;
}

// Convert favorite to pinned tab
async function convertFavoriteToPinned(favoriteId) {
  if (!currentWorkspace || !workspaces[currentWorkspace]) {
    alert('Please select a workspace first');
    return null;
  }
  
  const favoriteIndex = favorites.findIndex(f => f.id === favoriteId);
  if (favoriteIndex === -1) return null;
  
  const favorite = favorites[favoriteIndex];
  
  // Create pinned tab
  const pinnedTab = {
    id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: favorite.title,
    url: favorite.url,
    savedUrl: favorite.savedUrl,
    favicon: favorite.favicon,
    createdAt: Date.now(),
    chromeTabId: favorite.chromeTabId,
    folderId: null
  };
  
  const workspace = workspaces[currentWorkspace];
  if (!workspace.pinnedTabs) {
    workspace.pinnedTabs = [];
  }
  workspace.pinnedTabs.push(pinnedTab);
  
  // Remove from favorites
  favorites.splice(favoriteIndex, 1);
  
  // Update tab mapping
  if (favorite.chromeTabId) {
    tabMapping[favorite.chromeTabId] = {
      pinnedTabId: pinnedTab.id,
      favoriteId: null,
      workspaceId: currentWorkspace
    };
  }
  
  await chrome.storage.local.set({ workspaces, favorites, tabMapping });
  return pinnedTab;
}

// ========== IMPORT FUNCTIONS ==========

// Setup import event listeners
function setupImportListeners() {
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');
  const importModal = document.getElementById('import-modal');
  const importCancelBtn = document.getElementById('import-modal-cancel-btn');
  const importConfirmBtn = document.getElementById('import-modal-confirm-btn');
  const importOptions = document.querySelectorAll('input[name="import-target"]');

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      parsedBookmarks = parseNetscapeBookmarks(content);
      selectedImportFolders = new Set(parsedBookmarks.workspaces.map((_, i) => i));
      renderImportFolderSelection(parsedBookmarks);
      updateImportPreview();
      importModal.classList.remove('hidden');
    } catch (error) {
      console.error('Error reading bookmark file:', error);
      alert('Error reading bookmark file. Please make sure it is a valid HTML bookmark file.');
    }

    // Reset file input
    importFileInput.value = '';
  });

  importCancelBtn.addEventListener('click', () => {
    importModal.classList.add('hidden');
    parsedBookmarks = null;
    selectedImportFolders.clear();
  });

  importModal.addEventListener('click', (e) => {
    if (e.target === importModal) {
      importModal.classList.add('hidden');
      parsedBookmarks = null;
      selectedImportFolders.clear();
    }
  });

  importConfirmBtn.addEventListener('click', async () => {
    if (!parsedBookmarks) return;
    
    if (selectedImportFolders.size === 0) {
      alert('Please select at least one folder to import.');
      return;
    }

    const importTarget = document.querySelector('input[name="import-target"]:checked').value;
    await importBookmarks(parsedBookmarks, importTarget);

    importModal.classList.add('hidden');
    parsedBookmarks = null;
    selectedImportFolders.clear();
    renderUI();
  });

  // Update preview when import target changes
  importOptions.forEach(option => {
    option.addEventListener('change', () => {
      if (parsedBookmarks) {
        updateImportPreview();
      }
    });
  });
}

// Render folder selection checkboxes
function renderImportFolderSelection(bookmarks) {
  const container = document.getElementById('import-folder-selection');
  container.innerHTML = '';

  if (bookmarks.workspaces.length === 0) {
    container.innerHTML = '<div class="empty-state">No folders found in bookmark file</div>';
    return;
  }

  // Select All option
  const selectAllDiv = document.createElement('div');
  selectAllDiv.className = 'import-select-all';
  selectAllDiv.innerHTML = `
    <input type="checkbox" id="import-select-all" ${selectedImportFolders.size === bookmarks.workspaces.length ? 'checked' : ''}>
    <label for="import-select-all">Select All / Deselect All</label>
  `;
  selectAllDiv.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const checkbox = selectAllDiv.querySelector('input');
    checkbox.checked = !checkbox.checked;
    toggleSelectAllFolders(checkbox.checked, bookmarks);
  });
  selectAllDiv.querySelector('input').addEventListener('change', (e) => {
    toggleSelectAllFolders(e.target.checked, bookmarks);
  });
  container.appendChild(selectAllDiv);

  // Individual folder items
  bookmarks.workspaces.forEach((ws, index) => {
    const folderItem = document.createElement('div');
    folderItem.className = 'import-folder-item';
    
    const tabCount = countTabsInWorkspace(ws);
    const folderCount = ws.folders.length;

    folderItem.innerHTML = `
      <input type="checkbox" id="import-folder-${index}" ${selectedImportFolders.has(index) ? 'checked' : ''}>
      <div class="import-folder-item-content">
        <div class="import-folder-item-name">📁 ${ws.name}</div>
        <div class="import-folder-item-stats">${folderCount} folder${folderCount !== 1 ? 's' : ''}, ${tabCount} tab${tabCount !== 1 ? 's' : ''}</div>
      </div>
    `;

    folderItem.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = folderItem.querySelector('input');
      checkbox.checked = !checkbox.checked;
      toggleFolderSelection(index, checkbox.checked, bookmarks);
    });

    folderItem.querySelector('input').addEventListener('change', (e) => {
      toggleFolderSelection(index, e.target.checked, bookmarks);
    });

    container.appendChild(folderItem);
  });
}

// Toggle select all folders
function toggleSelectAllFolders(selectAll, bookmarks) {
  if (selectAll) {
    bookmarks.workspaces.forEach((_, i) => selectedImportFolders.add(i));
  } else {
    selectedImportFolders.clear();
  }
  renderImportFolderSelection(bookmarks);
  updateImportPreview();
}

// Toggle individual folder selection
function toggleFolderSelection(index, selected, bookmarks) {
  if (selected) {
    selectedImportFolders.add(index);
  } else {
    selectedImportFolders.delete(index);
  }
  renderImportFolderSelection(bookmarks);
  updateImportPreview();
}

// Count total tabs in a workspace
function countTabsInWorkspace(ws) {
  let count = ws.tabs.length;
  ws.folders.forEach(f => count += f.tabs.length);
  return count;
}

// Update import preview
function updateImportPreview() {
  if (!parsedBookmarks) return;
  showImportPreview(parsedBookmarks);
}

// Parse Netscape bookmark HTML format
function parseNetscapeBookmarks(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const result = {
    workspaces: [],
    totalTabs: 0,
    totalFolders: 0
  };

  // Find the main DL element (bookmark list)
  const mainDL = doc.querySelector('body > dl') || doc.querySelector('dl');
  if (!mainDL) {
    console.error('No bookmark list found in file');
    return result;
  }

  // Parse top-level items (these become workspaces)
  const topLevelItems = mainDL.children;
  
  for (const item of topLevelItems) {
    if (item.tagName === 'DT') {
      const h3 = item.querySelector(':scope > h3');
      const dl = item.querySelector(':scope > dl');
      
      if (h3 && dl) {
        // This is a folder - it becomes a workspace
        const workspace = {
          name: h3.textContent.trim(),
          folders: [],
          tabs: []
        };
        
        parseBookmarkFolder(dl, workspace.folders, workspace.tabs, result);
        result.workspaces.push(workspace);
      } else {
        // Top-level bookmark (will go into "Imported" workspace)
        const anchor = item.querySelector(':scope > a');
        if (anchor) {
          // Create an "Imported" workspace if needed
          let importedWs = result.workspaces.find(w => w.name === 'Imported');
          if (!importedWs) {
            importedWs = { name: 'Imported', folders: [], tabs: [] };
            result.workspaces.push(importedWs);
          }
          importedWs.tabs.push({
            title: anchor.textContent.trim(),
            url: anchor.getAttribute('href') || ''
          });
          result.totalTabs++;
        }
      }
    }
  }

  return result;
}

// Recursively parse bookmark folders
function parseBookmarkFolder(dl, folders, tabs, result) {
  const items = dl.children;
  
  for (const item of items) {
    if (item.tagName === 'DT') {
      const h3 = item.querySelector(':scope > h3');
      const innerDL = item.querySelector(':scope > dl');
      const anchor = item.querySelector(':scope > a');
      
      if (h3 && innerDL) {
        // This is a subfolder
        const folder = {
          name: h3.textContent.trim(),
          tabs: []
        };
        
        // Parse folder contents - only get direct tab children, nested folders become flat
        parseFolderContents(innerDL, folder.tabs, result);
        
        if (folder.tabs.length > 0) {
          folders.push(folder);
          result.totalFolders++;
        }
      } else if (anchor) {
        // This is a bookmark
        tabs.push({
          title: anchor.textContent.trim(),
          url: anchor.getAttribute('href') || ''
        });
        result.totalTabs++;
      }
    }
  }
}

// Parse folder contents (tabs and nested folders)
function parseFolderContents(dl, tabs, result) {
  const items = dl.children;
  
  for (const item of items) {
    if (item.tagName === 'DT') {
      const h3 = item.querySelector(':scope > h3');
      const innerDL = item.querySelector(':scope > dl');
      const anchor = item.querySelector(':scope > a');
      
      if (h3 && innerDL) {
        // Nested folder - add its contents as tabs (flatten)
        parseFolderContents(innerDL, tabs, result);
      } else if (anchor) {
        tabs.push({
          title: anchor.textContent.trim(),
          url: anchor.getAttribute('href') || ''
        });
        result.totalTabs++;
      }
    }
  }
}

// Show import preview
function showImportPreview(bookmarks) {
  const previewDiv = document.getElementById('import-preview');
  const previewContent = document.getElementById('import-preview-content');
  const importTarget = document.querySelector('input[name="import-target"]:checked').value;

  previewDiv.classList.remove('hidden');

  // Get only selected workspaces
  const selectedWorkspaces = bookmarks.workspaces.filter((_, i) => selectedImportFolders.has(i));
  
  if (selectedWorkspaces.length === 0) {
    previewContent.innerHTML = '<div class="import-preview-count" style="color: #ff6b6b;">No folders selected</div>';
    return;
  }

  // Count totals for selected
  let totalTabs = 0;
  let totalFolders = 0;
  selectedWorkspaces.forEach(ws => {
    totalTabs += countTabsInWorkspace(ws);
    totalFolders += ws.folders.length;
  });

  let html = '';

  if (importTarget === 'new-workspaces') {
    html += `<div class="import-preview-count">${selectedWorkspaces.length} workspace${selectedWorkspaces.length !== 1 ? 's' : ''}, ${totalFolders} folder${totalFolders !== 1 ? 's' : ''}, ${totalTabs} tab${totalTabs !== 1 ? 's' : ''}</div>`;
    
    selectedWorkspaces.forEach(ws => {
      html += `<div class="import-preview-workspace">`;
      html += `<div class="import-preview-workspace-name">📁 ${ws.name}</div>`;
      
      ws.folders.forEach(folder => {
        html += `<div class="import-preview-folder">📂 ${folder.name} (${folder.tabs.length})</div>`;
      });
      
      if (ws.tabs.length > 0) {
        html += `<div class="import-preview-folder">${ws.tabs.length} tab${ws.tabs.length !== 1 ? 's' : ''} at root</div>`;
      }
      html += `</div>`;
    });
  } else if (importTarget === 'current-workspace') {
    html += `<div class="import-preview-count">Will import ${totalFolders} folder${totalFolders !== 1 ? 's' : ''} and ${totalTabs} tab${totalTabs !== 1 ? 's' : ''} into current workspace</div>`;
    
    selectedWorkspaces.forEach(ws => {
      html += `<div class="import-preview-workspace">`;
      html += `<div class="import-preview-workspace-name">From "${ws.name}":</div>`;
      
      ws.folders.forEach(folder => {
        html += `<div class="import-preview-folder">📂 ${folder.name} (${folder.tabs.length})</div>`;
      });
      
      if (ws.tabs.length > 0) {
        html += `<div class="import-preview-folder">${ws.tabs.length} tab${ws.tabs.length !== 1 ? 's' : ''} at root</div>`;
      }
      html += `</div>`;
    });
    
    if (!currentWorkspace) {
      html += `<div style="color: #ff6b6b; margin-top: 8px;">⚠️ Please select a workspace first</div>`;
    }
  } else if (importTarget === 'favorites') {
    html += `<div class="import-preview-count">Will import ${totalTabs} tab${totalTabs !== 1 ? 's' : ''} as favorites (folders will be flattened)</div>`;
  }

  previewContent.innerHTML = html;
}

// Import bookmarks based on selected target
async function importBookmarks(bookmarks, target) {
  try {
    // Filter to only selected workspaces
    const selectedWorkspaces = bookmarks.workspaces.filter((_, i) => selectedImportFolders.has(i));
    
    if (selectedWorkspaces.length === 0) {
      alert('Please select at least one folder to import.');
      return;
    }

    if (target === 'new-workspaces') {
      await importAsWorkspaces(selectedWorkspaces);
    } else if (target === 'current-workspace') {
      if (!currentWorkspace || !workspaces[currentWorkspace]) {
        alert('Please select a workspace first');
        return;
      }
      await importToCurrentWorkspace(selectedWorkspaces);
    } else if (target === 'favorites') {
      await importAsFavorites(selectedWorkspaces);
    }

    await chrome.storage.local.set({ workspaces, favorites });
    
    // Notify background
    chrome.runtime.sendMessage({ type: 'workspaceCreated' });
    
  } catch (error) {
    console.error('Error importing bookmarks:', error);
    alert('Error importing bookmarks: ' + error.message);
  }
}

// Import as new workspaces
async function importAsWorkspaces(selectedWorkspaces) {
  let firstImportedWorkspaceId = null;
  
  for (const ws of selectedWorkspaces) {
    const workspaceId = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!firstImportedWorkspaceId) {
      firstImportedWorkspaceId = workspaceId;
    }
    
    const workspace = {
      id: workspaceId,
      name: ws.name,
      pinnedTabs: [],
      normalTabs: [],
      folders: []
    };

    // Create folders and their tabs (folder names stay as-is, not prefixed)
    for (const folder of ws.folders) {
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      workspace.folders.push({
        id: folderId,
        name: folder.name, // Just the folder name, not "WorkspaceName - FolderName"
        tabs: []
      });

      // Add tabs to folder
      for (const tab of folder.tabs) {
        const pinnedTab = createPinnedTabFromBookmark(tab, folderId);
        workspace.pinnedTabs.push(pinnedTab);
      }

      // Small delay to ensure unique IDs
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Add root-level tabs (tabs directly under the workspace, not in any folder)
    for (const tab of ws.tabs) {
      const pinnedTab = createPinnedTabFromBookmark(tab, null);
      workspace.pinnedTabs.push(pinnedTab);
    }

    workspaces[workspaceId] = workspace;

    // Small delay to ensure unique IDs
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  // Select first imported workspace if no current workspace
  if (!currentWorkspace && firstImportedWorkspaceId) {
    currentWorkspace = firstImportedWorkspaceId;
    await chrome.storage.local.set({ currentWorkspace });
  }
}

// Import to current workspace
async function importToCurrentWorkspace(selectedWorkspaces) {
  const workspace = workspaces[currentWorkspace];
  if (!workspace) return;

  // Ensure arrays exist
  if (!workspace.pinnedTabs) workspace.pinnedTabs = [];
  if (!workspace.folders) workspace.folders = [];

  for (const ws of selectedWorkspaces) {
    // Create folders from imported workspaces
    // Folder names stay as-is (not prefixed with workspace name)
    for (const folder of ws.folders) {
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      workspace.folders.push({
        id: folderId,
        name: folder.name, // Just the folder name
        tabs: []
      });

      // Add tabs to folder
      for (const tab of folder.tabs) {
        const pinnedTab = createPinnedTabFromBookmark(tab, folderId);
        workspace.pinnedTabs.push(pinnedTab);
      }

      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Add workspace root tabs directly to root (not in a folder)
    for (const tab of ws.tabs) {
      const pinnedTab = createPinnedTabFromBookmark(tab, null);
      workspace.pinnedTabs.push(pinnedTab);
    }
  }
}

// Import as favorites
async function importAsFavorites(selectedWorkspaces) {
  for (const ws of selectedWorkspaces) {
    // Add all tabs from folders
    for (const folder of ws.folders) {
      for (const tab of folder.tabs) {
        const favorite = createFavoriteFromBookmark(tab);
        favorites.push(favorite);
      }
    }

    // Add root tabs
    for (const tab of ws.tabs) {
      const favorite = createFavoriteFromBookmark(tab);
      favorites.push(favorite);
    }
  }
}

// Create pinned tab from bookmark data
function createPinnedTabFromBookmark(bookmark, folderId) {
  return {
    id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    savedUrl: bookmark.url || '',
    favicon: DEFAULT_FAVICON, // Will be updated when tab is opened
    createdAt: Date.now(),
    chromeTabId: null,
    folderId: folderId
  };
}

// Create favorite from bookmark data
function createFavoriteFromBookmark(bookmark) {
  return {
    id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    savedUrl: bookmark.url || '',
    favicon: DEFAULT_FAVICON, // Will be updated when tab is opened
    createdAt: Date.now(),
    chromeTabId: null
  };
}
