const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat, 2: Shuffle
let isDraggingProgress = false;
let searchDebounceTimer = null;

// Web Audio Visualizer API State
let audioCtx;
let analyser;
let source;
let dataArray;

// DOM Selectors
const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
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
const btnToggleIsland = document.getElementById("btn-toggle-island");

// Utility Sheet Drawer Elements
const utilityDrawer = document.getElementById("utility-drawer");
const btnDrawerToggle = document.getElementById("btn-drawer-toggle");
const btnSettingsDrawer = document.getElementById("btn-settings-drawer");
const btnCloseDrawer = document.getElementById("btn-close-drawer");

const tabBtnSearch = document.getElementById("tab-btn-search");
const tabBtnPlaylist = document.getElementById("tab-btn-playlist");
const tabBtnSettings = document.getElementById("tab-btn-settings");

const drawerSectionSearch = document.getElementById("drawer-section-search");
const drawerSectionPlaylist = document.getElementById("drawer-section-playlist");
const drawerSectionSettings = document.getElementById("drawer-section-settings");

const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchSuggestions = document.getElementById("search-suggestions");
const searchResults = document.getElementById("search-results");
const playlistList = document.getElementById("playlist-list");

const glassOpacitySlider = document.getElementById("glass-opacity");
const glassOpacityVal = document.getElementById("glass-opacity-val");
const blurSlider = document.getElementById("blur-slider");
const blurSliderVal = document.getElementById("blur-slider-val");
const tintPicker = document.getElementById("tint-picker");
const eqToggle = document.getElementById("eq-toggle");
const canvas = document.getElementById("eq-canvas");
const canvasCtx = canvas.getContext("2d");

// Safe Property Extractors to completely eliminate "undefined" errors
function getTrackTitle(track) {
  if (!track) return "Unknown Song";
  return track.name || track.title || "Unknown Song";
}

function getTrackArtist(track) {
  if (!track) return "Unknown Artist";
  return track.artist || track.author || "Unknown Artist";
}

function getTrackPic(track) {
  if (!track) return "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg";
  return track.pic || track.cover || track.url_pic || "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg";
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// LRC Lyric Parser
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
      if (text) result.push({ time, text });
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

async function fetchLyrics(lrcUrl) {
  lyrics = [];
  setLyricText("♪ Loading lyrics...");
  if (!lrcUrl) {
    setLyricText("♪ Instrumental");
    return;
  }
  try {
    const res = await fetch(lrcUrl);
    const data = await res.text();
    lyrics = parseLrc(data);
    setLyricText(lyrics.length === 0 ? "♪ Instrumental" : "♪");
  } catch (e) {
    setLyricText("♪ Lyrics unavailable");
  }
}

// Load Track State
function loadTrack(index) {
  if (!playlist || playlist.length === 0) return;
  currentIndex = (index + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  const tTitle = getTrackTitle(track);
  const tArtist = getTrackArtist(track);
  const tPic = getTrackPic(track);

  audio.src = track.url;
  cover.src = tPic;
  backdropImg.src = tPic;
  title.innerText = tTitle;
  artist.innerText = tArtist;

  islandCover.src = tPic;
  islandTitle.innerText = tTitle;

  fetchLyrics(track.lrc);
  renderPlaylist();
}

function playTrack() {
  audio.play().then(() => {
    playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    if (!audioCtx && eqToggle.checked) initAudioContext();
  }).catch(err => console.log("Playback blocked:", err));
}

function pauseTrack() {
  audio.pause();
  playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
}

function togglePlay() {
  if (audio.paused) playTrack();
  else pauseTrack();
}

function playNext() {
  if (playMode === 2) {
    loadTrack(Math.floor(Math.random() * playlist.length));
  } else {
    loadTrack(currentIndex + 1);
  }
  playTrack();
}

function playPrev() {
  loadTrack(currentIndex - 1);
  playTrack();
}

// Accurate NetEase Search & Suggestion Engine
async function fetchSuggestions(query) {
  if (!query.trim()) {
    searchSuggestions.classList.add("hidden");
    return;
  }
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSuggestions(data);
  } catch (e) {
    console.error("Suggestion error:", e);
  }
}

function renderSuggestions(data) {
  searchSuggestions.innerHTML = "";
  if (!data || data.length === 0) {
    searchSuggestions.classList.add("hidden");
    return;
  }
  data.slice(0, 5).forEach(song => {
    const sTitle = getTrackTitle(song);
    const sArtist = getTrackArtist(song);
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.innerText = `${sTitle} — ${sArtist}`;
    div.addEventListener("click", () => {
      searchInput.value = sTitle;
      searchSuggestions.classList.add("hidden");
      executeSearch(sTitle);
    });
    searchSuggestions.appendChild(div);
  });
  searchSuggestions.classList.remove("hidden");
}

async function executeSearch(query) {
  if (!query.trim()) return;
  searchSuggestions.classList.add("hidden");
  searchResults.innerHTML = "<div style='font-size:0.75rem; padding:10px; color:rgba(255,255,255,0.6);'>Searching Apple Music / NetEase...</div>";
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSearchResults(data);
  } catch (e) {
    searchResults.innerHTML = "<div style='font-size:0.75rem; padding:10px; color:rgba(255,255,255,0.6);'>Search failed. Please try again.</div>";
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = "";
  if (!results || results.length === 0) {
    searchResults.innerHTML = "<div style='font-size:0.75rem; padding:10px; color:rgba(255,255,255,0.6);'>No matching songs found.</div>";
    return;
  }
  results.slice(0, 15).forEach(song => {
    const sTitle = getTrackTitle(song);
    const sArtist = getTrackArtist(song);
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:82%;">
        <strong>${sTitle}</strong><br><span style="color:rgba(255,255,255,0.6); font-size:0.7rem;">${sArtist}</span>
      </div>
      <button class="btn-add-morph" title="Add song">+</button>
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
      utilityDrawer.classList.add("collapsed");
    });
    searchResults.appendChild(item);
  });
}

function renderPlaylist() {
  playlistList.innerHTML = "";
  playlist.forEach((song, idx) => {
    const sTitle = getTrackTitle(song);
    const sArtist = getTrackArtist(song);
    const li = document.createElement("li");
    if (idx === currentIndex) li.className = "active";
    li.innerHTML = `
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%;">
        <strong>${sTitle}</strong><br><span style="color:rgba(255,255,255,0.6); font-size:0.68rem;">${sArtist}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      loadTrack(idx);
      playTrack();
      utilityDrawer.classList.add("collapsed");
    });
    playlistList.appendChild(li);
  });
}

// Search Inputs & Debounce Event Listeners
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchSuggestions(e.target.value);
  }, 200);
});

btnSearch.addEventListener("click", () => executeSearch(searchInput.value));
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") executeSearch(searchInput.value); });

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
    searchSuggestions.classList.add("hidden");
  }
});

// Progress Bar Scrubbing
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

// Primary Controls
btnPlay.addEventListener("click", togglePlay);
btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);

btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  btnMode.style.opacity = playMode === 0 ? "1" : (playMode === 1 ? "0.7" : "0.4");
});

// Drawer Navigation Tabs
btnDrawerToggle.addEventListener("click", () => {
  utilityDrawer.classList.remove("collapsed");
  switchTab(tabBtnSearch, drawerSectionSearch);
});

btnSettingsDrawer.addEventListener("click", () => {
  utilityDrawer.classList.remove("collapsed");
  switchTab(tabBtnSettings, drawerSectionSettings);
});

btnCloseDrawer.addEventListener("click", () => utilityDrawer.classList.add("collapsed"));

function switchTab(activeTab, activeSection) {
  [tabBtnSearch, tabBtnPlaylist, tabBtnSettings].forEach(b => b.classList.remove("active"));
  [drawerSectionSearch, drawerSectionPlaylist, drawerSectionSettings].forEach(s => s.classList.remove("active"));
  activeTab.classList.add("active");
  activeSection.classList.add("active");
}

tabBtnSearch.addEventListener("click", () => switchTab(tabBtnSearch, drawerSectionSearch));
tabBtnPlaylist.addEventListener("click", () => {
  switchTab(tabBtnPlaylist, drawerSectionPlaylist);
  renderPlaylist();
});
tabBtnSettings.addEventListener("click", () => switchTab(tabBtnSettings, drawerSectionSettings));

// Live Sliders & Settings
glassOpacitySlider.addEventListener("input", (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  glassOpacityVal.innerText = `${Math.round(val * 100)}%`;
});

blurSlider.addEventListener("input", (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty("--glass-blur", `${val}px`);
  blurSliderVal.innerText = `${val}px`;
});

tintPicker.addEventListener("input", (e) => {
  playerCard.style.boxShadow = `0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 0 1px ${e.target.value}44`;
});

volumeSlider.addEventListener("input", (e) => {
  audio.volume = e.target.value;
});

btnToggleIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", () => {
  playerCard.classList.remove("hidden");
  dynamicIsland.classList.add("hidden");
});

// Web Audio API Equalizer Visualizer Bars
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
  requestAnimationFrame(drawEQ);
  if (!eqToggle.checked) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  analyser.getByteFrequencyData(dataArray);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = 3;
  const gap = 5;
  const numBars = Math.floor(canvas.width / (barWidth + gap));

  for (let i = 0; i < numBars; i++) {
    const val = dataArray[i % dataArray.length] || 0;
    const barHeight = Math.max(4, (val / 255) * canvas.height * 0.75);
    const x = i * (barWidth + gap) + gap;
    const y = canvas.height - barHeight;

    canvasCtx.fillStyle = `rgba(255, 255, 255, ${0.25 + (val / 255) * 0.65})`;
    canvasCtx.beginPath();
    canvasCtx.roundRect(x, y, barWidth, barHeight, 2);
    canvasCtx.fill();
  }
}

// Initializing Default Playlist
async function init() {
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    if (playlist && playlist.length > 0) {
      loadTrack(0);
    }
  } catch (e) {
    console.error("Playlist init failed:", e);
  }
}

init();