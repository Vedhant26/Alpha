// ============================================
// ALPHA — Chrome Extension Popup Logic
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const setupView = document.getElementById('setupView');
  const mainView = document.getElementById('mainView');
  const serverUrlInput = document.getElementById('serverUrl');
  const setupStatus = document.getElementById('setupStatus');
  const boardSelect = document.getElementById('boardSelect');
  const columnSelect = document.getElementById('columnSelect');
  
  let serverUrl = '';
  let boards = [];
  
  // 1. Load settings
  const result = await chrome.storage.local.get(['alphaServerUrl', 'lastBoardId', 'lastColumnId']);
  if (result.alphaServerUrl) {
    serverUrl = result.alphaServerUrl;
    serverUrlInput.value = serverUrl;
    await checkConnection();
  } else {
    setupView.classList.remove('hidden');
  }
  
  // 2. Setup connection
  document.getElementById('btnConnect').addEventListener('click', async () => {
    serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
    await checkConnection();
  });
  
  async function checkConnection() {
    setupStatus.textContent = 'Connecting...';
    setupStatus.style.display = 'block';
    setupStatus.className = 'status';
    
    try {
      const res = await fetch(`${serverUrl}/api/boards`);
      if (!res.ok) throw new Error('Bad response');
      
      boards = await res.json();
      
      await chrome.storage.local.set({ alphaServerUrl: serverUrl });
      setupView.classList.add('hidden');
      mainView.classList.remove('hidden');
      
      populateBoards();
      checkCurrentTab();
      
    } catch (err) {
      setupStatus.textContent = 'Failed to connect. Is the server running?';
      setupStatus.className = 'status error';
      setupView.classList.remove('hidden');
      mainView.classList.add('hidden');
    }
  }
  
  function populateBoards() {
    boardSelect.innerHTML = boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    
    // Select last used or first
    chrome.storage.local.get('lastBoardId', (data) => {
      if (data.lastBoardId && boards.find(b => b.id === data.lastBoardId)) {
        boardSelect.value = data.lastBoardId;
      }
      loadColumnsForBoard(boardSelect.value);
    });
    
    boardSelect.addEventListener('change', (e) => {
      const boardId = e.target.value;
      chrome.storage.local.set({ lastBoardId: boardId });
      loadColumnsForBoard(boardId);
    });
  }
  
  async function loadColumnsForBoard(boardId) {
    try {
      const res = await fetch(`${serverUrl}/api/boards/${boardId}`);
      const board = await res.json();
      
      columnSelect.innerHTML = board.columns.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      
      chrome.storage.local.get('lastColumnId', (data) => {
        if (data.lastColumnId && board.columns.find(c => c.id === data.lastColumnId)) {
          columnSelect.value = data.lastColumnId;
        }
      });
      
      columnSelect.addEventListener('change', (e) => {
        chrome.storage.local.set({ lastColumnId: e.target.value });
      });
      
    } catch (err) {
      console.error('Failed to load columns', err);
    }
  }
  
  async function checkCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Try to communicate with content script
    try {
      chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          // Fallback if content script not injected
          document.getElementById('taskTitle').value = tab.title;
          document.getElementById('taskDesc').value = '';
          document.getElementById('taskUrl').value = tab.url;
        } else {
          // Content script responded
          const data = response.data;
          document.getElementById('taskTitle').value = data.title;
          document.getElementById('taskUrl').value = data.url;
          
          if (data.selection) {
            document.getElementById('taskDesc').value = `> ${data.selection}\n\nClipped from ${data.url}`;
          } else {
            document.getElementById('taskDesc').value = `Clipped from ${data.url}`;
          }
        }
      });
    } catch (e) {
      document.getElementById('taskTitle').value = tab.title;
      document.getElementById('taskUrl').value = tab.url;
    }
  }
  
  document.getElementById('btnClip').addEventListener('click', async () => {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return;
    
    const desc = document.getElementById('taskDesc').value.trim();
    const url = document.getElementById('taskUrl').value.trim();
    
    const boardId = boardSelect.value;
    const columnId = columnSelect.value;
    const btn = document.getElementById('btnClip');
    const status = document.getElementById('clipStatus');
    
    btn.disabled = true;
    btn.textContent = 'Clipping...';
    
    try {
      // Create card via API
      const res = await fetch(`${serverUrl}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_id: boardId,
          column_id: columnId,
          title: title,
          description: desc,
          reference_url: url
        })
      });
      
      if (!res.ok) throw new Error('Failed to create card');
      
      status.textContent = 'Successfully clipped to Alpha!';
      status.style.display = 'block';
      status.className = 'status';
      btn.textContent = 'Clipped ✓';
      
      setTimeout(() => window.close(), 1500);
      
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.style.display = 'block';
      status.className = 'status error';
      btn.disabled = false;
      btn.textContent = 'Clip to Alpha';
    }
  });
});
