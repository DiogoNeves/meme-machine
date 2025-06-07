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
let currentEditingKey = null; // Track which key is currently being edited

// Play mode state
let backgroundAudioElement = null;
let backgroundYouTubePlayer = null;
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
  settings: 'meme-machine-settings',
  firstVisit: 'meme-machine-first-visit'
};

// Initialize the app
function init() {
  loadYouTubeAPI();
  loadFromStorage(); // Load saved data first
  renderCurrentMode();
  setupEventListeners();
  checkFirstVisit(); // Check if this is the first visit and show help if needed
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

// Parse timestamp to seconds with comprehensive format support and validation
function parseTimestamp(timestamp) {
  if (!timestamp || timestamp.trim() === '') return 0;
  
  let input = timestamp.toString().trim();
  
  // Normalize decimal separators - replace comma with period for parsing
  // This supports locales that use comma as decimal separator (e.g., European locales)
  input = input.replace(',', '.');
  
  // Handle various time formats with validation
  const formats = [
    // MM:SS.s format (e.g., "1:30.5", "12:45.25", "1:30,5")
    {
      regex: /^(\d{1,3}):([0-5]?\d(?:\.\d+)?)$/,
      parse: (match) => {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        if (minutes > 999 || seconds >= 60) return null;
        return minutes * 60 + seconds;
      }
    },
    // M:SS.s format (e.g., "1:05.5", "2:30.25", "2:30,25")
    {
      regex: /^(\d{1,2}):([0-5]?\d(?:\.\d+)?)$/,
      parse: (match) => {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        if (minutes > 99 || seconds >= 60) return null;
        return minutes * 60 + seconds;
      }
    },
    // Seconds with decimals (e.g., "90.5", "125.25", "90,5")  
    {
      regex: /^(\d+(?:\.\d+)?)$/,
      parse: (match) => {
        const seconds = parseFloat(match[1]);
        if (seconds > 86400) return null; // Max 24 hours in seconds
        return seconds;
      }
    },
    // Alternative format: "1m30s", "1m30.5s", "30s", "1m30,5s"
    {
      regex: /^(?:(\d+)m)?(\d+(?:\.\d+)?)?s?$/,
      parse: (match) => {
        const minutes = parseInt(match[1] || 0);
        const seconds = parseFloat(match[2] || 0);
        if (minutes > 999 || seconds >= 60) return null;
        return minutes * 60 + seconds;
      }
    }
  ];
  
  // Try each format
  for (const format of formats) {
    const match = input.match(format.regex);
    if (match) {
      const result = format.parse(match);
      if (result !== null && result >= 0) {
        return result;
      }
    }
  }
  
  // Fallback: try parsing as a plain number
  const fallback = parseFloat(input);
  if (!isNaN(fallback) && fallback >= 0 && fallback <= 86400) {
    return fallback;
  }
  
  return 0;
}

// Detect local decimal separator
function getLocalDecimalSeparator() {
  const numberWithDecimal = 1.1;
  const localeString = numberWithDecimal.toLocaleString();
  return localeString.substring(1, 2);
}

// Get localized number examples
function getLocalizedExamples() {
  const decimalSep = getLocalDecimalSeparator();
  
  return {
    decimal: decimalSep,
    timeWithDecimal: `2:45${decimalSep}5`,
    secondsWithDecimal: `125${decimalSep}5`,
    minutesWithDecimal: `2m15${decimalSep}5s`
  };
}

// Get localized placeholder text
function getLocalizedPlaceholder() {
  const examples = getLocalizedExamples();
  return `1:30${examples.decimal}5 or 90${examples.decimal}25`;
}

// Validate timestamp format and provide user feedback
function validateTimestamp(timestamp) {
  if (!timestamp || timestamp.trim() === '') {
    return { valid: true, message: '' };
  }
  
  const parsed = parseTimestamp(timestamp);
  const input = timestamp.toString().trim();
  
  // Check if parsing succeeded (non-zero result or valid zero input)
  if (parsed > 0 || input === '0' || input === '0.0' || input === '0:00' || input === '0,00') {
    return { 
      valid: true, 
      message: `Parsed as ${formatTime(parsed)}`,
      seconds: parsed
    };
  }
  
  // Provide helpful error messages with locale-appropriate examples
  const examples = getLocalizedExamples();
  const suggestions = [];
  
  if (input.includes(':')) {
    suggestions.push(`MM:SS format (e.g., 1:30, ${examples.timeWithDecimal})`);
  } else if (input.includes('m') || input.includes('s')) {
    suggestions.push(`1m30s format (e.g., 1m30s, ${examples.minutesWithDecimal})`);
  } else {
    suggestions.push(`Seconds (e.g., 90, ${examples.secondsWithDecimal})`);
  }
  
  return { 
    valid: false, 
    message: `Invalid format. Expected: ${suggestions.join(' or ')}`,
    seconds: 0
  };
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
  const mappedClips = clips.filter(clip => clip.key);
  const currentClip = currentEditingKey ? clips.find(clip => clip.key === currentEditingKey) : null;
  const currentClipIndex = currentClip ? clips.indexOf(currentClip) : -1;
  
  const virtualKeyboardHTML = generateVirtualKeyboardForEdit(clips);

  return `
    <div class="edit-mode">
      <div class="header-row">
        <h1>Meme Machine <span class="mode-subtitle">- Edit Mode</span></h1>
        <button class="help-btn" title="Show help">?</button>
      </div>
      
      <div class="edit-help-section">
        <div class="edit-help-text">
          ${currentEditingKey ? 
            `Editing key <strong>${currentEditingKey}</strong> - Add a YouTube URL and set the timestamp for the clip` :
            'Click any key on the keyboard below to start mapping it to a YouTube clip'
          }
        </div>
      </div>
      
      <div class="edit-preview-area">
        ${currentEditingKey && currentClip && currentClip.url && extractYouTubeVideoId(currentClip.url) ? `
          <div id="edit-preview-player"></div>
        ` : `
          <div class="preview-placeholder-edit">
            <div class="preview-text">Video preview area</div>
          </div>
        `}
      </div>
      
      <div class="edit-controls-area">
        ${currentEditingKey ? `
          <div class="edit-controls-compact">
            <div class="control-grid">
              <div class="key-section">
                <div class="editing-key">${currentEditingKey}</div>
                <button class="remap-btn" title="Change to different key">remap</button>
              </div>
              
              <div class="url-time-group">
                <div class="url-section-vertical">
                  <label>YouTube URL:</label>
                  <input type="text" class="clip-url" placeholder="https://youtu.be/dj0i0ZIwBUc" 
                         value="${currentClip ? currentClip.url : ''}" 
                         data-clip-index="${currentClipIndex}">
                </div>
                
                <div class="time-section">
                  <div class="timestamp-section-vertical">
                    <label>Start Time:</label>
                    <div class="timestamp-input-row">
                      <input type="text" class="timestamp" 
                             placeholder="${getLocalizedPlaceholder()}" 
                             value="${currentClip ? currentClip.timestamp : ''}" 
                             data-clip-index="${currentClipIndex}">
                      ${currentClip && currentClip.url && extractYouTubeVideoId(currentClip.url) ? `
                        <button class="set-timestamp-btn" data-clip-index="${currentClipIndex}" id="set-time-btn-${currentClipIndex}" title="Set timestamp to current video time">set to 0:00</button>
                      ` : ''}
                    </div>
                    ${currentClipIndex >= 0 ? `
                      <div class="timestamp-validation" id="timestamp-validation-${currentClipIndex}"></div>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <div class="control-actions">
                ${currentClip && currentClip.url ? `
                  <button class="unmap-key-btn" data-key="${currentEditingKey}">Unmap Key</button>
                ` : ''}
                <button class="done-editing-btn">Done</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="no-key-message">
            Select a key from the keyboard below to start mapping
          </div>
        `}
      </div>
      
      <div class="virtual-keyboard-edit">
        ${virtualKeyboardHTML}
      </div>
      
      <div class="edit-bottom-controls">
        <div class="background-section-compact">
          <label>Background audio:</label>
          <input type="text" class="background-track" placeholder="YouTube URL or upload" value="${backgroundTrack}">
          <button class="upload-btn" title="Upload audio file">📁</button>
          ${backgroundAudioFile || backgroundTrack ? '<button class="clear-audio-btn" title="Clear">×</button>' : ''}
          <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        </div>
        
        <button class="play-mode-btn" ${clips.some(c => c.url && c.key) ? '' : 'disabled'}>Play Mode</button>
      </div>
      
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
  const virtualKeyboardHTML = generateVirtualKeyboard(mappedClips);

  return `
    <div class="play-mode">
      <div class="header-row">
        <h1>Meme Machine <span class="mode-subtitle">- Play Mode</span></h1>
        <button class="help-btn" title="Show help">?</button>
      </div>
      
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
        <div class="instructions">
          <div>Press keys to play clips • Space bar controls background music</div>
        </div>
        
        <div class="playback-status">
          <div class="background-status">Background: <span id="bg-status">stopped</span></div>
          <div class="performance-stats">
            <div>Keys pressed: <span id="keys-pressed">0</span></div>
            <div>Session: <span id="session-time">00:00</span></div>
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

// Generate virtual keyboard for edit mode
function generateVirtualKeyboardForEdit(clips) {
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];
  
  const mappedKeys = {};
  clips.forEach(clip => {
    if (clip.key) {
      mappedKeys[clip.key] = clip;
    }
  });
  
  return keyboardRows.map(row => 
    `<div class="keyboard-row">
      ${row.map(key => {
        const isMapped = key in mappedKeys;
        const clip = mappedKeys[key];
        const isCurrentlyEditing = key === currentEditingKey;
        return `
          <div class="virtual-key-edit ${isMapped ? 'mapped' : ''} ${isCurrentlyEditing ? 'editing' : ''}" data-key="${key}">
            <span class="key-letter">${key}</span>
            ${isMapped && clip.url ? `
              <div class="key-info">
                <div class="clip-indicator">●</div>
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
  // Clear any existing background audio
  if (backgroundAudioElement) {
    backgroundAudioElement.pause();
    backgroundAudioElement = null;
  }
  
  if (backgroundYouTubePlayer) {
    backgroundYouTubePlayer.destroy();
    backgroundYouTubePlayer = null;
  }
  
  // Setup audio file background
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
    
    console.log('Background audio file ready');
  }
  // Setup YouTube background audio
  else if (backgroundTrack && extractYouTubeVideoId(backgroundTrack)) {
    setupBackgroundYouTubePlayer();
  }
}

// Setup background YouTube player
function setupBackgroundYouTubePlayer() {
  if (!isYouTubeAPIReady) {
    console.log('YouTube API not ready for background player, retrying...');
    // Retry after a short delay
    setTimeout(setupBackgroundYouTubePlayer, 500);
    return;
  }
  
  const videoId = extractYouTubeVideoId(backgroundTrack);
  if (!videoId) return;
  
  // Create hidden container for background player
  let bgContainer = document.getElementById('background-youtube-player');
  if (!bgContainer) {
    bgContainer = document.createElement('div');
    bgContainer.id = 'background-youtube-player';
    bgContainer.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
    document.body.appendChild(bgContainer);
  }
  
  // Create player div
  const playerDiv = document.createElement('div');
  playerDiv.id = 'bg-youtube-player';
  bgContainer.innerHTML = '';
  bgContainer.appendChild(playerDiv);
  
  backgroundYouTubePlayer = new YT.Player('bg-youtube-player', {
    height: '1',
    width: '1',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      loop: 1,
      playlist: videoId // Required for loop to work
    },
    events: {
      onReady: (event) => {
        console.log('Background YouTube player ready');
        // Set volume lower for background
        event.target.setVolume(70);
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          updateBackgroundStatus('playing');
        } else if (event.data === YT.PlayerState.PAUSED) {
          updateBackgroundStatus('paused');
        } else if (event.data === YT.PlayerState.ENDED) {
          updateBackgroundStatus('stopped');
          // Auto-restart for loop
          event.target.playVideo();
        }
      }
    }
  });
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
  // Handle audio file background
  if (backgroundAudioElement) {
    if (backgroundAudioElement.paused) {
      backgroundAudioElement.play().catch(e => {
        console.error('Failed to play background audio:', e);
      });
    } else {
      backgroundAudioElement.pause();
    }
  }
  // Handle YouTube background
  else if (backgroundYouTubePlayer) {
    try {
      const state = backgroundYouTubePlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        backgroundYouTubePlayer.pauseVideo();
      } else {
        backgroundYouTubePlayer.playVideo();
      }
    } catch (e) {
      console.error('Failed to toggle background YouTube player:', e);
    }
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
    if (listeningClipIndex >= 0 && listeningClipIndex < clips.length) {
      clips[listeningClipIndex].key = key;
      currentEditingKey = key; // Update current editing key
    }
    
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
  const backgroundTrackInput = document.querySelector('.background-track');
  const uploadBtn = document.querySelector('.upload-btn');
  const helpBtn = document.querySelector('.help-btn');
  const audioFileInput = document.querySelector('.audio-file-input');
  const clearAudioBtn = document.querySelector('.clear-audio-btn');
  const virtualKeys = document.querySelectorAll('.virtual-key-edit');
  const remapBtn = document.querySelector('.remap-btn');
  const doneEditingBtn = document.querySelector('.done-editing-btn');
  const unmapKeyBtn = document.querySelector('.unmap-key-btn');
  const setTimestampBtn = document.querySelector('.set-timestamp-btn');
  
  // Play button
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      validateUniqueKeys(); // Ensure no duplicates before playing
      if (clips.some(c => c.url && c.key)) {
        currentMode = 'play';
        currentEditingKey = null; // Clear editing state
        saveToStorage(); // Save current state before switching modes
        renderCurrentMode();
      }
    });
  }
  
  // Virtual keyboard keys
  virtualKeys.forEach(key => {
    key.addEventListener('click', (e) => {
      const keyLetter = e.currentTarget.dataset.key;
      if (keyLetter) {
        // Toggle selection if clicking the same key
        if (currentEditingKey === keyLetter) {
          currentEditingKey = null;
        } else {
          // If this key already exists in clips, edit it; otherwise create new
          let existingClip = clips.find(c => c.key === keyLetter);
          if (!existingClip) {
            existingClip = { key: keyLetter, url: '', timestamp: '' };
            clips.push(existingClip);
          }
          currentEditingKey = keyLetter;
        }
        
        saveToStorage();
        renderCurrentMode();
      }
    });
  });
  
  // Remap button
  if (remapBtn) {
    remapBtn.addEventListener('click', () => {
      isListeningForKey = true;
      // Store the current editing key as the one to remap
      listeningClipIndex = clips.findIndex(c => c.key === currentEditingKey);
      renderCurrentMode();
    });
  }
  
  // Done editing button
  if (doneEditingBtn) {
    doneEditingBtn.addEventListener('click', () => {
      currentEditingKey = null;
      saveToStorage();
      renderCurrentMode();
    });
  }
  
  // Unmap key button
  if (unmapKeyBtn) {
    unmapKeyBtn.addEventListener('click', (e) => {
      const key = e.target.dataset.key;
      if (key) {
        const clipIndex = clips.findIndex(c => c.key === key);
        if (clipIndex !== -1) {
          clips.splice(clipIndex, 1);
          currentEditingKey = null;
          saveToStorage();
          renderCurrentMode();
        }
      }
    });
  }
  
  // Set timestamp button
  if (setTimestampBtn) {
    setTimestampBtn.addEventListener('click', (e) => {
      const clipIndex = parseInt(e.target.dataset.clipIndex);
      if (clipIndex >= 0 && previewPlayers.edit) {
        setTimestampFromEditPreview(clipIndex);
      }
    });
  }
  
  // Background track input
  if (backgroundTrackInput) {
    backgroundTrackInput.addEventListener('input', (e) => {
      backgroundTrack = e.target.value;
      
      // If user enters a URL, clear any uploaded file
      if (backgroundTrack.trim() && backgroundAudioFile) {
        if (backgroundAudioFile.audioUrl) {
          URL.revokeObjectURL(backgroundAudioFile.audioUrl);
        }
        backgroundAudioFile = null;
      }
      
      // Validate YouTube URL if provided
      if (backgroundTrack.trim()) {
        validateYouTubeUrl(backgroundTrack, e.target);
      } else {
        e.target.classList.remove('valid', 'invalid');
      }
      
      saveToStorage(); // Auto-save background track changes
      
      // Update UI to show/hide clear button
      setTimeout(() => renderCurrentMode(), 100);
    });
  }
  
  // Upload button
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      audioFileInput.click();
    });
  }

  // Help button
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      showHelpModal();
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
  
  // Handle inputs for the current editing clip
  if (currentEditingKey) {
    const clipIndex = clips.findIndex(c => c.key === currentEditingKey);
    
    // URL input
    const urlInput = document.querySelector('.clip-url');
    if (urlInput && clipIndex !== -1) {
      urlInput.addEventListener('input', (e) => {
        clips[clipIndex].url = e.target.value;
        
        // Validate YouTube URL
        if (e.target.value) {
          validateYouTubeUrl(e.target.value, e.target);
        } else {
          e.target.classList.remove('valid', 'invalid');
        }
        
        // Update play button state
        updatePlayButtonState();
        
        // Auto-save with debouncing
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
          saveToStorage();
          // Re-render to update preview
          renderCurrentMode();
        }, 1000);
      });
    }
    
    // Timestamp input
    const timestampInput = document.querySelector('.timestamp');
    if (timestampInput && clipIndex !== -1) {
      timestampInput.addEventListener('input', (e) => {
        clips[clipIndex].timestamp = e.target.value;
        
        // Validate timestamp
        validateTimestampInput(e.target.value, clipIndex);
        
        // Auto-save with debouncing
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
          saveToStorage();
        }, 1000);
      });
    }
  }
  
  // Handle keyboard input for key mapping
  if (isListeningForKey) {
    // This will be handled by the global key handler
    const editHelp = document.querySelector('.edit-help-text');
    if (editHelp) {
      editHelp.innerHTML = '<div class="listening-message">Press any letter key to map it...</div>';
    }
  }
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
  
  // Clear any YouTube URL input when uploading a file
  const backgroundTrackInput = document.querySelector('.background-track');
  if (backgroundTrackInput) {
    backgroundTrackInput.classList.remove('valid', 'invalid');
  }
  
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
  // Clean up audio file
  if (backgroundAudioFile && backgroundAudioFile.audioUrl) {
    URL.revokeObjectURL(backgroundAudioFile.audioUrl);
  }
  
  // Clean up YouTube player
  if (backgroundYouTubePlayer) {
    backgroundYouTubePlayer.destroy();
    backgroundYouTubePlayer = null;
  }
  
  // Clean up audio element
  if (backgroundAudioElement) {
    backgroundAudioElement.pause();
    backgroundAudioElement = null;
  }
  
  backgroundAudioFile = null;
  backgroundTrack = '';
  
  // Clear the file input
  const audioFileInput = document.querySelector('.audio-file-input');
  if (audioFileInput) {
    audioFileInput.value = '';
  }
  
  // Clear the URL input and its validation state
  const backgroundTrackInput = document.querySelector('.background-track');
  if (backgroundTrackInput) {
    backgroundTrackInput.value = '';
    backgroundTrackInput.classList.remove('valid', 'invalid');
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

// Validate timestamp input and show UI feedback
function validateTimestampInput(timestamp, clipIndex) {
  const validation = validateTimestamp(timestamp);
  const input = document.querySelector(`.timestamp[data-clip-index="${clipIndex}"]`);
  const validationElement = document.getElementById(`timestamp-validation-${clipIndex}`);
  
  if (!input) return;
  
  // Update input styling
  input.classList.remove('valid', 'invalid');
  
  if (validation.valid) {
    if (timestamp && timestamp.trim() !== '') {
      input.classList.add('valid');
    }
  } else {
    input.classList.add('invalid');
  }
  
  // Update validation message
  if (validationElement) {
    validationElement.textContent = validation.message;
    validationElement.className = `timestamp-validation ${validation.valid ? 'valid' : 'invalid'}`;
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
  const virtualKeys = document.querySelectorAll('.virtual-key');
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Stop all active clips and background audio
      Object.keys(activeClips).forEach(key => stopClip(key));
      if (backgroundAudioElement) {
        backgroundAudioElement.pause();
      }
      if (backgroundYouTubePlayer) {
        backgroundYouTubePlayer.pauseVideo();
      }
      
      currentMode = 'edit';
      saveToStorage(); // Save current state before switching modes
      renderCurrentMode();
    });
  }
  
  // Add click listeners to virtual keys in play mode
  virtualKeys.forEach(key => {
    const keyLetter = key.dataset.key;
    if (keyLetter) {
      // Mouse down - start playing
      key.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const clip = clips.find(c => c.key === keyLetter && c.url);
        if (clip && !activeClips[keyLetter]) {
          playClip(keyLetter);
        }
      });
      
      // Mouse up - stop playing
      key.addEventListener('mouseup', (e) => {
        e.preventDefault();
        const clip = clips.find(c => c.key === keyLetter && c.url);
        if (clip && activeClips[keyLetter]) {
          stopClip(keyLetter);
        }
      });
      
      // Mouse leave - also stop playing (in case user drags mouse off)
      key.addEventListener('mouseleave', (e) => {
        const clip = clips.find(c => c.key === keyLetter && c.url);
        if (clip && activeClips[keyLetter]) {
          stopClip(keyLetter);
        }
      });
      
      // Prevent context menu on right click
      key.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
  });
  
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

// Add console commands for debugging storage and testing time parser
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

// Add console command for testing time parser
window.testTimeParser = (timestamp) => {
  const validation = validateTimestamp(timestamp);
  const parsed = parseTimestamp(timestamp);
  const examples = getLocalizedExamples();
  
  console.log(`Input: "${timestamp}"`);
  console.log(`Parsed: ${parsed} seconds`);
  console.log(`Formatted: ${formatTime(parsed)}`);
  console.log(`Valid: ${validation.valid}`);
  console.log(`Message: ${validation.message}`);
  console.log(`Local decimal separator: "${examples.decimal}"`);
  console.log(`Try these local formats: ${examples.timeWithDecimal}, ${examples.secondsWithDecimal}`);
  
  return { input: timestamp, parsed, formatted: formatTime(parsed), validation, examples };
};

// Setup Edit Mode
function setupEditMode() {
  // Clear any preview players from previous mode
  previewPlayers = {};
  
  // If there's a current editing key, setup the preview player
  if (currentEditingKey) {
    setupEditPreviewPlayer();
  }
}

// Setup preview player for the current editing key
function setupEditPreviewPlayer() {
  if (!isYouTubeAPIReady || !currentEditingKey) return;
  
  const clip = clips.find(c => c.key === currentEditingKey);
  if (!clip || !clip.url) return;
  
  const videoId = extractYouTubeVideoId(clip.url);
  if (!videoId) return;
  
  const playerContainer = document.getElementById('edit-preview-player');
  if (!playerContainer) return;
  
  // Clear existing player
  if (previewPlayers.edit) {
    previewPlayers.edit.destroy();
    delete previewPlayers.edit;
  }
  
  // Create new player
  previewPlayers.edit = new YT.Player('edit-preview-player', {
    height: '240',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 0,
      fs: 1,
      modestbranding: 1,
      rel: 0,
      start: parseTimestamp(clip.timestamp) || 0
    },
    events: {
      onReady: (event) => {
        console.log(`Edit preview player ready for key ${currentEditingKey}`);
        // Start time updater
        const clipIndex = clips.indexOf(clip);
        startEditTimeUpdater(clipIndex, previewPlayers.edit);
      },
      onStateChange: (event) => {
        // Update timestamp display when user seeks
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
          const clipIndex = clips.indexOf(clip);
          updateCurrentTimeDisplay(clipIndex, previewPlayers.edit);
        }
      }
    }
  });
}

// Start time updater for edit preview
function startEditTimeUpdater(clipIndex, player) {
  if (window.editTimeUpdaterInterval) {
    clearInterval(window.editTimeUpdaterInterval);
  }
  
  window.editTimeUpdaterInterval = setInterval(() => {
    if (player && player.getCurrentTime) {
      updateCurrentTimeDisplay(clipIndex, player);
    }
  }, 500);
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
    const setTimeBtn = document.getElementById(`set-time-btn-${clipIndex}`);
    if (setTimeBtn && currentTime !== undefined) {
      setTimeBtn.textContent = `set to ${formatTime(currentTime)}`;
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

// Set timestamp from edit preview player
function setTimestampFromEditPreview(clipIndex) {
  const player = previewPlayers.edit;
  if (player && player.getCurrentTime && clipIndex >= 0) {
    try {
      const currentTime = player.getCurrentTime();
      const formattedTime = formatTime(currentTime);
      
      // Update the clip data
      clips[clipIndex].timestamp = formattedTime;
      
      // Update the input field
      const timestampInput = document.querySelector('.timestamp');
      if (timestampInput) {
        timestampInput.value = formattedTime;
        // Trigger validation
        validateTimestampInput(formattedTime, clipIndex);
      }
      
      // Save to storage
      saveToStorage();
      
      console.log(`Timestamp set to ${formattedTime} for clip ${clipIndex}`);
    } catch (error) {
      console.error('Failed to set timestamp:', error);
    }
  }
}



// Check if this is the first visit and show help modal
function checkFirstVisit() {
  const hasVisited = localStorage.getItem(STORAGE_KEYS.firstVisit);
  if (!hasVisited) {
    showHelpModal();
    localStorage.setItem(STORAGE_KEYS.firstVisit, 'true');
  }
}

// Show help modal
function showHelpModal() {
  const modal = createHelpModal();
  document.body.appendChild(modal);
  
  // Focus the modal for accessibility
  setTimeout(() => {
    const closeBtn = modal.querySelector('.help-modal-close');
    if (closeBtn) closeBtn.focus();
  }, 100);
}

// Create help modal HTML
function createHelpModal() {
  const modal = document.createElement('div');
  modal.className = 'help-modal-overlay';
  modal.innerHTML = `
    <div class="help-modal">
      <div class="help-modal-header">
        <h2>Welcome to Meme Machine!</h2>
        <button class="help-modal-close" title="Close help">×</button>
      </div>
      <div class="help-modal-content">
        <div class="help-section">
          <h3>🎵 Background Audio / Beat (Optional)</h3>
          <p>Add background music that will loop while you play clips:</p>
          <p>• Paste a <strong>YouTube URL</strong> for music videos or beats</p>
          <p>• Or click <strong>"📁"</strong> to upload your own audio file</p>
          <p>This is completely optional but adds atmosphere to your meme sessions!</p>
        </div>
        
        <div class="help-section">
          <h3>🎬 Mapping Video Clips</h3>
          <p>1. Click on any key on the <strong>virtual keyboard</strong> to select it</p>
          <p>2. Add a <strong>YouTube URL</strong> in the main editor area</p>
          <p>3. Set a <strong>timestamp</strong> to start from a specific moment</p>
          <p>4. Use <strong>"Set Current Time"</strong> to capture the exact timestamp from the preview</p>
          <p>5. Click <strong>"Done"</strong> when finished or select another key to edit</p>
        </div>
        
        <div class="help-section">
          <h3>🎮 Playing Your Memes</h3>
          <p>1. Click <strong>"Play Mode"</strong> to start performing</p>
          <p>2. Press any mapped key to play that video clip</p>
          <p>3. Press <strong>Space</strong> to start/stop background music</p>
          <p>4. Release the key to stop the clip immediately</p>
        </div>
        
        <div class="help-section">
          <h3>💡 Pro Tips</h3>
          <p>• Use timestamps to skip intros: "0:15" or "15"</p>
          <p>• Green dots on keys show mapped clips</p>
          <p>• Click <strong>"Change Key"</strong> to remap to a different letter</p>
          <p>• Your settings are automatically saved</p>
          <p>• Background audio can be a YouTube URL or uploaded file</p>
        </div>
        
        <div class="help-section">
          <h3>⌨️ Timestamp Formats</h3>
          <p>All of these work: <code>1:30</code>, <code>90</code>, <code>90.5</code>, <code>1m30s</code></p>
        </div>
      </div>
      <div class="help-modal-footer">
        <button class="help-modal-got-it">Got it! Let's start</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const closeBtn = modal.querySelector('.help-modal-close');
  const gotItBtn = modal.querySelector('.help-modal-got-it');
  const overlay = modal;
  
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn.addEventListener('click', closeModal);
  gotItBtn.addEventListener('click', closeModal);
  
  // Close on overlay click (but not on modal content click)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  return modal;
}

// Start the app
init();
