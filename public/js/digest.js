// ============================================
// ALPHA — Digest View Logic
// ============================================

window.Digest = {
  render: () => {
    const container = document.getElementById('digestContent');
    
    window.Utils.api(`/api/ai/digest/${window.AppState.currentBoardId}`)
      .then(digest => {
        if (!digest) {
          container.innerHTML = `
            <div class="digest-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <div class="digest-empty-text">No digest generated yet</div>
              <div style="font-size:var(--font-sm)">Digests are generated weekly by the AI Project Manager.</div>
              <button class="ghost-button" style="margin-top:var(--space-md)" onclick="window.Digest.generateNow()">Generate Now</button>
            </div>
          `;
          return;
        }
        
        container.innerHTML = window.Digest.createHTML(digest.data);
        window.Digest.animateElements();
      })
      .catch(err => {
        container.innerHTML = `<div style="color:var(--danger)">Failed to load digest.</div>`;
      });
  },
  
  generateNow: async () => {
    try {
      // We didn't build a separate trigger endpoint for JUST the digest in the backend yet,
      // but we can mock it here for demonstration or trigger the full AI analysis.
      await window.Utils.api(`/api/ai/analyze/${window.AppState.currentBoardId}`, { method: 'POST' });
      window.Toast.show('Analysis complete. Refreshing digest...', 'success');
      // In a real app we'd fetch the newly created digest, for now just reload
      setTimeout(() => window.Digest.render(), 1000);
    } catch (e) {
      console.error(e);
    }
  },
  
  createHTML: (data) => {
    const trendClass = data.velocity_change >= 0 ? 'stat-card-trend--up' : 'stat-card-trend--down';
    const trendIcon = data.velocity_change >= 0 ? '↑' : '↓';
    const trendText = `${trendIcon} ${Math.abs(data.velocity_change)} from last week`;
    
    // Bottleneck Callout
    let bottleneckHtml = '';
    if (data.bottleneck) {
      bottleneckHtml = `
        <div class="bottleneck-callout glass-card-static">
          <div class="bottleneck-callout-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Bottleneck Detected: ${data.bottleneck.columnName}
          </div>
          <div class="bottleneck-callout-text">${data.bottleneck.message} ${data.bottleneck.recommendation}</div>
        </div>
      `;
    }
    
    // Distribution Calculation
    let totalCards = 0;
    Object.values(data.distribution || {}).forEach(c => totalCards += c.count);
    
    let distroBars = '';
    let distroLegend = '';
    
    if (totalCards > 0) {
      Object.entries(data.distribution || {}).forEach(([name, info]) => {
        if (info.count === 0) return;
        const pct = (info.count / totalCards) * 100;
        distroBars += `<div class="distribution-segment" data-status="${info.color}" data-width="${pct}%" style="width: 0%">${Math.round(pct)}%</div>`;
        
        let colorCode = '#1a6fb5';
        if (info.color === 'done') colorCode = '#4CAF50';
        if (info.color === 'in-progress') colorCode = '#FFB74D';
        if (info.color === 'todo') colorCode = '#64B5F6';
        if (info.color === 'review') colorCode = '#9575CD';
        
        distroLegend += `
          <div class="distribution-legend-item">
            <div class="distribution-legend-dot" style="background:${colorCode}"></div>
            ${name} (${info.count})
          </div>
        `;
      });
    } else {
      distroBars = `<div style="width:100%;text-align:center;color:var(--text-muted);font-size:12px;line-height:28px;">Board is empty</div>`;
    }
    
    return `
      <div class="digest-header">
        <h1 class="digest-title">Weekly Digest</h1>
        <div class="digest-period">Generated automatically</div>
      </div>
      
      <div class="digest-stats">
        <div class="stat-card glass-card-static">
          <div class="stat-card-value count-up" data-target="${data.completed_count}">0</div>
          <div class="stat-card-label">Cards Completed</div>
          <div class="stat-card-trend ${trendClass}">${trendText}</div>
        </div>
        <div class="stat-card glass-card-static">
          <div class="stat-card-value count-up" data-target="${totalCards}">0</div>
          <div class="stat-card-label">Total Active Cards</div>
        </div>
        <div class="stat-card glass-card-static">
          <div class="stat-card-value">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <div class="stat-card-label" style="margin-top: 10px;">Velocity Steady</div>
        </div>
      </div>
      
      ${bottleneckHtml}
      
      <div class="distribution-section glass-card-static" style="padding: var(--space-lg);">
        <h3 class="distribution-title">Work Distribution</h3>
        <div class="distribution-bar">
          ${distroBars}
        </div>
        <div class="distribution-legend">
          ${distroLegend}
        </div>
      </div>
    `;
  },
  
  animateElements: () => {
    // Count up animation
    setTimeout(() => {
      document.querySelectorAll('.count-up').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        const duration = 800;
        const steps = 30;
        const stepTime = duration / steps;
        const increment = target / steps;
        
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = Math.round(current);
          }
        }, stepTime);
      });
      
      // Expand distribution bars
      document.querySelectorAll('.distribution-segment').forEach(el => {
        el.style.width = el.getAttribute('data-width');
      });
    }, 100);
  }
};
