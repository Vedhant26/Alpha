// ============================================
// ALPHA — GitHub Import Logic
// ============================================

window.GithubImport = {
  initModal: () => {
    const btnImport = document.getElementById('btnImport');
    const btnClose = document.getElementById('btnCloseGithub');
    const modal = document.getElementById('githubModal');
    const backdrop = document.getElementById('modalBackdrop');
    
    const btnPreview = document.getElementById('btnPreviewGithub');
    const btnConfirm = document.getElementById('btnConfirmImport');
    const previewDiv = document.getElementById('githubPreview');
    
    btnImport.addEventListener('click', () => {
      modal.classList.add('active');
      backdrop.classList.add('active');
      // Reset state
      previewDiv.classList.add('hidden');
      document.getElementById('githubRepoUrl').value = '';
    });
    
    btnClose.addEventListener('click', () => {
      modal.classList.remove('active');
      backdrop.classList.remove('active');
    });
    
    // Preview
    btnPreview.addEventListener('click', async () => {
      const url = document.getElementById('githubRepoUrl').value.trim();
      if (!url) return;
      
      btnPreview.disabled = true;
      btnPreview.textContent = 'Loading...';
      
      try {
        const res = await window.Utils.api('/api/github/preview', {
          method: 'POST',
          body: JSON.stringify({ repo_url: url })
        });
        
        document.getElementById('githubPreviewCount').textContent = `${res.count} open issues found in ${res.repo}`;
        
        const list = document.getElementById('githubIssuesList');
        list.innerHTML = res.sample.map(issue => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px;">
            <div style="font-weight: 500;">#${issue.number} ${issue.title}</div>
            <div style="color: var(--text-muted); margin-top: 4px; font-size: 12px;">
              ${issue.labels.map(l => `<span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin-right:4px;">${l}</span>`).join('')}
              ${issue.assignee_login ? `• @${issue.assignee_login}` : ''}
            </div>
          </div>
        `).join('') + (res.count > 5 ? `<div style="padding-top:8px; color:var(--text-muted); font-size:12px; text-align:center;">+ ${res.count - 5} more issues</div>` : '');
        
        previewDiv.classList.remove('hidden');
        
        // Store repo for import
        btnConfirm.dataset.repo = url;
        
      } catch (err) {
        console.error(err);
      } finally {
        btnPreview.disabled = false;
        btnPreview.textContent = 'Preview Issues';
      }
    });
    
    // Confirm Import
    btnConfirm.addEventListener('click', async () => {
      const url = btnConfirm.dataset.repo;
      if (!url) return;
      
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Importing... (AI is analyzing complexity)';
      
      try {
        const res = await window.Utils.api('/api/github/import', {
          method: 'POST',
          body: JSON.stringify({ 
            board_id: window.AppState.currentBoardId, 
            repo_url: url 
            // omitting target_column_id defaults to first column
          })
        });
        
        window.Toast.show(`Successfully imported ${res.importedCount} issues from ${res.repo}. Skipped ${res.skippedCount} duplicates.`, 'success');
        
        modal.classList.remove('active');
        backdrop.classList.remove('active');
        
        // Refresh board
        window.switchBoard(window.AppState.currentBoardId);
        
      } catch (err) {
        console.error(err);
      } finally {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Import All Issues';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', window.GithubImport.initModal);
