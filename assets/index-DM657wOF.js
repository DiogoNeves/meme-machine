(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();let h="edit",i=[{key:"A",url:"",timestamp:""}],b="",d=null,$=!1,C=-1,f={},m=null,P={},M={},I={},N={},z={},L=!1,E=null,T=null,A=null;const p={clips:"meme-machine-clips",backgroundTrack:"meme-machine-background-track",backgroundAudioData:"meme-machine-background-audio-data",backgroundAudioName:"meme-machine-background-audio-name",collapsedPreviews:"meme-machine-collapsed-previews",settings:"meme-machine-settings"};function H(){G(),R(),v(),ne(),console.log("Meme Machine loaded with saved settings")}function G(){if(window.YT){L=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{L=!0,console.log("YouTube API loaded")}}function B(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,o=e.match(t);return o?o[1]:null}function O(e){if(!e)return 0;const t=/(?:(\d+)[:m])?(\d+)(?:[s])?/,o=e.match(t);if(o){const a=parseInt(o[1]||0),n=parseInt(o[2]||0);return a*60+n}return parseFloat(e)||0}function v(){const e=document.querySelector("#app");h==="edit"?(e.innerHTML=_(),Te()):(e.innerHTML=J(),h==="play"&&X()),re()}function _(){const e=i.map((t,o)=>{const a=t.url&&B(t.url),n=f[o]||!1;return`
    <div class="clip-row">
      <div class="clip-main">
        <div class="key-button ${$&&C===o?"listening":""}" 
             data-clip-index="${o}">
          ${t.key||"?"}
        </div>
        <input type="text" class="clip-url" placeholder="YouTube URL" value="${t.url}" data-clip-index="${o}">
        <input type="text" class="timestamp" placeholder="0:00" value="${t.timestamp}" data-clip-index="${o}">
        <button class="remove-clip-btn" data-clip-index="${o}" title="Remove this clip">×</button>
        ${a?`
          <button class="toggle-preview-btn ${n?"collapsed":""}" 
                  data-clip-index="${o}" 
                  title="${n?"Show":"Hide"} preview">
            ${n?"▼":"▲"}
          </button>
        `:""}
      </div>
      ${a?`
        <div class="clip-preview ${n?"collapsed":""}" id="preview-container-${o}">
          <div class="preview-player">
            <div id="preview-player-${o}"></div>
          </div>
          <div class="preview-controls">
            <button class="set-timestamp-btn" data-clip-index="${o}">Set Current Time</button>
            <span class="current-time" id="current-time-${o}">0:00</span>
          </div>
        </div>
      `:""}
    </div>
  `}).join("");return`
    <div class="edit-mode">
      <h1>Meme Machine <span class="mode-subtitle">- Edit Mode</span></h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track (optional)" value="${b}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${d?'<button class="clear-audio-btn">×</button>':""}
      </div>
      
      <div class="clips-section">
        ${e}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${$?'<div class="listening-message">Press any letter key to map it...</div>':'<div class="mapping-instructions">Click on a key button to map it to a different key<br/>Add YouTube URLs to see video previews<br/>Use ▲/▼ to hide/show previews</div>'}
      </div>
      
      <button class="play-mode-btn" ${i.some(t=>t.url&&t.key)?"":"disabled"}>Play</button>
      
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
  `}function J(){const e=i.filter(a=>a.key&&a.url),t=e.map(a=>`<div class="mapped-key" data-key="${a.key}">${a.key}</div>`).join("");return`
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
        ${Z(e)}
      </div>
      
      <div class="controls-section">
        <div class="mapped-keys-section">
          <span class="mapped-keys-label">Active Keys</span>
          <div class="mapped-keys">
            ${t||'<div class="no-keys">No keys mapped</div>'}
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
  `}function Z(e){const t=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],o=new Set(e.map(a=>a.key));return t.map(a=>`<div class="keyboard-row">
      ${a.map(n=>{const s=o.has(n),l=e.find(k=>k.key===n);return`
          <div class="virtual-key ${s?"mapped":""}" data-key="${n}">
            <span class="key-letter">${n}</span>
            ${s?`
              <div class="key-info">
                <div class="clip-name">${W(l.url)}</div>
                <div class="timestamp-info">${l.timestamp||"0:00"}</div>
              </div>
            `:""}
  </div>
        `}).join("")}
    </div>`).join("")}function W(e){try{const t=B(e);return t?`${t.substring(0,6)}...`:"Clip"}catch{return"Clip"}}function X(){Q(),ee(),fe(),be()}function Q(){d&&d.audioUrl&&(m=new Audio(d.audioUrl),m.loop=!0,m.volume=.7,m.addEventListener("play",()=>{q("playing")}),m.addEventListener("pause",()=>{q("paused")}),m.addEventListener("ended",()=>{q("stopped")}),console.log("Background audio ready"))}function ee(){if(!L){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&(P={},e.innerHTML="",i.forEach(t=>{if(t.url&&t.key){const o=B(t.url);o&&te(t.key,o,e)}}))}function te(e,t,o){const a=document.createElement("div");a.id=`player-${e}`,a.style.display="none",o.appendChild(a);const n=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:s=>{console.log(`Player ready for key: ${e}`)},onStateChange:s=>{s.data===YT.PlayerState.ENDED&&K(e)}}});P[e]=n}function q(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function oe(e){const t=i.find(s=>s.key===e&&s.url);if(!t||I[e])return;const o=P[e];if(!o)return;const a=O(t.timestamp),n=document.getElementById(`player-${e}`);if(n){const s=document.querySelector(".video-placeholder");s&&(s.style.opacity="0",setTimeout(()=>s.style.display="none",300)),n.style.display="block",n.style.opacity="0",setTimeout(()=>n.style.opacity="1",50),o.seekTo(a),o.playVideo(),I[e]=!0,F(e,!0),ke(),console.log(`Playing clip ${e} from ${a}s`)}}function K(e){const t=P[e];if(!t||!I[e])return;t.pauseVideo();const o=document.getElementById(`player-${e}`);o&&(o.style.opacity="0",setTimeout(()=>o.style.display="none",300)),setTimeout(()=>{if(!Object.values(I).some(n=>n)){const n=document.querySelector(".video-placeholder");n&&(n.style.display="block",n.style.opacity="1")}},300),N[e]&&(clearTimeout(N[e]),delete N[e]),z[e]&&(clearInterval(z[e]),delete z[e]),F(e,!1),I[e]=!1,console.log(`Stopped clip ${e}`)}function ae(){m&&(m.paused?m.play().catch(e=>{console.error("Failed to play background audio:",e)}):m.pause())}function ne(){document.addEventListener("keydown",se)}function se(e){h==="edit"&&$&&C>=0?ie(e):h==="play"&&ve(e)}function ie(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const o=i.findIndex(a=>a.key===t);if(o!==-1&&o!==C){alert(`Key "${t}" is already mapped to another clip!`);return}i.forEach((a,n)=>{n!==C&&a.key===t&&(a.key="")}),i[C].key=t,$=!1,C=-1,y(),v()}}function re(){h==="edit"?le():me()}function le(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".map-new-key-btn"),o=document.querySelector(".background-track"),a=document.querySelector(".upload-btn"),n=document.querySelector(".audio-file-input"),s=document.querySelector(".clear-audio-btn"),l=document.querySelectorAll(".key-button"),k=document.querySelectorAll(".remove-clip-btn"),x=document.querySelectorAll(".set-timestamp-btn"),w=document.querySelectorAll(".toggle-preview-btn");e&&e.addEventListener("click",()=>{Y(),i.some(u=>u.url&&u.key)&&(h="play",y(),v())}),t&&t.addEventListener("click",()=>{const u=new Set(i.map(r=>r.key).filter(r=>r));let c="A";for(let r=0;r<26;r++){const g=String.fromCharCode(65+r);if(!u.has(g)){c=g;break}}i.push({key:c,url:"",timestamp:""}),y(),v()}),k.forEach(u=>{u.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);if(r>=0&&i.length>1){i.splice(r,1);const g={};Object.keys(f).forEach(U=>{const S=parseInt(U);S<r?g[S]=f[S]:S>r&&(g[S-1]=f[S])}),f=g,Y(),y(),v()}else i.length===1&&(i[0]={key:"A",url:"",timestamp:""},f={},y(),v())})}),w.forEach(u=>{u.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&Ee(r)})}),x.forEach(u=>{u.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&$e(r)})}),o&&o.addEventListener("input",u=>{d||(b=u.target.value,y())}),a&&a.addEventListener("click",()=>{n.click()}),n&&n.addEventListener("change",u=>{const c=u.target.files[0];c&&ce(c)}),s&&s.addEventListener("click",()=>{de()}),l.forEach(u=>{u.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&($=!0,C=r,v())})}),document.querySelectorAll(".clip-url, .timestamp").forEach(u=>{u.addEventListener("input",c=>{const r=parseInt(c.target.dataset.clipIndex),g=c.target.classList.contains("clip-url")?"url":"timestamp";i[r]&&(i[r][g]=c.target.value,g==="url"&&(c.target.value&&ue(c.target.value,c.target),setTimeout(()=>{v()},100)),pe(),clearTimeout(window.saveTimeout),window.saveTimeout=setTimeout(()=>{y()},1e3))})})}function ce(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}d=e,b=e.name,d.audioUrl&&URL.revokeObjectURL(d.audioUrl),d.audioUrl=URL.createObjectURL(e),e.size>5*1024*1024&&console.warn("File larger than 5MB - will not be saved to localStorage"),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),y(),v()}function de(){d&&d.audioUrl&&URL.revokeObjectURL(d.audioUrl),d=null,b="";const e=document.querySelector(".audio-file-input");e&&(e.value=""),console.log("Background audio cleared"),y(),v()}function ue(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function pe(){const e=document.querySelector(".play-mode-btn");if(e){const t=i.some(o=>o.url&&o.key);e.disabled=!t}}function me(){const e=document.querySelector(".edit-mode-btn");e&&e.addEventListener("click",()=>{Object.keys(I).forEach(t=>K(t)),m&&m.pause(),h="edit",y(),v()}),document.addEventListener("keyup",ye)}function ve(e){if(h!=="play")return;const t=e.key.toUpperCase();i.find(a=>a.key===t&&a.url)&&!I[t]&&oe(t),e.key===" "&&(e.preventDefault(),ae())}function ye(e){if(h!=="play")return;const t=e.key.toUpperCase();i.find(a=>a.key===t&&a.url)&&I[t]&&K(t)}function Y(){const e=new Set,t=[];return i.forEach((o,a)=>{o.key&&e.has(o.key)?t.push({index:a,key:o.key}):o.key&&e.add(o.key)}),t.forEach(({index:o})=>{i[o].key=""}),t.length===0}function fe(){try{E=new(window.AudioContext||window.webkitAudioContext),T=E.createAnalyser(),T.fftSize=256,A=new Uint8Array(T.frequencyBinCount),m&&(E.createMediaElementSource(m).connect(T),T.connect(E.destination)),ge()}catch(e){console.log("Audio visualization not available:",e)}}function ge(){const e=document.getElementById("visualizer-canvas");if(!e||!T)return;const t=e.getContext("2d"),o=e.width/2,a=e.height/2,n=60;function s(){if(!T)return;T.getByteFrequencyData(A),t.clearRect(0,0,e.width,e.height);const l=32,k=Math.PI*2/l;for(let w=0;w<l;w++){const u=(A[w]||0)/255*40,c=w*k,r=o+Math.cos(c)*n,g=a+Math.sin(c)*n,U=o+Math.cos(c)*(n+u),S=a+Math.sin(c)*(n+u);t.strokeStyle=`hsl(${w*10%360}, 70%, 60%)`,t.lineWidth=3,t.beginPath(),t.moveTo(r,g),t.lineTo(U,S),t.stroke()}const x=A.reduce((w,D)=>w+D,0)/A.length;he(x),requestAnimationFrame(s)}s()}function he(e){const t=document.querySelector(".canvas-border");if(t){const o=Math.min(e/128,1),a=o*120+240;t.style.boxShadow=`inset 0 0 ${20+o*30}px rgba(${Math.floor(o*255)}, 100, 255, 0.6)`,t.style.borderColor=`hsl(${a}, 70%, 60%)`}}function be(){const e=Date.now();setInterval(()=>{const t=Math.floor((Date.now()-e)/1e3),o=Math.floor(t/60),a=t%60,n=document.getElementById("session-time");n&&(n.textContent=`${o.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`)},1e3)}function F(e,t){const o=document.querySelector(`.virtual-key[data-key="${e}"]`);if(o)if(t)o.classList.add("active");else{o.classList.remove("active");const a=o.querySelector(".progress-fill");a&&(a.style.transform="rotate(0deg)")}}function ke(){const e=document.getElementById("keys-pressed");if(e){const t=parseInt(e.textContent)||0;e.textContent=(t+1).toString()}}function y(){try{if(localStorage.setItem(p.clips,JSON.stringify(i)),localStorage.setItem(p.collapsedPreviews,JSON.stringify(f)),localStorage.setItem(p.backgroundTrack,b),d)if(localStorage.setItem(p.backgroundAudioName,d.name),d.size<=5*1024*1024){const t=new FileReader;t.onload=function(o){try{localStorage.setItem(p.backgroundAudioData,o.target.result),console.log("Background audio saved to localStorage")}catch(a){console.warn("Failed to save audio data - file too large:",a),localStorage.removeItem(p.backgroundAudioData)}},t.readAsDataURL(d)}else localStorage.removeItem(p.backgroundAudioData),console.warn("Background audio file too large for localStorage (>5MB)");else localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData);const e={currentMode:h,lastSaved:Date.now()};localStorage.setItem(p.settings,JSON.stringify(e)),console.log("Settings saved to localStorage")}catch(e){console.error("Failed to save to localStorage:",e)}}function R(){try{const e=localStorage.getItem(p.clips);if(e){const l=JSON.parse(e);Array.isArray(l)&&l.length>0&&(i=l.map(k=>({key:k.key||"",url:k.url||"",timestamp:k.timestamp||""})))}const t=localStorage.getItem(p.collapsedPreviews);t&&(f=JSON.parse(t));const o=localStorage.getItem(p.backgroundTrack);o&&(b=o);const a=localStorage.getItem(p.backgroundAudioName),n=localStorage.getItem(p.backgroundAudioData);a&&n?fetch(n).then(l=>l.blob()).then(l=>{d=new File([l],a,{type:l.type}),d.audioUrl=URL.createObjectURL(l),b=a,console.log("Background audio restored from localStorage:",a),h==="edit"&&v()}).catch(l=>{console.error("Failed to restore background audio:",l),localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData)}):a&&(b=a+" (file too large - please re-upload)");const s=localStorage.getItem(p.settings);if(s){const l=JSON.parse(s);console.log("Last saved:",new Date(l.lastSaved).toLocaleString())}console.log("Settings loaded from localStorage")}catch(e){console.error("Failed to load from localStorage:",e),i=[{key:"A",url:"",timestamp:""}],b="",d=null,f={}}}function we(){try{Object.values(p).forEach(e=>{localStorage.removeItem(e)}),console.log("All stored data cleared")}catch(e){console.error("Failed to clear storage:",e)}}function Se(){try{let e=0;const t={};return Object.entries(p).forEach(([o,a])=>{const n=localStorage.getItem(a),s=n?new Blob([n]).size:0;t[o]={size:s,sizeKB:Math.round(s/1024*100)/100,exists:!!n},e+=s}),t.total={size:e,sizeKB:Math.round(e/1024*100)/100,sizeMB:Math.round(e/1024/1024*100)/100},t}catch(e){return console.error("Failed to get storage info:",e),null}}window.memeMachineStorage={save:y,load:R,clear:we,info:Se,export:()=>{const e={clips:i,backgroundTrack:b,backgroundAudioName:(d==null?void 0:d.name)||null,timestamp:new Date().toISOString()};return console.log("Exported data:",e),e}};function Te(){setTimeout(()=>{Ie()},100)}function Ie(){if(!L){console.log("YouTube API not ready for previews yet");return}Object.values(M).forEach(e=>{e&&e.destroy&&e.destroy()}),M={},i.forEach((e,t)=>{if(e.url){const o=B(e.url);o&&Ce(t,o)}})}function Ce(e,t){if(!document.getElementById(`preview-player-${e}`))return;const a=new YT.Player(`preview-player-${e}`,{height:"200",width:"100%",videoId:t,playerVars:{autoplay:0,controls:1,disablekb:0,fs:0,modestbranding:1,rel:0,start:O(i[e].timestamp)||0},events:{onReady:n=>{console.log(`Preview player ready for clip ${e}`),Ae(e,a)},onStateChange:n=>{(n.data===YT.PlayerState.PLAYING||n.data===YT.PlayerState.PAUSED)&&V(e,a)}}});M[e]=a}function Ae(e,t){setInterval(()=>{t&&t.getCurrentTime&&V(e,t)},500)}function V(e,t){try{const o=t.getCurrentTime(),a=document.getElementById(`current-time-${e}`);a&&o!==void 0&&(a.textContent=j(o))}catch{}}function j(e){const t=Math.floor(e/60),o=Math.floor(e%60);return`${t}:${o.toString().padStart(2,"0")}`}function $e(e){const t=M[e];if(t&&t.getCurrentTime)try{const o=t.getCurrentTime(),a=j(o);i[e].timestamp=a;const n=document.querySelector(`.timestamp[data-clip-index="${e}"]`);n&&(n.value=a),y(),console.log(`Timestamp set to ${a} for clip ${e}`)}catch(o){console.error("Failed to set timestamp:",o)}}function Ee(e){f[e]=!f[e],y(),v(),console.log(`Preview ${e} ${f[e]?"collapsed":"expanded"}`)}H();
