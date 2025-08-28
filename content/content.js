console.log('Viddy content script loaded!');

// Chat window state
let chatWindow = null;
let isChatOpen = false;
let isGhostMode = false;
let chatDragState = { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
let resizeState = { isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0, direction: '' };
let currentVideoId = null;
let isVideoInitializing = false;
let initStatusPollingInterval = null;

function getOrCreateChatId() {
    let chatId = sessionStorage.getItem('viddy_chat_id');
    if (!chatId) {
      chatId = crypto.randomUUID();
      sessionStorage.setItem('viddy_chat_id', chatId);
    }
    return chatId;
  }

function createChatId() {
    const chatId = crypto.randomUUID();
    sessionStorage.setItem('viddy_chat_id', chatId);
    return chatId;
  }
  

function extractVideoId(url = window.location.href) {
  const patterns = [
    /[?&]v=([^&]+)/,                // youtube.com/watch?v=VIDEOID
    /youtu\.be\/([^?&]+)/,          // youtu.be/VIDEOID
    /embed\/([^?&]+)/,              // youtube.com/embed/VIDEOID
    /youtube\.com\/shorts\/([^?&]+)/ // youtube.com/shorts/VIDEOID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getCurrentTimestamp(){
    const video = document.getElementsByClassName("video-stream")[0];
    return video ? Math.floor(video.currentTime) : 0;
}

function createAskPayload(userPrompt, isFirstMessage = false){
    const videoId = extractVideoId();
    console.log('[createAskPayload] videoId:', videoId);
    
    let chatId;
    if (isFirstMessage) {
      // Create new chat ID for first message
      chatId = createChatId();
      console.log('[createAskPayload] Created new chat session:', chatId);
    } else {
      // Use existing chat ID
      chatId = getOrCreateChatId();
    }
    
    return {
        videoId,
        chatId,
        current_timestamp: getCurrentTimestamp(), 
        prompt: userPrompt
    };
}

function createChatWindow(player, arrow) {
  if (chatWindow) return chatWindow;
  
  const chat = document.createElement('div');
  chat.id = 'viddy-chat';
  chat.style.position = 'absolute';
  chat.style.right = '45px';
  chat.style.top = '50%';
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
  chat.style.pointerEvents = 'auto'; // Ensure chat window can receive events
  chat.style.isolation = 'isolate'; // Create a new stacking context
  chat.style.contain = 'layout style paint'; // Prevent layout effects on parent
  
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
  title.id = 'viddy-chat-title';
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
  
  // scrolling intercept
  chat.addEventListener('wheel', (e) => {
    e.stopPropagation(); // Prevent YouTube from getting the scroll event
    e.preventDefault(); // Prevent default scroll behavior
    
    // Apply scroll to the messages area instead
    const messagesArea = chat.querySelector('#viddy-messages');
    if (messagesArea) {
      messagesArea.scrollTop += e.deltaY;
    }
   }, { passive: false }); // passive: false allows preventDefault to work
  
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
    if (e.key === 'Enter') {
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
  sendBtn.style.background = '#A084E8';
  sendBtn.style.color = '#18122B';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '6px';
  sendBtn.style.padding = '8px 16px';
  sendBtn.style.fontFamily = 'Inter, Arial, sans-serif';
  sendBtn.style.fontSize = '14px';
  sendBtn.style.fontWeight = '600';
  sendBtn.style.cursor = 'pointer';
  
  
  
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


function createResizeHandles() {
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

function startChatDrag(e) {
  chatDragState.isDragging = true;
  chatDragState.startX = e.clientX;
  chatDragState.startY = e.clientY;
  
  const rect = chatWindow.getBoundingClientRect();
  chatDragState.startLeft = rect.left;
  chatDragState.startTop = rect.top;
  
  chatWindow.style.transition = 'none';
  e.preventDefault();
}

function startResize(e, direction) {
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

function toggleGhostMode() {
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

function toggleMaximize() {
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

// Helper function to update an existing message
function updateMessage(messageElement, newText) {
    if (messageElement) {
      messageElement.textContent = newText;
    }
  }

async function sendMessage(message, messagesArea, input) {
if (!message.trim()) return;

// Initialize current video ID if not set
if (!currentVideoId) {
  currentVideoId = extractVideoId();
}

// Check if video is still initializing
if (isVideoInitializing) {
  const userMessage = addMessage(messagesArea, message, 'user');
  input.value = '';
  const holdMessage = addMessage(messagesArea, "⏳ Hold on bro, video is still initializing...", 'ai');
  return;
}

// Check if this is the first message in the session
const isFirstMessage = !sessionStorage.getItem('viddy_chat_id');

// Add user message
const userMessage = addMessage(messagesArea, message, 'user');
input.value = '';

// Show loading message
const loadingMessage = addMessage(messagesArea, "Analyzing video...", 'ai');

try {
    // Create payload with video data
    const payload = createAskPayload(message, isFirstMessage);
    
    // Validate we're on a YouTube video
    if (!payload.videoId) {
    console.log('[sendMessage] No videoId found, payload:', payload, 'window.location.href:', window.location.href);
    updateMessage(loadingMessage, "Please navigate to a YouTube video first.");
    return;
    }
    
    console.log('Sending payload:', payload);
    
    // Call your backend
    const response = await fetch('https://viddy-backend.onrender.com/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
    });

    // --- RAW RESPONSE DEBUGGING ---
    const rawText = await response.text();
    console.log("***RAW RESPONSE:", rawText);

    let result;
    try {
    result = JSON.parse(rawText);
    console.log('Backend response:', result);
    } catch (e) {
    console.error('Could not parse JSON from backend!', e);
    updateMessage(loadingMessage, "Server error: response not valid JSON.");
    return;
    }
    // -----------------------------

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


function addMessage(messagesArea, text, sender) {
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
  
  return message; // Add this return statement
}

function openChatWindow(player, arrow) {
  if (!chatWindow) {
    createChatWindow(player, arrow);
  }
  
  // Ensure the video player maintains its layout
  const playerRect = player.getBoundingClientRect();
  const originalPlayerStyle = {
    position: player.style.position,
    overflow: player.style.overflow,
    transform: player.style.transform
  };
  
  // Set player to relative positioning if not already set
  if (player.style.position !== 'relative') {
    player.style.position = 'relative';
  }
  
  // Ensure the video player's layout is stable
  // Don't modify the video element directly to avoid layout issues
  
  // Position chat relative to arrow with better positioning logic
  const arrowTop = arrow.style.top;
  const arrowHeight = arrow.offsetHeight;
  const chatHeight = chatWindow.offsetHeight;
  
  // Calculate the optimal position to center the chat window relative to the arrow
  let topPosition;
  if (arrowTop.includes('%')) {
    // If arrow is positioned by percentage, maintain that relationship
    const percentage = parseFloat(arrowTop);
    topPosition = `${percentage}%`;
    chatWindow.style.transform = 'translateY(-50%)';
  } else {
    // If arrow is positioned by pixels, calculate the center position
    const arrowTopPx = parseFloat(arrowTop);
    const playerHeight = player.offsetHeight;
    
    // Ensure the chat window stays within the player bounds with some padding
    const minTop = 10; // Add some padding from the top
    const maxTop = playerHeight - chatHeight - 10; // Add some padding from the bottom
    const centerTop = arrowTopPx - (chatHeight / 2);
    
    topPosition = Math.max(minTop, Math.min(maxTop, centerTop)) + 'px';
    chatWindow.style.transform = 'none';
  }
  
  chatWindow.style.top = topPosition;
  chatWindow.style.display = 'flex';
  isChatOpen = true;
  
  // Show welcome message based on initialization status
  const messagesArea = chatWindow.querySelector('#viddy-messages');
  if (messagesArea && messagesArea.children.length === 0) {
    if (isVideoInitializing) {
      addMessage(messagesArea, "⏳ Video is initializing... Please wait a moment before asking questions.", 'ai');
    } else {
      addMessage(messagesArea, "👋 Hi! I'm ready to help you with this video. Ask me anything!", 'ai');
    }
  }
  
  // Add a small delay to ensure stable positioning
  setTimeout(() => {
    // Re-check positioning after a brief delay to prevent layout glitches
    if (chatWindow && isChatOpen) {
      const currentTop = chatWindow.style.top;
      const playerHeight = player.offsetHeight;
      const chatHeight = chatWindow.offsetHeight;
      
      // Ensure the chat window is still within bounds
      if (currentTop.includes('px')) {
        const topPx = parseFloat(currentTop);
        const minTop = 10; // Add some padding from the top
        const maxTop = playerHeight - chatHeight - 10; // Add some padding from the bottom
        
        if (topPx < minTop || topPx > maxTop) {
          const newTop = Math.max(minTop, Math.min(maxTop, topPx));
          chatWindow.style.top = newTop + 'px';
        }
      }
      
      // Force a layout recalculation to prevent glitches
      chatWindow.offsetHeight; // Trigger reflow
    }
  }, 50);
  
  // Focus on input
  const input = chatWindow.querySelector('input');
  if (input) input.focus();
}

function clearChatSession() {
  // Clear session storage
  sessionStorage.removeItem('viddy_chat_id');
  
  // Stop any ongoing initialization polling
  stopInitStatusPolling();
  isVideoInitializing = false;
  
  // Clear chat messages if window exists
  if (chatWindow) {
    const messagesArea = chatWindow.querySelector('#viddy-messages');
    if (messagesArea) {
      messagesArea.innerHTML = '';
    }
  }
  
  console.log('[clearChatSession] Chat session cleared for new video');
}

function closeChatWindow() {
  if (chatWindow) {
    chatWindow.style.display = 'none';
    isChatOpen = false;
    
    // Restore video player to its original state if needed
    const player = document.querySelector('.html5-video-player');
    if (player) {
      // Only restore if we're not in a state where we need relative positioning
      // (e.g., if the arrow is still present)
      const arrow = document.getElementById('viddy-arrow');
      if (!arrow) {
        player.style.position = '';
      }
    }
  }
}

function injectArrow(player) {
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
    
    // Visual feedback
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
  
  if (chatWindow) {
    chatWindow.remove();
    chatWindow = null;
    isChatOpen = false;
  }
  
  // Stop any ongoing initialization polling
  stopInitStatusPolling();
  isVideoInitializing = false;
}

async function checkVideoChange() {
  const newVideoId = extractVideoId();
  
  // If we have a previous video ID and it's different from the current one
  if (currentVideoId && newVideoId && currentVideoId !== newVideoId) {
    console.log('[checkVideoChange] Video changed from', currentVideoId, 'to', newVideoId);
    clearChatSession();
    
    // Close chat window if it's open
    if (isChatOpen) {
      closeChatWindow();
    }
    
    // Initialize the new video
    await initializeVideo(newVideoId);
  } else if (newVideoId && !currentVideoId) {
    // First time loading a video (currentVideoId is null/undefined)
    console.log('[checkVideoChange] First video loaded:', newVideoId);
    await initializeVideo(newVideoId);
  }
  
  // Update current video ID
  currentVideoId = newVideoId;
}

async function initializeVideo(videoId) {
  try {
    console.log('[initializeVideo] INITIALIZING VIDEO:', videoId);
    isVideoInitializing = true;
    
    const response = await fetch('https://viddy-backend.onrender.com/api/init_video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: videoId })
    });

    const data = await response.json();
    console.log('[initializeVideo] Response:', data);
    
    if (data.status === 'error') {
      console.error('[initializeVideo] Error initializing video:', data.message);
      isVideoInitializing = false;
      updateChatTitle('error');
    } else {
      console.log('[initializeVideo] Video initialization started:', data.message);
      updateChatTitle('initializing');
      // Start polling for initialization status
      startInitStatusPolling(videoId);
    }
    
  } catch (error) {
    console.error('[initializeVideo] Failed to initialize video:', error);
    isVideoInitializing = false;
  }
}

async function checkVideoStatus(videoId) {
  try {
    const response = await fetch(`https://viddy-backend.onrender.com/api/video_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check video status:', error);
    throw error;
  }
}

function startInitStatusPolling(videoId) {
  // Clear any existing polling
  stopInitStatusPolling();
  
  console.log('[startInitStatusPolling] Starting to poll for video initialization status');
  
  // Poll every 2 seconds
  initStatusPollingInterval = setInterval(() => {
    checkVideoStatus(videoId);
  }, 2000);
  
  // Also check immediately
  checkVideoStatus(videoId);
}

function stopInitStatusPolling() {
  if (initStatusPollingInterval) {
    clearInterval(initStatusPollingInterval);
    initStatusPollingInterval = null;
    console.log('[stopInitStatusPolling] Stopped polling for initialization status');
  }
}

function updateChatTitle(status) {
  const title = document.getElementById('viddy-chat-title');
  if (title) {
    if (status === 'initializing') {
      title.textContent = 'Viddy Chat ⏳';
    } else if (status === 'ready') {
      title.textContent = 'Viddy Chat ✅';
    } else if (status === 'error') {
      title.textContent = 'Viddy Chat ❌';
    } else {
      title.textContent = 'Viddy Chat';
    }
  }
}

async function tryInjectIfEnabled(enabled) {
  const player = document.querySelector('.html5-video-player');
  if (player) {
    if (enabled) {
      // Check for video change before injecting
      await checkVideoChange();
      injectArrow(player);
    } else {
      removeArrow();
    }
    return true;
  }
  return false;
}

(function main() {
  // Initialize current video ID
  currentVideoId = extractVideoId();
  
  chrome.storage.sync.get(['viddyEnabled'], async (result) => {
    const enabled = result.viddyEnabled !== false;
    if (await tryInjectIfEnabled(enabled)) return;
    const observer = new MutationObserver(async () => {
      if (await tryInjectIfEnabled(enabled)) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync' && 'viddyEnabled' in changes) {
      const enabled = changes.viddyEnabled.newValue !== false;
      await tryInjectIfEnabled(enabled);
    }
  });
  
  // Listen for URL changes (YouTube SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(async () => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[main] URL changed to:', url);
      await checkVideoChange();
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Global mouse handlers for drag and resize
  document.addEventListener('mousemove', (e) => {
    if (chatDragState.isDragging) {
      const deltaX = e.clientX - chatDragState.startX;
      const deltaY = e.clientY - chatDragState.startY;
      
      const newLeft = chatDragState.startLeft + deltaX;
      const newTop = chatDragState.startTop + deltaY;
      
      // Convert to right/top positioning for consistency
      const player = document.querySelector('.html5-video-player');
      const playerRect = player.getBoundingClientRect();
      const chatRect = chatWindow.getBoundingClientRect();
      
      const rightPos = playerRect.width - (newLeft - playerRect.left) - chatRect.width;
      const topPos = newTop - playerRect.top;
      
      chatWindow.style.right = Math.max(0, Math.min(playerRect.width - chatRect.width, rightPos)) + 'px';
      chatWindow.style.top = Math.max(0, Math.min(playerRect.height - chatRect.height, topPos)) + 'px';
      chatWindow.style.transform = 'none';
      
      e.preventDefault();
    }
    
    if (resizeState.isResizing) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newLeft = resizeState.startLeft;
      let newTop = resizeState.startTop;
      
      const direction = resizeState.direction;
      
      // Handle width changes
      if (direction.includes('e')) {
        newWidth = Math.max(280, Math.min(600, resizeState.startWidth + deltaX));
      } else if (direction.includes('w')) {
        newWidth = Math.max(280, Math.min(600, resizeState.startWidth - deltaX));
        newLeft = resizeState.startLeft + (resizeState.startWidth - newWidth);
      }
      
      // Handle height changes
      if (direction.includes('s')) {
        newHeight = Math.max(200, resizeState.startHeight + deltaY);
      } else if (direction.includes('n')) {
        newHeight = Math.max(200, resizeState.startHeight - deltaY);
        newTop = resizeState.startTop + (resizeState.startHeight - newHeight);
      }
      
      // Apply changes
      chatWindow.style.width = newWidth + 'px';
      chatWindow.style.height = newHeight + 'px';
      
      // Convert position back to right/top for consistency
      const player = document.querySelector('.html5-video-player');
      const playerRect = player.getBoundingClientRect();
      
      if (direction.includes('w')) {
        const rightPos = playerRect.width - (newLeft - playerRect.left) - newWidth;
        chatWindow.style.right = Math.max(0, rightPos) + 'px';
      }
      
      if (direction.includes('n')) {
        chatWindow.style.top = Math.max(0, newTop - playerRect.top) + 'px';
        chatWindow.style.transform = 'none';
      }
      
      e.preventDefault();
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (chatDragState.isDragging) {
      chatDragState.isDragging = false;
      chatWindow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
    }
    
    if (resizeState.isResizing) {
      resizeState.isResizing = false;
      chatWindow.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
    }
  });
})();