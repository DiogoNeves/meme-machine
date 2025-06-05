(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const p of s.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&i(p)}).observe(document,{childList:!0,subtree:!0});function n(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(o){if(o.ep)return;o.ep=!0;const s=n(o);fetch(o.href,s)}})();let f="edit",a=[{key:"A",url:"",timestamp:"",duration:""}],h="",c=null,b=!1,v=-1,u=null,L={},m={},k={},P=!1;function $(){w(),y(),O()}function w(){if(window.YT){P=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{P=!0,console.log("YouTube API loaded")}}function A(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,n=e.match(t);return n?n[1]:null}function B(e){if(!e)return 0;const t=/(?:(\d+)[:m])?(\d+)(?:[s])?/,n=e.match(t);if(n){const i=parseInt(n[1]||0),o=parseInt(n[2]||0);return i*60+o}return parseFloat(e)||0}function M(e){return e&&parseFloat(e)||5}function y(){const e=document.querySelector("#app");f==="edit"?e.innerHTML=x():(e.innerHTML=U(),f==="play"&&C()),j()}function x(){const e=a.map((t,n)=>`
    <div class="clip-row">
      <div class="key-button ${b&&v===n?"listening":""}" 
           data-clip-index="${n}">
        ${t.key||"?"}
      </div>
      <input type="text" class="clip-url" placeholder="Clip URL" value="${t.url}" data-clip-index="${n}">
      <input type="text" class="timestamp" placeholder="0:00" value="${t.timestamp}" data-clip-index="${n}">
      <input type="text" class="duration" placeholder="2.5s" value="${t.duration}" data-clip-index="${n}">
      <button class="remove-clip-btn" data-clip-index="${n}" title="Remove this clip">×</button>
    </div>
  `).join("");return`
    <div class="edit-mode">
      <h1>Edit Mode</h1>
      
      <div class="background-section">
        <input type="text" class="background-track" placeholder="background track (optional)" value="${h}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${c?'<button class="clear-audio-btn">×</button>':""}
      </div>
      
      <div class="clips-section">
        ${e}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${b?'<div class="listening-message">Press any letter key to map it...</div>':'<div class="mapping-instructions">Click on a key button to map it to a different key</div>'}
      </div>
      
      <button class="play-mode-btn" ${a.some(t=>t.url&&t.key)?"":"disabled"}>Play</button>
    </div>
  `}function U(){return`
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
            ${a.filter(t=>t.key&&t.url).map(t=>`<div class="mapped-key">${t.key}</div>`).join("")||'<div class="no-keys">No keys mapped</div>'}
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
  `}function C(){q(),K()}function q(){c&&c.audioUrl&&(u=new Audio(c.audioUrl),u.loop=!0,u.volume=.7,u.addEventListener("play",()=>{I("playing")}),u.addEventListener("pause",()=>{I("paused")}),u.addEventListener("ended",()=>{I("stopped")}),console.log("Background audio ready"))}function K(){if(!P){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&(L={},e.innerHTML="",a.forEach(t=>{if(t.url&&t.key){const n=A(t.url);n&&R(t.key,n,e)}}))}function R(e,t,n){const i=document.createElement("div");i.id=`player-${e}`,i.style.display="none",n.appendChild(i);const o=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:s=>{console.log(`Player ready for key: ${e}`)},onStateChange:s=>{s.data===YT.PlayerState.ENDED&&E(e)}}});L[e]=o}function I(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function Y(e){const t=a.find(p=>p.key===e&&p.url);if(!t||m[e])return;const n=L[e];if(!n)return;const i=B(t.timestamp),o=M(t.duration),s=document.getElementById(`player-${e}`);if(s){const p=document.querySelector(".video-placeholder");p&&(p.style.display="none"),s.style.display="block",n.seekTo(i),n.playVideo(),m[e]=!0,k[e]=setTimeout(()=>{E(e)},o*1e3),console.log(`Playing clip ${e} from ${i}s for ${o}s`)}}function E(e){const t=L[e];if(!t||!m[e])return;t.pauseVideo();const n=document.getElementById(`player-${e}`);if(n&&(n.style.display="none"),!Object.values(m).some(o=>o)){const o=document.querySelector(".video-placeholder");o&&(o.style.display="block")}k[e]&&(clearTimeout(k[e]),delete k[e]),m[e]=!1,console.log(`Stopped clip ${e}`)}function F(){u&&(u.paused?u.play().catch(e=>{console.error("Failed to play background audio:",e)}):u.pause())}function O(){document.addEventListener("keydown",D)}function D(e){f==="edit"&&b&&v>=0?N(e):f==="play"&&W(e)}function N(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const n=a.findIndex(i=>i.key===t);if(n!==-1&&n!==v){alert(`Key "${t}" is already mapped to another clip!`);return}a.forEach((i,o)=>{o!==v&&i.key===t&&(i.key="")}),a[v].key=t,b=!1,v=-1,y()}}function j(){f==="edit"?z():G()}function z(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".map-new-key-btn"),n=document.querySelector(".background-track"),i=document.querySelector(".upload-btn"),o=document.querySelector(".audio-file-input"),s=document.querySelector(".clear-audio-btn"),p=document.querySelectorAll(".key-button"),T=document.querySelectorAll(".remove-clip-btn");e&&e.addEventListener("click",()=>{S(),a.some(d=>d.url&&d.key)&&(f="play",y())}),t&&t.addEventListener("click",()=>{const d=new Set(a.map(r=>r.key).filter(r=>r));let l="A";for(let r=0;r<26;r++){const g=String.fromCharCode(65+r);if(!d.has(g)){l=g;break}}a.push({key:l,url:"",timestamp:"",duration:""}),y()}),T.forEach(d=>{d.addEventListener("click",l=>{const r=parseInt(l.target.dataset.clipIndex);r>=0&&a.length>1?(a.splice(r,1),S(),y()):a.length===1&&(a[0]={key:"A",url:"",timestamp:"",duration:""},y())})}),n&&n.addEventListener("input",d=>{c||(h=d.target.value)}),i&&i.addEventListener("click",()=>{o.click()}),o&&o.addEventListener("change",d=>{const l=d.target.files[0];l&&V(l)}),s&&s.addEventListener("click",()=>{H()}),p.forEach(d=>{d.addEventListener("click",l=>{const r=parseInt(l.target.dataset.clipIndex);r>=0&&(b=!0,v=r,y())})}),document.querySelectorAll(".clip-url, .timestamp, .duration").forEach(d=>{d.addEventListener("input",l=>{const r=parseInt(l.target.dataset.clipIndex),g=l.target.classList.contains("clip-url")?"url":l.target.classList.contains("timestamp")?"timestamp":"duration";a[r]&&(a[r][g]=l.target.value,g==="url"&&l.target.value&&Z(l.target.value,l.target),_())})})}function V(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}c=e,h=e.name,c.audioUrl&&URL.revokeObjectURL(c.audioUrl),c.audioUrl=URL.createObjectURL(e),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),y()}function H(){c&&c.audioUrl&&URL.revokeObjectURL(c.audioUrl),c=null,h="";const e=document.querySelector(".audio-file-input");e&&(e.value=""),console.log("Background audio cleared"),y()}function Z(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function _(){const e=document.querySelector(".play-mode-btn");if(e){const t=a.some(n=>n.url&&n.key);e.disabled=!t}}function G(){const e=document.querySelector(".edit-mode-btn");e&&e.addEventListener("click",()=>{Object.keys(m).forEach(t=>E(t)),u&&u.pause(),f="edit",y()}),document.addEventListener("keyup",J)}function W(e){if(f!=="play")return;const t=e.key.toUpperCase();a.find(i=>i.key===t&&i.url)&&!m[t]&&Y(t),e.key===" "&&(e.preventDefault(),F())}function J(e){if(f!=="play")return;const t=e.key.toUpperCase();a.find(i=>i.key===t&&i.url)&&m[t]&&E(t)}function S(){const e=new Set,t=[];return a.forEach((n,i)=>{n.key&&e.has(n.key)?t.push({index:i,key:n.key}):n.key&&e.add(n.key)}),t.forEach(({index:n})=>{a[n].key=""}),t.length===0}$();
