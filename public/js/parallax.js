// ============================================
// ALPHA — Parallax & 3D Effects
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  
  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    // Normalize to -0.5 to 0.5
    targetX = (e.clientX / window.innerWidth) - 0.5;
    targetY = (e.clientY / window.innerHeight) - 0.5;
  });
  
  // Smooth animation loop using requestAnimationFrame (Easing-Gentle feel)
  function animateParallax() {
    // LERP (Linear Interpolation) for that smooth lagging 3D feel
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;
    
    // Apply 3D tilt to currently hovered card
    const hoveredCard = document.querySelector('.kanban-card:hover:not(.dragging)');
    if (hoveredCard) {
      // Calculate mouse position relative to the card center for precise tilt
      const rect = hoveredCard.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      
      const tiltX = ((targetY * window.innerHeight + window.innerHeight/2) - cardCenterY) * -0.05;
      const tiltY = ((targetX * window.innerWidth + window.innerWidth/2) - cardCenterX) * 0.05;
      
      // Cap the rotation angles
      const rotX = Math.max(-8, Math.min(8, tiltX));
      const rotY = Math.max(-8, Math.min(8, tiltY));
      
      hoveredCard.style.transform = `
        perspective(1000px)
        rotateX(${rotX}deg)
        rotateY(${rotY}deg)
        translateZ(8px)
        translateY(-2px)
      `;
    }
    
    // Reset transform when not hovering
    document.querySelectorAll('.kanban-card:not(:hover):not(.dragging)').forEach(card => {
      if (card.style.transform.includes('perspective')) {
        card.style.transform = '';
      }
    });
    
    requestAnimationFrame(animateParallax);
  }
  
  animateParallax();
});
