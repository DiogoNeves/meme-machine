(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const p of i.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&a(p)}).observe(document,{childList:!0,subtree:!0});function o(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(n){if(n.ep)return;n.ep=!0;const i=o(n);fetch(n.href,i)}})();let v="edit",s=[{key:"A",url:"",timestamp:""}],g="",l=null,A=!1,w=-1,m=null,M={},L={},k={},B={},U={},$=!1,E=null,h=null,I=null;const u={clips:"meme-machine-clips",backgroundTrack:"meme-machine-background-track",backgroundAudioData:"meme-machine-background-audio-data",backgroundAudioName:"meme-machine-background-audio-name",settings:"meme-machine-settings"};function j(){H(),F(),y(),ae(),console.log("Meme Machine loaded with saved settings")}function H(){if(window.YT){$=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{$=!0,console.log("YouTube API loaded")}}function P(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,o=e.match(t);return o?o[1]:null}function q(e){if(!e)return 0;const t=/(?:(\d+)[:m])?(\d+)(?:[s])?/,o=e.match(t);if(o){const a=parseInt(o[1]||0),n=parseInt(o[2]||0);return a*60+n}return parseFloat(e)||0}function y(){const e=document.querySelector("#app");v==="edit"?(e.innerHTML=J(),we()):(e.innerHTML=G(),v==="play"&&W()),se()}function J(){const e=s.map((t,o)=>`
    <div class="clip-row">
      <div class="clip-main">
        <div class="key-button ${A&&w===o?"listening":""}" 
             data-clip-index="${o}">
          ${t.key||"?"}
        </div>
        <input type="text" class="clip-url" placeholder="YouTube URL" value="${t.url}" data-clip-index="${o}">
        <input type="text" class="timestamp" placeholder="0:00" value="${t.timestamp}" data-clip-index="${o}">
        <button class="remove-clip-btn" data-clip-index="${o}" title="Remove this clip">×</button>
      </div>
      ${t.url&&P(t.url)?`
        <div class="clip-preview" id="preview-container-${o}">
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
  `).join("");return`
    <div class="edit-mode">
      <h1>Edit Mode</h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track (optional)" value="${g}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${l?'<button class="clear-audio-btn">×</button>':""}
      </div>
      
      <div class="clips-section">
        ${e}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${A?'<div class="listening-message">Press any letter key to map it...</div>':'<div class="mapping-instructions">Click on a key button to map it to a different key<br/>Add YouTube URLs to see video previews</div>'}
      </div>
      
      <button class="play-mode-btn" ${s.some(t=>t.url&&t.key)?"":"disabled"}>Play</button>
    </div>
  `}function G(){const e=s.filter(a=>a.key&&a.url),t=e.map(a=>`<div class="mapped-key" data-key="${a.key}">${a.key}</div>`).join("");return`
    <div class="play-mode">
      <h1>Play Mode</h1>
      
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
    </div>
  `}function Z(e){const t=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],o=new Set(e.map(a=>a.key));return t.map(a=>`<div class="keyboard-row">
      ${a.map(n=>{const i=o.has(n),p=e.find(T=>T.key===n);return`
          <div class="virtual-key ${i?"mapped":""}" data-key="${n}">
            <span class="key-letter">${n}</span>
            ${i?`
              <div class="key-info">
                <div class="clip-name">${_(p.url)}</div>
                <div class="timestamp-info">${p.timestamp||"0:00"}</div>
              </div>
            `:""}
          </div>
        `}).join("")}
    </div>`).join("")}function _(e){try{const t=P(e);return t?`${t.substring(0,6)}...`:"Clip"}catch{return"Clip"}}function W(){X(),Q(),fe(),be()}function X(){l&&l.audioUrl&&(m=new Audio(l.audioUrl),m.loop=!0,m.volume=.7,m.addEventListener("play",()=>{x("playing")}),m.addEventListener("pause",()=>{x("paused")}),m.addEventListener("ended",()=>{x("stopped")}),console.log("Background audio ready"))}function Q(){if(!$){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&(M={},e.innerHTML="",s.forEach(t=>{if(t.url&&t.key){const o=P(t.url);o&&ee(t.key,o,e)}}))}function ee(e,t,o){const a=document.createElement("div");a.id=`player-${e}`,a.style.display="none",o.appendChild(a);const n=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:i=>{console.log(`Player ready for key: ${e}`)},onStateChange:i=>{i.data===YT.PlayerState.ENDED&&D(e)}}});M[e]=n}function x(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function te(e){const t=s.find(i=>i.key===e&&i.url);if(!t||k[e])return;const o=M[e];if(!o)return;const a=q(t.timestamp),n=document.getElementById(`player-${e}`);if(n){const i=document.querySelector(".video-placeholder");i&&(i.style.opacity="0",setTimeout(()=>i.style.display="none",300)),n.style.display="block",n.style.opacity="0",setTimeout(()=>n.style.opacity="1",50),o.seekTo(a),o.playVideo(),k[e]=!0,z(e,!0),he(),console.log(`Playing clip ${e} from ${a}s`)}}function D(e){const t=M[e];if(!t||!k[e])return;t.pauseVideo();const o=document.getElementById(`player-${e}`);o&&(o.style.opacity="0",setTimeout(()=>o.style.display="none",300)),setTimeout(()=>{if(!Object.values(k).some(n=>n)){const n=document.querySelector(".video-placeholder");n&&(n.style.display="block",n.style.opacity="1")}},300),B[e]&&(clearTimeout(B[e]),delete B[e]),U[e]&&(clearInterval(U[e]),delete U[e]),z(e,!1),k[e]=!1,console.log(`Stopped clip ${e}`)}function oe(){m&&(m.paused?m.play().catch(e=>{console.error("Failed to play background audio:",e)}):m.pause())}function ae(){document.addEventListener("keydown",ne)}function ne(e){v==="edit"&&A&&w>=0?ie(e):v==="play"&&me(e)}function ie(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const o=s.findIndex(a=>a.key===t);if(o!==-1&&o!==w){alert(`Key "${t}" is already mapped to another clip!`);return}s.forEach((a,n)=>{n!==w&&a.key===t&&(a.key="")}),s[w].key=t,A=!1,w=-1,f(),y()}}function se(){v==="edit"?re():pe()}function re(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".map-new-key-btn"),o=document.querySelector(".background-track"),a=document.querySelector(".upload-btn"),n=document.querySelector(".audio-file-input"),i=document.querySelector(".clear-audio-btn"),p=document.querySelectorAll(".key-button"),T=document.querySelectorAll(".remove-clip-btn"),C=document.querySelectorAll(".set-timestamp-btn");e&&e.addEventListener("click",()=>{K(),s.some(d=>d.url&&d.key)&&(v="play",f(),y())}),t&&t.addEventListener("click",()=>{const d=new Set(s.map(r=>r.key).filter(r=>r));let c="A";for(let r=0;r<26;r++){const S=String.fromCharCode(65+r);if(!d.has(S)){c=S;break}}s.push({key:c,url:"",timestamp:""}),f(),y()}),T.forEach(d=>{d.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&s.length>1?(s.splice(r,1),K(),f(),y()):s.length===1&&(s[0]={key:"A",url:"",timestamp:""},f(),y())})}),C.forEach(d=>{d.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&Ee(r)})}),o&&o.addEventListener("input",d=>{l||(g=d.target.value,f())}),a&&a.addEventListener("click",()=>{n.click()}),n&&n.addEventListener("change",d=>{const c=d.target.files[0];c&&le(c)}),i&&i.addEventListener("click",()=>{ce()}),p.forEach(d=>{d.addEventListener("click",c=>{const r=parseInt(c.target.dataset.clipIndex);r>=0&&(A=!0,w=r,y())})}),document.querySelectorAll(".clip-url, .timestamp").forEach(d=>{d.addEventListener("input",c=>{const r=parseInt(c.target.dataset.clipIndex),S=c.target.classList.contains("clip-url")?"url":"timestamp";s[r]&&(s[r][S]=c.target.value,S==="url"&&(c.target.value&&de(c.target.value,c.target),setTimeout(()=>{y()},100)),ue(),clearTimeout(window.saveTimeout),window.saveTimeout=setTimeout(()=>{f()},1e3))})})}function le(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}l=e,g=e.name,l.audioUrl&&URL.revokeObjectURL(l.audioUrl),l.audioUrl=URL.createObjectURL(e),e.size>5*1024*1024&&console.warn("File larger than 5MB - will not be saved to localStorage"),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),f(),y()}function ce(){l&&l.audioUrl&&URL.revokeObjectURL(l.audioUrl),l=null,g="";const e=document.querySelector(".audio-file-input");e&&(e.value=""),console.log("Background audio cleared"),f(),y()}function de(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function ue(){const e=document.querySelector(".play-mode-btn");if(e){const t=s.some(o=>o.url&&o.key);e.disabled=!t}}function pe(){const e=document.querySelector(".edit-mode-btn");e&&e.addEventListener("click",()=>{Object.keys(k).forEach(t=>D(t)),m&&m.pause(),v="edit",f(),y()}),document.addEventListener("keyup",ye)}function me(e){if(v!=="play")return;const t=e.key.toUpperCase();s.find(a=>a.key===t&&a.url)&&!k[t]&&te(t),e.key===" "&&(e.preventDefault(),oe())}function ye(e){if(v!=="play")return;const t=e.key.toUpperCase();s.find(a=>a.key===t&&a.url)&&k[t]&&D(t)}function K(){const e=new Set,t=[];return s.forEach((o,a)=>{o.key&&e.has(o.key)?t.push({index:a,key:o.key}):o.key&&e.add(o.key)}),t.forEach(({index:o})=>{s[o].key=""}),t.length===0}function fe(){try{E=new(window.AudioContext||window.webkitAudioContext),h=E.createAnalyser(),h.fftSize=256,I=new Uint8Array(h.frequencyBinCount),m&&(E.createMediaElementSource(m).connect(h),h.connect(E.destination)),ve()}catch(e){console.log("Audio visualization not available:",e)}}function ve(){const e=document.getElementById("visualizer-canvas");if(!e||!h)return;const t=e.getContext("2d"),o=e.width/2,a=e.height/2,n=60;function i(){if(!h)return;h.getByteFrequencyData(I),t.clearRect(0,0,e.width,e.height);const p=32,T=Math.PI*2/p;for(let b=0;b<p;b++){const c=(I[b]||0)/255*40,r=b*T,S=o+Math.cos(r)*n,O=a+Math.sin(r)*n,Y=o+Math.cos(r)*(n+c),V=a+Math.sin(r)*(n+c);t.strokeStyle=`hsl(${b*10%360}, 70%, 60%)`,t.lineWidth=3,t.beginPath(),t.moveTo(S,O),t.lineTo(Y,V),t.stroke()}const C=I.reduce((b,d)=>b+d,0)/I.length;ge(C),requestAnimationFrame(i)}i()}function ge(e){const t=document.querySelector(".canvas-border");if(t){const o=Math.min(e/128,1),a=o*120+240;t.style.boxShadow=`inset 0 0 ${20+o*30}px rgba(${Math.floor(o*255)}, 100, 255, 0.6)`,t.style.borderColor=`hsl(${a}, 70%, 60%)`}}function be(){const e=Date.now();setInterval(()=>{const t=Math.floor((Date.now()-e)/1e3),o=Math.floor(t/60),a=t%60,n=document.getElementById("session-time");n&&(n.textContent=`${o.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`)},1e3)}function z(e,t){const o=document.querySelector(`.virtual-key[data-key="${e}"]`);if(o)if(t)o.classList.add("active");else{o.classList.remove("active");const a=o.querySelector(".progress-fill");a&&(a.style.transform="rotate(0deg)")}}function he(){const e=document.getElementById("keys-pressed");if(e){const t=parseInt(e.textContent)||0;e.textContent=(t+1).toString()}}function f(){try{if(localStorage.setItem(u.clips,JSON.stringify(s)),localStorage.setItem(u.backgroundTrack,g),l)if(localStorage.setItem(u.backgroundAudioName,l.name),l.size<=5*1024*1024){const t=new FileReader;t.onload=function(o){try{localStorage.setItem(u.backgroundAudioData,o.target.result),console.log("Background audio saved to localStorage")}catch(a){console.warn("Failed to save audio data - file too large:",a),localStorage.removeItem(u.backgroundAudioData)}},t.readAsDataURL(l)}else localStorage.removeItem(u.backgroundAudioData),console.warn("Background audio file too large for localStorage (>5MB)");else localStorage.removeItem(u.backgroundAudioName),localStorage.removeItem(u.backgroundAudioData);const e={currentMode:v,lastSaved:Date.now()};localStorage.setItem(u.settings,JSON.stringify(e)),console.log("Settings saved to localStorage")}catch(e){console.error("Failed to save to localStorage:",e)}}function F(){try{const e=localStorage.getItem(u.clips);if(e){const i=JSON.parse(e);Array.isArray(i)&&i.length>0&&(s=i.map(p=>({key:p.key||"",url:p.url||"",timestamp:p.timestamp||""})))}const t=localStorage.getItem(u.backgroundTrack);t&&(g=t);const o=localStorage.getItem(u.backgroundAudioName),a=localStorage.getItem(u.backgroundAudioData);o&&a?fetch(a).then(i=>i.blob()).then(i=>{l=new File([i],o,{type:i.type}),l.audioUrl=URL.createObjectURL(i),g=o,console.log("Background audio restored from localStorage:",o),v==="edit"&&y()}).catch(i=>{console.error("Failed to restore background audio:",i),localStorage.removeItem(u.backgroundAudioName),localStorage.removeItem(u.backgroundAudioData)}):o&&(g=o+" (file too large - please re-upload)");const n=localStorage.getItem(u.settings);if(n){const i=JSON.parse(n);console.log("Last saved:",new Date(i.lastSaved).toLocaleString())}console.log("Settings loaded from localStorage")}catch(e){console.error("Failed to load from localStorage:",e),s=[{key:"A",url:"",timestamp:""}],g="",l=null}}function ke(){try{Object.values(u).forEach(e=>{localStorage.removeItem(e)}),console.log("All stored data cleared")}catch(e){console.error("Failed to clear storage:",e)}}function Se(){try{let e=0;const t={};return Object.entries(u).forEach(([o,a])=>{const n=localStorage.getItem(a),i=n?new Blob([n]).size:0;t[o]={size:i,sizeKB:Math.round(i/1024*100)/100,exists:!!n},e+=i}),t.total={size:e,sizeKB:Math.round(e/1024*100)/100,sizeMB:Math.round(e/1024/1024*100)/100},t}catch(e){return console.error("Failed to get storage info:",e),null}}window.memeMachineStorage={save:f,load:F,clear:ke,info:Se,export:()=>{const e={clips:s,backgroundTrack:g,backgroundAudioName:(l==null?void 0:l.name)||null,timestamp:new Date().toISOString()};return console.log("Exported data:",e),e}};function we(){setTimeout(()=>{Te()},100)}function Te(){if(!$){console.log("YouTube API not ready for previews yet");return}Object.values(L).forEach(e=>{e&&e.destroy&&e.destroy()}),L={},s.forEach((e,t)=>{if(e.url){const o=P(e.url);o&&Ie(t,o)}})}function Ie(e,t){if(!document.getElementById(`preview-player-${e}`))return;const a=new YT.Player(`preview-player-${e}`,{height:"200",width:"100%",videoId:t,playerVars:{autoplay:0,controls:1,disablekb:0,fs:0,modestbranding:1,rel:0,start:q(s[e].timestamp)||0},events:{onReady:n=>{console.log(`Preview player ready for clip ${e}`),Ae(e,a)},onStateChange:n=>{(n.data===YT.PlayerState.PLAYING||n.data===YT.PlayerState.PAUSED)&&R(e,a)}}});L[e]=a}function Ae(e,t){setInterval(()=>{t&&t.getCurrentTime&&R(e,t)},500)}function R(e,t){try{const o=t.getCurrentTime(),a=document.getElementById(`current-time-${e}`);a&&o!==void 0&&(a.textContent=N(o))}catch{}}function N(e){const t=Math.floor(e/60),o=Math.floor(e%60);return`${t}:${o.toString().padStart(2,"0")}`}function Ee(e){const t=L[e];if(t&&t.getCurrentTime)try{const o=t.getCurrentTime(),a=N(o);s[e].timestamp=a;const n=document.querySelector(`.timestamp[data-clip-index="${e}"]`);n&&(n.value=a),f(),console.log(`Timestamp set to ${a} for clip ${e}`)}catch(o){console.error("Failed to set timestamp:",o)}}j();
