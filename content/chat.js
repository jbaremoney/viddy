// Chat window logic module
export let chatWindow = null;
export let isChatOpen = false;
export let isGhostMode = false;
export let chatDragState = { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
export let resizeState = { isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0, direction: '' };

export function createChatWindow(player, arrow) {
  if (chatWindow) return chatWindow;
  if (chatWindow) return chatWindow;
  
  const chat = document.createElement('div');
  chat.id = 'viddy-chat';
  chat.style.position = 'absolute';
  chat.style.right = '45px';
  chat.style.top = arrow.style.top;
  chat.style.transform = 'translateY(-50%)';
  chat.style.width = '350px';
  chat.style.height = '400px';
  chat.style.minWidth = '280px';
  chat.style.minHeight = '200px';
  chat.style.maxWidth = '600px';
  chat.style.maxHeight = '80vh';
  chat.style.background = '#18122B';
  chat.style.border = '1px solid #393053';
  chat.style.borderRadius = '12px';
  chat.style.boxShadow = '-4px 4px 20px rgba(0,0,0,0.3)';
  chat.style.zIndex = '10001';
  chat.style.display = 'none';
  chat.style.flexDirection = 'column';
  chat.style.overflow = 'hidden';
  chat.style.resize = 'none'; // We'll handle resizing manually
  
  // Chat header (draggable)
  const header = document.createElement('div');
  header.style.background = '#231942';
  header.style.color = '#A084E8';
  header.style.padding = '12px 16px';
  header.style.fontFamily = 'Inter, Arial, sans-serif';
  header.style.fontWeight = '600';
  header.style.fontSize = '14px';
  header.style.borderBottom = '1px solid #393053';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.cursor = 'move';
  header.style.userSelect = 'none';
  
  const title = document.createElement('span');
  title.textContent = 'Viddy Chat';
  header.appendChild(title);
  
  // Window controls
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.alignItems = 'center';
  
  // Ghost mode button
  const ghostBtn = document.createElement('button');
  ghostBtn.innerHTML = '👻';
  ghostBtn.style.background = 'none';
  ghostBtn.style.border = 'none';
  ghostBtn.style.color = '#A084E8';
  ghostBtn.style.fontSize = '14px';
  ghostBtn.style.cursor = 'pointer';
  ghostBtn.style.padding = '2px 6px';
  ghostBtn.style.borderRadius = '3px';
  ghostBtn.style.transition = 'background 0.2s';
  ghostBtn.title = 'Ghost Mode (make transparent)';
  ghostBtn.addEventListener('mouseenter', () => ghostBtn.style.background = 'rgba(160, 132, 232, 0.2)');
  ghostBtn.addEventListener('mouseleave', () => ghostBtn.style.background = 'none');
  ghostBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGhostMode();
  });
  
  // Maximize button
  const maximizeBtn = document.createElement('button');
  maximizeBtn.innerHTML = '□';
  maximizeBtn.style.background = 'none';
  maximizeBtn.style.border = 'none';
  maximizeBtn.style.color = '#A084E8';
  maximizeBtn.style.fontSize = '14px';
  maximizeBtn.style.cursor = 'pointer';
  maximizeBtn.style.padding = '2px 6px';
  maximizeBtn.style.borderRadius = '3px';
  maximizeBtn.style.transition = 'background 0.2s';
  maximizeBtn.addEventListener('mouseenter', () => maximizeBtn.style.background = 'rgba(160, 132, 232, 0.2)');
  maximizeBtn.addEventListener('mouseleave', () => maximizeBtn.style.background = 'none');
  maximizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMaximize();
  });
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#A084E8';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '2px 6px';
  closeBtn.style.borderRadius = '3px';
  closeBtn.style.transition = 'background 0.2s';
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(232, 84, 84, 0.2)');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeChatWindow();
  });
  
  controls.appendChild(ghostBtn);
  controls.appendChild(maximizeBtn);
  controls.appendChild(closeBtn);
  header.appendChild(controls);
  
  // Header drag functionality
  header.addEventListener('mousedown', (e) => {
    if (e.target === header || e.target === title) {
      startChatDrag(e);
    }
  });
  
  // Chat messages area
  const messagesArea = document.createElement('div');
  messagesArea.id = 'viddy-messages';
  messagesArea.style.flex = '1';
  messagesArea.style.padding = '16px';
  messagesArea.style.overflowY = 'auto';
  messagesArea.style.color = '#EDE4FF';
  messagesArea.style.fontFamily = 'Inter, Arial, sans-serif';
  messagesArea.style.fontSize = '14px';
  messagesArea.style.lineHeight = '1.4';
  
  // Chat input area
  const inputArea = document.createElement('div');
  inputArea.style.padding = '12px 16px';
  inputArea.style.borderTop = '1px solid #393053';
  inputArea.style.display = 'flex';
  inputArea.style.gap = '8px';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask about this video...';
  input.style.flex = '1';
  input.style.background = '#231942';
  input.style.border = '1px solid #393053';
  input.style.borderRadius = '6px';
  input.style.padding = '8px 12px';
  input.style.color = '#EDE4FF';
  input.style.fontFamily = 'Inter, Arial, sans-serif';
  input.style.fontSize = '14px';
  input.style.outline = 'none';
  
  // Prevent YouTube keyboard shortcuts when typing
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to YouTube
  });
  
  input.addEventListener('keyup', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to YouTube
  });
  
  input.addEventListener('keypress', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to YouTube
    if (e.key === 'Enter' && !sendBtn.disabled) { // Only send if enabled
      sendMessage(input.value, messagesArea, input);
    }
  });
  
  // Also prevent focus-related issues
  input.addEventListener('focus', (e) => {
    e.stopPropagation();
  });
  
  input.addEventListener('blur', (e) => {
    e.stopPropagation();
  });
  
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.disabled = true; // Start disabled
  sendBtn.style.background = '#A084E8';
  sendBtn.style.color = '#18122B';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '6px';
  sendBtn.style.padding = '8px 16px';
  sendBtn.style.fontFamily = 'Inter, Arial, sans-serif';
  sendBtn.style.fontSize = '14px';
  sendBtn.style.fontWeight = '600';
  sendBtn.style.cursor = 'pointer';
  sendBtn.style.opacity = '0.5'; // Start disabled
  sendBtn.style.transition = 'opacity 0.2s';
  
  // Function to update button state
  function updateSendButton() {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    
    if (hasText) {
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
    } else {
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
    }
  }
  
  // Listen for input changes
  input.addEventListener('input', updateSendButton);
  input.addEventListener('keyup', updateSendButton);
  
  // Resize handles
  const resizeHandles = createResizeHandles();
  
  // Event listeners
  sendBtn.addEventListener('click', () => sendMessage(input.value, messagesArea, input));
  
  // Assemble chat window
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  chat.appendChild(header);
  chat.appendChild(messagesArea);
  chat.appendChild(inputArea);
  
  // Prevent YouTube keyboard shortcuts from affecting the entire chat window
  chat.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });
  
  chat.addEventListener('keyup', (e) => {
    e.stopPropagation();
  });
  
  chat.addEventListener('keypress', (e) => {
    e.stopPropagation();
  });
  
  // Special ghost mode interaction
  chat.addEventListener('mouseenter', () => {
    if (isGhostMode) {
      // Temporarily increase opacity on hover
      chatWindow.style.opacity = '0.8';
    }
  });
  
  chat.addEventListener('mouseleave', () => {
    if (isGhostMode) {
      // Return to ghost mode opacity
      chatWindow.style.opacity = '0.3';
    }
  });
  
  // Add resize handles
  resizeHandles.forEach(handle => chat.appendChild(handle));
  
  player.appendChild(chat);
  chatWindow = chat;
  
  return chat;
}

export function createResizeHandles() {
  const handles = [];
  const directions = [
    { name: 'n', cursor: 'n-resize', style: { top: '0', left: '8px', right: '8px', height: '4px' } },
    { name: 's', cursor: 's-resize', style: { bottom: '0', left: '8px', right: '8px', height: '4px' } },
    { name: 'e', cursor: 'e-resize', style: { right: '0', top: '8px', bottom: '8px', width: '4px' } },
    { name: 'w', cursor: 'w-resize', style: { left: '0', top: '8px', bottom: '8px', width: '4px' } },
    { name: 'ne', cursor: 'ne-resize', style: { top: '0', right: '0', width: '8px', height: '8px' } },
    { name: 'nw', cursor: 'nw-resize', style: { top: '0', left: '0', width: '8px', height: '8px' } },
    { name: 'se', cursor: 'se-resize', style: { bottom: '0', right: '0', width: '8px', height: '8px' } },
    { name: 'sw', cursor: 'sw-resize', style: { bottom: '0', left: '0', width: '8px', height: '8px' } }
  ];
  
  directions.forEach(dir => {
    const handle = document.createElement('div');
    handle.style.position = 'absolute';
    handle.style.cursor = dir.cursor;
    handle.style.zIndex = '10002';
    
    Object.assign(handle.style, dir.style);
    
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startResize(e, dir.name);
    });
    
    handles.push(handle);
  });
  
  return handles;
}

export function startChatDrag(e) {
  chatDragState.isDragging = true;
  chatDragState.startX = e.clientX;
  chatDragState.startY = e.clientY;
  
  const rect = chatWindow.getBoundingClientRect();
  chatDragState.startLeft = rect.left;
  chatDragState.startTop = rect.top;
  
  chatWindow.style.transition = 'none';
  e.preventDefault();
}


export function startResize(e, direction) {
  resizeState.isResizing = true;
  resizeState.direction = direction;
  resizeState.startX = e.clientX;
  resizeState.startY = e.clientY;
  
  const rect = chatWindow.getBoundingClientRect();
  resizeState.startWidth = rect.width;
  resizeState.startHeight = rect.height;
  resizeState.startLeft = rect.left;
  resizeState.startTop = rect.top;
  
  chatWindow.style.transition = 'none';
  e.preventDefault();
}

export function toggleGhostMode() {
  const messagesArea = chatWindow.querySelector('#viddy-messages');
  
  if (isGhostMode) {
    // Exit ghost mode - restore full opacity
    chatWindow.style.opacity = '1';
    messagesArea.style.pointerEvents = 'auto';
    isGhostMode = false;
    
    // Update button appearance
    const ghostBtn = chatWindow.querySelector('button[title*="Ghost"]');
    if (ghostBtn) {
      ghostBtn.style.background = 'none';
      ghostBtn.innerHTML = '👻';
    }
  } else {
    // Enter ghost mode - make transparent
    chatWindow.style.opacity = '0.3';
    messagesArea.style.pointerEvents = 'none'; // Only disable messages area
    isGhostMode = true;
    
    // Update button appearance to show it's active
    const ghostBtn = chatWindow.querySelector('button[title*="Ghost"]');
    if (ghostBtn) {
      ghostBtn.style.background = 'rgba(160, 132, 232, 0.3)';
      ghostBtn.innerHTML = '👁️'; // Eye icon to show it's "watching"
    }
  }
}

export function toggleMaximize() {
  const player = document.querySelector('.html5-video-player');
  
  if (chatWindow.dataset.isMaximized === 'true') {
    // Restore
    chatWindow.style.width = chatWindow.dataset.previousWidth || '350px';
    chatWindow.style.height = chatWindow.dataset.previousHeight || '400px';
    chatWindow.style.right = chatWindow.dataset.previousRight || '45px';
    chatWindow.style.top = chatWindow.dataset.previousTop || '50%';
    chatWindow.style.transform = 'translateY(-50%)';
    chatWindow.dataset.isMaximized = 'false';
  } else {
    // Maximize
    chatWindow.dataset.previousWidth = chatWindow.style.width;
    chatWindow.dataset.previousHeight = chatWindow.style.height;
    chatWindow.dataset.previousRight = chatWindow.style.right;
    chatWindow.dataset.previousTop = chatWindow.style.top;
    
    chatWindow.style.width = `${player.offsetWidth - 20}px`;
    chatWindow.style.height = `${player.offsetHeight - 20}px`;
    chatWindow.style.right = '10px';
    chatWindow.style.top = '10px';
    chatWindow.style.transform = 'none';
    chatWindow.dataset.isMaximized = 'true';
  }
}

export async function sendMessage(message, messagesArea, input) {
  if (!message.trim()) return;
  
  // Add user message
  const userMessage = addMessage(messagesArea, message, 'user');
  input.value = '';
  
  // Update send button state after clearing input
  const sendBtn = input.nextElementSibling;
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.5';
  sendBtn.style.cursor = 'not-allowed';
  
  // Show loading message
  const loadingMessage = addMessage(messagesArea, "Analyzing video...", 'ai');
  
  try {
    // Create payload with video data
    const payload = createAskPayload(message);
    
    // Validate we're on a YouTube video
    if (!payload.video_id) {
      updateMessage(loadingMessage, "Please navigate to a YouTube video first.");
      return;
    }
    
    console.log('Sending payload:', payload);
    
    // Call your backend - REPLACE WITH YOUR ACTUAL VERCEL URL
    const response = await fetch('https://your-backend-url.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('Backend response:', result);
    
    // Handle response
    if (result.error) {
      updateMessage(loadingMessage, `Error: ${result.error}`);
    } else {
      updateMessage(loadingMessage, result.answer || result.message || "No response received");
    }
    
  } catch (error) {
    console.error('Backend request failed:', error);
    updateMessage(loadingMessage, "Sorry, I couldn't connect to the server. Please try again.");
  }
}

export function updateMessage(messageElement, newText) {
  if (messageElement) {
    messageElement.textContent = newText;
  }
}

export function addMessage(messagesArea, text, sender) {
  const message = document.createElement('div');
  message.style.marginBottom = '12px';
  message.style.padding = '8px 12px';
  message.style.borderRadius = '8px';
  message.style.maxWidth = '85%';
  
  if (sender === 'user') {
    message.style.background = '#A084E8';
    message.style.color = '#18122B';
    message.style.marginLeft = 'auto';
    message.style.textAlign = 'right';
  } else {
    message.style.background = '#231942';
    message.style.color = '#EDE4FF';
    message.style.marginRight = 'auto';
  }
  
  message.textContent = text;
  messagesArea.appendChild(message);
  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  return message; // Return the element so we can update it later
}

export function openChatWindow(player, arrow) {
  if (!chatWindow) {
    createChatWindow(player, arrow);
  }
  
  // Position chat relative to arrow
  chatWindow.style.top = arrow.style.top;
  chatWindow.style.display = 'flex';
  isChatOpen = true;
  
  // Focus on input
  const input = chatWindow.querySelector('input');
  if (input) input.focus();
}

export function closeChatWindow() {
  if (chatWindow) {
    chatWindow.style.display = 'none';
    isChatOpen = false;
  }
}