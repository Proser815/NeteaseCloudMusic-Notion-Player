const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let previousVolume = 0.8;
let previousOpacity = 0.85;
let debounceTimer = null;

let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

// Icons & Labels
const MODE_ICONS = {
  loop: `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
  repeatOne: `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM12 10v4h1v-4h-1z"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`
};

const TRASH_BIN_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

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

const islandBtnMode = document.getElementById("island-btn-mode");
const islandModeLoop = document.getElementById("island-mode-loop");
const islandModeOne = document.getElementById("island-mode-one");
const islandModeShuffle = document.getElementById("island-mode-shuffle");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnNext = document.getElementById("island-btn-next");

const islandBtnVolume = document.getElementById("island-btn-volume");
const islandVolLowIcon = document.getElementById("island-vol-low-icon");
const islandVolHighIcon = document.getElementById("island-vol-high-icon");
const islandMuteIcon = document.getElementById("island-mute-icon");
const islandVolumeSlider = document.getElementById("island-volume-slider");

const btnGlass = document.getElementById("btn-glass");
const glassIcon = document.getElementById("glass-icon");
const glassOffIcon = document.getElementById("glass-off-icon");
const opacitySlider = document.getElementById("opacity-slider");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

// Drawers & Drawers Toggle Buttons
const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchResultsUl = document.getElementById("search-results-ul");
const searchResultsContainer = document.getElementById("search-results");

const btnList = document.getElementById("btn-list");
const playlistDrawer = document.getElementById("playlist-drawer");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const btnCloseInfo = document.getElementById("btn-close-info");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

const btnLyrics = document.getElementById("btn-lyrics");
const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");

// Helper to close all open drawers
function closeAllDrawers() {
  [searchSection, playlistDrawer, infoDrawer, lyricsContainer].forEach(d => {
    if (d) d.classList.add("collapsed");
  });
  [btnToggleSearch, btnList, btnInfo, btnLyrics].forEach(b => {
    if (b) b.classList.remove("active");
  });
}

function toggleDrawer(drawer, button) {
  const isCollapsed = drawer.classList.contains("collapsed");
  closeAllDrawers();
  if (isCollapsed) {
    drawer.classList.remove("collapsed");
    button.classList.add("active");
  }
}

// Web Audio API Equalizer Animation
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
  } catch (e) {
    console.warn("Audio Context init warning:", e);
  }
}

function animateBars() {
  if (!analyser || audio.paused) return;
  analyser.getByteFrequencyData(dataArray);

  const low = dataArray[2] || 0;
  const mid = dataArray[8] || 0;
  const high = dataArray[15] || 0;

  const bar1Height = Math.max(3, (low / 255) * 13);
  const bar2Height = Math.max(3, (mid / 255) * 13);
  const bar3Height = Math.max(3, (high / 255) * 13);

  const allBars = document.querySelectorAll(".eq-bars span");
  allBars.forEach((_, idx) => {
    let h = 3;
    if (idx % 3 === 0) h = bar1Height;
    if (idx % 3 === 1) h = bar2Height;
    if (idx % 3 === 2) h = bar3Height;
    allBars[idx].style.height = `${h}px`;
  });

  animationFrameId = requestAnimationFrame(animateBars);
}

// Initialise App
async function initPlayer() {
  handleVolumeChange(0.8);
  handleOpacityChange(0.85);
  syncPlayModeUI();

  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    islandTitle.innerText = "Error Loading";
  }
}

// Drawer Listeners
btnToggleSearch.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(searchSection, btnToggleSearch); });
btnList.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(playlistDrawer, btnList); });
btnInfo.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(infoDrawer, btnInfo); });
btnLyrics.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(lyricsContainer, btnLyrics); });

btnClosePlaylist.addEventListener("click", (e) => { e.stopPropagation(); closeAllDrawers(); });
btnCloseInfo.addEventListener("click", (e) => { e.stopPropagation(); closeAllDrawers(); });

// Track Loading & Controls
function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  audio.src = song.url;

  islandCover.src = song.pic || "";
  islandHoverCover.src = song.pic || "";

  islandTitle.innerText = song.title || "Unknown Title";
  islandHoverTitle.innerText = song.title || "Unknown Title";

  islandArtist.innerText = song.author || "Unknown Artist";
  islandHoverArtist.innerText = song.author || "Unknown Artist";

  metaAlbum.innerText = song.album || "Single";
  metaBpm.innerText = song.bpm || "~120 BPM";
  metaYear.innerText = song.year || "2026";
  metaGenre.innerText = song.genre || "Pop";
  metaStory.innerText = song.story || "No background information available.";

  fetchLyrics(song.lrc);
  renderPlaylist();
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

// Mode Cycling
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

// Audio Progress Management
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressBarFill.style.width = `${pct}%`;

  currentTimeEl.innerText = formatTime(audio.currentTime);
  durationTimeEl.innerText = formatTime(audio.duration);

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

progressBarBg.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = progressBarBg.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = clickX / rect.width;
  if (audio.duration) {
    audio.currentTime = ratio * audio.duration;
  }
});

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Lyrics Fetcher
async function fetchLyrics(lrcUrl) {
  lyrics = [];
  islandLyricText.innerText = "No lyrics found";
  lyricText.innerText = "No lyrics found";
  if (!lrcUrl) return;

  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLrc(text);
  } catch (err) {
    islandLyricText.innerText = "Instrumental / Lyrics unavailable";
    lyricText.innerText = "Instrumental / Lyrics unavailable";
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
    if (currentTime >= lyrics[i].time) {
      activeLyric = lyrics[i].text;
    } else {
      break;
    }
  }

  if (activeLyric) {
    islandLyricText.innerText = activeLyric;
    lyricText.innerText = activeLyric;
  }
}

// Volume Controls
function handleVolumeChange(val) {
  const parsed = parseFloat(val);
  audio.volume = parsed;
  islandVolumeSlider.value = parsed;
  if (parsed === 0) {
    islandVolLowIcon.classList.add("hidden");
    islandVolHighIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
  } else if (parsed <= 0.5) {
    islandVolLowIcon.classList.remove("hidden");
    islandVolHighIcon.classList.add("hidden");
    islandMuteIcon.classList.add("hidden");
  } else {
    islandVolLowIcon.classList.add("hidden");
    islandVolHighIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
  }
}

islandVolumeSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  handleVolumeChange(e.target.value);
});

islandBtnVolume.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    handleVolumeChange(0);
  } else {
    handleVolumeChange(previousVolume || 0.8);
  }
});

// Opacity Controls
function handleOpacityChange(val) {
  const parsed = parseFloat(val);
  opacitySlider.value = parsed;
  document.documentElement.style.setProperty("--glass-tint-opacity", parsed);
  if (parsed < 0.15) {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
}

opacitySlider.addEventListener("input", (e) => {
  e.stopPropagation();
  handleOpacityChange(e.target.value);
});

btnGlass.addEventListener("click", (e) => {
  e.stopPropagation();
  const currentVal = parseFloat(opacitySlider.value);
  if (currentVal >= 0.15) {
    previousOpacity = currentVal;
    handleOpacityChange(0);
  } else {
    handleOpacityChange(previousOpacity || 0.85);
  }
});

// Playlist Rendering
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = `playlist-item-ios ${i === currentIndex ? "active" : ""}`;
    li.innerHTML = `
      <span>${song.title} - ${song.author}</span>
      <button class="btn-remove" title="Remove" style="background:none;border:none;color:#ff3b30;cursor:pointer;">${TRASH_BIN_SVG}</button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove")) {
        e.stopPropagation();
        playlist.splice(i, 1);
        if (playlist.length === 0) pauseTrack();
        else {
          if (i === currentIndex) loadTrack(currentIndex % playlist.length);
          else if (i < currentIndex) currentIndex--;
          renderPlaylist();
        }
        return;
      }
      loadTrack(i);
      playTrack();
    });

    playlistUl.appendChild(li);
  });
}

// Search Logic
btnSearch.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") performSearch(); });

async function performSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  searchResultsUl.innerHTML = "<li>Searching...</li>";
  searchResultsContainer.classList.remove("hidden");

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(q)}`);
    const results = await res.json();

    searchResultsUl.innerHTML = "";
    if (!results.length) {
      searchResultsUl.innerHTML = "<li>No songs found</li>";
      return;
    }

    results.slice(0, 5).forEach((song) => {
      const li = document.createElement("li");
      li.className = "playlist-item-ios";
      li.innerText = `${song.title} - ${song.author}`;
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        playlist.push(song);
        renderPlaylist();
        loadTrack(playlist.length - 1);
        playTrack();
        closeAllDrawers();
      });
      searchResultsUl.appendChild(li);
    });
  } catch (err) {
    searchResultsUl.innerHTML = "<li>Error performing search</li>";
  }
}

// Initialize on Load
window.addEventListener("DOMContentLoaded", initPlayer);