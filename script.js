const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let islandDebounce = null;

let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

const TRASH_BIN_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

// DOM Elements
const audio = document.getElementById("audio-player");
const dynamicIsland = document.getElementById("dynamic-island");

const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandArtist = document.getElementById("island-artist");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const islandMarqueeContainer = document.getElementById("island-marquee-container");

const islandBtnMode = document.getElementById("island-btn-mode");
const islandModeLoop = document.getElementById("island-mode-loop");
const islandModeOne = document.getElementById("island-mode-one");
const islandModeShuffle = document.getElementById("island-mode-shuffle");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnNext = document.getElementById("island-btn-next");

// Island Drawer Elements
const islandBtnSearch = document.getElementById("island-btn-search");
const islandSearchDrawer = document.getElementById("island-search-drawer");
const islandCloseSearch = document.getElementById("island-close-search");
const islandSearchInput = document.getElementById("island-search-input");
const islandSearchPredictions = document.getElementById("island-search-predictions");
const islandSearchResultsUl = document.getElementById("island-search-results-ul");
const islandSearchResults = document.getElementById("island-search-results");

const islandBtnPlaylist = document.getElementById("island-btn-playlist");
const islandPlaylistDrawer = document.getElementById("island-playlist-drawer");
const islandClosePlaylist = document.getElementById("island-close-playlist");
const islandPlaylistUl = document.getElementById("island-playlist-ul");

const islandBtnSettings = document.getElementById("island-btn-settings");
const islandSettingsDrawer = document.getElementById("island-settings-drawer");
const islandCloseSettings = document.getElementById("island-close-settings");
const islandSettingsVol = document.getElementById("island-settings-vol");
const islandSettingsOpacity = document.getElementById("island-settings-opacity");

const islandBtnLyricsToggle = document.getElementById("island-btn-lyrics");
const islandCurrentTimeEl = document.getElementById("island-current-time");
const islandDurationTimeEl = document.getElementById("island-duration-time");
const islandProgressBarBg = document.getElementById("island-progress-bar-bg");
const islandProgressBarFill = document.getElementById("island-progress-bar-fill");

function closeAllIslandDrawers() {
  [islandSearchDrawer, islandPlaylistDrawer, islandSettingsDrawer].forEach(d => {
    if (d) d.classList.add("collapsed");
  });
  [islandBtnSearch, islandBtnPlaylist, islandBtnSettings].forEach(b => {
    if (b) b.classList.remove("active");
  });
  dynamicIsland.classList.remove("search-active", "playlist-active", "settings-active");
}

function toggleIslandDrawer(drawer, button, activeClass) {
  const isCollapsed = drawer.classList.contains("collapsed");
  closeAllIslandDrawers();
  if (isCollapsed) {
    drawer.classList.remove("collapsed");
    button.classList.add("active");
    dynamicIsland.classList.add(activeClass);
    if (drawer === islandSearchDrawer) islandSearchInput.focus();
  }
}

// Extract dominant color from album artwork to tint Dynamic Island background glass
function extractDominantColor(imageUrl) {
  if (!imageUrl) return;
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 30;
      canvas.height = 30;
      ctx.drawImage(img, 0, 0, 30, 30);
      const data = ctx.getImageData(0, 0, 30, 30).data;
      
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    } catch (e) {
      document.documentElement.style.setProperty("--accent-rgb", "20, 20, 20");
    }
  };
}

// Smooth Lyric Expansion Toggle Fix
islandBtnLyricsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isActive = islandBtnLyricsToggle.classList.toggle("active");
  islandMarqueeContainer.classList.toggle("collapsed-lyric", !isActive);
});

// Equalizer Visualizer Setup
function initAudioContext() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  } catch (e) {}
}

function animateBars() {
  if (!analyser || audio.paused) return;
  analyser.getByteFrequencyData(dataArray);

  const low = dataArray[2] || 0;
  const mid = dataArray[8] || 0;
  const high = dataArray[15] || 0;

  const bar1Height = Math.max(3, (low / 255) * 12);
  const bar2Height = Math.max(3, (mid / 255) * 12);
  const bar3Height = Math.max(3, (high / 255) * 12);

  const allBars = document.querySelectorAll(".eq-bars span");
  if (allBars[0]) allBars[0].style.height = `${bar1Height}px`;
  if (allBars[1]) allBars[1].style.height = `${bar2Height}px`;
  if (allBars[2]) allBars[2].style.height = `${bar3Height}px`;

  animationFrameId = requestAnimationFrame(animateBars);
}

// Initialize Application
async function initPlayer() {
  dynamicIsland.classList.remove("hidden");
  handleVolumeChange(0.8);
  handleOpacityChange(0.75);
  syncPlayModeUI();

  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderIslandPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    islandTitle.innerText = "Error Loading";
  }
}

// Drawer Event Listeners
islandBtnSearch.addEventListener("click", (e) => { e.stopPropagation(); toggleIslandDrawer(islandSearchDrawer, islandBtnSearch, "search-active"); });
islandCloseSearch.addEventListener("click", (e) => { e.stopPropagation(); closeAllIslandDrawers(); });

islandBtnPlaylist.addEventListener("click", (e) => { 
  e.stopPropagation(); 
  renderIslandPlaylist();
  toggleIslandDrawer(islandPlaylistDrawer, islandBtnPlaylist, "playlist-active"); 
});
islandClosePlaylist.addEventListener("click", (e) => { e.stopPropagation(); closeAllIslandDrawers(); });

islandBtnSettings.addEventListener("click", (e) => { e.stopPropagation(); toggleIslandDrawer(islandSettingsDrawer, islandBtnSettings, "settings-active"); });
islandCloseSettings.addEventListener("click", (e) => { e.stopPropagation(); closeAllIslandDrawers(); });

// Track Player Control Logic
function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  audio.src = song.url;
  const picUrl = song.pic || song.cover || "";
  islandCover.src = picUrl;
  islandHoverCover.src = picUrl;
  
  extractDominantColor(picUrl);

  const title = song.title || song.name || "Unknown Title";
  const artist = song.author || song.artist || "Unknown Artist";

  islandTitle.innerText = title;
  islandHoverTitle.innerText = title;
  islandArtist.innerText = artist;
  islandHoverArtist.innerText = artist;

  fetchLyrics(song.lrc);
  renderIslandPlaylist();
}

function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  audio.play();
  islandPlayIcon.classList.add("hidden");
  islandPauseIcon.classList.remove("hidden");
  animateBars();
}

function pauseTrack() {
  audio.pause();
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

islandBtnPlay.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.paused) playTrack(); else pauseTrack();
});

islandBtnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlist.length - 1;
  loadTrack(prevIndex);
  playTrack();
});

islandBtnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  let nextIndex = currentIndex + 1;
  if (nextIndex >= playlist.length) nextIndex = 0;
  loadTrack(nextIndex);
  playTrack();
});

// Play Mode Controls
islandBtnMode.addEventListener("click", (e) => {
  e.stopPropagation();
  playMode = (playMode + 1) % 3;
  syncPlayModeUI();
});

function syncPlayModeUI() {
  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

// Track Progress & Timer Updates
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  islandProgressBarFill.style.width = `${pct}%`;

  islandCurrentTimeEl.innerText = formatTime(audio.currentTime);
  islandDurationTimeEl.innerText = formatTime(audio.duration);

  updateCurrentLyric(audio.currentTime);
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    playTrack();
  } else if (playMode === 2) {
    let rand = Math.floor(Math.random() * playlist.length);
    loadTrack(rand);
    playTrack();
  } else {
    islandBtnNext.click();
  }
});

islandProgressBarBg.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = islandProgressBarBg.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (audio.duration) audio.currentTime = ratio * audio.duration;
});

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Lyrics Parser Logic
async function fetchLyrics(lrcUrl) {
  lyrics = [];
  updateIslandLyric("No lyrics found");
  if (!lrcUrl) return;

  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLrc(text);
  } catch (err) {
    updateIslandLyric("Lyrics unavailable");
  }
}

function parseLrc(lrcText) {
  const lines = lrcText.split("\n");
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyrics = [];

  for (let line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = min * 60 + sec + (ms > 99 ? ms / 1000 : ms / 100);
      const content = line.replace(timeExp, "").trim();
      if (content) lyrics.push({ time, text: content });
    }
  }
  lyrics.sort((a, b) => a.time - b.time);
}

function updateCurrentLyric(currentTime) {
  if (!lyrics.length) return;
  let activeLyric = "";
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) activeLyric = lyrics[i].text;
    else break;
  }
  if (activeLyric) {
    updateIslandLyric(activeLyric);
  }
}

function updateIslandLyric(text) {
  if (!islandLyricText || !islandMarqueeContainer) return;
  islandLyricText.innerText = text;
}

// Settings Controls
function handleVolumeChange(val) {
  audio.volume = parseFloat(val);
}

islandSettingsVol.addEventListener("input", (e) => {
  e.stopPropagation();
  handleVolumeChange(e.target.value);
});

function handleOpacityChange(val) {
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
}

islandSettingsOpacity.addEventListener("input", (e) => {
  e.stopPropagation();
  handleOpacityChange(e.target.value);
});

// Playlist Renderer inside Drawer
function renderIslandPlaylist() {
  if (!islandPlaylistUl) return;
  islandPlaylistUl.innerHTML = "";
  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = `playlist-item-ios ${i === currentIndex ? "active" : ""}`;
    const songName = song.title || song.name || "Unknown";
    const songArtist = song.author || song.artist || "Unknown";

    li.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; padding-right: 8px;">${songName} - ${songArtist}</span>
      <button class="btn-remove" title="Remove" style="background:none;border:none;color:#ff3b30;cursor:pointer; display:flex;">${TRASH_BIN_SVG}</button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove")) {
        e.stopPropagation();
        playlist.splice(i, 1);
        if (playlist.length === 0) pauseTrack();
        else {
          if (i === currentIndex) loadTrack(currentIndex % playlist.length);
          else if (i < currentIndex) currentIndex--;
          renderIslandPlaylist();
        }
        return;
      }
      loadTrack(i);
      playTrack();
      renderIslandPlaylist();
    });

    islandPlaylistUl.appendChild(li);
  });
}

// Live Search inside Island Drawer
islandSearchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(islandDebounce);

  if (!q) {
    islandSearchPredictions.classList.add("hidden");
    islandSearchResults.classList.add("hidden");
    return;
  }

  islandDebounce = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(q)}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        islandSearchResultsUl.innerHTML = "";
        data.slice(0, 6).forEach((song) => {
          const li = document.createElement("li");
          li.className = "playlist-item-ios";
          const title = song.title || song.name || "Unknown";
          const artist = song.author || song.artist || "Unknown";

          li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
              <img src="${song.pic || song.cover || ''}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;" alt="">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;">
                <span>${title} - ${artist}</span>
              </div>
            </div>
            <button class="btn-add-track" title="Play Now" style="background:none;border:none;color:#fff;cursor:pointer;">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          `;

          li.addEventListener("click", () => {
            playlist.push(song);
            loadTrack(playlist.length - 1);
            playTrack();
            closeAllIslandDrawers();
            islandSearchInput.value = "";
            islandSearchResults.classList.add("hidden");
          });

          islandSearchResultsUl.appendChild(li);
        });
        islandSearchResults.classList.remove("hidden");
      }
    } catch (err) {}
  }, 250);
});

window.addEventListener("DOMContentLoaded", initPlayer);