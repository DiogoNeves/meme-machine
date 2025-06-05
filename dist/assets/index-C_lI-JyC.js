(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();let g="edit",i=[{key:"A",url:"",timestamp:"",duration:""}],h="",r=null,L=!1,I=-1,y=null,$={},S={},M={},w={},C=!1,E=null,k=null,A=null;const p={clips:"meme-machine-clips",backgroundTrack:"meme-machine-background-track",backgroundAudioData:"meme-machine-background-audio-data",backgroundAudioName:"meme-machine-background-audio-name",settings:"meme-machine-settings"};function R(){O(),q(),f(),te(),console.log("Meme Machine loaded with saved settings")}function O(){if(window.YT){C=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{C=!0,console.log("YouTube API loaded")}}function D(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,o=e.match(t);return o?o[1]:null}function Y(e){if(!e)return 0;const t=/(?:(\d+)[:m])?(\d+)(?:[s])?/,o=e.match(t);if(o){const a=parseInt(o[1]||0),n=parseInt(o[2]||0);return a*60+n}return parseFloat(e)||0}function V(e){return e&&parseFloat(e)||5}function f(){const e=document.querySelector("#app");g==="edit"?e.innerHTML=j():(e.innerHTML=H(),g==="play"&&_()),ne()}function j(){const e=i.map((t,o)=>`
    <div class="clip-row">
      <div class="key-button ${L&&I===o?"listening":""}" 
           data-clip-index="${o}">
        ${t.key||"?"}
      </div>
      <input type="text" class="clip-url" placeholder="Clip URL" value="${t.url}" data-clip-index="${o}">
      <input type="text" class="timestamp" placeholder="0:00" value="${t.timestamp}" data-clip-index="${o}">
      <input type="text" class="duration" placeholder="2.5s" value="${t.duration}" data-clip-index="${o}">
      <button class="remove-clip-btn" data-clip-index="${o}" title="Remove this clip">×</button>
    </div>
  `).join("");return`
    <div class="edit-mode">
      <h1>Edit Mode</h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track (optional)" value="${h}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${r?'<button class="clear-audio-btn">×</button>':""}
      </div>
      
      <div class="clips-section">
        ${e}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${L?'<div class="listening-message">Press any letter key to map it...</div>':'<div class="mapping-instructions">Click on a key button to map it to a different key</div>'}
      </div>
      
      <button class="play-mode-btn" ${i.some(t=>t.url&&t.key)?"":"disabled"}>Play</button>
    </div>
  `}function H(){const e=i.filter(a=>a.key&&a.url),t=e.map(a=>`<div class="mapped-key" data-key="${a.key}">${a.key}</div>`).join("");return`
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
        ${J(e)}
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
  `}function J(e){const t=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],o=new Set(e.map(a=>a.key));return t.map(a=>`<div class="keyboard-row">
      ${a.map(n=>{const s=o.has(n),d=e.find(b=>b.key===n);return`
          <div class="virtual-key ${s?"mapped":""}" data-key="${n}">
            <span class="key-letter">${n}</span>
            ${s?`
              <div class="key-info">
                <div class="clip-name">${Z(d.url)}</div>
                <div class="progress-ring">
                  <div class="progress-fill"></div>
                </div>
              </div>
            `:""}
          </div>
        `}).join("")}
    </div>`).join("")}function Z(e){try{const t=D(e);return t?`${t.substring(0,6)}...`:"Clip"}catch{return"Clip"}}function _(){G(),W(),ye(),ge()}function G(){r&&r.audioUrl&&(y=new Audio(r.audioUrl),y.loop=!0,y.volume=.7,y.addEventListener("play",()=>{x("playing")}),y.addEventListener("pause",()=>{x("paused")}),y.addEventListener("ended",()=>{x("stopped")}),console.log("Background audio ready"))}function W(){if(!C){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&($={},e.innerHTML="",i.forEach(t=>{if(t.url&&t.key){const o=D(t.url);o&&X(t.key,o,e)}}))}function X(e,t,o){const a=document.createElement("div");a.id=`player-${e}`,a.style.display="none",o.appendChild(a);const n=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:s=>{console.log(`Player ready for key: ${e}`)},onStateChange:s=>{s.data===YT.PlayerState.ENDED&&B(e)}}});$[e]=n}function x(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function Q(e){const t=i.find(d=>d.key===e&&d.url);if(!t||S[e])return;const o=$[e];if(!o)return;const a=Y(t.timestamp),n=V(t.duration),s=document.getElementById(`player-${e}`);if(s){const d=document.querySelector(".video-placeholder");d&&(d.style.opacity="0",setTimeout(()=>d.style.display="none",300)),s.style.display="block",s.style.opacity="0",setTimeout(()=>s.style.opacity="1",50),o.seekTo(a),o.playVideo(),S[e]=!0,U(e,!0),ve(e,n),M[e]=setTimeout(()=>{B(e)},n*1e3),he(),console.log(`Playing clip ${e} from ${a}s for ${n}s`)}}function B(e){const t=$[e];if(!t||!S[e])return;t.pauseVideo();const o=document.getElementById(`player-${e}`);o&&(o.style.opacity="0",setTimeout(()=>o.style.display="none",300)),setTimeout(()=>{if(!Object.values(S).some(n=>n)){const n=document.querySelector(".video-placeholder");n&&(n.style.display="block",n.style.opacity="1")}},300),M[e]&&(clearTimeout(M[e]),delete M[e]),w[e]&&(clearInterval(w[e]),delete w[e]),U(e,!1),S[e]=!1,console.log(`Stopped clip ${e}`)}function ee(){y&&(y.paused?y.play().catch(e=>{console.error("Failed to play background audio:",e)}):y.pause())}function te(){document.addEventListener("keydown",oe)}function oe(e){g==="edit"&&L&&I>=0?ae(e):g==="play"&&ue(e)}function ae(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const o=i.findIndex(a=>a.key===t);if(o!==-1&&o!==I){alert(`Key "${t}" is already mapped to another clip!`);return}i.forEach((a,n)=>{n!==I&&a.key===t&&(a.key="")}),i[I].key=t,L=!1,I=-1,m(),f()}}function ne(){g==="edit"?se():de()}function se(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".map-new-key-btn"),o=document.querySelector(".background-track"),a=document.querySelector(".upload-btn"),n=document.querySelector(".audio-file-input"),s=document.querySelector(".clear-audio-btn"),d=document.querySelectorAll(".key-button"),b=document.querySelectorAll(".remove-clip-btn");e&&e.addEventListener("click",()=>{P(),i.some(l=>l.url&&l.key)&&(g="play",m(),f())}),t&&t.addEventListener("click",()=>{const l=new Set(i.map(u=>u.key).filter(u=>u));let c="A";for(let u=0;u<26;u++){const v=String.fromCharCode(65+u);if(!l.has(v)){c=v;break}}i.push({key:c,url:"",timestamp:"",duration:""}),m(),f()}),b.forEach(l=>{l.addEventListener("click",c=>{const u=parseInt(c.target.dataset.clipIndex);u>=0&&i.length>1?(i.splice(u,1),P(),m(),f()):i.length===1&&(i[0]={key:"A",url:"",timestamp:"",duration:""},m(),f())})}),o&&o.addEventListener("input",l=>{r||(h=l.target.value,m())}),a&&a.addEventListener("click",()=>{n.click()}),n&&n.addEventListener("change",l=>{const c=l.target.files[0];c&&ie(c)}),s&&s.addEventListener("click",()=>{re()}),d.forEach(l=>{l.addEventListener("click",c=>{const u=parseInt(c.target.dataset.clipIndex);u>=0&&(L=!0,I=u,f())})}),document.querySelectorAll(".clip-url, .timestamp, .duration").forEach(l=>{l.addEventListener("input",c=>{const u=parseInt(c.target.dataset.clipIndex),v=c.target.classList.contains("clip-url")?"url":c.target.classList.contains("timestamp")?"timestamp":"duration";i[u]&&(i[u][v]=c.target.value,v==="url"&&c.target.value&&le(c.target.value,c.target),ce(),clearTimeout(window.saveTimeout),window.saveTimeout=setTimeout(()=>{m()},1e3))})})}function ie(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}r=e,h=e.name,r.audioUrl&&URL.revokeObjectURL(r.audioUrl),r.audioUrl=URL.createObjectURL(e),e.size>5*1024*1024&&console.warn("File larger than 5MB - will not be saved to localStorage"),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),m(),f()}function re(){r&&r.audioUrl&&URL.revokeObjectURL(r.audioUrl),r=null,h="";const e=document.querySelector(".audio-file-input");e&&(e.value=""),console.log("Background audio cleared"),m(),f()}function le(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function ce(){const e=document.querySelector(".play-mode-btn");if(e){const t=i.some(o=>o.url&&o.key);e.disabled=!t}}function de(){const e=document.querySelector(".edit-mode-btn");e&&e.addEventListener("click",()=>{Object.keys(S).forEach(t=>B(t)),y&&y.pause(),g="edit",m(),f()}),document.addEventListener("keyup",pe)}function ue(e){if(g!=="play")return;const t=e.key.toUpperCase();i.find(a=>a.key===t&&a.url)&&!S[t]&&Q(t),e.key===" "&&(e.preventDefault(),ee())}function pe(e){if(g!=="play")return;const t=e.key.toUpperCase();i.find(a=>a.key===t&&a.url)&&S[t]&&B(t)}function P(){const e=new Set,t=[];return i.forEach((o,a)=>{o.key&&e.has(o.key)?t.push({index:a,key:o.key}):o.key&&e.add(o.key)}),t.forEach(({index:o})=>{i[o].key=""}),t.length===0}function ye(){try{E=new(window.AudioContext||window.webkitAudioContext),k=E.createAnalyser(),k.fftSize=256,A=new Uint8Array(k.frequencyBinCount),y&&(E.createMediaElementSource(y).connect(k),k.connect(E.destination)),me()}catch(e){console.log("Audio visualization not available:",e)}}function me(){const e=document.getElementById("visualizer-canvas");if(!e||!k)return;const t=e.getContext("2d"),o=e.width/2,a=e.height/2,n=60;function s(){if(!k)return;k.getByteFrequencyData(A),t.clearRect(0,0,e.width,e.height);const d=32,b=Math.PI*2/d;for(let l=0;l<d;l++){const u=(A[l]||0)/255*40,v=l*b,K=o+Math.cos(v)*n,z=a+Math.sin(v)*n,F=o+Math.cos(v)*(n+u),N=a+Math.sin(v)*(n+u);t.strokeStyle=`hsl(${l*10%360}, 70%, 60%)`,t.lineWidth=3,t.beginPath(),t.moveTo(K,z),t.lineTo(F,N),t.stroke()}const T=A.reduce((l,c)=>l+c,0)/A.length;fe(T),requestAnimationFrame(s)}s()}function fe(e){const t=document.querySelector(".canvas-border");if(t){const o=Math.min(e/128,1),a=o*120+240;t.style.boxShadow=`inset 0 0 ${20+o*30}px rgba(${Math.floor(o*255)}, 100, 255, 0.6)`,t.style.borderColor=`hsl(${a}, 70%, 60%)`}}function ge(){const e=Date.now();setInterval(()=>{const t=Math.floor((Date.now()-e)/1e3),o=Math.floor(t/60),a=t%60,n=document.getElementById("session-time");n&&(n.textContent=`${o.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`)},1e3)}function U(e,t){const o=document.querySelector(`.virtual-key[data-key="${e}"]`);if(o)if(t)o.classList.add("active");else{o.classList.remove("active");const a=o.querySelector(".progress-fill");a&&(a.style.transform="rotate(0deg)")}}function ve(e,t){const o=document.querySelector(`.virtual-key[data-key="${e}"]`),a=o==null?void 0:o.querySelector(".progress-fill");if(!a)return;const n=Date.now(),s=t*1e3;w[e]=setInterval(()=>{const d=Date.now()-n,b=Math.min(d/s,1),T=b*360;a.style.transform=`rotate(${T}deg)`,b>=1&&(clearInterval(w[e]),delete w[e])},50)}function he(){const e=document.getElementById("keys-pressed");if(e){const t=parseInt(e.textContent)||0;e.textContent=(t+1).toString()}}function m(){try{if(localStorage.setItem(p.clips,JSON.stringify(i)),localStorage.setItem(p.backgroundTrack,h),r)if(localStorage.setItem(p.backgroundAudioName,r.name),r.size<=5*1024*1024){const t=new FileReader;t.onload=function(o){try{localStorage.setItem(p.backgroundAudioData,o.target.result),console.log("Background audio saved to localStorage")}catch(a){console.warn("Failed to save audio data - file too large:",a),localStorage.removeItem(p.backgroundAudioData)}},t.readAsDataURL(r)}else localStorage.removeItem(p.backgroundAudioData),console.warn("Background audio file too large for localStorage (>5MB)");else localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData);const e={currentMode:g,lastSaved:Date.now()};localStorage.setItem(p.settings,JSON.stringify(e)),console.log("Settings saved to localStorage")}catch(e){console.error("Failed to save to localStorage:",e)}}function q(){try{const e=localStorage.getItem(p.clips);if(e){const s=JSON.parse(e);Array.isArray(s)&&s.length>0&&(i=s)}const t=localStorage.getItem(p.backgroundTrack);t&&(h=t);const o=localStorage.getItem(p.backgroundAudioName),a=localStorage.getItem(p.backgroundAudioData);o&&a?fetch(a).then(s=>s.blob()).then(s=>{r=new File([s],o,{type:s.type}),r.audioUrl=URL.createObjectURL(s),h=o,console.log("Background audio restored from localStorage:",o),g==="edit"&&f()}).catch(s=>{console.error("Failed to restore background audio:",s),localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData)}):o&&(h=o+" (file too large - please re-upload)");const n=localStorage.getItem(p.settings);if(n){const s=JSON.parse(n);console.log("Last saved:",new Date(s.lastSaved).toLocaleString())}console.log("Settings loaded from localStorage")}catch(e){console.error("Failed to load from localStorage:",e),i=[{key:"A",url:"",timestamp:"",duration:""}],h="",r=null}}function be(){try{Object.values(p).forEach(e=>{localStorage.removeItem(e)}),console.log("All stored data cleared")}catch(e){console.error("Failed to clear storage:",e)}}function ke(){try{let e=0;const t={};return Object.entries(p).forEach(([o,a])=>{const n=localStorage.getItem(a),s=n?new Blob([n]).size:0;t[o]={size:s,sizeKB:Math.round(s/1024*100)/100,exists:!!n},e+=s}),t.total={size:e,sizeKB:Math.round(e/1024*100)/100,sizeMB:Math.round(e/1024/1024*100)/100},t}catch(e){return console.error("Failed to get storage info:",e),null}}window.memeMachineStorage={save:m,load:q,clear:be,info:ke,export:()=>{const e={clips:i,backgroundTrack:h,backgroundAudioName:(r==null?void 0:r.name)||null,timestamp:new Date().toISOString()};return console.log("Exported data:",e),e}};R();
