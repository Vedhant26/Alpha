// ============================================
// ALPHA — Chrome Extension Content Script
// ============================================

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    // Get user's highlighted text
    const selection = window.getSelection().toString().trim();
    
    sendResponse({
      success: true,
      data: {
        title: document.title,
        url: window.location.href,
        selection: selection
      }
    });
  }
  return true;
});
