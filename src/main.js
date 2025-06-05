import './style.css'

// Application state
let currentMode = 'edit'; // 'edit' or 'play'
let clips = [
  { key: 'A', url: '', timestamp: '', duration: '' }
];
let backgroundTrack = '';
let backgroundAudioFile = null; // Store the actual audio file
let isListeningForKey = false;
let listeningClipIndex = -1;

// Play mode state
let backgroundAudioElement = null;
let youtubePlayers = {}; // Store YouTube players by clip key
let activeClips = {}; // Track which clips are currently playing
let clipTimeouts = {}; // Store timeouts for clip duration limits
let isYouTubeAPIReady = false;

// Initialize the app
function init() {
  loadYouTubeAPI();
  renderCurrentMode();
  setupEventListeners();
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

// Parse duration to seconds
function parseDuration(duration) {
  if (!duration) return 5; // Default 5 seconds
  return parseFloat(duration) || 5;
}

// Render the current mode
function renderCurrentMode() {
  const app = document.querySelector('#app');
  
  if (currentMode === 'edit') {
    app.innerHTML = renderEditMode();
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
  const clipsHTML = clips.map((clip, index) => `
    <div class="clip-row">
      <div class="key-button ${isListeningForKey && listeningClipIndex === index ? 'listening' : ''}" 
           data-clip-index="${index}">
        ${clip.key || '?'}
      </div>
      <input type="text" class="clip-url" placeholder="Clip URL" value="${clip.url}" data-clip-index="${index}">
      <input type="text" class="timestamp" placeholder="0:00" value="${clip.timestamp}" data-clip-index="${index}">
      <input type="text" class="duration" placeholder="2.5s" value="${clip.duration}" data-clip-index="${index}">
      <button class="remove-clip-btn" data-clip-index="${index}" title="Remove this clip">×</button>
    </div>
  `).join('');

  return `
    <div class="edit-mode">
      <h1>Edit Mode</h1>
      
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
          '<div class="mapping-instructions">Click on a key button to map it to a different key</div>'
        }
      </div>
      
      <button class="play-mode-btn" ${clips.some(c => c.url && c.key) ? '' : 'disabled'}>Play</button>
    </div>
  `;
}

// Render Play Mode
function renderPlayMode() {
  const mappedKeysHTML = clips
    .filter(clip => clip.key && clip.url)
    .map(clip => `<div class="mapped-key">${clip.key}</div>`)
    .join('');

  return `
    <div class="play-mode">
      <h1>Play Mode</h1>
      
      <div class="video-canvas">
        <div class="canvas-content">
          <div class="video-placeholder">Press a key to play video</div>
          <div class="youtube-players"></div>
        </div>
      </div>
      
      <div class="controls-section">
        <div class="mapped-keys-section">
          <span class="mapped-keys-label">Mapped keys</span>
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
        </div>
      </div>
      
      <button class="edit-mode-btn">Back to Edit</button>
    </div>
  `;
}

// Setup Play Mode
function setupPlayMode() {
  setupBackgroundAudio();
  setupYouTubePlayers();
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

// Play a clip
function playClip(key) {
  const clip = clips.find(c => c.key === key && c.url);
  if (!clip || activeClips[key]) return;
  
  const player = youtubePlayers[key];
  if (!player) return;
  
  const startTime = parseTimestamp(clip.timestamp);
  const duration = parseDuration(clip.duration);
  
  // Show and play the video
  const playerDiv = document.getElementById(`player-${key}`);
  if (playerDiv) {
    // Hide placeholder
    const placeholder = document.querySelector('.video-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    
    // Show and play this video
    playerDiv.style.display = 'block';
    player.seekTo(startTime);
    player.playVideo();
    
    activeClips[key] = true;
    
    // Set timeout for duration limit
    clipTimeouts[key] = setTimeout(() => {
      stopClip(key);
    }, duration * 1000);
    
    console.log(`Playing clip ${key} from ${startTime}s for ${duration}s`);
  }
}

// Stop a clip
function stopClip(key) {
  const player = youtubePlayers[key];
  if (!player || !activeClips[key]) return;
  
  // Stop the video
  player.pauseVideo();
  
  // Hide the video
  const playerDiv = document.getElementById(`player-${key}`);
  if (playerDiv) {
    playerDiv.style.display = 'none';
  }
  
  // Show placeholder if no other videos are playing
  const hasActiveClips = Object.values(activeClips).some(active => active);
  if (!hasActiveClips) {
    const placeholder = document.querySelector('.video-placeholder');
    if (placeholder) placeholder.style.display = 'block';
  }
  
  // Clear timeout
  if (clipTimeouts[key]) {
    clearTimeout(clipTimeouts[key]);
    delete clipTimeouts[key];
  }
  
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
    // Check if key is already used
    const existingClip = clips.find(clip => clip.key === key);
    if (existingClip && clips.indexOf(existingClip) !== listeningClipIndex) {
      alert(`Key "${key}" is already mapped to another clip!`);
      return;
    }
    
    // Map the key
    clips[listeningClipIndex].key = key;
    
    // Stop listening
    isListeningForKey = false;
    listeningClipIndex = -1;
    
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
  
  // Play button
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (clips.some(c => c.url && c.key)) {
        currentMode = 'play';
        renderCurrentMode();
      }
    });
  }
  
  // Map new key button
  if (mapNewKeyBtn) {
    mapNewKeyBtn.addEventListener('click', () => {
      const nextKey = String.fromCharCode(65 + clips.length); // A, B, C, etc.
      clips.push({ key: nextKey, url: '', timestamp: '', duration: '' });
      renderCurrentMode();
    });
  }
  
  // Remove clip buttons
  removeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0 && clips.length > 1) { // Keep at least one clip
        clips.splice(clipIndex, 1);
        renderCurrentMode();
      } else if (clips.length === 1) {
        // Reset the single clip instead of removing it
        clips[0] = { key: 'A', url: '', timestamp: '', duration: '' };
        renderCurrentMode();
      }
    });
  });
  
  // Background track input (now readonly, but keep for manual URL input)
  if (backgroundTrackInput) {
    backgroundTrackInput.addEventListener('input', (e) => {
      if (!backgroundAudioFile) { // Only allow manual input if no file is uploaded
        backgroundTrack = e.target.value;
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
  const clipInputs = document.querySelectorAll('.clip-url, .timestamp, .duration');
  clipInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      const fieldType = e.target.classList.contains('clip-url') ? 'url' :
                       e.target.classList.contains('timestamp') ? 'timestamp' : 'duration';
      
      if (clips[clipIndex]) {
        clips[clipIndex][fieldType] = e.target.value;
        
        // Validate YouTube URL
        if (fieldType === 'url' && e.target.value) {
          validateYouTubeUrl(e.target.value, e.target);
        }
        
        // Update play button state
        updatePlayButtonState();
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
  
  // Check file size (limit to 50MB)
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
  
  console.log('Background audio loaded:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
  
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

// Start the app
init();
