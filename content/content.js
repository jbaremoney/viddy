console.log('Viddy content script loaded!');

function injectArrow(player) {
  if (document.getElementById('viddy-arrow')) return;
  console.log('Injecting Viddy arrow!');
  const arrow = document.createElement('div');
  arrow.id = 'viddy-arrow';
  arrow.style.position = 'absolute';
  arrow.style.top = '50%';
  arrow.style.right = '0px'; // Attached to the right edge
  arrow.style.transform = 'translateY(-50%)';
  arrow.style.width = '40px';
  arrow.style.height = '28px';
  arrow.style.background = 'rgba(160, 132, 232, 0.8)';
  arrow.style.borderRadius = '8px 0 0 8px'; // Rounded left side only
  arrow.style.display = 'flex';
  arrow.style.alignItems = 'center';
  arrow.style.justifyContent = 'center';
  arrow.style.cursor = 'pointer';
  arrow.style.zIndex = '10000';
  arrow.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.2)'; // Shadow on the left
  arrow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
  arrow.style.userSelect = 'none'; // Prevent text selection during drag
  
  let isDragging = false;
  let hasMoved = false;
  let startY = 0;
  let startTop = 0;
  const dragThreshold = 5; // pixels - minimum movement to count as drag
  
  // Add hover effect (only when not dragging)
  arrow.addEventListener('mouseenter', () => {
    if (!isDragging) {
      arrow.style.background = 'rgba(160, 132, 232, 0.95)';
      arrow.style.boxShadow = '-3px 0 12px rgba(0,0,0,0.3)';
    }
  });
  
  arrow.addEventListener('mouseleave', () => {
    if (!isDragging) {
      arrow.style.background = 'rgba(160, 132, 232, 0.8)';
      arrow.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.2)';
    }
  });
  
  // Click/Drag functionality
  arrow.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    startY = e.clientY;
    
    // Get the actual current position of the arrow
    const rect = arrow.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    startTop = rect.top - playerRect.top + (arrow.offsetHeight / 2);
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = Math.abs(e.clientY - startY);
    
    // Only start visual dragging if moved beyond threshold
    if (deltaY > dragThreshold && !hasMoved) {
      hasMoved = true;
      arrow.style.cursor = 'grabbing';
      arrow.style.transition = 'none'; // Disable transitions during drag
      arrow.style.background = 'rgba(160, 132, 232, 1)';
    }
    
    // Only update position if we've moved beyond threshold
    if (hasMoved) {
      const totalDeltaY = e.clientY - startY;
      let newTop = startTop + totalDeltaY;
      
      // Constrain to player bounds
      const arrowHeight = arrow.offsetHeight;
      const minTop = arrowHeight / 2;
      const maxTop = player.offsetHeight - (arrowHeight / 2);
      
      newTop = Math.max(minTop, Math.min(maxTop, newTop));
      
      arrow.style.top = newTop + 'px';
      arrow.style.transform = 'translateY(-50%)';
    }
    
    e.preventDefault();
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    
    // If we didn't move much, treat it as a click
    if (!hasMoved) {
      handleArrowClick();
    } else {
      // Save position to storage after drag
      const currentTop = parseInt(arrow.style.top);
      const playerHeight = player.offsetHeight;
      const percentage = (currentTop / playerHeight) * 100;
      chrome.storage.sync.set({ viddyArrowPosition: percentage });
    }
    
    // Reset visual state
    arrow.style.cursor = 'pointer';
    arrow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
    arrow.style.background = 'rgba(160, 132, 232, 0.8)';
    
    hasMoved = false;
  });
  
  // Handle what happens when arrow is clicked
  function handleArrowClick() {
    console.log('Viddy arrow clicked!');
    // Add your click functionality here
    // For example: open a modal, trigger an action, etc.
    
    // Temporary visual feedback for click
    arrow.style.background = 'rgba(160, 132, 232, 1)';
    setTimeout(() => {
      arrow.style.background = 'rgba(160, 132, 232, 0.8)';
    }, 150);
  }
  
  // Left-pointing arrow SVG
  arrow.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  `;
  
  // Restore saved position
  chrome.storage.sync.get(['viddyArrowPosition'], (result) => {
    if (result.viddyArrowPosition !== undefined) {
      const savedTop = (result.viddyArrowPosition / 100) * player.offsetHeight;
      arrow.style.top = savedTop + 'px';
    }
  });
  
  player.style.position = 'relative';
  player.appendChild(arrow);
}

function removeArrow() {
  const arrow = document.getElementById('viddy-arrow');
  if (arrow) {
    arrow.remove();
    console.log('Removed Viddy arrow!');
  }
}

function tryInjectIfEnabled(enabled) {
  const player = document.querySelector('.html5-video-player');
  if (player) {
    if (enabled) {
      injectArrow(player);
    } else {
      removeArrow();
    }
    return true;
  }
  return false;
}

(function main() {
  // Initial check
  chrome.storage.sync.get(['viddyEnabled'], (result) => {
    const enabled = result.viddyEnabled !== false; // default to true
    if (tryInjectIfEnabled(enabled)) return;
    // If not found, observe for DOM changes
    const observer = new MutationObserver(() => {
      if (tryInjectIfEnabled(enabled)) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  // Listen for changes to viddyEnabled
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && 'viddyEnabled' in changes) {
      const enabled = changes.viddyEnabled.newValue !== false;
      tryInjectIfEnabled(enabled);
    }
  });
})();