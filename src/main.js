import './style.css'

// Application state
let currentMode = 'edit'; // 'edit' or 'play'
let clips = [
  { key: 'A', url: '', timestamp: '' }
];
let backgroundTrack = '';
let backgroundAudioFile = null; // Store the actual audio file
let isListeningForKey = false;
let listeningClipIndex = -1;
let collapsedPreviews = {}; // Track which previews are collapsed

// Play mode state
let backgroundAudioElement = null;
let youtubePlayers = {}; // Store YouTube players by clip key
let previewPlayers = {}; // Store preview players for edit mode
let activeClips = {}; // Track which clips are currently playing
let clipTimeouts = {}; // Store timeouts for clip duration limits
let clipProgressIntervals = {}; // Store progress update intervals
let isYouTubeAPIReady = false;
let audioContext = null;
let audioAnalyser = null;
let audioDataArray = null;

// LocalStorage keys
const STORAGE_KEYS = {
  clips: 'meme-machine-clips',
  backgroundTrack: 'meme-machine-background-track',
  backgroundAudioData: 'meme-machine-background-audio-data',
  backgroundAudioName: 'meme-machine-background-audio-name',
  collapsedPreviews: 'meme-machine-collapsed-previews',
  settings: 'meme-machine-settings'
};

// Initialize the app
function init() {
  loadYouTubeAPI();
  loadFromStorage(); // Load saved data first
  renderCurrentMode();
  setupEventListeners();
  console.log('Meme Machine loaded with saved settings');
}

// Load YouTube iFrame API
function loadYouTubeAPI() {
  if (window.YT) {
    isYouTubeAPIReady = true;
    return;
  }
  
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  
  // YouTube API callback
  window.onYouTubeIframeAPIReady = () => {
    isYouTubeAPIReady = true;
    console.log('YouTube API loaded');
  };
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Parse timestamp to seconds
function parseTimestamp(timestamp) {
  if (!timestamp) return 0;
  
  // Handle formats like "1:30", "90", "1m30s", etc.
  const timeRegex = /(?:(\d+)[:m])?(\d+)(?:[s])?/;
  const match = timestamp.match(timeRegex);
  
  if (match) {
    const minutes = parseInt(match[1] || 0);
    const seconds = parseInt(match[2] || 0);
    return minutes * 60 + seconds;
  }
  
  return parseFloat(timestamp) || 0;
}

// Parse duration to seconds (simplified since we don't use duration anymore)
function parseDuration(duration) {
  return 5; // Default 5 seconds for backward compatibility
}

// Render the current mode
function renderCurrentMode() {
  const app = document.querySelector('#app');
  
  if (currentMode === 'edit') {
    app.innerHTML = renderEditMode();
    setupEditMode(); // Setup preview players after rendering
  } else {
    app.innerHTML = renderPlayMode();
    if (currentMode === 'play') {
      setupPlayMode();
    }
  }
  
  // Re-setup event listeners after rendering
  setupModeSpecificListeners();
}

// Render Edit Mode
function renderEditMode() {
  const clipsHTML = clips.map((clip, index) => {
    const hasValidUrl = clip.url && extractYouTubeVideoId(clip.url);
    const isCollapsed = collapsedPreviews[index] || false;
    
    return `
    <div class="clip-row">
      <div class="clip-main">
        <div class="key-button ${isListeningForKey && listeningClipIndex === index ? 'listening' : ''}" 
             data-clip-index="${index}">
          ${clip.key || '?'}
        </div>
        <input type="text" class="clip-url" placeholder="YouTube URL" value="${clip.url}" data-clip-index="${index}">
        <input type="text" class="timestamp" placeholder="0:00" value="${clip.timestamp}" data-clip-index="${index}">
        <button class="remove-clip-btn" data-clip-index="${index}" title="Remove this clip">×</button>
        ${hasValidUrl ? `
          <button class="toggle-preview-btn ${isCollapsed ? 'collapsed' : ''}" 
                  data-clip-index="${index}" 
                  title="${isCollapsed ? 'Show' : 'Hide'} preview">
            ${isCollapsed ? '▼' : '▲'}
          </button>
        ` : ''}
      </div>
      ${hasValidUrl ? `
        <div class="clip-preview ${isCollapsed ? 'collapsed' : ''}" id="preview-container-${index}">
          <div class="preview-player">
            <div id="preview-player-${index}"></div>
          </div>
          <div class="preview-controls">
            <button class="set-timestamp-btn" data-clip-index="${index}">Set Current Time</button>
            <span class="current-time" id="current-time-${index}">0:00</span>
          </div>
        </div>
      ` : ''}
    </div>
  `}).join('');

  return `
    <div class="edit-mode">
      <h1>Meme Machine <span class="mode-subtitle">- Edit Mode</span></h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track (optional)" value="${backgroundTrack}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${backgroundAudioFile ? '<button class="clear-audio-btn">×</button>' : ''}
      </div>
      
      <div class="clips-section">
        ${clipsHTML}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${isListeningForKey ? 
          '<div class="listening-message">Press any letter key to map it...</div>' : 
          '<div class="mapping-instructions">Click on a key button to map it to a different key<br/>Add YouTube URLs to see video previews<br/>Use ▲/▼ to hide/show previews</div>'
        }
      </div>
      
      <button class="play-mode-btn" ${clips.some(c => c.url && c.key) ? '' : 'disabled'}>Play</button>
      
      <div class="creator-credits">
        <div class="credits-text">Created by <strong>Diogo Neves</strong></div>
        <div class="credits-links">
          <a href="https://github.com/DiogoNeves/meme-machine" target="_blank" rel="noopener noreferrer" title="View source code on GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a href="https://www.youtube.com/@DiogoNeves" target="_blank" rel="noopener noreferrer" title="Check out my YouTube channel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </a>
        </div>
      </div>
    </div>
  `;
}

// Render Play Mode
function renderPlayMode() {
  const mappedClips = clips.filter(clip => clip.key && clip.url);
  
  const mappedKeysHTML = mappedClips
    .map(clip => `<div class="mapped-key" data-key="${clip.key}">${clip.key}</div>`)
    .join('');

  const virtualKeyboardHTML = generateVirtualKeyboard(mappedClips);

  return `
    <div class="play-mode">
      <h1>Meme Machine <span class="mode-subtitle">- Play Mode</span></h1>
      
      <div class="video-canvas">
        <div class="canvas-content">
          <div class="video-placeholder">Press a key to play video</div>
          <div class="youtube-players"></div>
          <div class="canvas-border"></div>
          <div class="audio-visualizer">
            <canvas id="visualizer-canvas" width="200" height="200"></canvas>
          </div>
        </div>
      </div>
      
      <div class="virtual-keyboard">
        ${virtualKeyboardHTML}
      </div>
      
      <div class="controls-section">
        <div class="mapped-keys-section">
          <span class="mapped-keys-label">Active Keys</span>
          <div class="mapped-keys">
            ${mappedKeysHTML || '<div class="no-keys">No keys mapped</div>'}
          </div>
        </div>
        
        <div class="instructions">
          <div>Press keys to play clip</div>
          <div>Press space to start/stop music</div>
        </div>
        
        <div class="playback-status">
          <div class="background-status">Background: <span id="bg-status">stopped</span></div>
          <div class="performance-stats">
            <div>Keys pressed: <span id="keys-pressed">0</span></div>
            <div>Session time: <span id="session-time">00:00</span></div>
          </div>
        </div>
      </div>
      
      <button class="edit-mode-btn">Back to Edit</button>
      
      <div class="creator-credits">
        <div class="credits-text">Created by <strong>Diogo Neves</strong></div>
        <div class="credits-links">
          <a href="https://github.com/DiogoNeves/meme-machine" target="_blank" rel="noopener noreferrer" title="View source code on GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a href="https://www.youtube.com/@DiogoNeves" target="_blank" rel="noopener noreferrer" title="Check out my YouTube channel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </a>
        </div>
      </div>
    </div>
  `;
}

// Generate virtual keyboard
function generateVirtualKeyboard(mappedClips) {
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];
  
  const mappedKeys = new Set(mappedClips.map(clip => clip.key));
  
  return keyboardRows.map(row => 
    `<div class="keyboard-row">
      ${row.map(key => {
        const isMapped = mappedKeys.has(key);
        const clip = mappedClips.find(c => c.key === key);
        return `
          <div class="virtual-key ${isMapped ? 'mapped' : ''}" data-key="${key}">
            <span class="key-letter">${key}</span>
            ${isMapped ? `
              <div class="key-info">
                <div class="clip-name">${getClipName(clip.url)}</div>
                <div class="timestamp-info">${clip.timestamp || '0:00'}</div>
              </div>
            ` : ''}
  </div>
        `;
      }).join('')}
    </div>`
  ).join('');
}

// Get short clip name from URL
function getClipName(url) {
  try {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `${videoId.substring(0, 6)}...` : 'Clip';
  } catch {
    return 'Clip';
  }
}

// Setup Play Mode
function setupPlayMode() {
  setupBackgroundAudio();
  setupYouTubePlayers();
  setupAudioVisualization();
  startSessionTimer();
}

// Setup background audio
function setupBackgroundAudio() {
  if (backgroundAudioFile && backgroundAudioFile.audioUrl) {
    backgroundAudioElement = new Audio(backgroundAudioFile.audioUrl);
    backgroundAudioElement.loop = true;
    backgroundAudioElement.volume = 0.7; // Slightly lower volume for background
    
    backgroundAudioElement.addEventListener('play', () => {
      updateBackgroundStatus('playing');
    });
    
    backgroundAudioElement.addEventListener('pause', () => {
      updateBackgroundStatus('paused');
    });
    
    backgroundAudioElement.addEventListener('ended', () => {
      updateBackgroundStatus('stopped');
    });
    
    console.log('Background audio ready');
  }
}

// Setup YouTube players
function setupYouTubePlayers() {
  if (!isYouTubeAPIReady) {
    console.log('YouTube API not ready yet');
    return;
  }
  
  const playersContainer = document.querySelector('.youtube-players');
  if (!playersContainer) return;
  
  // Clear existing players
  youtubePlayers = {};
  playersContainer.innerHTML = '';
  
  // Create players for clips with URLs
  clips.forEach(clip => {
    if (clip.url && clip.key) {
      const videoId = extractYouTubeVideoId(clip.url);
      if (videoId) {
        createYouTubePlayer(clip.key, videoId, playersContainer);
      }
    }
  });
}

// Create a YouTube player
function createYouTubePlayer(key, videoId, container) {
  const playerDiv = document.createElement('div');
  playerDiv.id = `player-${key}`;
  playerDiv.style.display = 'none';
  container.appendChild(playerDiv);
  
  const player = new YT.Player(`player-${key}`, {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: (event) => {
        console.log(`Player ready for key: ${key}`);
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          stopClip(key);
        }
      }
    }
  });
  
  youtubePlayers[key] = player;
}

// Update background status
function updateBackgroundStatus(status) {
  const statusElement = document.getElementById('bg-status');
  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = status;
  }
}

// Play a clip (simplified without duration)
function playClip(key) {
  const clip = clips.find(c => c.key === key && c.url);
  if (!clip || activeClips[key]) return;
  
  const player = youtubePlayers[key];
  if (!player) return;
  
  const startTime = parseTimestamp(clip.timestamp);
  
  // Show and play the video
  const playerDiv = document.getElementById(`player-${key}`);
  if (playerDiv) {
    // Hide placeholder with fade effect
    const placeholder = document.querySelector('.video-placeholder');
    if (placeholder) {
      placeholder.style.opacity = '0';
      setTimeout(() => placeholder.style.display = 'none', 300);
    }
    
    // Show and play this video with fade in
    playerDiv.style.display = 'block';
    playerDiv.style.opacity = '0';
    setTimeout(() => playerDiv.style.opacity = '1', 50);
    
    player.seekTo(startTime);
    player.playVideo();
    
    activeClips[key] = true;
    
    // Update virtual keyboard
    updateVirtualKey(key, true);
    
    // Update stats
    updateKeysPressed();
    
    console.log(`Playing clip ${key} from ${startTime}s`);
  }
}

// Stop a clip
function stopClip(key) {
  const player = youtubePlayers[key];
  if (!player || !activeClips[key]) return;
  
  // Stop the video
  player.pauseVideo();
  
  // Hide the video with fade
  const playerDiv = document.getElementById(`player-${key}`);
  if (playerDiv) {
    playerDiv.style.opacity = '0';
    setTimeout(() => playerDiv.style.display = 'none', 300);
  }
  
  // Show placeholder if no other videos are playing
  setTimeout(() => {
    const hasActiveClips = Object.values(activeClips).some(active => active);
    if (!hasActiveClips) {
      const placeholder = document.querySelector('.video-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.style.opacity = '1';
      }
    }
  }, 300);
  
  // Clear timeout and progress
  if (clipTimeouts[key]) {
    clearTimeout(clipTimeouts[key]);
    delete clipTimeouts[key];
  }
  
  if (clipProgressIntervals[key]) {
    clearInterval(clipProgressIntervals[key]);
    delete clipProgressIntervals[key];
  }
  
  // Update virtual keyboard
  updateVirtualKey(key, false);
  
  activeClips[key] = false;
  
  console.log(`Stopped clip ${key}`);
}

// Toggle background audio
function toggleBackgroundAudio() {
  if (!backgroundAudioElement) return;
  
  if (backgroundAudioElement.paused) {
    backgroundAudioElement.play().catch(e => {
      console.error('Failed to play background audio:', e);
    });
  } else {
    backgroundAudioElement.pause();
  }
}

// Setup general event listeners
function setupEventListeners() {
  // Global keydown listener for key mapping
  document.addEventListener('keydown', handleGlobalKeyDown);
}

// Handle global key presses (for key mapping and play mode)
function handleGlobalKeyDown(e) {
  if (currentMode === 'edit' && isListeningForKey && listeningClipIndex >= 0) {
    handleKeyMapping(e);
  } else if (currentMode === 'play') {
    handlePlayModeKeyDown(e);
  }
}

// Handle key mapping in edit mode
function handleKeyMapping(e) {
  const key = e.key.toUpperCase();
  
  // Only allow letter keys
  if (key.length === 1 && key >= 'A' && key <= 'Z') {
    // Check if key is already used by a different clip
    const existingClipIndex = clips.findIndex(clip => clip.key === key);
    if (existingClipIndex !== -1 && existingClipIndex !== listeningClipIndex) {
      alert(`Key "${key}" is already mapped to another clip!`);
      return;
    }
    
    // Clear the key from any other clip that might have it (extra safety)
    clips.forEach((clip, index) => {
      if (index !== listeningClipIndex && clip.key === key) {
        clip.key = '';
      }
    });
    
    // Map the key
    clips[listeningClipIndex].key = key;
    
    // Stop listening
    isListeningForKey = false;
    listeningClipIndex = -1;
    
    // Save the new key mapping
    saveToStorage();
    
    // Re-render to update UI
    renderCurrentMode();
  }
}

// Setup mode-specific event listeners
function setupModeSpecificListeners() {
  if (currentMode === 'edit') {
    setupEditModeListeners();
  } else {
    setupPlayModeListeners();
  }
}

// Setup Edit Mode event listeners
function setupEditModeListeners() {
  const playBtn = document.querySelector('.play-mode-btn');
  const mapNewKeyBtn = document.querySelector('.map-new-key-btn');
  const backgroundTrackInput = document.querySelector('.background-track');
  const uploadBtn = document.querySelector('.upload-btn');
  const audioFileInput = document.querySelector('.audio-file-input');
  const clearAudioBtn = document.querySelector('.clear-audio-btn');
  const keyButtons = document.querySelectorAll('.key-button');
  const removeButtons = document.querySelectorAll('.remove-clip-btn');
  const setTimestampButtons = document.querySelectorAll('.set-timestamp-btn');
  const togglePreviewButtons = document.querySelectorAll('.toggle-preview-btn');
  
  // Play button
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      validateUniqueKeys(); // Ensure no duplicates before playing
      if (clips.some(c => c.url && c.key)) {
        currentMode = 'play';
        saveToStorage(); // Save current state before switching modes
        renderCurrentMode();
      }
    });
  }
  
  // Map new key button
  if (mapNewKeyBtn) {
    mapNewKeyBtn.addEventListener('click', () => {
      // Find next available key
      const usedKeys = new Set(clips.map(c => c.key).filter(k => k));
      let nextKey = 'A';
      for (let i = 0; i < 26; i++) {
        const testKey = String.fromCharCode(65 + i);
        if (!usedKeys.has(testKey)) {
          nextKey = testKey;
          break;
        }
      }
      
      clips.push({ key: nextKey, url: '', timestamp: '' });
      saveToStorage(); // Auto-save when adding clips
      renderCurrentMode();
    });
  }
  
  // Remove clip buttons
  removeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0 && clips.length > 1) { // Keep at least one clip
        clips.splice(clipIndex, 1);
        // Also remove collapsed state for this clip and shift others
        const newCollapsedPreviews = {};
        Object.keys(collapsedPreviews).forEach(key => {
          const idx = parseInt(key);
          if (idx < clipIndex) {
            newCollapsedPreviews[idx] = collapsedPreviews[idx];
          } else if (idx > clipIndex) {
            newCollapsedPreviews[idx - 1] = collapsedPreviews[idx];
          }
        });
        collapsedPreviews = newCollapsedPreviews;
        
        validateUniqueKeys(); // Clean up after removal
        saveToStorage(); // Auto-save when removing clips
        renderCurrentMode();
      } else if (clips.length === 1) {
        // Reset the single clip instead of removing it
        clips[0] = { key: 'A', url: '', timestamp: '' };
        collapsedPreviews = {}; // Reset collapsed states
        saveToStorage(); // Auto-save when resetting clip
        renderCurrentMode();
      }
    });
  });
  
  // Toggle preview buttons
  togglePreviewButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0) {
        togglePreviewCollapse(clipIndex);
      }
    });
  });
  
  // Set timestamp buttons
  setTimestampButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0) {
        setTimestampFromPreview(clipIndex);
      }
    });
  });
  
  // Background track input (now readonly, but keep for manual URL input)
  if (backgroundTrackInput) {
    backgroundTrackInput.addEventListener('input', (e) => {
      if (!backgroundAudioFile) { // Only allow manual input if no file is uploaded
        backgroundTrack = e.target.value;
        saveToStorage(); // Auto-save background track changes
      }
    });
  }
  
  // Upload button
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      audioFileInput.click();
    });
  }
  
  // Audio file input
  if (audioFileInput) {
    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleAudioFileUpload(file);
      }
    });
  }
  
  // Clear audio button
  if (clearAudioBtn) {
    clearAudioBtn.addEventListener('click', () => {
      clearBackgroundAudio();
    });
  }
  
  // Key buttons for mapping
  keyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0) {
        // Start listening for key mapping
        isListeningForKey = true;
        listeningClipIndex = clipIndex;
        renderCurrentMode();
      }
    });
  });
  
  // Clip input fields
  const clipInputs = document.querySelectorAll('.clip-url, .timestamp');
  clipInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      const fieldType = e.target.classList.contains('clip-url') ? 'url' : 'timestamp';
      
      if (clips[clipIndex]) {
        clips[clipIndex][fieldType] = e.target.value;
        
        // Validate YouTube URL and setup preview
        if (fieldType === 'url') {
          if (e.target.value) {
            validateYouTubeUrl(e.target.value, e.target);
          }
          // Re-render to show/hide preview players
          setTimeout(() => {
            renderCurrentMode();
          }, 100);
        }
        
        // Update play button state
        updatePlayButtonState();
        
        // Auto-save on input changes (with debouncing)
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
          saveToStorage();
        }, 1000); // Save after 1 second of no typing
      }
    });
  });
}

// Handle audio file upload
function handleAudioFileUpload(file) {
  // Validate file type
  if (!file.type.startsWith('audio/')) {
    alert('Please select a valid audio file.');
    return;
  }
  
  // Check file size (limit to 50MB for usage, 5MB for storage)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    alert('File size is too large. Please select a file smaller than 50MB.');
    return;
  }
  
  // Store the file and update UI
  backgroundAudioFile = file;
  backgroundTrack = file.name;
  
  // Create audio URL for preview/playback
  if (backgroundAudioFile.audioUrl) {
    URL.revokeObjectURL(backgroundAudioFile.audioUrl);
  }
  backgroundAudioFile.audioUrl = URL.createObjectURL(file);
  
  // Show storage warning for large files
  if (file.size > 5 * 1024 * 1024) {
    console.warn('File larger than 5MB - will not be saved to localStorage');
  }
  
  console.log('Background audio loaded:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
  
  // Save to storage
  saveToStorage();
  
  // Re-render to show the clear button and updated filename
  renderCurrentMode();
}

// Clear background audio
function clearBackgroundAudio() {
  if (backgroundAudioFile && backgroundAudioFile.audioUrl) {
    URL.revokeObjectURL(backgroundAudioFile.audioUrl);
  }
  
  backgroundAudioFile = null;
  backgroundTrack = '';
  
  // Clear the file input
  const audioFileInput = document.querySelector('.audio-file-input');
  if (audioFileInput) {
    audioFileInput.value = '';
  }
  
  console.log('Background audio cleared');
  
  // Save to storage
  saveToStorage();
  
  // Re-render to hide the clear button
  renderCurrentMode();
}

// Validate YouTube URL
function validateYouTubeUrl(url, input) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const isValid = youtubeRegex.test(url);
  
  if (isValid) {
    input.classList.remove('invalid');
    input.classList.add('valid');
  } else {
    input.classList.remove('valid');
    input.classList.add('invalid');
  }
}

// Update play button state
function updatePlayButtonState() {
  const playBtn = document.querySelector('.play-mode-btn');
  if (playBtn) {
    const hasValidClips = clips.some(c => c.url && c.key);
    playBtn.disabled = !hasValidClips;
  }
}

// Setup Play Mode event listeners
function setupPlayModeListeners() {
  const editBtn = document.querySelector('.edit-mode-btn');
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Stop all active clips and background audio
      Object.keys(activeClips).forEach(key => stopClip(key));
      if (backgroundAudioElement) {
        backgroundAudioElement.pause();
      }
      
      currentMode = 'edit';
      saveToStorage(); // Save current state before switching modes
      renderCurrentMode();
    });
  }
  
  // Add keyup listener for play mode
  document.addEventListener('keyup', handlePlayModeKeyUp);
}

// Handle key press in play mode
function handlePlayModeKeyDown(e) {
  if (currentMode !== 'play') return;
  
  const key = e.key.toUpperCase();
  const clip = clips.find(c => c.key === key && c.url);
  
  if (clip && !activeClips[key]) {
    playClip(key);
  }
  
  if (e.key === ' ') {
    e.preventDefault(); // Prevent page scroll
    toggleBackgroundAudio();
  }
}

// Handle key release in play mode
function handlePlayModeKeyUp(e) {
  if (currentMode !== 'play') return;
  
  const key = e.key.toUpperCase();
  const clip = clips.find(c => c.key === key && c.url);
  
  if (clip && activeClips[key]) {
    stopClip(key);
  }
}

// Validate that no duplicate keys exist (called when adding/removing clips)
function validateUniqueKeys() {
  const usedKeys = new Set();
  const duplicates = [];
  
  clips.forEach((clip, index) => {
    if (clip.key && usedKeys.has(clip.key)) {
      duplicates.push({ index, key: clip.key });
    } else if (clip.key) {
      usedKeys.add(clip.key);
    }
  });
  
  // Clear duplicate keys (keep first occurrence)
  duplicates.forEach(({ index }) => {
    clips[index].key = '';
  });
  
  return duplicates.length === 0;
}

// Setup audio visualization
function setupAudioVisualization() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    
    if (backgroundAudioElement) {
      const source = audioContext.createMediaElementSource(backgroundAudioElement);
      source.connect(audioAnalyser);
      audioAnalyser.connect(audioContext.destination);
    }
    
    startVisualization();
  } catch (error) {
    console.log('Audio visualization not available:', error);
  }
}

// Start audio visualization
function startVisualization() {
  const canvas = document.getElementById('visualizer-canvas');
  if (!canvas || !audioAnalyser) return;
  
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 60;
  
  function animate() {
    if (!audioAnalyser) return;
    
    audioAnalyser.getByteFrequencyData(audioDataArray);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular visualizer
    const barCount = 32;
    const angleStep = (Math.PI * 2) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const value = audioDataArray[i] || 0;
      const height = (value / 255) * 40;
      const angle = i * angleStep;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + height);
      const y2 = centerY + Math.sin(angle) * (radius + height);
      
      ctx.strokeStyle = `hsl(${(i * 10) % 360}, 70%, 60%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Update canvas border based on audio
    const avgVolume = audioDataArray.reduce((a, b) => a + b, 0) / audioDataArray.length;
    updateCanvasBorder(avgVolume);
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Update canvas border based on audio
function updateCanvasBorder(volume) {
  const border = document.querySelector('.canvas-border');
  if (border) {
    const intensity = Math.min(volume / 128, 1);
    const hue = (intensity * 120) + 240; // Blue to purple range
    border.style.boxShadow = `inset 0 0 ${20 + intensity * 30}px rgba(${Math.floor(intensity * 255)}, 100, 255, 0.6)`;
    border.style.borderColor = `hsl(${hue}, 70%, 60%)`;
  }
}

// Start session timer
function startSessionTimer() {
  const startTime = Date.now();
  
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeElement = document.getElementById('session-time');
    if (timeElement) {
      timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// Update virtual key visual state
function updateVirtualKey(key, isActive) {
  const virtualKey = document.querySelector(`.virtual-key[data-key="${key}"]`);
  if (virtualKey) {
    if (isActive) {
      virtualKey.classList.add('active');
    } else {
      virtualKey.classList.remove('active');
      // Reset progress ring
      const progressFill = virtualKey.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.transform = 'rotate(0deg)';
      }
    }
  }
}

// Start progress indicator for a clip
function startProgressIndicator(key, duration) {
  const virtualKey = document.querySelector(`.virtual-key[data-key="${key}"]`);
  const progressFill = virtualKey?.querySelector('.progress-fill');
  
  if (!progressFill) return;
  
  const startTime = Date.now();
  const durationMs = duration * 1000;
  
  clipProgressIntervals[key] = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const degrees = progress * 360;
    
    progressFill.style.transform = `rotate(${degrees}deg)`;
    
    if (progress >= 1) {
      clearInterval(clipProgressIntervals[key]);
      delete clipProgressIntervals[key];
    }
  }, 50);
}

// Update keys pressed counter
function updateKeysPressed() {
  const counter = document.getElementById('keys-pressed');
  if (counter) {
    const current = parseInt(counter.textContent) || 0;
    counter.textContent = (current + 1).toString();
  }
}

// Save data to localStorage
function saveToStorage() {
  try {
    // Save clips data
    localStorage.setItem(STORAGE_KEYS.clips, JSON.stringify(clips));
    
    // Save collapsed previews state
    localStorage.setItem(STORAGE_KEYS.collapsedPreviews, JSON.stringify(collapsedPreviews));
    
    // Save background track name/URL
    localStorage.setItem(STORAGE_KEYS.backgroundTrack, backgroundTrack);
    
    // Save background audio filename
    if (backgroundAudioFile) {
      localStorage.setItem(STORAGE_KEYS.backgroundAudioName, backgroundAudioFile.name);
      
      // For small files, save the actual audio data as base64
      if (backgroundAudioFile.size <= 5 * 1024 * 1024) { // 5MB limit for localStorage
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            localStorage.setItem(STORAGE_KEYS.backgroundAudioData, e.target.result);
            console.log('Background audio saved to localStorage');
          } catch (error) {
            console.warn('Failed to save audio data - file too large:', error);
            localStorage.removeItem(STORAGE_KEYS.backgroundAudioData);
          }
        };
        reader.readAsDataURL(backgroundAudioFile);
      } else {
        // File too large for localStorage
        localStorage.removeItem(STORAGE_KEYS.backgroundAudioData);
        console.warn('Background audio file too large for localStorage (>5MB)');
      }
    } else {
      // No audio file, clear stored data
      localStorage.removeItem(STORAGE_KEYS.backgroundAudioName);
      localStorage.removeItem(STORAGE_KEYS.backgroundAudioData);
    }
    
    // Save general settings
    const settings = {
      currentMode: currentMode,
      lastSaved: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    
    console.log('Settings saved to localStorage');
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// Load data from localStorage (updated to handle missing duration)
function loadFromStorage() {
  try {
    // Load clips data
    const savedClips = localStorage.getItem(STORAGE_KEYS.clips);
    if (savedClips) {
      const parsedClips = JSON.parse(savedClips);
      if (Array.isArray(parsedClips) && parsedClips.length > 0) {
        // Remove duration field from old saved data
        clips = parsedClips.map(clip => ({
          key: clip.key || '',
          url: clip.url || '',
          timestamp: clip.timestamp || ''
        }));
      }
    }
    
    // Load collapsed previews state
    const savedCollapsedPreviews = localStorage.getItem(STORAGE_KEYS.collapsedPreviews);
    if (savedCollapsedPreviews) {
      collapsedPreviews = JSON.parse(savedCollapsedPreviews);
    }
    
    // Load background track
    const savedBackgroundTrack = localStorage.getItem(STORAGE_KEYS.backgroundTrack);
    if (savedBackgroundTrack) {
      backgroundTrack = savedBackgroundTrack;
    }
    
    // Load background audio data
    const savedAudioName = localStorage.getItem(STORAGE_KEYS.backgroundAudioName);
    const savedAudioData = localStorage.getItem(STORAGE_KEYS.backgroundAudioData);
    
    if (savedAudioName && savedAudioData) {
      // Recreate the audio file from base64 data
      fetch(savedAudioData)
        .then(res => res.blob())
        .then(blob => {
          // Create a File object from the blob
          backgroundAudioFile = new File([blob], savedAudioName, { type: blob.type });
          backgroundAudioFile.audioUrl = URL.createObjectURL(blob);
          backgroundTrack = savedAudioName;
          
          console.log('Background audio restored from localStorage:', savedAudioName);
          
          // Re-render if we're in edit mode to show the restored audio
          if (currentMode === 'edit') {
            renderCurrentMode();
          }
        })
        .catch(error => {
          console.error('Failed to restore background audio:', error);
          // Clear invalid data
          localStorage.removeItem(STORAGE_KEYS.backgroundAudioName);
          localStorage.removeItem(STORAGE_KEYS.backgroundAudioData);
        });
    } else if (savedAudioName) {
      // Name saved but no data - likely file was too large
      backgroundTrack = savedAudioName + ' (file too large - please re-upload)';
    }
    
    // Load general settings
    const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Could restore currentMode here, but better to always start in edit mode
      console.log('Last saved:', new Date(settings.lastSaved).toLocaleString());
    }
    
    console.log('Settings loaded from localStorage');
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    // Reset to defaults if loading fails
    clips = [{ key: 'A', url: '', timestamp: '' }];
    backgroundTrack = '';
    backgroundAudioFile = null;
    collapsedPreviews = {};
  }
}

// Clear all stored data
function clearStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('All stored data cleared');
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

// Get storage usage info
function getStorageInfo() {
  try {
    let totalSize = 0;
    const info = {};
    
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      info[name] = {
        size: size,
        sizeKB: Math.round(size / 1024 * 100) / 100,
        exists: !!value
      };
      totalSize += size;
    });
    
    info.total = {
      size: totalSize,
      sizeKB: Math.round(totalSize / 1024 * 100) / 100,
      sizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    };
    
    return info;
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return null;
  }
}

// Add console commands for debugging storage
window.memeMachineStorage = {
  save: saveToStorage,
  load: loadFromStorage,
  clear: clearStorage,
  info: getStorageInfo,
  export: () => {
    const data = {
      clips: clips,
      backgroundTrack: backgroundTrack,
      backgroundAudioName: backgroundAudioFile?.name || null,
      timestamp: new Date().toISOString()
    };
    console.log('Exported data:', data);
    return data;
  }
};

// Setup Edit Mode
function setupEditMode() {
  setTimeout(() => {
    setupPreviewPlayers();
  }, 100); // Small delay to ensure DOM is ready
}

// Setup preview players for edit mode
function setupPreviewPlayers() {
  if (!isYouTubeAPIReady) {
    console.log('YouTube API not ready for previews yet');
    return;
  }
  
  // Clear existing preview players
  Object.values(previewPlayers).forEach(player => {
    if (player && player.destroy) {
      player.destroy();
    }
  });
  previewPlayers = {};
  
  // Create preview players for clips with URLs
  clips.forEach((clip, index) => {
    if (clip.url) {
      const videoId = extractYouTubeVideoId(clip.url);
      if (videoId) {
        createPreviewPlayer(index, videoId);
      }
    }
  });
}

// Create a preview player for edit mode
function createPreviewPlayer(clipIndex, videoId) {
  const playerContainer = document.getElementById(`preview-player-${clipIndex}`);
  if (!playerContainer) return;
  
  const player = new YT.Player(`preview-player-${clipIndex}`, {
    height: '200',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 0,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      start: parseTimestamp(clips[clipIndex].timestamp) || 0
    },
    events: {
      onReady: (event) => {
        console.log(`Preview player ready for clip ${clipIndex}`);
        startTimeUpdater(clipIndex, player);
      },
      onStateChange: (event) => {
        // Update timestamp display when user seeks
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
          updateCurrentTimeDisplay(clipIndex, player);
        }
      }
    }
  });
  
  previewPlayers[clipIndex] = player;
}

// Start time updater for preview player
function startTimeUpdater(clipIndex, player) {
  const updateTime = () => {
    if (player && player.getCurrentTime) {
      updateCurrentTimeDisplay(clipIndex, player);
    }
  };
  
  // Update every 500ms
  setInterval(updateTime, 500);
}

// Update current time display
function updateCurrentTimeDisplay(clipIndex, player) {
  try {
    const currentTime = player.getCurrentTime();
    const timeElement = document.getElementById(`current-time-${clipIndex}`);
    if (timeElement && currentTime !== undefined) {
      timeElement.textContent = formatTime(currentTime);
    }
  } catch (error) {
    // Ignore errors when player is not ready
  }
}

// Format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Set timestamp from preview player
function setTimestampFromPreview(clipIndex) {
  const player = previewPlayers[clipIndex];
  if (player && player.getCurrentTime) {
    try {
      const currentTime = player.getCurrentTime();
      const formattedTime = formatTime(currentTime);
      
      // Update the clip data
      clips[clipIndex].timestamp = formattedTime;
      
      // Update the input field
      const timestampInput = document.querySelector(`.timestamp[data-clip-index="${clipIndex}"]`);
      if (timestampInput) {
        timestampInput.value = formattedTime;
      }
      
      // Save to storage
      saveToStorage();
      
      console.log(`Timestamp set to ${formattedTime} for clip ${clipIndex}`);
    } catch (error) {
      console.error('Failed to set timestamp:', error);
    }
  }
}

// Toggle preview collapse state
function togglePreviewCollapse(clipIndex) {
  collapsedPreviews[clipIndex] = !collapsedPreviews[clipIndex];
  
  // Save collapsed state
  saveToStorage();
  
  // Re-render to update UI
  renderCurrentMode();
  
  console.log(`Preview ${clipIndex} ${collapsedPreviews[clipIndex] ? 'collapsed' : 'expanded'}`);
}

// Start the app
init();
