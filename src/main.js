import './style.css'

// Application state
let currentMode = 'edit'; // 'edit' or 'play'
let clips = [
  { key: 'A', url: '', timestamp: '', duration: '' },
  { key: 'S', url: '', timestamp: '', duration: '' }
];
let backgroundTrack = '';
let backgroundAudioFile = null; // Store the actual audio file
let isListeningForKey = false;
let listeningClipIndex = -1;

// Initialize the app
function init() {
  renderCurrentMode();
  setupEventListeners();
}

// Render the current mode
function renderCurrentMode() {
  const app = document.querySelector('#app');
  
  if (currentMode === 'edit') {
    app.innerHTML = renderEditMode();
  } else {
    app.innerHTML = renderPlayMode();
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
        <div class="canvas-placeholder">Video Canvas</div>
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
          <div>Press space to start</div>
        </div>
      </div>
      
      <button class="edit-mode-btn">Back to Edit</button>
    </div>
  `;
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
  
  if (clip) {
    console.log(`Playing clip for key: ${key}`, clip);
    // TODO: Implement clip playback
  }
  
  if (e.key === ' ') {
    e.preventDefault(); // Prevent page scroll
    console.log('Starting background track');
    // TODO: Implement background track playback
  }
}

// Handle key release in play mode
function handlePlayModeKeyUp(e) {
  if (currentMode !== 'play') return;
  
  const key = e.key.toUpperCase();
  const clip = clips.find(c => c.key === key && c.url);
  
  if (clip) {
    console.log(`Stopping clip for key: ${key}`);
    // TODO: Implement clip stop
  }
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

// Start the app
init();
