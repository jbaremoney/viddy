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
  arrow.style.transition = 'all 0.2s ease';
  
  // Add hover effect
  arrow.addEventListener('mouseenter', () => {
    arrow.style.background = 'rgba(160, 132, 232, 0.95)';
    arrow.style.transform = 'translateY(-50%) translateX(-2px)'; // Slide out slightly
  });
  
  arrow.addEventListener('mouseleave', () => {
    arrow.style.background = 'rgba(160, 132, 232, 0.8)';
    arrow.style.transform = 'translateY(-50%) translateX(0)';
  });
  
  // Left-pointing arrow SVG
  arrow.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  `;
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