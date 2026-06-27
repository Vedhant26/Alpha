// ============================================
// ALPHA — WebSocket Client
// ============================================

window.WS = {
  socket: null,
  
  init: () => {
    window.WS.socket = io();
    const statusDot = document.getElementById('wsStatus');
    const navStatusDot = document.getElementById('navStatusDot');
    const navStatusText = document.getElementById('navStatusText');
    
    window.WS.socket.on('connect', () => {
      console.log('WebSocket connected');
      statusDot.className = 'status-dot status-dot--connected';
      statusDot.title = 'Connected';
      navStatusDot.className = 'status-dot status-dot--connected';
      navStatusText.textContent = 'Connected';
      
      // Rejoin room if we have a current board
      if (window.AppState.currentBoardId) {
        window.WS.socket.emit('join-board', window.AppState.currentBoardId);
      }
    });
    
    window.WS.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      statusDot.className = 'status-dot status-dot--disconnected';
      statusDot.title = 'Disconnected';
      navStatusDot.className = 'status-dot status-dot--disconnected';
      navStatusText.textContent = 'Disconnected';
    });
    
    // ─── Event Handlers ───
    
    window.WS.socket.on('card-created', (card) => {
      if (window.Board && window.AppState.currentBoardId === card.board_id) {
        window.Board.addCardToDOM(card);
      }
    });
    
    window.WS.socket.on('card-updated', (card) => {
      if (window.Board && window.AppState.currentBoardId === card.board_id) {
        // If the current user has the card modal open for this card, show conflict
        if (window.CardModal && window.CardModal.currentCardId === card.id) {
          window.Toast.show('This card was just updated by someone else', 'warning');
          // Update the underlying data but don't overwrite user's unsubmitted edits
          // In a real app we'd merge or show a diff
        } else {
          // Normal DOM update
          window.Board.updateCardInDOM(card);
        }
      }
    });
    
    window.WS.socket.on('card-moved', (data) => {
      if (window.Board && window.AppState.currentBoardId === data.card.board_id) {
        window.Board.moveCardInDOM(data.cardId, data.newColumnId, data.newPosition);
        // Also update full card data (like labels/assignee if they changed)
        window.Board.updateCardInDOM(data.card);
      }
    });
    
    window.WS.socket.on('card-deleted', (cardId) => {
      if (window.Board) {
        const el = document.getElementById(`card-${cardId}`);
        if (el) el.remove();
        
        if (window.CardModal && window.CardModal.currentCardId === cardId) {
          window.CardModal.close();
          window.Toast.show('This card was deleted by someone else', 'info');
        }
      }
    });
    
    // AI Insights stream
    window.WS.socket.on('ai-insight-new', (insight) => {
      if (window.AppState.currentBoardId === insight.board_id) {
        window.Toast.show('New AI Insight generated', 'info');
        if (window.AIPanel) {
          window.AIPanel.addInsightToDOM(insight);
        }
      }
    });

    window.WS.socket.on('ai-stream-start', (data) => {
      if (window.AppState.currentBoardId === data.boardId && window.AIPanel) {
        window.AIPanel.handleStreamStart(data);
      }
    });

    window.WS.socket.on('ai-stream-chunk', (data) => {
      if (window.AIPanel) {
        window.AIPanel.handleStreamChunk(data);
      }
    });

    window.WS.socket.on('ai-stream-done', (data) => {
      if (window.AIPanel) {
        window.AIPanel.handleStreamDone(data);
      }
    });

    window.WS.socket.on('ai-stream-error', (data) => {
      if (window.AIPanel) {
        window.AIPanel.handleStreamError(data);
      }
    });
  }
};
