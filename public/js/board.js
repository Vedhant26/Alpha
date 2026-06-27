// ============================================
// ALPHA — Board View logic & Drag/Drop
// ============================================

window.Board = {
  draggedCard: null,
  placeholder: null,
  
  render: (boardData) => {
    const boardView = document.getElementById('boardView');
    boardView.innerHTML = ''; // Clear skeleton
    
    if (!boardData.columns || boardData.columns.length === 0) {
      boardView.innerHTML = `<div style="padding:var(--space-xl);color:var(--text-muted)">No columns found.</div>`;
      return;
    }
    
    boardData.columns.forEach(col => {
      const colEl = window.Board.createColumnEl(col);
      boardView.appendChild(colEl);
    });
    
    window.Board.setupDragAndDrop();
    window.Board.setupInlineCreation();
  },
  
  createColumnEl: (col) => {
    const div = document.createElement('div');
    div.className = 'kanban-column';
    div.dataset.id = col.id;
    div.dataset.status = col.color;
    
    // Header
    const header = document.createElement('div');
    header.className = 'column-header';
    header.innerHTML = `
      <div class="column-header-left">
        <h3 class="column-title">${col.name}</h3>
        <div class="count-pill">${col.cards ? col.cards.length : 0}</div>
      </div>
      <div class="column-actions">
        <button class="column-action-btn" title="More">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>
        </button>
      </div>
    `;
    div.appendChild(header);
    
    // Cards Container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';
    
    if (col.cards && col.cards.length > 0) {
      col.cards.forEach(card => {
        cardsContainer.appendChild(window.Board.createCardEl(card));
      });
    } else {
      cardsContainer.innerHTML = `
        <div class="column-empty" style="display:none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          No cards yet
        </div>
      `;
    }
    
    // Drop zone placeholder (hidden)
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.innerHTML = `
      <svg class="drop-zone-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <div class="drop-zone-text">Drop here</div>
    `;
    cardsContainer.appendChild(dropZone);
    
    div.appendChild(cardsContainer);
    
    // Ghost card (Add Task)
    const ghost = document.createElement('div');
    ghost.className = 'ghost-card';
    ghost.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 011 1v5h5a1 1 0 110 2H9v5a1 1 0 11-2 0V9H2a1 1 0 110-2h5V2a1 1 0 011-1z"/></svg>
      Add Task
    `;
    div.appendChild(ghost);
    
    return div;
  },
  
  createCardEl: (card) => {
    const el = document.createElement('div');
    el.className = 'kanban-card glass-card';
    el.id = `card-${card.id}`;
    el.dataset.id = card.id;
    el.draggable = true;
    
    // Build Assignee UI
    let assigneeHtml = '';
    if (card.assignee_id) {
      const member = window.AppState.boardData.members.find(m => m.id === card.assignee_id);
      if (member) {
        assigneeHtml = `<div class="avatar-bubble avatar-bubble--sm" style="background:${member.avatar_color}" title="${member.name}">${window.Utils.getInitials(member.name)}</div>`;
      }
    }
    
    // Build Labels
    let labelsHtml = '';
    if (card.labels && card.labels.length > 0) {
      labelsHtml = card.labels.map(l => `<span class="label-chip">${l}</span>`).join('');
    }
    
    // Build Complexity
    let complexityHtml = '';
    if (card.complexity) {
      complexityHtml = `<div class="complexity-badge ${!card.complexity_accepted ? 'complexity-badge--suggestion' : ''}" title="${card.complexity_accepted ? 'Complexity' : 'AI Suggested Complexity'}">${card.complexity}</div>`;
    }
    
    // Github reference
    let githubHtml = '';
    if (card.github_issue_id) {
      githubHtml = `<svg width="14" height="14" viewBox="0 0 16 16" fill="var(--text-muted)" title="GitHub Issue"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
    }
    
    // Check if card is completed based on its column name
    const colName = window.AppState.boardData.columns.find(c => c.id === card.column_id)?.name.toLowerCase() || '';
    const isCompleted = colName.includes('done') || colName.includes('published');
    
    el.innerHTML = `
      <div class="card-title ${isCompleted ? 'strikethrough' : ''}">${card.title}</div>
      <button class="card-complete-btn ${isCompleted ? 'completed' : ''}" title="${isCompleted ? 'Completed' : 'Mark as Complete'}">✓</button>
      <button class="card-delete-btn" title="Delete Task" aria-label="Delete Task">×</button>
      <div class="card-meta">
        <div class="card-meta-left">
          ${labelsHtml}
          ${githubHtml}
        </div>
        <div class="card-meta-right">
          ${complexityHtml}
          ${assigneeHtml}
        </div>
      </div>
    `;
    
    // Complete button click
    const compBtn = el.querySelector('.card-complete-btn');
    if (compBtn) {
      compBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent modal opening
        
        // Find a "done" column, or fallback to the last column
        const doneCol = window.AppState.boardData.columns.find(c => {
          const n = c.name.toLowerCase();
          return n.includes('done') || n.includes('published');
        }) || window.AppState.boardData.columns[window.AppState.boardData.columns.length - 1];
        
        if (!doneCol || doneCol.id === card.column_id) return;
        
        try {
          await window.Utils.api(`/api/cards/${card.id}/move`, { 
            method: 'PUT',
            body: JSON.stringify({
              column_id: doneCol.id,
              position: 99999
            })
          });
          
          if (window.WS && window.WS.socket) {
            window.WS.socket.emit('card-move', {
              boardId: window.AppState.currentBoardId,
              cardId: card.id,
              fromColumn: card.column_id,
              toColumn: doneCol.id,
              newPosition: 99999
            });
          }
          el.remove();
          window.Board.updateColumnCount(card.column_id);
        } catch (err) {
          console.error(err);
        }
      });
    }

    // Delete button click
    const delBtn = el.querySelector('.card-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent modal opening
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
          await window.Utils.api(`/api/cards/${card.id}`, { method: 'DELETE' });
          el.remove();
          if (window.Board) {
            window.Board.updateColumnCount(card.column_id);
          }
          if (window.WS && window.WS.socket) {
            window.WS.socket.emit('card-delete', {
              boardId: window.AppState.currentBoardId,
              cardId: card.id
            });
          }
        } catch (err) {
          console.error(err);
        }
      });
    }
    
    // Click to open modal
    el.addEventListener('click', () => {
      if (window.CardModal) window.CardModal.open(card.id);
    });
    
    return el;
  },
  
  // ─── DOM Mutation Helpers ───
  addCardToDOM: (card) => {
    if (document.getElementById(`card-${card.id}`)) return; // Already exists
    
    const col = document.querySelector(`.kanban-column[data-id="${card.column_id}"] .column-cards`);
    if (col) {
      const cardEl = window.Board.createCardEl(card);
      cardEl.classList.add('card-new');
      // Insert before drop zone
      const dropZone = col.querySelector('.drop-zone');
      col.insertBefore(cardEl, dropZone);
      window.Board.updateColumnCount(card.column_id);
    }
  },
  
  updateCardInDOM: (card) => {
    const oldEl = document.getElementById(`card-${card.id}`);
    if (oldEl) {
      const newEl = window.Board.createCardEl(card);
      oldEl.parentNode.replaceChild(newEl, oldEl);
      
      // If column changed, it's handled by moveCardInDOM separately usually,
      // but just in case, verify column
      const currentParent = newEl.closest('.kanban-column').dataset.id;
      if (currentParent !== card.column_id) {
        window.Board.moveCardInDOM(card.id, card.column_id, card.position);
      }
    }
  },
  
  moveCardInDOM: (cardId, newColumnId, newPosition) => {
    const cardEl = document.getElementById(`card-${cardId}`);
    if (!cardEl) return;
    
    const oldColumnId = cardEl.closest('.kanban-column').dataset.id;
    const newColContainer = document.querySelector(`.kanban-column[data-id="${newColumnId}"] .column-cards`);
    
    if (!newColContainer) return;
    
    // Very simple placement: just append before dropzone for now.
    // In a full implementation, we'd insert based on exact position.
    const dropZone = newColContainer.querySelector('.drop-zone');
    newColContainer.insertBefore(cardEl, dropZone);
    
    window.Board.updateColumnCount(oldColumnId);
    window.Board.updateColumnCount(newColumnId);
  },
  
  updateColumnCount: (columnId) => {
    const col = document.querySelector(`.kanban-column[data-id="${columnId}"]`);
    if (col) {
      const count = col.querySelectorAll('.kanban-card').length;
      col.querySelector('.count-pill').textContent = count;
    }
  },
  
  // ─── Drag and Drop (HTML5) ───
  setupDragAndDrop: () => {
    const boardView = document.getElementById('boardView');
    
    boardView.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('kanban-card')) {
        window.Board.draggedCard = e.target;
        e.target.classList.add('dragging');
        
        // Show all drop zones (we don't really need to now since column is the target, but we can leave it for visual)
        document.querySelectorAll('.drop-zone').forEach(zone => {
          zone.classList.add('active');
        });
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
      }
    });
    
    boardView.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('kanban-card')) {
        e.target.classList.remove('dragging');
        window.Board.draggedCard = null;
        
        // Cleanup over classes
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('active'));
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('over'));
      }
    });
    
    boardView.addEventListener('dragover', (e) => {
      e.preventDefault();
      const columnEl = e.target.closest('.kanban-column');
      if (columnEl) {
        document.querySelectorAll('.kanban-column.over').forEach(z => z.classList.remove('over'));
        columnEl.classList.add('over');
      }
    });
    
    boardView.addEventListener('drop', async (e) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('text/plain');
      const columnEl = e.target.closest('.kanban-column');
      
      if (columnEl && cardId) {
        const dropZone = columnEl.querySelector('.drop-zone');
        const newColumnId = columnEl.dataset.id;
        const cardEl = document.getElementById(`card-${cardId}`);
        const oldColumnId = cardEl.closest('.kanban-column').dataset.id;
        
        // Move visually immediately (Optimistic update)
        const cardsContainer = columnEl.querySelector('.column-cards');
        cardsContainer.insertBefore(cardEl, dropZone);
        
        window.Board.updateColumnCount(oldColumnId);
        window.Board.updateColumnCount(newColumnId);
        
        // Position calculation (append to end)
        const newPosition = cardsContainer.querySelectorAll('.kanban-card').length - 1;
        
        // API Call
        try {
          const res = await fetch(`/api/cards/${cardId}/move`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column_id: newColumnId, position: newPosition })
          });
          const updatedCard = await res.json();
          
          // Broadcast via WS
          if (window.WS && window.WS.socket) {
            window.WS.socket.emit('card-move', {
              boardId: window.AppState.currentBoardId,
              cardId,
              newColumnId,
              newPosition,
              card: updatedCard
            });
          }
        } catch (err) {
          console.error(err);
          window.Toast.show('Failed to move card', 'error');
          // Should revert UI here in real app
        }
      }
    });
  },
  
  // ─── Inline Creation ───
  setupInlineCreation: () => {
    document.querySelectorAll('.ghost-card').forEach(ghost => {
      ghost.addEventListener('click', (e) => {
        const col = ghost.closest('.kanban-column');
        const colId = col.dataset.id;
        
        // Transform ghost to input
        ghost.style.display = 'none';
        
        const creator = document.createElement('div');
        creator.className = 'inline-card-creator glass-card';
        creator.innerHTML = `
          <input type="text" class="glass-input" placeholder="What needs to be done?" autofocus>
          <div class="inline-card-creator-actions">
            <button class="ghost-button btn-cancel" style="padding: 4px 12px; font-size: 12px;">Cancel</button>
            <button class="accent-button btn-add" style="padding: 4px 12px; font-size: 12px;">Add</button>
          </div>
        `;
        
        col.appendChild(creator);
        
        const input = creator.querySelector('input');
        input.focus();
        
        const closeCreator = () => {
          creator.remove();
          ghost.style.display = 'flex';
        };
        
        const saveCard = async () => {
          const title = input.value.trim();
          if (!title) {
            closeCreator();
            return;
          }
          
          input.disabled = true;
          
          try {
            const res = await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                column_id: colId,
                board_id: window.AppState.currentBoardId,
                title: title
              })
            });
            const newCard = await res.json();
            
            closeCreator();
            window.Board.addCardToDOM(newCard);
            
            // Broadcast WS
            if (window.WS && window.WS.socket) {
              window.WS.socket.emit('card-create', {
                boardId: window.AppState.currentBoardId,
                card: newCard
              });
            }
          } catch (err) {
            console.error(err);
            window.Toast.show('Failed to create card', 'error');
            input.disabled = false;
            input.focus();
          }
        };
        
        creator.querySelector('.btn-cancel').addEventListener('click', closeCreator);
        creator.querySelector('.btn-add').addEventListener('click', saveCard);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveCard();
          if (e.key === 'Escape') closeCreator();
        });
      });
    });
  }
};
