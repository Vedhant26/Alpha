// ============================================
// ALPHA — Utility Functions
// ============================================

window.Utils = {
  // Format date relative to now (e.g., "2 hours ago")
  timeAgo: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    
    if (seconds < 30) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  },
  
  // Get initials for avatar
  getInitials: (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },
  
  // API Fetch helper with error handling
  api: async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      
      if (res.status === 401 && !url.includes('/api/auth/')) {
        // Session expired or not logged in, force reload to show auth screen
        window.location.reload();
        return;
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { error: 'Invalid response from server' };
      }

      if (!res.ok) throw new Error(data.error || 'API Error');
      return data;
    } catch (err) {
      console.error(`API Error (${url}):`, err);
      if (window.Toast) {
        window.Toast.show(err.message, 'error');
      }
      throw err;
    }
  },
  
  // Debounce function for live editing
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};
