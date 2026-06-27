// ============================================
// ALPHA — Toast Notification System
// ============================================

window.Toast = {
  queue: [],
  isShowing: false,
  
  show: (message, type = 'info', duration = 4000) => {
    window.Toast.queue.push({ message, type, duration });
    if (!window.Toast.isShowing) {
      window.Toast.processQueue();
    }
  },
  
  processQueue: () => {
    if (window.Toast.queue.length === 0) {
      window.Toast.isShowing = false;
      return;
    }
    
    window.Toast.isShowing = true;
    const toastData = window.Toast.queue.shift();
    window.Toast.render(toastData);
  },
  
  render: ({ message, type, duration }) => {
    const container = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    
    let title = 'Notification';
    let icon = '';
    
    switch (type) {
      case 'success':
        title = 'Success';
        icon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/></svg>`;
        break;
      case 'error':
        title = 'Error';
        icon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zM4.5 7.5h7a.5.5 0 010 1h-7a.5.5 0 010-1z"/></svg>`;
        break;
      case 'warning':
        title = 'Warning';
        icon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/></svg>`;
        break;
      case 'info':
      default:
        title = 'Info';
        icon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z"/></svg>`;
        break;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.id = id;
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>
      </button>
      <div class="toast-timer" style="animation: toastTimer ${duration}ms linear forwards;"></div>
    `;
    
    container.appendChild(toast);
    
    let isClosed = false;
    
    const closeToast = () => {
      if (isClosed) return;
      isClosed = true;
      toast.classList.add('toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        window.Toast.processQueue();
      }, 300); // Wait for out animation
    };
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', closeToast);
    
    const timer = toast.querySelector('.toast-timer');
    timer.addEventListener('animationend', closeToast);
  }
};
