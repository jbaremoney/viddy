import { openChatWindow, closeChatWindow, isChatOpen } from './chat.js';

export function injectArrow(player) {
  if (document.getElementById('viddy-arrow')) return;
  console.log('Injecting Viddy arrow!');
  const arrow = document.createElement('div');
  arrow.id = 'viddy-arrow';
  arrow.style.position = 'absolute';
  arrow.style.top = '50%';
  arrow.style.right = '0px';
  arrow.style.transform = 'translateY(-50%)';
  arrow.style.width = '40px';
  arrow.style.height = '28px';
  arrow.style.background = 'rgba(160, 132, 232, 0.8)';
  arrow.style.borderRadius = '8px 0 0 8px';
  arrow.style.display = 'flex';
  arrow.style.alignItems = 'center';
  arrow.style.justifyContent = 'center';
  arrow.style.cursor = 'pointer';
  arrow.style.zIndex = '10000';
  arrow.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.2)';
  arrow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
  arrow.style.userSelect = 'none';
  
  let isDragging = false;
  let hasMoved = false;
  let startY = 0;
  let startTop = 0;
  const dragThreshold = 5;
  
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
  
  arrow.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    startY = e.clientY;
    
    const rect = arrow.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    startTop = rect.top - playerRect.top + (arrow.offsetHeight / 2);
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = Math.abs(e.clientY - startY);
    
    if (deltaY > dragThreshold && !hasMoved) {
      hasMoved = true;
      arrow.style.cursor = 'grabbing';
      arrow.style.transition = 'none';
      arrow.style.background = 'rgba(160, 132, 232, 1)';
      
      // Close chat if open during drag
      if (isChatOpen) {
        closeChatWindow();
      }
    }
    
    if (hasMoved) {
      const totalDeltaY = e.clientY - startY;
      let newTop = startTop + totalDeltaY;
      
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
    
    if (!hasMoved) {
      handleArrowClick(player, arrow);
    } else {
      const currentTop = parseInt(arrow.style.top);
      const playerHeight = player.offsetHeight;
      const percentage = (currentTop / playerHeight) * 100;
      chrome.storage.sync.set({ viddyArrowPosition: percentage });
    }
    
    arrow.style.cursor = 'pointer';
    arrow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
    arrow.style.background = 'rgba(160, 132, 232, 0.8)';
    
    hasMoved = false;
  });
  
  function handleArrowClick(player, arrow) {
    console.log('Viddy arrow clicked!');
    if (isChatOpen) {
      closeChatWindow();
    } else {
      openChatWindow(player, arrow);
    }
    arrow.style.background = 'rgba(160, 132, 232, 1)';
    setTimeout(() => {
      arrow.style.background = 'rgba(160, 132, 232, 0.8)';
    }, 150);
  }
  
  arrow.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  `;
  
  chrome.storage.sync.get(['viddyArrowPosition'], (result) => {
    if (result.viddyArrowPosition !== undefined) {
      const savedTop = (result.viddyArrowPosition / 100) * player.offsetHeight;
      arrow.style.top = savedTop + 'px';
      arrow.style.transform = 'translateY(-50%)';
    }
  });
  
  player.style.position = 'relative';
  player.appendChild(arrow);
}

export function removeArrow() {
  const arrow = document.getElementById('viddy-arrow');
  if (arrow) {
    arrow.remove();
    console.log('Removed Viddy arrow!');
  }
  // Also remove chat window if present
  if (window.chatWindow) {
    window.chatWindow.remove();
    window.chatWindow = null;
    window.isChatOpen = false;
  }
} 