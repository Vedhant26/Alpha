// ============================================
// ALPHA — AI Insights Panel Logic
// ============================================

window.AIPanel = {
  loadInsights: () => {
    const list = document.getElementById('aiInsightsList');
    
    // Skeleton
    list.innerHTML = `
      <div class="skeleton skeleton-card" style="height: 80px; margin-bottom: 10px;"></div>
      <div class="skeleton skeleton-card" style="height: 100px;"></div>
    `;
    
    window.Utils.api(`/api/ai/insights/${window.AppState.currentBoardId}`)
      .then(insights => {
        if (insights.length === 0) {
          list.innerHTML = `
            <div style="padding:var(--space-xl) var(--space-md); text-align:center; color:var(--text-muted); font-size:13px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:12px; opacity:0.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <br>No insights available yet.<br>The AI analyzes your board every 6 hours.
            </div>
          `;
          return;
        }
        
        list.innerHTML = '';
        insights.forEach(insight => window.AIPanel.addInsightToDOM(insight));
      })
      .catch(err => {
        list.innerHTML = `<div style="color:var(--danger); padding:var(--space-md)">Failed to load insights.</div>`;
      });
  },
  
  addInsightToDOM: (insight) => {
    const list = document.getElementById('aiInsightsList');
    
    if (list.querySelector('.skeleton') || list.innerHTML.includes('No insights')) {
      list.innerHTML = '';
    }
    
    const el = document.createElement('div');
    el.className = 'ai-chat-message';
    
    const data = insight.data;
    
    let icon = '';
    let titleClass = '';
    
    if (insight.type === 'bottleneck') {
      icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      titleClass = data.severity === 'high' ? 'color: var(--danger)' : 'color: var(--warning)';
    } else if (insight.type === 'risk') {
      icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      titleClass = data.severity === 'high' ? 'color: var(--danger)' : (data.severity === 'medium' ? 'color: var(--warning)' : 'color: var(--success)');
    } else {
      icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
      titleClass = 'color: var(--accent)';
    }
    
    el.innerHTML = `
      <div class="ai-chat-avatar">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 011 1v1.07A5.001 5.001 0 0113 8a5 5 0 01-4 4.9V14a1 1 0 11-2 0v-1.1A5.002 5.002 0 013 8a5 5 0 014-4.93V2a1 1 0 011-1zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg>
      </div>
      <div class="ai-chat-bubble glass-card-static">
        <div class="ai-chat-header">
          <span style="${titleClass}; display:flex; align-items:center; gap:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; font-size:11px;">
            ${icon} ${insight.type}
          </span>
          <span class="ai-chat-time">${window.Utils.timeAgo(insight.created_at || Date.now())}</span>
        </div>
        <div class="ai-chat-text">${data.message}</div>
        ${data.recommendation ? `<div class="ai-chat-recommendation"><strong>Recommendation:</strong> ${data.recommendation}</div>` : ''}
      </div>
    `;
    
    if (list.firstChild) {
      list.insertBefore(el, list.firstChild);
    } else {
      list.appendChild(el);
    }
  },
  
  initRunButton: () => {
    const btn = document.getElementById('btnRunAi');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="skeleton-shimmer" style="display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:6px;"></span> Brainstorming...`;
        
        try {
          await window.Utils.api(`/api/ai/stream-analysis/${window.AppState.currentBoardId}`, { method: 'POST' });
        } catch (e) {
          console.error(e);
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }
  },

  handleStreamStart: (data) => {
    const list = document.getElementById('aiInsightsList');
    if (list.querySelector('.skeleton') || list.innerHTML.includes('No insights')) {
      list.innerHTML = '';
    }
    
    const el = document.createElement('div');
    el.className = 'ai-chat-message';
    el.id = `stream-${data.streamId}`;
    el.innerHTML = `
      <div class="ai-chat-avatar" style="animation: pulse 1.5s infinite;">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 011 1v1.07A5.001 5.001 0 0113 8a5 5 0 01-4 4.9V14a1 1 0 11-2 0v-1.1A5.002 5.002 0 013 8a5 5 0 014-4.93V2a1 1 0 011-1zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg>
      </div>
      <div class="ai-chat-bubble glass-card-static">
        <div class="ai-chat-header">
          <span style="color: var(--accent); display:flex; align-items:center; gap:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; font-size:11px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Brainstorming
          </span>
          <span class="ai-chat-time">Just now</span>
        </div>
        <div class="ai-chat-text" id="stream-text-${data.streamId}"><span class="skeleton-shimmer" style="display:inline-block; width:100px; height:14px; border-radius:4px;"></span></div>
      </div>
    `;
    
    if (list.firstChild) {
      list.insertBefore(el, list.firstChild);
    } else {
      list.appendChild(el);
    }
    list.scrollTop = 0; // scroll to top since we prepend
  },

  handleStreamChunk: (data) => {
    const textEl = document.getElementById(`stream-text-${data.streamId}`);
    if (textEl) {
      textEl.innerHTML = data.textSoFar.replace(/\n/g, '<br>');
    }
  },

  handleStreamDone: (data) => {
    // Remove the streaming element completely since a full insight will be emitted and added next
    const el = document.getElementById(`stream-${data.streamId}`);
    if (el) {
      el.remove();
    }
    
    const btn = document.getElementById('btnRunAi');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 011 1v1.07A5.001 5.001 0 0113 8a5 5 0 01-4 4.9V14a1 1 0 11-2 0v-1.1A5.002 5.002 0 013 8a5 5 0 014-4.93V2a1 1 0 011-1zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg> Run Analysis Now`;
    }
  },

  handleStreamError: (data) => {
    const el = document.getElementById(`stream-${data.streamId}`);
    if (el) {
      el.remove();
    }
    
    const btn = document.getElementById('btnRunAi');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 011 1v1.07A5.001 5.001 0 0113 8a5 5 0 01-4 4.9V14a1 1 0 11-2 0v-1.1A5.002 5.002 0 013 8a5 5 0 014-4.93V2a1 1 0 011-1zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg> Run Analysis Now`;
    }
    
    if (window.Toast) {
      window.Toast.show(`AI Brainstorming failed: ${data.error || 'Unknown error'}`, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', window.AIPanel.initRunButton);
