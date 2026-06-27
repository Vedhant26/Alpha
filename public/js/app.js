// ============================================
// ALPHA — Main App Initialization & Routing
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // ─── Authentication & Splash Screen Sequence ───
  const splash = document.getElementById('splashScreen');
  const appContainer = document.getElementById('appContainer');
  const authContainer = document.getElementById('authContainer');
  const splashProgress = document.getElementById('splashProgress');

  async function checkAuthAndInit() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPublicView = urlParams.get('public') === 'true';

    const continueToApp = (user) => {
      window.AppState = window.AppState || {};
      window.AppState.me = user;
      
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        appContainer.classList.add('visible');
        if (window.WS) window.WS.init();
        loadInitialData();
      }, 400);
    };

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        continueToApp(user);
      } else if (isPublicView) {
        continueToApp({ name: 'Anonymous (Read-Only)' });
      } else {
        // Not authenticated, show auth UI
        splashProgress.style.display = 'none';
        authContainer.classList.add('visible');
      }
    } catch (err) {
      console.error('Auth check failed', err);
      if (isPublicView) {
        continueToApp({ name: 'Anonymous (Read-Only)' });
      } else {
        splashProgress.style.display = 'none';
        authContainer.classList.add('visible');
      }
    }
  }

  // Initial auth check after animations (give splash a bit of time to breathe)
  setTimeout(checkAuthAndInit, 2000);

  // Auth Handlers
  document.getElementById('btnLogin').addEventListener('click', async () => {
    const user = document.getElementById('authUsername').value;
    const pass = document.getElementById('authPassword').value;
    if (!user || !pass) return window.Toast.show('Username and password required', 'error');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      authContainer.classList.remove('visible');
      splashProgress.style.display = 'block';
      checkAuthAndInit();
    } catch (err) {
      window.Toast.show(err.message, 'error');
    }
  });

  document.getElementById('btnSignup').addEventListener('click', async () => {
    const user = document.getElementById('authUsername').value;
    const pass = document.getElementById('authPassword').value;
    if (!user || !pass) return window.Toast.show('Username and password required', 'error');
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      authContainer.classList.remove('visible');
      splashProgress.style.display = 'block';
      checkAuthAndInit();
    } catch (err) {
      window.Toast.show(err.message, 'error');
    }
  });

  // ─── Navigation Routing ───
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Switch view
      const targetViewId = link.getAttribute('data-view') + 'View';
      views.forEach(v => {
        if (v.id === targetViewId) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
      });
      
      // Re-trigger animations if needed
      if (targetViewId === 'digestView' && window.Digest) {
        window.Digest.render();
      }
      if (targetViewId === 'teamView' && window.Team) {
        window.Team.render();
      }
    });
  });

  // ─── AI Panel Toggle ───
  const btnAiPanel = document.getElementById('btnAiPanel');
  const btnCloseAiPanel = document.getElementById('btnCloseAiPanel');
  const aiPanel = document.getElementById('aiPanel');
  
  btnAiPanel.addEventListener('click', () => {
    aiPanel.classList.add('active');
    if (window.AIPanel) window.AIPanel.loadInsights();
  });
  
  btnCloseAiPanel.addEventListener('click', () => {
    aiPanel.classList.remove('active');
  });

  // ─── Global State ───
  window.AppState = {
    currentBoardId: null,
    boardData: null,
    me: { name: 'You' } // In a real app, this would be the logged in user
  };

  // ─── Theme Toggle ───
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  if (btnThemeToggle) {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('alpha-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
      btnThemeToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
    
    btnThemeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('alpha-theme', 'light');
        btnThemeToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('alpha-theme', 'dark');
        btnThemeToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      }
    });
  }

  // ─── Settings Modal Handlers ───
  const btnSettings = document.getElementById('btnSettings');
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnDeleteBoard = document.getElementById('btnDeleteBoard');

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      settingsModal.classList.add('active');
      document.getElementById('modalBackdrop').classList.add('active');
    });
  }
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.remove('active');
      document.getElementById('modalBackdrop').classList.remove('active');
    });
  }
  if (btnDeleteBoard) {
    btnDeleteBoard.addEventListener('click', async () => {
      if (!confirm('Are you absolutely sure you want to delete this board? All data will be lost forever.')) return;
      try {
        await window.Utils.api(`/api/boards/${window.AppState.currentBoardId}`, { method: 'DELETE' });
        window.location.reload(); // Reload to fetch boards and pick the first available one
      } catch (err) {
        console.error(err);
        window.Toast.show(err.message || 'Failed to delete board', 'error');
      }
    });
  }

  // ─── Initial Data Load ───
  async function loadInitialData() {
    try {
      // Try to fetch boards
      const res = await fetch('/api/boards');
      const boards = await res.json();
      
      const urlParams = new URLSearchParams(window.location.search);
      const sharedBoardId = urlParams.get('board');
      const isPublicView = urlParams.get('public') === 'true';
      
      if (isPublicView) {
        window.AppState.isReadOnly = true;
        document.body.classList.add('read-only-mode');
        window.Toast.show('Viewing in Read-Only Mode', 'info');
      }

      if (boards.length === 0 && !sharedBoardId) {
        // Show create board modal if no boards exist
        document.getElementById('createBoardModal').classList.add('active');
        document.getElementById('modalBackdrop').classList.add('active');
      } else {
        // Load the shared board or the first board
        const boardToLoad = sharedBoardId || (boards.length > 0 ? boards[0].id : null);
        if (boardToLoad) switchBoard(boardToLoad);
      }
      
      setupBoardSelector(boards);
      
    } catch (err) {
      console.error('Failed to load initial data:', err);
      // We might be running purely frontend without backend yet, use mock data
      window.Toast.show('Error connecting to server. Using offline mode.', 'error');
    }
  }

  // ─── Board Switching ───
  window.switchBoard = async function(boardId) {
    try {
      window.AppState.currentBoardId = boardId;
      
      // Tell WebSocket to join this board's room
      if (window.WS && window.WS.socket) {
        window.WS.socket.emit('join-board', boardId);
      }
      
      // Fetch full board data
      const res = await fetch(`/api/boards/${boardId}`);
      const boardData = await res.json();
      
      window.AppState.boardData = boardData;
      
      // Render components
      if (window.Board) window.Board.render(boardData);
      if (window.Team) window.Team.render();
      if (window.Digest) window.Digest.render();
      
    } catch (err) {
      console.error('Failed to switch board:', err);
    }
  };
  
  // ─── Board Selector Dropdown ───
  function setupBoardSelector(boards) {
    // We'll add this to the navbar dynamically
    const navLogo = document.querySelector('.nav-logo');
    
    // Convert logo text to a dropdown trigger
    navLogo.innerHTML = `
      <img src="/images/alpha-logo.png" alt="Alpha" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;" />
      <div class="board-selector" id="boardSelector">
        <div class="board-selector-trigger" id="boardSelectorTrigger">
          <span id="currentBoardName">${boards.length > 0 ? boards[0].name : 'Alpha'}</span>
          <svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>
        </div>
        <div class="board-dropdown" id="boardDropdown">
          ${boards.map(b => `<div class="board-dropdown-item" data-id="${b.id}">${b.name}</div>`).join('')}
          <div class="board-dropdown-divider"></div>
          <div class="board-dropdown-item board-dropdown-item--create" id="btnNewBoard">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="margin-right:6px"><path d="M8 1a1 1 0 011 1v5h5a1 1 0 110 2H9v5a1 1 0 11-2 0V9H2a1 1 0 110-2h5V2a1 1 0 011-1z"/></svg>
            Create New Board
          </div>
        </div>
      </div>
    `;
    
    const selector = document.getElementById('boardSelector');
    const trigger = document.getElementById('boardSelectorTrigger');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      selector.classList.toggle('open');
    });
    
    document.addEventListener('click', () => {
      selector.classList.remove('open');
    });
    
    // Add listeners to dropdown items
    document.querySelectorAll('.board-dropdown-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const name = item.textContent;
        document.getElementById('currentBoardName').textContent = name;
        window.switchBoard(id);
      });
    });
    
    // Create new board
    document.getElementById('btnNewBoard').addEventListener('click', () => {
      document.getElementById('createBoardModal').classList.add('active');
      document.getElementById('modalBackdrop').classList.add('active');
    });
  }
  
  // ─── Create Board Modal Handlers ───
  const btnCloseCreateBoard = document.getElementById('btnCloseCreateBoard');
  const btnCreateBoard = document.getElementById('btnCreateBoard');
  
  btnCloseCreateBoard.addEventListener('click', () => {
    document.getElementById('createBoardModal').classList.remove('active');
    document.getElementById('modalBackdrop').classList.remove('active');
  });
  
  btnCreateBoard.addEventListener('click', async () => {
    const name = document.getElementById('newBoardName').value;
    const sprintEnd = document.getElementById('newBoardSprintEnd').value;
    const template = document.getElementById('newBoardTemplate').value;
    const isPublic = document.getElementById('newBoardIsPublic').checked ? 1 : 0;
    
    if (!name) return;
    
    btnCreateBoard.textContent = 'Creating...';
    btnCreateBoard.disabled = true;
    
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sprint_end_date: sprintEnd, template, is_public: isPublic })
      });
      const newBoard = await res.json();
      
      document.getElementById('createBoardModal').classList.remove('active');
      document.getElementById('modalBackdrop').classList.remove('active');
      
      // Reload page to refresh board list
      window.location.reload();
      
    } catch (err) {
      console.error(err);
      window.Toast.show('Failed to create board', 'error');
    } finally {
      btnCreateBoard.textContent = 'Create Board';
      btnCreateBoard.disabled = false;
    }
  });

  // ─── Share Board Handler ───
  const btnShareBoard = document.getElementById('btnShareBoard');

  // ─── Global Add Task Button ───
  const btnAddTask = document.getElementById('btnAddTask');
  if (btnAddTask) {
    btnAddTask.addEventListener('click', () => {
      const firstGhost = document.querySelector('.kanban-column .ghost-card');
      if (firstGhost) {
        firstGhost.click();
        firstGhost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        if (window.Toast) window.Toast.show('No columns available', 'error');
      }
    });
  }
  if (btnShareBoard) {
    btnShareBoard.addEventListener('click', async () => {
      const board = window.AppState.boardData;
      if (!board) return;
      
      const shareUrl = window.location.origin + '?board=' + board.id + '&public=true';
      
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.Toast.show('Public link copied to clipboard!', 'success');
        
        // If not already public, set it to public
        if (!board.is_public) {
          fetch('/api/boards/' + board.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: 1 })
          });
          board.is_public = 1;
        }
      } catch (err) {
        window.Toast.show('Failed to copy link', 'error');
      }
    });
  }
});
