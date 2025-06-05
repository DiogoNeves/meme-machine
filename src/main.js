import './style.css'

// Application state
let currentMode = 'edit'; // 'edit' or 'play'
let clips = [
  { key: 'A', url: '', timestamp: '', duration: '' },
  { key: 'S', url: '', timestamp: '', duration: '' }
];
let backgroundTrack = '';

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
  const clipsHTML = clips.map(clip => `
    <div class="clip-row">
      <div class="key-button">${clip.key}</div>
      <input type="text" class="clip-url" placeholder="Clip URL" value="${clip.url}">
      <input type="text" class="timestamp" placeholder="timestamp" value="${clip.timestamp}">
      <input type="text" class="duration" placeholder="duration" value="${clip.duration}">
    </div>
  `).join('');

  return `
    <div class="edit-mode">
      <h1>Edit Mode</h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track" value="${backgroundTrack}">
        <button class="upload-btn">Upload</button>
      </div>
      
      <div class="clips-section">
        ${clipsHTML}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <button class="play-mode-btn">Play</button>
    </div>
  `;
}

// Render Play Mode
function renderPlayMode() {
  const mappedKeysHTML = clips.map(clip => `
    <div class="mapped-key">${clip.key}</div>
  `).join('');

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
            ${mappedKeysHTML}
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
  // This will be called once on init
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
  
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      currentMode = 'play';
      renderCurrentMode();
    });
  }
  
  if (mapNewKeyBtn) {
    mapNewKeyBtn.addEventListener('click', () => {
      // For now, just add a new clip with the next letter
      const nextKey = String.fromCharCode(65 + clips.length); // A, B, C, etc.
      clips.push({ key: nextKey, url: '', timestamp: '', duration: '' });
      renderCurrentMode();
    });
  }
  
  if (backgroundTrackInput) {
    backgroundTrackInput.addEventListener('input', (e) => {
      backgroundTrack = e.target.value;
    });
  }
  
  // Setup clip input listeners
  const clipInputs = document.querySelectorAll('.clip-url, .timestamp, .duration');
  clipInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const clipIndex = Math.floor(index / 3);
      const fieldIndex = index % 3;
      const fields = ['url', 'timestamp', 'duration'];
      
      if (clips[clipIndex]) {
        clips[clipIndex][fields[fieldIndex]] = e.target.value;
      }
    });
  });
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
  
  // Keyboard event listeners for play mode
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

// Handle key press in play mode
function handleKeyDown(e) {
  if (currentMode !== 'play') return;
  
  const key = e.key.toUpperCase();
  const clip = clips.find(c => c.key === key);
  
  if (clip) {
    console.log(`Playing clip for key: ${key}`);
    // TODO: Implement clip playback
  }
  
  if (e.key === ' ') {
    console.log('Starting background track');
    // TODO: Implement background track playback
  }
}

// Handle key release in play mode
function handleKeyUp(e) {
  if (currentMode !== 'play') return;
  
  const key = e.key.toUpperCase();
  const clip = clips.find(c => c.key === key);
  
  if (clip) {
    console.log(`Stopping clip for key: ${key}`);
    // TODO: Implement clip stop
  }
}

// Start the app
init();
