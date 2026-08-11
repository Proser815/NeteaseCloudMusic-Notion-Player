const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Single Loop, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;

// Web Audio API State
let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

// DOM Element Selections
const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const coverWrapper = document.getElementById("cover-wrapper");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const lyricText = document.getElementById("lyric-text");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");
const volumeSlider = document.getElementById("volume-slider");

// Dynamic Island Elements
const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");

// Consolidated Utility Drawer Elements
const utilityDrawer = document.getElementById("utility-drawer");
const btnDrawerToggle = document.getElementById("btn-drawer-toggle");
const btnCloseDrawer = document.getElementById("btn-close-drawer");

const tabBtnSearch = document.getElementById("tab-btn-search");
const tabBtnPlaylist = document.getElementById("tab-btn-playlist");
const tabBtnSettings = document.getElementById("tab-btn-settings");

const drawerSectionSearch = document.getElementById("drawer-section-search");
const drawerSectionPlaylist = document.getElementById("drawer-section-playlist");
const drawerSectionSettings = document.getElementById("drawer-section-settings");

const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchResults = document.getElementById("search-results");
const playlistList = document.getElementById("playlist-list");

const glassOpacitySlider = document.getElementById("glass-opacity");
const glassOpacityVal = document.getElementById("glass-opacity-val");
const tintPicker = document.getElementById("tint-picker");
const eqToggle = document.getElementById("eq-toggle");
const btnToggleIsland = document.getElementById("btn-toggle-island");
const canvas = document.getElementById("eq-canvas");
const canvasCtx = canvas.getContext("2d");

// Time Formatter
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Synchronized LRC Lyric Parser
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (let line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + (milliseconds > 99 ? milliseconds / 1000 : milliseconds / 100);
      const text = line.replace(timeExp, "").trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function setLyricText(text) {
  lyricText.style.opacity = '0';
  setTimeout(() => {
    lyricText.innerText = text || "♪ ...";
    lyricText.style.opacity = '1';
  }, 150);
}

// Active Lyrics API Fetching
async function fetchLyrics(lrcUrl) {
  lyrics = [];
  setLyricText("♪ Loading lyrics...");
  if (!lrcUrl) {
    setLyricText("♪ Instrumental / No lyrics");
    return;
  }
  try {
    const res = await fetch(lrcUrl);
    const data = await res.text();
    lyrics = parseLrc(data);
    if (lyrics.length === 0) {
      setLyricText("♪ Instrumental / No lyrics");
    } else {
      setLyricText("♪");
    }
  } catch (e) {
    console.error("Lyrics fetch error:", e);
    setLyricText("♪ Lyrics unavailable");
  }
}

// Track Loading
function loadTrack(index) {
  if (!playlist || playlist.length === 0) return;
  currentIndex = (index + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  audio.src = track.url;
  cover.src = track.pic;
  backdropImg.src = track.pic;
  title.innerText = track.name;
  artist.innerText = track.artist;

  // Island Sync
  islandCover.src = track.pic;
  islandTitle.innerText = track.name;
  islandHoverCover.src = track.pic;
  islandHoverTitle.innerText = track.name;
  islandHoverArtist.innerText = track.artist;

  fetchLyrics(track.lrc);
  renderPlaylist();
}

function playTrack() {
  audio.play().then(() => {
    playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    islandPlayIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    if (!audioCtx && eqToggle.checked) initAudioContext();
  }).catch(err => console.log("Playback error:", err));
}

function pauseTrack() {
  audio.pause();
  playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  islandPlayIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
}

function togglePlay() {
  if (audio.paused) playTrack();
  else pauseTrack();
}

function playNext() {
  if (playMode === 2) {
    let nextIndex = Math.floor(Math.random() * playlist.length);
    loadTrack(nextIndex);
  } else {
    loadTrack(currentIndex + 1);
  }
  playTrack();
}

function playPrev() {
  loadTrack(currentIndex - 1);
  playTrack();
}

// Mode Cycle
btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  if (playMode === 0) {
    btnMode.title = "Loop Playlist";
    btnMode.style.opacity = "1";
  } else if (playMode === 1) {
    btnMode.title = "Repeat Track";
    btnMode.style.opacity = "0.6";
  } else {
    btnMode.title = "Shuffle";
    btnMode.style.opacity = "0.3";
  }
});

// Real-Time NetEase Search API Implementation
async function searchSongs(query) {
  if (!query.trim()) return;
  searchResults.innerHTML = "<div style='font-size:0.75rem; padding:8px;'>Searching...</div>";
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSearchResults(data);
  } catch (e) {
    console.error("Search error:", e);
    searchResults.innerHTML = "<div style='font-size:0.75rem; padding:8px;'>Search failed.</div>";
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = "";
  if (!results || results.length === 0) {
    searchResults.innerHTML = "<div style='font-size:0.75rem; padding:8px;'>No songs found.</div>";
    return;
  }
  results.slice(0, 10).forEach(song => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80%;">
        <strong>${song.name}</strong> - ${song.artist}
      </div>
      <button class="btn-add-morph" title="Add to playlist">+</button>
    `;
    item.querySelector(".btn-add-morph").addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.push(song);
      renderPlaylist();
      item.querySelector(".btn-add-morph").innerText = "✓";
    });
    item.addEventListener("click", () => {
      playlist.push(song);
      currentIndex = playlist.length - 1;
      loadTrack(currentIndex);
      playTrack();
    });
    searchResults.appendChild(item);
  });
}

function renderPlaylist() {
  playlistList.innerHTML = "";
  playlist.forEach((song, idx) => {
    const li = document.createElement("li");
    if (idx === currentIndex) li.className = "active";
    li.innerHTML = `<span>${idx + 1}. ${song.name}</span> <small>${song.artist}</small>`;
    li.addEventListener("click", () => {
      loadTrack(idx);
      playTrack();
    });
    playlistList.appendChild(li);
  });
}

// Progress Bar Scrubbing Callbacks
function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  progressBarFill.style.width = `${percent * 100}%`;
  currentTimeEl.innerText = formatTime(percent * audio.duration);
  return percent;
}

progressBarBg.addEventListener("mousedown", (e) => {
  isDraggingProgress = true;
  const percent = updateProgressFromEvent(e);
  if (percent !== undefined && audio.duration) audio.currentTime = percent * audio.duration;
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingProgress) updateProgressFromEvent(e);
});

window.addEventListener("mouseup", (e) => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    const percent = updateProgressFromEvent(e);
    if (percent !== undefined && audio.duration) audio.currentTime = percent * audio.duration;
  }
});

// Synchronized Time Update & Lyric Line Event
audio.addEventListener("timeupdate", () => {
  if (!audio.duration || isDraggingProgress) return;
  const curTime = audio.currentTime;
  progressBarFill.style.width = `${(curTime / audio.duration) * 100}%`;
  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      setLyricText(currentLine.text);
    }
  }
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
  } else {
    playNext();
  }
});

// Controls Listeners
btnPlay.addEventListener("click", togglePlay);
btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);

islandBtnPlay.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });
islandBtnNext.addEventListener("click", (e) => { e.stopPropagation(); playNext(); });
islandBtnPrev.addEventListener("click", (e) => { e.stopPropagation(); playPrev(); });

// Drawer Navigation Tabs
btnDrawerToggle.addEventListener("click", () => utilityDrawer.classList.remove("collapsed"));
btnCloseDrawer.addEventListener("click", () => utilityDrawer.classList.add("collapsed"));

function switchTab(activeTab, activeSection) {
  [tabBtnSearch, tabBtnPlaylist, tabBtnSettings].forEach(b => b.classList.remove("active"));
  [drawerSectionSearch, drawerSectionPlaylist, drawerSectionSettings].forEach(s => s.classList.remove("active"));
  
  activeTab.classList.add("active");
  activeSection.classList.add("active");
}

tabBtnSearch.addEventListener("click", () => switchTab(tabBtnSearch, drawerSectionSearch));
tabBtnPlaylist.addEventListener("click", () => switchTab(tabBtnPlaylist, drawerSectionPlaylist));
tabBtnSettings.addEventListener("click", () => switchTab(tabBtnSettings, drawerSectionSettings));

btnSearch.addEventListener("click", () => searchSongs(searchInput.value));
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchSongs(searchInput.value); });

// Settings & Customization
glassOpacitySlider.addEventListener("input", (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  glassOpacityVal.innerText = `${Math.round(val * 100)}%`;
});

tintPicker.addEventListener("input", (e) => {
  const color = e.target.value;
  playerCard.style.borderColor = color;
});

volumeSlider.addEventListener("input", (e) => {
  audio.volume = e.target.value;
});

btnToggleIsland.addEventListener("click", () => {
  playerCard.classList.toggle("hidden");
  dynamicIsland.classList.toggle("hidden");
});

dynamicIsland.addEventListener("click", () => {
  playerCard.classList.remove("hidden");
  dynamicIsland.classList.add("hidden");
});

// Web Audio API Equalizer Canvas Visualizer
function initAudioContext() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  drawEQ();
}

function drawEQ() {
  animationFrameId = requestAnimationFrame(drawEQ);
  if (!eqToggle.checked) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  analyser.getByteFrequencyData(dataArray);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / dataArray.length) * 1.5;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    canvasCtx.fillStyle = `rgba(255, 255, 255, ${dataArray[i] / 255 * 0.4})`;
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }
}

// Initial Fetch
async function init() {
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    if (playlist && playlist.length > 0) {
      loadTrack(0);
    }
  } catch (e) {
    console.error("Failed to load playlist:", e);
  }
}

init();