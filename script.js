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

// Drawers & Search Elements
const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const predictionsUl = document.getElementById("predictions-ul");
const searchPredictionsContainer = document.getElementById("search-predictions");
const searchResultsUl = document.getElementById("search-results-ul");
const searchResultsContainer = document.getElementById("search-results");

const btnList = document.getElementById("btn-list");
const playlistDrawer = document.getElementById("playlist-drawer");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const btnLyrics = document.getElementById("btn-lyrics");

function closeAllDrawers() {
  [searchSection, playlistDrawer].forEach(d => {
    if (d) d.classList.add("collapsed");
  });
  [btnToggleSearch, btnList].forEach(b => {
    if (b) b.classList.remove("active");
  });
  dynamicIsland.classList.remove("search-active", "playlist-active");
}

function toggleDrawer(drawer, button) {
  const isCollapsed = drawer.classList.contains("collapsed");
  closeAllDrawers();
  if (isCollapsed) {
    drawer.classList.remove("collapsed");
    button.classList.add("active");
    if (drawer === searchSection) {
      dynamicIsland.classList.add("search-active");
      searchInput.focus();
    } else if (drawer === playlistDrawer) {
      dynamicIsland.classList.add("playlist-active");
    }
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

      // Apply dynamic accent color to root CSS variable
      document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    } catch (e) {
      // Fallback if cross-origin taint blocks canvas data reading
      document.documentElement.style.setProperty("--accent-rgb", "20, 20, 20");
    }
  };
}

// Smooth Lyric Expansion Toggle
btnLyrics.addEventListener("click", (e) => {
  e.stopPropagation();
  const isActive = btnLyrics.classList.toggle("active");
  islandMarqueeContainer.classList.toggle("collapsed-lyric", !isActive);
  dynamicIsland.classList.toggle("lyrics-hidden", !isActive);
});

// Equalizer Visualizer
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
  handleVolumeChange(0.8);
  handleOpacityChange(0.75);
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

btnToggleSearch.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(searchSection, btnToggleSearch); });
btnList.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(playlistDrawer, btnList); });
btnClosePlaylist.addEventListener("click", (e) => { e.stopPropagation(); closeAllDrawers(); });

// Track Player Controls
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

// Mode Controls
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

// Progress Tracker
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
  if (audio.duration) audio.currentTime = ratio * audio.duration;
});

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Lyrics Parser & Scrolling Marquee Logic
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
  islandLyricText.classList.remove("animate-island-lyric");
  
  setTimeout(() => {
    const containerWidth = islandMarqueeContainer.clientWidth;
    const textWidth = islandLyricText.scrollWidth;
    
    if (textWidth > containerWidth) {
      const overflowDiff = textWidth - containerWidth + 15;
      const duration = Math.max(4, overflowDiff * 0.05);
      
      islandMarqueeContainer.style.setProperty("--island-scroll-distance", `-${overflowDiff}px`);
      islandMarqueeContainer.style.setProperty("--island-scroll-duration", `${duration}s`);
      islandLyricText.classList.add("animate-island-lyric");
    }
  }, 50);
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
    handleOpacityChange(previousOpacity || 0.75);
  }
});

// Playlist Renderer
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = `playlist-item-ios ${i === currentIndex ? "active" : ""}`;
    const songName = song.title || song.name || "Unknown";
    const songArtist = song.author || song.artist || "Unknown";

    li.innerHTML = `
      <span>${songName} - ${songArtist}</span>
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

// Live Autocomplete Predict & Search Functions
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(debounceTimer);

  if (!query) {
    searchPredictionsContainer.classList.add("hidden");
    searchResultsContainer.classList.add("hidden");
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchSearchPredictions(query);
  }, 250);
});

async function fetchSearchPredictions(query) {
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      renderSearchPredictions(data.slice(0, 5));
    } else {
      searchPredictionsContainer.classList.add("hidden");
    }
  } catch (err) {
    searchPredictionsContainer.classList.add("hidden");
  }
}

function renderSearchPredictions(suggestions) {
  predictionsUl.innerHTML = "";
  suggestions.forEach((item) => {
    const li = document.createElement("li");
    li.className = "playlist-item-ios";
    const title = item.title || item.name || "Unknown";
    const artist = item.author || item.artist || "Unknown";
    li.innerText = `${title} - ${artist}`;
    
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      searchPredictionsContainer.classList.add("hidden");
      addAndPlaySong(item);
    });

    predictionsUl.appendChild(li);
  });
  searchResultsContainer.classList.add("hidden");
  searchPredictionsContainer.classList.remove("hidden");
}

btnSearch.addEventListener("click", (e) => {
  e.stopPropagation();
  performSearch();
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    performSearch();
  }
});

async function performSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  searchPredictionsContainer.classList.add("hidden");
  searchResultsUl.innerHTML = "<li class='playlist-item-ios'>Searching...</li>";
  searchResultsContainer.classList.remove("hidden");

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(q)}`);
    const results = await res.json();

    searchResultsUl.innerHTML = "";
    if (!Array.isArray(results) || !results.length) {
      searchResultsUl.innerHTML = "<li class='playlist-item-ios'>No songs found</li>";
      return;
    }

    results.slice(0, 8).forEach((song) => {
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
        <button class="btn-add-track" title="Add track">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      `;
      
      // Clicking the row plays song immediately & closes drawer
      li.addEventListener("click", (e) => {
        if (e.target.closest(".btn-add-track")) return;
        addAndPlaySong(song);
      });

      // Clicking '+' button adds track to playlist only without disrupting active play
      const addBtn = li.querySelector(".btn-add-track");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        playlist.push(song);
        renderPlaylist();
        
        addBtn.style.background = "#34c759";
        addBtn.style.color = "#ffffff";
        setTimeout(() => {
          addBtn.style.background = "";
        }, 600);
      });

      searchResultsUl.appendChild(li);
    });
  } catch (err) {
    searchResultsUl.innerHTML = "<li class='playlist-item-ios'>Error performing search</li>";
  }
}

function addAndPlaySong(song) {
  playlist.push(song);
  renderPlaylist();
  loadTrack(playlist.length - 1);
  playTrack();
  closeAllDrawers();
  searchResultsContainer.classList.add("hidden");
  searchPredictionsContainer.classList.add("hidden");
  searchInput.value = "";
}

window.addEventListener("DOMContentLoaded", initPlayer);