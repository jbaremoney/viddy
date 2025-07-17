console.log('Viddy content script loaded!');

function injectArrow(player) {
  if (document.getElementById('viddy-arrow')) return;
  console.log('Injecting Viddy arrow!');
  const arrow = document.createElement('div');
  arrow.id = 'viddy-arrow';
  arrow.style.position = 'absolute';
  arrow.style.top = '50%';
  arrow.style.right = '8px';
  arrow.style.transform = 'translateY(-50%)';
  arrow.style.width = '32px';
  arrow.style.height = '32px';
  arrow.style.background = 'rgba(160, 132, 232, 0.7)';
  arrow.style.borderRadius = '50%';
  arrow.style.display = 'flex';
  arrow.style.alignItems = 'center';
  arrow.style.justifyContent = 'center';
  arrow.style.cursor = 'pointer';
  arrow.style.zIndex = '10000';
  arrow.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  arrow.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6" />
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
