(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const s of n.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function o(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(i){if(i.ep)return;i.ep=!0;const n=o(i);fetch(i.href,n)}})();let S="edit",r=[{key:"A",url:"",timestamp:""}],f="",c=null,Y=!1,L=-1,d=null,u=null,b=null,q={},T={},k={},F={},z={},P=!1,U=null,E=null,x=null;const p={clips:"meme-machine-clips",backgroundTrack:"meme-machine-background-track",backgroundAudioData:"meme-machine-background-audio-data",backgroundAudioName:"meme-machine-background-audio-name",settings:"meme-machine-settings",firstVisit:"meme-machine-first-visit"};function Q(){ee(),_(),y(),me(),De(),console.log("Meme Machine loaded with saved settings")}function ee(){if(window.YT){P=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{P=!0,console.log("YouTube API loaded")}}function $(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,o=e.match(t);return o?o[1]:null}function N(e){if(!e||e.trim()==="")return 0;let t=e.toString().trim();t=t.replace(",",".");const o=[{regex:/^(\d{1,3}):([0-5]?\d(?:\.\d+)?)$/,parse:i=>{const n=parseInt(i[1]),s=parseFloat(i[2]);return n>999||s>=60?null:n*60+s}},{regex:/^(\d{1,2}):([0-5]?\d(?:\.\d+)?)$/,parse:i=>{const n=parseInt(i[1]),s=parseFloat(i[2]);return n>99||s>=60?null:n*60+s}},{regex:/^(\d+(?:\.\d+)?)$/,parse:i=>{const n=parseFloat(i[1]);return n>86400?null:n}},{regex:/^(?:(\d+)m)?(\d+(?:\.\d+)?)?s?$/,parse:i=>{const n=parseInt(i[1]||0),s=parseFloat(i[2]||0);return n>999||s>=60?null:n*60+s}}];for(const i of o){const n=t.match(i.regex);if(n){const s=i.parse(n);if(s!==null&&s>=0)return s}}const a=parseFloat(t);return!isNaN(a)&&a>=0&&a<=86400?a:0}function te(){return 1.1.toLocaleString().substring(1,2)}function R(){const e=te();return{decimal:e,timeWithDecimal:`2:45${e}5`,secondsWithDecimal:`125${e}5`,minutesWithDecimal:`2m15${e}5s`}}function oe(){const e=R();return`1:30${e.decimal}5 or 90${e.decimal}25`}function O(e){if(!e||e.trim()==="")return{valid:!0,message:""};const t=N(e),o=e.toString().trim();if(t>0||o==="0"||o==="0.0"||o==="0:00"||o==="0,00")return{valid:!0,message:`Parsed as ${B(t)}`,seconds:t};const a=R(),i=[];return o.includes(":")?i.push(`MM:SS format (e.g., 1:30, ${a.timeWithDecimal})`):o.includes("m")||o.includes("s")?i.push(`1m30s format (e.g., 1m30s, ${a.minutesWithDecimal})`):i.push(`Seconds (e.g., 90, ${a.secondsWithDecimal})`),{valid:!1,message:`Invalid format. Expected: ${i.join(" or ")}`,seconds:0}}function y(){const e=document.querySelector("#app");S==="edit"?(e.innerHTML=ae(),xe()):(e.innerHTML=ie(),S==="play"&&le()),ge()}function ae(){r.filter(a=>a.key);const e=d?r.find(a=>a.key===d):null,t=e?r.indexOf(e):-1,o=se(r);return`
    <div class="edit-mode">
      <div class="header-row">
        <h1>Meme Machine <span class="mode-subtitle">- Edit Mode</span></h1>
        <button class="help-btn" title="Show help">?</button>
      </div>
      
      <div class="edit-help-section">
        <div class="edit-help-text">
          ${d?`Editing key <strong>${d}</strong> - Add a YouTube URL and set the timestamp for the clip`:"Click any key on the keyboard below to start mapping it to a YouTube clip"}
        </div>
      </div>
      
      <div class="edit-preview-area">
        ${d&&e&&e.url&&$(e.url)?`
          <div id="edit-preview-player"></div>
        `:`
          <div class="preview-placeholder-edit">
            <div class="preview-text">Video preview area</div>
          </div>
        `}
      </div>
      
      <div class="edit-controls-area">
        ${d?`
          <div class="edit-controls-compact">
            <div class="control-grid">
              <div class="key-section">
                <div class="editing-key">${d}</div>
                <button class="remap-btn" title="Change to different key">remap</button>
              </div>
              
              <div class="url-time-group">
                <div class="url-section-vertical">
                  <label>YouTube URL:</label>
                  <input type="text" class="clip-url" placeholder="https://youtu.be/dj0i0ZIwBUc" 
                         value="${e?e.url:""}" 
                         data-clip-index="${t}">
                </div>
                
                <div class="time-section">
                  <div class="timestamp-section-vertical">
                    <label>Start Time:</label>
                    <div class="timestamp-input-row">
                      <input type="text" class="timestamp" 
                             placeholder="${oe()}" 
                             value="${e?e.timestamp:""}" 
                             data-clip-index="${t}">
                      ${e&&e.url&&$(e.url)?`
                        <button class="set-timestamp-btn" data-clip-index="${t}" id="set-time-btn-${t}" title="Set timestamp to current video time">set to 0:00</button>
                      `:""}
                    </div>
                    ${t>=0?`
                      <div class="timestamp-validation" id="timestamp-validation-${t}"></div>
                    `:""}
                  </div>
                </div>
              </div>
              
              <div class="control-actions">
                ${e&&e.url?`
                  <button class="unmap-key-btn" data-key="${d}">Unmap Key</button>
                `:""}
                <button class="done-editing-btn">Done</button>
              </div>
            </div>
          </div>
        `:`
          <div class="no-key-message">
            Select a key from the keyboard below to start mapping
          </div>
        `}
      </div>
      
      <div class="virtual-keyboard-edit">
        ${o}
      </div>
      
      <div class="edit-bottom-controls">
        <div class="background-section-compact">
          <label>Background audio:</label>
          <input type="text" class="background-track" placeholder="YouTube URL or upload" value="${f}">
          <button class="upload-btn" title="Upload audio file">📁</button>
          ${c||f?'<button class="clear-audio-btn" title="Clear">×</button>':""}
          <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        </div>
        
        <button class="play-mode-btn" ${r.some(a=>a.url&&a.key)?"":"disabled"}>Play Mode</button>
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
  `}function ie(){const e=r.filter(o=>o.key&&o.url);return`
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
        ${ne(e)}
      </div>
      
      <div class="controls-section">
        <div class="instructions">
          <div>Press keys to play clips • Space bar controls background music</div>
        </div>
        
        <div class="playback-status">
          <div class="background-status">Background: <span id="bg-status">stopped</span></div>
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
  `}function ne(e){const t=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],o=new Set(e.map(a=>a.key));return t.map(a=>`<div class="keyboard-row">
      ${a.map(i=>{const n=o.has(i),s=e.find(I=>I.key===i);return`
          <div class="virtual-key ${n?"mapped":""}" data-key="${i}">
            <span class="key-letter">${i}</span>
            ${n?`
              <div class="key-info">
                <div class="clip-name">${re(s.url)}</div>
                <div class="timestamp-info">${s.timestamp||"0:00"}</div>
              </div>
            `:""}
  </div>
        `}).join("")}
    </div>`).join("")}function se(e){const t=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],o={};return e.forEach(a=>{a.key&&(o[a.key]=a)}),t.map(a=>`<div class="keyboard-row">
      ${a.map(i=>{const n=i in o,s=o[i];return`
          <div class="virtual-key-edit ${n?"mapped":""} ${i===d?"editing":""}" data-key="${i}">
            <span class="key-letter">${i}</span>
            ${n&&s.url?`
              <div class="key-info">
                <div class="clip-indicator">●</div>
              </div>
            `:""}
          </div>
        `}).join("")}
    </div>`).join("")}function re(e){try{const t=$(e);return t?`${t.substring(0,6)}...`:"Clip"}catch{return"Clip"}}function le(){ce(),de(),Ee()}function ce(){u&&(u.pause(),u=null),b&&(b.destroy(),b=null),c&&c.audioUrl?(u=new Audio(c.audioUrl),u.loop=!0,u.volume=.7,u.addEventListener("play",()=>{C("playing")}),u.addEventListener("pause",()=>{C("paused")}),u.addEventListener("ended",()=>{C("stopped")}),console.log("Background audio file ready")):f&&$(f)&&H()}function H(){if(!P){console.log("YouTube API not ready for background player, retrying..."),setTimeout(H,500);return}const e=$(f);if(!e)return;let t=document.getElementById("background-youtube-player");t||(t=document.createElement("div"),t.id="background-youtube-player",t.style.cssText="position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;",document.body.appendChild(t));const o=document.createElement("div");o.id="bg-youtube-player",t.innerHTML="",t.appendChild(o),b=new YT.Player("bg-youtube-player",{height:"1",width:"1",videoId:e,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0,loop:1,playlist:e},events:{onReady:a=>{console.log("Background YouTube player ready"),a.target.setVolume(70)},onStateChange:a=>{a.data===YT.PlayerState.PLAYING?C("playing"):a.data===YT.PlayerState.PAUSED?C("paused"):a.data===YT.PlayerState.ENDED&&(C("stopped"),a.target.playVideo())}}})}function de(){if(!P){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&(q={},e.innerHTML="",r.forEach(t=>{if(t.url&&t.key){const o=$(t.url);o&&ue(t.key,o,e)}}))}function ue(e,t,o){const a=document.createElement("div");a.id=`player-${e}`,a.style.display="none",o.appendChild(a);const i=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:n=>{console.log(`Player ready for key: ${e}`)},onStateChange:n=>{n.data===YT.PlayerState.ENDED&&A(e)}}});q[e]=i}function C(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function j(e){const t=r.find(n=>n.key===e&&n.url);if(!t||k[e])return;const o=q[e];if(!o)return;const a=N(t.timestamp),i=document.getElementById(`player-${e}`);if(i){const n=document.querySelector(".video-placeholder");n&&(n.style.opacity="0",setTimeout(()=>n.style.display="none",300)),i.style.display="block",i.style.opacity="0",setTimeout(()=>i.style.opacity="1",50),o.seekTo(a),o.playVideo(),k[e]=!0,G(e,!0),console.log(`Playing clip ${e} from ${a}s`)}}function A(e){const t=q[e];if(!t||!k[e])return;t.pauseVideo();const o=document.getElementById(`player-${e}`);o&&(o.style.opacity="0",setTimeout(()=>o.style.display="none",300)),setTimeout(()=>{if(!Object.values(k).some(i=>i)){const i=document.querySelector(".video-placeholder");i&&(i.style.display="block",i.style.opacity="1")}},300),F[e]&&(clearTimeout(F[e]),delete F[e]),z[e]&&(clearInterval(z[e]),delete z[e]),G(e,!1),k[e]=!1,console.log(`Stopped clip ${e}`)}function pe(){if(u)u.paused?u.play().catch(e=>{console.error("Failed to play background audio:",e)}):u.pause();else if(b)try{b.getPlayerState()===YT.PlayerState.PLAYING?b.pauseVideo():b.playVideo()}catch(e){console.error("Failed to toggle background YouTube player:",e)}}function me(){document.addEventListener("keydown",ve)}function ve(e){S==="edit"&&Y&&L>=0?fe(e):S==="play"&&we(e)}function fe(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const o=r.findIndex(a=>a.key===t);if(o!==-1&&o!==L){alert(`Key "${t}" is already mapped to another clip!`);return}r.forEach((a,i)=>{i!==L&&a.key===t&&(a.key="")}),L>=0&&L<r.length&&(r[L].key=t,d=t),Y=!1,L=-1,h(),y()}}function ge(){S==="edit"?ye():Se()}function ye(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".background-track"),o=document.querySelector(".upload-btn"),a=document.querySelector(".help-btn"),i=document.querySelector(".audio-file-input"),n=document.querySelector(".clear-audio-btn"),s=document.querySelectorAll(".virtual-key-edit"),I=document.querySelector(".remap-btn"),D=document.querySelector(".done-editing-btn"),w=document.querySelector(".unmap-key-btn"),M=document.querySelector(".set-timestamp-btn");if(e&&e.addEventListener("click",()=>{Le(),r.some(l=>l.url&&l.key)&&(S="play",d=null,h(),y())}),s.forEach(l=>{l.addEventListener("click",m=>{const g=m.currentTarget.dataset.key;if(g){if(d===g)d=null;else{let v=r.find(V=>V.key===g);v||(v={key:g,url:"",timestamp:""},r.push(v)),d=g}h(),y()}})}),I&&I.addEventListener("click",()=>{Y=!0,L=r.findIndex(l=>l.key===d),y()}),D&&D.addEventListener("click",()=>{d=null,h(),y()}),w&&w.addEventListener("click",l=>{const m=l.target.dataset.key;if(m){const g=r.findIndex(v=>v.key===m);g!==-1&&(r.splice(g,1),d=null,h(),y())}}),M&&M.addEventListener("click",l=>{const m=parseInt(l.target.dataset.clipIndex);m>=0&&T.edit&&Be(m)}),t&&t.addEventListener("input",l=>{f=l.target.value,f.trim()&&c&&(c.audioUrl&&URL.revokeObjectURL(c.audioUrl),c=null),f.trim()?K(f,l.target):l.target.classList.remove("valid","invalid"),h(),setTimeout(()=>y(),100)}),o&&o.addEventListener("click",()=>{i.click()}),a&&a.addEventListener("click",()=>{Z()}),i&&i.addEventListener("change",l=>{const m=l.target.files[0];m&&he(m)}),n&&n.addEventListener("click",()=>{be()}),d){const l=r.findIndex(v=>v.key===d),m=document.querySelector(".clip-url");m&&l!==-1&&m.addEventListener("input",v=>{r[l].url=v.target.value,v.target.value?K(v.target.value,v.target):v.target.classList.remove("valid","invalid"),ke(),clearTimeout(window.saveTimeout),window.saveTimeout=setTimeout(()=>{h(),y()},1e3)});const g=document.querySelector(".timestamp");g&&l!==-1&&g.addEventListener("input",v=>{r[l].timestamp=v.target.value,W(v.target.value,l),clearTimeout(window.saveTimeout),window.saveTimeout=setTimeout(()=>{h()},1e3)})}if(Y){const l=document.querySelector(".edit-help-text");l&&(l.innerHTML='<div class="listening-message">Press any letter key to map it...</div>')}}function he(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}c=e,f=e.name;const o=document.querySelector(".background-track");o&&o.classList.remove("valid","invalid"),c.audioUrl&&URL.revokeObjectURL(c.audioUrl),c.audioUrl=URL.createObjectURL(e),e.size>5*1024*1024&&console.warn("File larger than 5MB - will not be saved to localStorage"),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),h(),y()}function be(){c&&c.audioUrl&&URL.revokeObjectURL(c.audioUrl),b&&(b.destroy(),b=null),u&&(u.pause(),u=null),c=null,f="";const e=document.querySelector(".audio-file-input");e&&(e.value="");const t=document.querySelector(".background-track");t&&(t.value="",t.classList.remove("valid","invalid")),console.log("Background audio cleared"),h(),y()}function K(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function W(e,t){const o=O(e),a=document.querySelector(`.timestamp[data-clip-index="${t}"]`),i=document.getElementById(`timestamp-validation-${t}`);a&&(a.classList.remove("valid","invalid"),o.valid?e&&e.trim()!==""&&a.classList.add("valid"):a.classList.add("invalid"),i&&(i.textContent=o.message,i.className=`timestamp-validation ${o.valid?"valid":"invalid"}`))}function ke(){const e=document.querySelector(".play-mode-btn");if(e){const t=r.some(o=>o.url&&o.key);e.disabled=!t}}function Se(){const e=document.querySelector(".edit-mode-btn"),t=document.querySelectorAll(".virtual-key");e&&e.addEventListener("click",()=>{Object.keys(k).forEach(o=>A(o)),u&&u.pause(),b&&b.pauseVideo(),S="edit",h(),y()}),t.forEach(o=>{const a=o.dataset.key;a&&(o.addEventListener("mousedown",i=>{i.preventDefault(),r.find(s=>s.key===a&&s.url)&&!k[a]&&j(a)}),o.addEventListener("mouseup",i=>{i.preventDefault(),r.find(s=>s.key===a&&s.url)&&k[a]&&A(a)}),o.addEventListener("mouseleave",i=>{r.find(s=>s.key===a&&s.url)&&k[a]&&A(a)}),o.addEventListener("contextmenu",i=>{i.preventDefault()}))}),document.addEventListener("keyup",Te)}function we(e){if(S!=="play")return;const t=e.key.toUpperCase();r.find(a=>a.key===t&&a.url)&&!k[t]&&j(t),e.key===" "&&(e.preventDefault(),pe())}function Te(e){if(S!=="play")return;const t=e.key.toUpperCase();r.find(a=>a.key===t&&a.url)&&k[t]&&A(t)}function Le(){const e=new Set,t=[];return r.forEach((o,a)=>{o.key&&e.has(o.key)?t.push({index:a,key:o.key}):o.key&&e.add(o.key)}),t.forEach(({index:o})=>{r[o].key=""}),t.length===0}function Ee(){try{U=new(window.AudioContext||window.webkitAudioContext),E=U.createAnalyser(),E.fftSize=256,x=new Uint8Array(E.frequencyBinCount),u&&(U.createMediaElementSource(u).connect(E),E.connect(U.destination)),Ie()}catch(e){console.log("Audio visualization not available:",e)}}function Ie(){const e=document.getElementById("visualizer-canvas");if(!e||!E)return;const t=e.getContext("2d"),o=e.width/2,a=e.height/2,i=60;function n(){if(!E)return;E.getByteFrequencyData(x),t.clearRect(0,0,e.width,e.height);const s=32,I=Math.PI*2/s;for(let w=0;w<s;w++){const l=(x[w]||0)/255*40,m=w*I,g=o+Math.cos(m)*i,v=a+Math.sin(m)*i,V=o+Math.cos(m)*(i+l),X=a+Math.sin(m)*(i+l);t.strokeStyle=`hsl(${w*10%360}, 70%, 60%)`,t.lineWidth=3,t.beginPath(),t.moveTo(g,v),t.lineTo(V,X),t.stroke()}const D=x.reduce((w,M)=>w+M,0)/x.length;$e(D),requestAnimationFrame(n)}n()}function $e(e){const t=document.querySelector(".canvas-border");if(t){const o=Math.min(e/128,1),a=o*120+240;t.style.boxShadow=`inset 0 0 ${20+o*30}px rgba(${Math.floor(o*255)}, 100, 255, 0.6)`,t.style.borderColor=`hsl(${a}, 70%, 60%)`}}function G(e,t){const o=document.querySelector(`.virtual-key[data-key="${e}"]`);if(o)if(t)o.classList.add("active");else{o.classList.remove("active");const a=o.querySelector(".progress-fill");a&&(a.style.transform="rotate(0deg)")}}function h(){try{if(localStorage.setItem(p.clips,JSON.stringify(r)),localStorage.setItem(p.backgroundTrack,f),c)if(localStorage.setItem(p.backgroundAudioName,c.name),c.size<=5*1024*1024){const t=new FileReader;t.onload=function(o){try{localStorage.setItem(p.backgroundAudioData,o.target.result),console.log("Background audio saved to localStorage")}catch(a){console.warn("Failed to save audio data - file too large:",a),localStorage.removeItem(p.backgroundAudioData)}},t.readAsDataURL(c)}else localStorage.removeItem(p.backgroundAudioData),console.warn("Background audio file too large for localStorage (>5MB)");else localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData);const e={currentMode:S,lastSaved:Date.now()};localStorage.setItem(p.settings,JSON.stringify(e)),console.log("Settings saved to localStorage")}catch(e){console.error("Failed to save to localStorage:",e)}}function _(){try{const e=localStorage.getItem(p.clips);if(e){const n=JSON.parse(e);Array.isArray(n)&&n.length>0&&(r=n.map(s=>({key:s.key||"",url:s.url||"",timestamp:s.timestamp||""})))}const t=localStorage.getItem(p.backgroundTrack);t&&(f=t);const o=localStorage.getItem(p.backgroundAudioName),a=localStorage.getItem(p.backgroundAudioData);o&&a?fetch(a).then(n=>n.blob()).then(n=>{c=new File([n],o,{type:n.type}),c.audioUrl=URL.createObjectURL(n),f=o,console.log("Background audio restored from localStorage:",o),S==="edit"&&y()}).catch(n=>{console.error("Failed to restore background audio:",n),localStorage.removeItem(p.backgroundAudioName),localStorage.removeItem(p.backgroundAudioData)}):o&&(f=o+" (file too large - please re-upload)");const i=localStorage.getItem(p.settings);if(i){const n=JSON.parse(i);console.log("Last saved:",new Date(n.lastSaved).toLocaleString())}console.log("Settings loaded from localStorage")}catch(e){console.error("Failed to load from localStorage:",e),r=[{key:"A",url:"",timestamp:""}],f="",c=null}}function Ce(){try{Object.values(p).forEach(e=>{localStorage.removeItem(e)}),console.log("All stored data cleared")}catch(e){console.error("Failed to clear storage:",e)}}function Me(){try{let e=0;const t={};return Object.entries(p).forEach(([o,a])=>{const i=localStorage.getItem(a),n=i?new Blob([i]).size:0;t[o]={size:n,sizeKB:Math.round(n/1024*100)/100,exists:!!i},e+=n}),t.total={size:e,sizeKB:Math.round(e/1024*100)/100,sizeMB:Math.round(e/1024/1024*100)/100},t}catch(e){return console.error("Failed to get storage info:",e),null}}window.memeMachineStorage={save:h,load:_,clear:Ce,info:Me,export:()=>{const e={clips:r,backgroundTrack:f,backgroundAudioName:(c==null?void 0:c.name)||null,timestamp:new Date().toISOString()};return console.log("Exported data:",e),e}};window.testTimeParser=e=>{const t=O(e),o=N(e),a=R();return console.log(`Input: "${e}"`),console.log(`Parsed: ${o} seconds`),console.log(`Formatted: ${B(o)}`),console.log(`Valid: ${t.valid}`),console.log(`Message: ${t.message}`),console.log(`Local decimal separator: "${a.decimal}"`),console.log(`Try these local formats: ${a.timeWithDecimal}, ${a.secondsWithDecimal}`),{input:e,parsed:o,formatted:B(o),validation:t,examples:a}};function xe(){T={},d&&Ae()}function Ae(){if(!P||!d)return;const e=r.find(a=>a.key===d);if(!e||!e.url)return;const t=$(e.url);!t||!document.getElementById("edit-preview-player")||(T.edit&&(T.edit.destroy(),delete T.edit),T.edit=new YT.Player("edit-preview-player",{height:"240",width:"100%",videoId:t,playerVars:{autoplay:0,controls:1,disablekb:0,fs:1,modestbranding:1,rel:0,start:N(e.timestamp)||0},events:{onReady:a=>{console.log(`Edit preview player ready for key ${d}`);const i=r.indexOf(e);Pe(i,T.edit)},onStateChange:a=>{if(a.data===YT.PlayerState.PLAYING||a.data===YT.PlayerState.PAUSED){const i=r.indexOf(e);J(i,T.edit)}}}}))}function Pe(e,t){window.editTimeUpdaterInterval&&clearInterval(window.editTimeUpdaterInterval),window.editTimeUpdaterInterval=setInterval(()=>{t&&t.getCurrentTime&&J(e,t)},500)}function J(e,t){try{const o=t.getCurrentTime(),a=document.getElementById(`set-time-btn-${e}`);a&&o!==void 0&&(a.textContent=`set to ${B(o)}`)}catch{}}function B(e){const t=Math.floor(e/60),o=Math.floor(e%60);return`${t}:${o.toString().padStart(2,"0")}`}function Be(e){const t=T.edit;if(t&&t.getCurrentTime&&e>=0)try{const o=t.getCurrentTime(),a=B(o);r[e].timestamp=a;const i=document.querySelector(".timestamp");i&&(i.value=a,W(a,e)),h(),console.log(`Timestamp set to ${a} for clip ${e}`)}catch(o){console.error("Failed to set timestamp:",o)}}function De(){localStorage.getItem(p.firstVisit)||(Z(),localStorage.setItem(p.firstVisit,"true"))}function Z(){const e=Ue();document.body.appendChild(e),setTimeout(()=>{const t=e.querySelector(".help-modal-close");t&&t.focus()},100)}function Ue(){const e=document.createElement("div");e.className="help-modal-overlay",e.innerHTML=`
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
  `;const t=e.querySelector(".help-modal-close"),o=e.querySelector(".help-modal-got-it"),a=e,i=()=>{document.body.removeChild(e)};t.addEventListener("click",i),o.addEventListener("click",i),a.addEventListener("click",s=>{s.target===a&&i()});const n=s=>{s.key==="Escape"&&(i(),document.removeEventListener("keydown",n))};return document.addEventListener("keydown",n),e}Q();
