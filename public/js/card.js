// ============================================
// ALPHA — Card Detail Modal
// ============================================

window.CardModal = {
  currentCardId: null,
  cardData: null,
  timerInterval: null,
  
  open: async (cardId) => {
    window.CardModal.currentCardId = cardId;
    const modal = document.getElementById('cardModal');
    const backdrop = document.getElementById('modalBackdrop');
    
    // Show skeleton/loading state
    document.getElementById('cardModalTitle').value = 'Loading...';
    
    modal.classList.add('active');
    backdrop.classList.add('active');
    
    try {
      const card = await window.Utils.api(`/api/cards/${cardId}`);
      window.CardModal.cardData = card;
      window.CardModal.render(card);
    } catch (err) {
      window.CardModal.close();
    }
  },
  
  close: () => {
    if (window.CardModal.timerInterval) {
      clearInterval(window.CardModal.timerInterval);
      window.CardModal.timerInterval = null;
    }
    const modal = document.getElementById('cardModal');
    const backdrop = document.getElementById('modalBackdrop');
    
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      backdrop.classList.remove('active');
      window.CardModal.currentCardId = null;
      window.CardModal.cardData = null;
    }, 200);
  },
  
  render: (card) => {
    // Basic Info
    document.getElementById('cardModalTitle').value = card.title;
    document.getElementById('cardModalDesc').value = card.description || '';
    
    // Assignee Dropdown
    const assigneeSelect = document.getElementById('cardModalAssignee');
    let assigneeHtml = '<option value="">Unassigned</option>';
    if (window.AppState.boardData && window.AppState.boardData.members) {
      window.AppState.boardData.members.forEach(m => {
        assigneeHtml += `<option value="${m.id}" ${m.id === card.assignee_id ? 'selected' : ''}>${m.name}</option>`;
      });
    }
    assigneeSelect.innerHTML = assigneeHtml;
    
    // Column Dropdown
    const columnSelect = document.getElementById('cardModalColumn');
    let columnHtml = '';
    if (window.AppState.boardData && window.AppState.boardData.columns) {
      window.AppState.boardData.columns.forEach(c => {
        columnHtml += `<option value="${c.id}" ${c.id === card.column_id ? 'selected' : ''}>${c.name}</option>`;
      });
    }
    columnSelect.innerHTML = columnHtml;
    
    // Dependencies (Blockers)
    const depSelect = document.getElementById('cardModalDependencies');
    let depHtml = '';
    if (window.AppState.boardData && window.AppState.boardData.columns) {
      const allCards = [];
      window.AppState.boardData.columns.forEach(c => allCards.push(...c.cards));
      allCards.forEach(c => {
        if (c.id !== card.id) {
          const isBlockedBy = (card.blockers || []).includes(c.id);
          depHtml += `<option value="${c.id}" ${isBlockedBy ? 'selected' : ''}>${c.title}</option>`;
        }
      });
    }
    depSelect.innerHTML = depHtml;
    
    // Time Spent
    const timeDisplay = document.getElementById('cardModalTimeSpent');
    const spentSecs = card.time_spent || 0;
    const mins = Math.floor(spentSecs / 60);
    timeDisplay.textContent = `${mins}m`;
    
    // Labels
    window.CardModal.renderLabels();
    
    // Complexity
    const compContainer = document.getElementById('cardModalComplexity');
    if (card.complexity) {
      const isAccepted = card.complexity_accepted;
      compContainer.innerHTML = `
        <div class="complexity-badge ${!isAccepted ? 'complexity-badge--suggestion' : ''}">
          ${card.complexity}
        </div>
        ${!isAccepted ? `<button class="ghost-button" id="btnAcceptComplexity" style="padding: 2px 8px; font-size: 11px;">Accept AI Suggestion</button>` : ''}
      `;
      
      if (!isAccepted) {
        document.getElementById('btnAcceptComplexity').addEventListener('click', () => {
          window.CardModal.updateCard({ complexity_accepted: 1 });
        });
      }
    } else {
      compContainer.innerHTML = `<span style="color:var(--text-muted);font-size:12px;">No estimation yet</span>`;
    }
    
    // Comments
    window.CardModal.renderComments(card.comments || []);
    
    // Activity
    window.CardModal.renderActivity(card.activity || []);
    
    // Timer
    window.CardModal.initTimer(card.id);
    
    // Setup listeners if not already done (debounced saving)
    window.CardModal.setupListeners();
  },
  
  initTimer: async (cardId) => {
    if (window.CardModal.timerInterval) {
      clearInterval(window.CardModal.timerInterval);
      window.CardModal.timerInterval = null;
    }

    const btnTimer = document.getElementById('btnToggleTimer');
    
    try {
      const activeSessions = await window.Utils.api(`/api/cards/${cardId}/timer`);
      const me = window.AppState.me ? window.AppState.me.name : 'anonymous';
      const mySession = activeSessions.find(s => s.user_id === me);

      if (mySession) {
        window.CardModal.startCountdown(new Date(mySession.start_time));
      } else {
        btnTimer.textContent = 'Start Timer';
        btnTimer.classList.add('accent-button');
        btnTimer.classList.remove('danger-button');
      }
    } catch (e) {
      console.error(e);
    }
  },

  startCountdown: (startTimeDate) => {
    const btnTimer = document.getElementById('btnToggleTimer');
    btnTimer.classList.remove('accent-button');
    btnTimer.classList.add('danger-button');

    const TOTAL_SECONDS = 25 * 60; // 25 minutes pomodoro

    // Run once immediately
    const tick = () => {
      const elapsed = Math.floor((new Date() - startTimeDate) / 1000);
      let remaining = TOTAL_SECONDS - elapsed;
      
      if (remaining <= 0) {
        remaining = 0;
        if (window.CardModal.timerInterval) {
          clearInterval(window.CardModal.timerInterval);
          window.CardModal.timerInterval = null;
        }
        window.CardModal.stopTimerCall(true);
      }
      
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      btnTimer.textContent = `Stop (${m}:${s.toString().padStart(2, '0')})`;
    };
    
    tick();
    window.CardModal.timerInterval = setInterval(tick, 1000);
  },

  stopTimerCall: async (wasAutoFinished = false) => {
    const id = window.CardModal.currentCardId;
    if (!id) return;
    try {
      const me = window.AppState.me ? window.AppState.me.name : 'anonymous';
      const updatedCard = await window.Utils.api(`/api/cards/${id}/timer/stop`, {
        method: 'POST',
        body: JSON.stringify({ user_id: me })
      });
      const btnTimer = document.getElementById('btnToggleTimer');
      btnTimer.textContent = 'Start Timer';
      btnTimer.classList.add('accent-button');
      btnTimer.classList.remove('danger-button');
      if (window.CardModal.cardData) {
         window.CardModal.cardData.time_spent = updatedCard.time_spent;
      }
      const mins = Math.floor((updatedCard.time_spent || 0) / 60);
      document.getElementById('cardModalTimeSpent').textContent = `${mins}m`;
      if (wasAutoFinished && window.Toast) {
        window.Toast.show('Pomodoro completed!', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  },
  
  renderLabels: () => {
    const container = document.getElementById('cardModalLabels');
    const labels = window.CardModal.cardData.labels || [];
    container.innerHTML = labels.map((l, i) => `
      <span class="label-chip">
        ${l}
        <button class="remove-label" data-idx="${i}" style="margin-left:4px; opacity:0.6;">×</button>
      </span>
    `).join('');
    
    // Bind remove
    container.querySelectorAll('.remove-label').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        const newLabels = [...labels];
        newLabels.splice(idx, 1);
        window.CardModal.updateCard({ labels: newLabels });
      });
    });
  },
  
  renderComments: (comments) => {
    const thread = document.getElementById('commentThread');
    if (comments.length === 0) {
      thread.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No comments yet.</div>';
      return;
    }
    
    thread.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="avatar-bubble avatar-bubble--sm" style="background:#4aa8e8">${window.Utils.getInitials(c.author_name)}</div>
        <div class="comment-content">
          <div class="comment-author">${c.author_name} <span class="comment-time">${window.Utils.timeAgo(c.created_at)}</span></div>
          <div class="comment-text">${c.text}</div>
        </div>
      </div>
    `).join('');
  },
  
  renderActivity: (activity) => {
    const list = document.getElementById('activityList');
    if (activity.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No activity yet.</div>';
      return;
    }
    
    list.innerHTML = activity.map(a => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div>${a.details}</div>
          <div class="activity-time">${window.Utils.timeAgo(a.created_at)}</div>
        </div>
      </div>
    `).join('');
  },
  
  // Update local data, send API, broadcast WS
  updateCard: async (updates) => {
    if (!window.CardModal.currentCardId) return;
    
    const id = window.CardModal.currentCardId;
    window.CardModal.cardData = { ...window.CardModal.cardData, ...updates };
    
    try {
      // Re-render UI immediately for responsiveness
      if (updates.labels) window.CardModal.renderLabels();
      if (updates.complexity_accepted !== undefined) window.CardModal.render(window.CardModal.cardData);
      
      const updatedCard = await window.Utils.api(`/api/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      // Update board DOM
      if (window.Board) window.Board.updateCardInDOM(updatedCard);
      
      // Broadcast WS
      if (window.WS && window.WS.socket) {
        window.WS.socket.emit('card-update', {
          boardId: window.AppState.currentBoardId,
          card: updatedCard
        });
      }
    } catch (err) {
      console.error(err);
    }
  },
  
  setupListeners: () => {
    // Only setup once
    if (window.CardModal._listenersSetup) return;
    window.CardModal._listenersSetup = true;
    
    document.getElementById('btnCloseCard').addEventListener('click', window.CardModal.close);
    document.getElementById('modalBackdrop').addEventListener('click', window.CardModal.close);
    
    // Auto-save debounced inputs
    const debouncedSaveTitle = window.Utils.debounce((val) => window.CardModal.updateCard({ title: val }), 500);
    const titleInput = document.getElementById('cardModalTitle');
    titleInput.addEventListener('input', (e) => debouncedSaveTitle(e.target.value));
    
    const debouncedSaveDesc = window.Utils.debounce((val) => window.CardModal.updateCard({ description: val }), 1000);
    const descInput = document.getElementById('cardModalDesc');
    descInput.addEventListener('input', (e) => debouncedSaveDesc(e.target.value));
    
    // Selects save immediately
    document.getElementById('cardModalAssignee').addEventListener('change', (e) => {
      window.CardModal.updateCard({ assignee_id: e.target.value || null });
    });
    
    document.getElementById('cardModalColumn').addEventListener('change', (e) => {
      window.CardModal.updateCard({ column_id: e.target.value });
    });
    
    document.getElementById('cardModalDependencies').addEventListener('change', (e) => {
      const opts = Array.from(e.target.selectedOptions).map(o => o.value);
      window.CardModal.updateCard({ blockers: opts });
    });

    const btnAutoAssign = document.getElementById('btnAutoAssign');
    if (btnAutoAssign) {
      btnAutoAssign.addEventListener('click', async () => {
        btnAutoAssign.disabled = true;
        btnAutoAssign.innerHTML = `<span class="skeleton-shimmer" style="display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:4px;"></span> Thinking...`;
        
        try {
          const res = await fetch(`/api/ai/auto-assign/${window.AppState.currentBoardId}/${window.CardModal.currentCardId}`);
          const data = await res.json();
          if (data.recommendedAssignee) {
            const suggestion = document.getElementById('autoAssignSuggestion');
            suggestion.style.display = 'block';
            suggestion.innerHTML = `
              <strong>AI Suggests:</strong> ${data.recommendedAssignee}<br>
              <span style="opacity:0.8">${data.reason}</span><br>
              <button class="accent-button" id="btnAcceptAssignee" style="margin-top:4px; padding:2px 6px; font-size:10px;">Accept</button>
            `;
            
            document.getElementById('btnAcceptAssignee').onclick = () => {
              // Find the member id
              const select = document.getElementById('cardModalAssignee');
              const option = Array.from(select.options).find(o => o.text === data.recommendedAssignee);
              if (option) {
                select.value = option.value;
                window.CardModal.updateCard({ assignee_id: option.value });
                suggestion.style.display = 'none';
              } else {
                window.Toast.show('Assignee not found in project', 'error');
              }
            };
          }
        } catch (e) {
          window.Toast.show('Auto assign failed', 'error');
        } finally {
          btnAutoAssign.disabled = false;
          btnAutoAssign.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-top; margin-right: 4px;"><path d="M8 1a1 1 0 011 1v1.07A5.001 5.001 0 0113 8a5 5 0 01-4 4.9V14a1 1 0 11-2 0v-1.1A5.002 5.002 0 013 8a5 5 0 014-4.93V2a1 1 0 011-1zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg> Auto Assign`;
        }
      });
    }
    
    // Timer
    const btnTimer = document.getElementById('btnToggleTimer');
    btnTimer.addEventListener('click', async () => {
      const id = window.CardModal.currentCardId;
      const isRunning = btnTimer.classList.contains('danger-button');
      
      try {
        if (!isRunning) {
          const me = window.AppState.me ? window.AppState.me.name : 'anonymous';
          await window.Utils.api(`/api/cards/${id}/timer/start`, {
            method: 'POST',
            body: JSON.stringify({ user_id: me })
          });
          window.CardModal.startCountdown(new Date());
        } else {
          if (window.CardModal.timerInterval) {
            clearInterval(window.CardModal.timerInterval);
            window.CardModal.timerInterval = null;
          }
          window.CardModal.stopTimerCall(false);
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Add Label via Enter
    const labelInput = document.getElementById('cardLabelInput');
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && labelInput.value.trim()) {
        const val = labelInput.value.trim();
        const current = window.CardModal.cardData.labels || [];
        if (!current.includes(val)) {
          window.CardModal.updateCard({ labels: [...current, val] });
        }
        labelInput.value = '';
      }
    });
    
    // Delete
    document.getElementById('btnDeleteCard').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this card?')) return;
      const id = window.CardModal.currentCardId;
      try {
        await window.Utils.api(`/api/cards/${id}`, { method: 'DELETE' });
        
        window.CardModal.close();
        if (window.Board) {
          const el = document.getElementById(`card-${id}`);
          if (el) el.remove();
        }
        
        if (window.WS && window.WS.socket) {
          window.WS.socket.emit('card-delete', {
            boardId: window.AppState.currentBoardId,
            cardId: id
          });
        }
      } catch(err) {
        console.error(err);
      }
    });
    
    // Comments
    document.getElementById('btnAddComment').addEventListener('click', async () => {
      const input = document.getElementById('commentInput');
      const text = input.value.trim();
      if (!text) return;
      
      const id = window.CardModal.currentCardId;
      try {
        input.disabled = true;
        const newComment = await window.Utils.api(`/api/cards/${id}/comments`, {
          method: 'POST',
          body: JSON.stringify({ author_name: window.AppState.me.name, text })
        });
        
        window.CardModal.cardData.comments.push(newComment);
        window.CardModal.renderComments(window.CardModal.cardData.comments);
        input.value = '';
        
        // Minor: We'd want WS sync for comments too in a full prod app
      } catch (err) {
        console.error(err);
      } finally {
        input.disabled = false;
        input.focus();
      }
    });
  }
};
