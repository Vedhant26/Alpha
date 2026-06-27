// ============================================
// ALPHA — Team View Logic
// ============================================

window.Team = {
  render: () => {
    const grid = document.getElementById('teamGrid');
    if (!window.AppState.boardData || !window.AppState.boardData.members) return;
    
    if (window.AppState.boardData.members.length === 0) {
      grid.innerHTML = `
        <div class="team-empty" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <div class="team-empty-text">No team members yet</div>
          <button class="ghost-button" onclick="document.getElementById('addMemberModal').classList.add('active'); document.getElementById('modalBackdrop').classList.add('active');">Add your first member</button>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = '<div style="grid-column: 1 / -1;" class="skeleton skeleton-card"></div>';
    
    window.Utils.api(`/api/teams/${window.AppState.currentBoardId}/stats`)
      .then(stats => {
        grid.innerHTML = stats.map(member => window.Team.createCardHTML(member)).join('');
        // Trigger SVG animations
        setTimeout(() => {
          document.querySelectorAll('.completion-arc-fill').forEach(arc => {
            const pct = arc.dataset.pct;
            const length = 2 * Math.PI * 28; // r=28
            arc.style.strokeDasharray = length;
            arc.style.strokeDashoffset = length - (length * pct / 100);
          });
        }, 50);
      })
      .catch(err => {
        grid.innerHTML = `<div style="color:var(--danger)">Failed to load team stats.</div>`;
      });
  },
  
  createCardHTML: (member) => {
    // Generate WIP Chips
    let wipHtml = '';
    if (member.wip_count > 0) {
      wipHtml = `
        <div class="team-wip-label">In Progress (${member.wip_count})</div>
        <div class="team-wip">
          ${member.wip.map(c => `<div class="wip-chip" title="${c.title}">${c.title}</div>`).join('')}
        </div>
      `;
    }
    
    // Generate Label Specialisation
    let labelsHtml = '';
    if (member.top_labels && member.top_labels.length > 0) {
      labelsHtml = `
        <div class="team-labels-title" style="margin-top:var(--space-sm)">Expertise</div>
        <div class="team-labels">
          ${member.top_labels.map(l => `<span class="label-chip">${l.label}</span>`).join('')}
        </div>
      `;
    }
    
    return `
      <div class="team-card glass-card">
        <div class="team-card-header">
          <div class="avatar-bubble avatar-bubble--lg" style="background:${member.avatar_color}">
            ${window.Utils.getInitials(member.name)}
          </div>
          <div class="team-card-info">
            <div class="team-card-name">${member.name}</div>
            <div class="team-card-role">${member.github_username ? '@' + member.github_username : 'Team Member'}</div>
          </div>
          <button class="column-action-btn" onclick="window.Team.removeMember('${member.id}')" title="Remove">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 010-2H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118z"/></svg>
          </button>
        </div>
        
        <div class="team-completion">
          <div class="completion-arc-container">
            <svg viewBox="0 0 64 64">
              <circle class="completion-arc-bg" cx="32" cy="32" r="28"></circle>
              <circle class="completion-arc-fill" cx="32" cy="32" r="28" data-pct="${member.completion_rate}" stroke-dasharray="175" stroke-dashoffset="175"></circle>
            </svg>
            <div class="completion-arc-text">${member.completion_rate}%</div>
          </div>
          <div class="completion-stats">
            <div class="completion-stat">
              <span class="completion-stat-label">Assigned</span>
              <span class="completion-stat-value">${member.total_assigned}</span>
            </div>
            <div class="completion-stat">
              <span class="completion-stat-label">Completed</span>
              <span class="completion-stat-value">${member.completed}</span>
            </div>
          </div>
        </div>
        
        ${wipHtml}
        ${labelsHtml}
      </div>
    `;
  },
  
  removeMember: async (id) => {
    if (!confirm('Remove this member? Their assigned tasks will become unassigned.')) return;
    try {
      await window.Utils.api(`/api/teams/members/${id}`, { method: 'DELETE' });
      window.Toast.show('Member removed', 'success');
      // Refresh board data to sync unassigned tasks
      await window.switchBoard(window.AppState.currentBoardId);
    } catch (err) {
      console.error(err);
    }
  },
  
  initModal: () => {
    const btnClose = document.getElementById('btnCloseAddMember');
    const btnAdd = document.getElementById('btnConfirmAddMember');
    const modal = document.getElementById('addMemberModal');
    const backdrop = document.getElementById('modalBackdrop');
    
    document.getElementById('btnAddMember').addEventListener('click', () => {
      modal.classList.add('active');
      backdrop.classList.add('active');
    });
    
    btnClose.addEventListener('click', () => {
      modal.classList.remove('active');
      backdrop.classList.remove('active');
    });
    
    btnAdd.addEventListener('click', async () => {
      const name = document.getElementById('newMemberName').value.trim();
      const github = document.getElementById('newMemberGithub').value.trim();
      
      if (!name) return;
      
      btnAdd.disabled = true;
      try {
        await window.Utils.api(`/api/teams/${window.AppState.currentBoardId}/members`, {
          method: 'POST',
          body: JSON.stringify({ name, github_username: github })
        });
        
        modal.classList.remove('active');
        backdrop.classList.remove('active');
        document.getElementById('newMemberName').value = '';
        document.getElementById('newMemberGithub').value = '';
        
        window.Toast.show('Member added successfully', 'success');
        
        // Refresh board
        await window.switchBoard(window.AppState.currentBoardId);
      } catch (err) {
        console.error(err);
      } finally {
        btnAdd.disabled = false;
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', window.Team.initModal);
