(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const u of a.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&i(u)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();let y="edit",s=[{key:"A",url:"",timestamp:"",duration:""}],k="",d=null,g=!1,v=-1,c=null,h={},m={},b={},I=!1;function S(){$(),p(),F()}function $(){if(window.YT){I=!0;return}const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api";const t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t),window.onYouTubeIframeAPIReady=()=>{I=!0,console.log("YouTube API loaded")}}function B(e){const t=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,n=e.match(t);return n?n[1]:null}function w(e){if(!e)return 0;const t=/(?:(\d+)[:m])?(\d+)(?:[s])?/,n=e.match(t);if(n){const i=parseInt(n[1]||0),o=parseInt(n[2]||0);return i*60+o}return parseFloat(e)||0}function A(e){return e&&parseFloat(e)||5}function p(){const e=document.querySelector("#app");y==="edit"?e.innerHTML=M():(e.innerHTML=x(),y==="play"&&U()),N()}function M(){const e=s.map((t,n)=>`
    <div class="clip-row">
      <div class="key-button ${g&&v===n?"listening":""}" 
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
        <input type="text" class="background-track" placeholder="background track (optional)" value="${k}" readonly>
        <button class="upload-btn">Upload</button>
        <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
        ${d?'<button class="clear-audio-btn">×</button>':""}
      </div>
      
      <div class="clips-section">
        ${e}
        <button class="map-new-key-btn">Map new key</button>
      </div>
      
      <div class="instructions-edit">
        ${g?'<div class="listening-message">Press any letter key to map it...</div>':'<div class="mapping-instructions">Click on a key button to map it to a different key</div>'}
      </div>
      
      <button class="play-mode-btn" ${s.some(t=>t.url&&t.key)?"":"disabled"}>Play</button>
    </div>
  `}function x(){return`
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
            ${s.filter(t=>t.key&&t.url).map(t=>`<div class="mapped-key">${t.key}</div>`).join("")||'<div class="no-keys">No keys mapped</div>'}
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
  `}function U(){C(),q()}function C(){d&&d.audioUrl&&(c=new Audio(d.audioUrl),c.loop=!0,c.volume=.7,c.addEventListener("play",()=>{E("playing")}),c.addEventListener("pause",()=>{E("paused")}),c.addEventListener("ended",()=>{E("stopped")}),console.log("Background audio ready"))}function q(){if(!I){console.log("YouTube API not ready yet");return}const e=document.querySelector(".youtube-players");e&&(h={},e.innerHTML="",s.forEach(t=>{if(t.url&&t.key){const n=B(t.url);n&&R(t.key,n,e)}}))}function R(e,t,n){const i=document.createElement("div");i.id=`player-${e}`,i.style.display="none",n.appendChild(i);const o=new YT.Player(`player-${e}`,{height:"100%",width:"100%",videoId:t,playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,modestbranding:1,rel:0},events:{onReady:a=>{console.log(`Player ready for key: ${e}`)},onStateChange:a=>{a.data===YT.PlayerState.ENDED&&L(e)}}});h[e]=o}function E(e){const t=document.getElementById("bg-status");t&&(t.textContent=e,t.className=e)}function O(e){const t=s.find(u=>u.key===e&&u.url);if(!t||m[e])return;const n=h[e];if(!n)return;const i=w(t.timestamp),o=A(t.duration),a=document.getElementById(`player-${e}`);if(a){const u=document.querySelector(".video-placeholder");u&&(u.style.display="none"),a.style.display="block",n.seekTo(i),n.playVideo(),m[e]=!0,b[e]=setTimeout(()=>{L(e)},o*1e3),console.log(`Playing clip ${e} from ${i}s for ${o}s`)}}function L(e){const t=h[e];if(!t||!m[e])return;t.pauseVideo();const n=document.getElementById(`player-${e}`);if(n&&(n.style.display="none"),!Object.values(m).some(o=>o)){const o=document.querySelector(".video-placeholder");o&&(o.style.display="block")}b[e]&&(clearTimeout(b[e]),delete b[e]),m[e]=!1,console.log(`Stopped clip ${e}`)}function Y(){c&&(c.paused?c.play().catch(e=>{console.error("Failed to play background audio:",e)}):c.pause())}function F(){document.addEventListener("keydown",K)}function K(e){y==="edit"&&g&&v>=0?D(e):y==="play"&&G(e)}function D(e){const t=e.key.toUpperCase();if(t.length===1&&t>="A"&&t<="Z"){const n=s.find(i=>i.key===t);if(n&&s.indexOf(n)!==v){alert(`Key "${t}" is already mapped to another clip!`);return}s[v].key=t,g=!1,v=-1,p()}}function N(){y==="edit"?j():_()}function j(){const e=document.querySelector(".play-mode-btn"),t=document.querySelector(".map-new-key-btn"),n=document.querySelector(".background-track"),i=document.querySelector(".upload-btn"),o=document.querySelector(".audio-file-input"),a=document.querySelector(".clear-audio-btn"),u=document.querySelectorAll(".key-button"),T=document.querySelectorAll(".remove-clip-btn");e&&e.addEventListener("click",()=>{s.some(l=>l.url&&l.key)&&(y="play",p())}),t&&t.addEventListener("click",()=>{const l=String.fromCharCode(65+s.length);s.push({key:l,url:"",timestamp:"",duration:""}),p()}),T.forEach(l=>{l.addEventListener("click",r=>{const f=parseInt(r.target.dataset.clipIndex);f>=0&&s.length>1?(s.splice(f,1),p()):s.length===1&&(s[0]={key:"A",url:"",timestamp:"",duration:""},p())})}),n&&n.addEventListener("input",l=>{d||(k=l.target.value)}),i&&i.addEventListener("click",()=>{o.click()}),o&&o.addEventListener("change",l=>{const r=l.target.files[0];r&&z(r)}),a&&a.addEventListener("click",()=>{V()}),u.forEach(l=>{l.addEventListener("click",r=>{const f=parseInt(r.target.dataset.clipIndex);f>=0&&(g=!0,v=f,p())})}),document.querySelectorAll(".clip-url, .timestamp, .duration").forEach(l=>{l.addEventListener("input",r=>{const f=parseInt(r.target.dataset.clipIndex),P=r.target.classList.contains("clip-url")?"url":r.target.classList.contains("timestamp")?"timestamp":"duration";s[f]&&(s[f][P]=r.target.value,P==="url"&&r.target.value&&H(r.target.value,r.target),Z())})})}function z(e){if(!e.type.startsWith("audio/")){alert("Please select a valid audio file.");return}const t=50*1024*1024;if(e.size>t){alert("File size is too large. Please select a file smaller than 50MB.");return}d=e,k=e.name,d.audioUrl&&URL.revokeObjectURL(d.audioUrl),d.audioUrl=URL.createObjectURL(e),console.log("Background audio loaded:",e.name,"Size:",(e.size/1024/1024).toFixed(2)+"MB"),p()}function V(){d&&d.audioUrl&&URL.revokeObjectURL(d.audioUrl),d=null,k="";const e=document.querySelector(".audio-file-input");e&&(e.value=""),console.log("Background audio cleared"),p()}function H(e,t){/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(e)?(t.classList.remove("invalid"),t.classList.add("valid")):(t.classList.remove("valid"),t.classList.add("invalid"))}function Z(){const e=document.querySelector(".play-mode-btn");if(e){const t=s.some(n=>n.url&&n.key);e.disabled=!t}}function _(){const e=document.querySelector(".edit-mode-btn");e&&e.addEventListener("click",()=>{Object.keys(m).forEach(t=>L(t)),c&&c.pause(),y="edit",p()}),document.addEventListener("keyup",W)}function G(e){if(y!=="play")return;const t=e.key.toUpperCase();s.find(i=>i.key===t&&i.url)&&!m[t]&&O(t),e.key===" "&&(e.preventDefault(),Y())}function W(e){if(y!=="play")return;const t=e.key.toUpperCase();s.find(i=>i.key===t&&i.url)&&m[t]&&L(t)}S();
