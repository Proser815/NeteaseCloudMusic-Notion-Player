const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop Playlist, 1: Loop Single, 2: Shuffle
let isDraggingProgress = false;

// Elements
const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const coverWrapper = document.getElementById("cover-wrapper");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const btnIsland = document.getElementById("btn-island");

const btnPlay = document.getElementById("btn-play");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");

const islandBtnPlay = document.getElementById("island-btn-play");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");
const islandBtnMode = document.getElementById("island-btn-mode");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");
const lyricText = document.getElementById("lyric-text");

const btnPlaylist = document.getElementById("btn-playlist");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistDrawer = document.getElementById("playlist-drawer");
const playlistItems = document.getElementById("playlist-items");

const volumeSlider = document.getElementById("volume-slider");
const islandVolSlider = document.getElementById("island-volume-slider");
const islandVolFill = document.getElementById("island-volume-fill");
const opacitySlider = document.getElementById("opacity-slider");

// Fetch Initial Playlist Data
async function initPlaylist() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      loadTrack(currentIndex);
      renderPlaylist();
    } else {
      title.innerText = "Failed to load playlist";
    }
  } catch (e) {
    console.error("Failed to load playlist", e);
    title.innerText = "Error loading music";
  }
}

// Load Selected Track
function loadTrack(index) {
  if (playlist.length === 0) return;
  const track = playlist[index];
  
  audio.src = track.url;
  cover.src = track.pic;
  backdropImg.src = track.pic;
  title.innerText = track.title;
  artist.innerText = track.author;

  islandCover.src = track.pic;
  islandTitle.innerText = track.title;

  extractAccentColor(track.pic);
  fetchLyrics(track.lrc);
  renderPlaylist();
}

// Color Extraction for Dynamic Glow
function extractAccentColor(imgUrl) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imgUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    document.documentElement.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.6)`);
  };
}

// Fetch Lyrics
async function fetchLyrics(lrcUrl) {
  lyrics = [];
  lyricText.innerText = "Loading lyrics...";
  if (!lrcUrl) {
    lyricText.innerText = "Instrumental Track";
    return;
  }
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLrc(text);
  } catch (e) {
    lyricText.innerText = "Lyrics unavailable";
  }
}

// LRC Lyrics Parser
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
      const text = line.replace(timeExp, "").trim();
      if (text) lyrics.push({ time, text });
    }
  }

  if (lyrics.length === 0) {
    lyricText.innerText = "Music Only";
  }
}

// Toggle Play / Pause Sync
function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function updatePlayUI(isPlaying) {
  const playIcons = document.querySelectorAll(".icon-play");
  const pauseIcons = document.querySelectorAll(".icon-pause");

  if (isPlaying) {
    playIcons.forEach(el => el.classList.add("hidden"));
    pauseIcons.forEach(el => el.classList.remove("hidden"));
    coverWrapper.classList.add("playing");
  } else {
    playIcons.forEach(el => el.classList.remove("hidden"));
    pauseIcons.forEach(el => el.classList.add("hidden"));
    coverWrapper.classList.remove("playing");
  }
}

// Navigation Controls
function prevTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }
  loadTrack(currentIndex);
  audio.play();
}

function nextTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  audio.play();
}

// Play Mode Switching
function cyclePlayMode() {
  playMode = (playMode + 1) % 3;
  const modes = [".icon-repeat", ".icon-repeat-one", ".icon-shuffle"];
  
  document.querySelectorAll(".icon-repeat, .icon-repeat-one, .icon-shuffle").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(modes[playMode]).forEach(el => el.classList.remove("hidden"));
}

// Volume Controls & Sound Adjustment Sync
function syncVolume(val) {
  audio.volume = val;
  if (volumeSlider) volumeSlider.value = val;
  if (islandVolSlider) islandVolSlider.value = val;
  if (islandVolFill) islandVolFill.style.width = `${val * 100}%`;
}

if (volumeSlider) {
  volumeSlider.addEventListener("input", (e) => syncVolume(parseFloat(e.target.value)));
}

if (islandVolSlider) {
  islandVolSlider.addEventListener("input", (e) => syncVolume(parseFloat(e.target.value)));
}

// Card Transparency Slider
if (opacitySlider) {
  opacitySlider.addEventListener("input", (e) => {
    document.documentElement.style.setProperty("--glass-tint-opacity", e.target.value);
  });
}

// Dynamic Island Switch
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

window.addEventListener("click", (e) => {
  if (!dynamicIsland.classList.contains("hidden") && !dynamicIsland.contains(e.target)) {
    dynamicIsland.classList.add("hidden");
    playerCard.classList.remove("hidden");
  }
});

// Render Playlist Drawer with iOS Delete Buttons
function renderPlaylist() {
  if (!playlistItems) return;
  playlistItems.innerHTML = "";

  playlist.forEach((track, idx) => {
    const item = document.createElement("div");
    item.className = `playlist-item ${idx === currentIndex ? "active" : ""}`;

    item.innerHTML = `
      <div class="playlist-item-left" onclick="playSelectedTrack(${idx})">
        <img src="${track.pic}" class="playlist-item-cover" alt="cover">
        <div class="playlist-item-info">
          <div class="playlist-item-title">${track.title}</div>
          <div class="playlist-item-artist">${track.author}</div>
        </div>
      </div>
      <button class="ios-delete-btn" title="Delete Track" onclick="deleteTrack(event, ${idx})">
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
          <rect width="12" height="2" rx="1" fill="white"/>
        </svg>
      </button>
    `;
    playlistItems.appendChild(item);
  });
}

function playSelectedTrack(idx) {
  currentIndex = idx;
  loadTrack(currentIndex);
  audio.play();
}

function deleteTrack(event, idx) {
  event.stopPropagation();
  playlist.splice(idx, 1);

  if (playlist.length === 0) {
    audio.pause();
    title.innerText = "No Tracks Remaining";
    artist.innerText = "";
  } else {
    if (idx === currentIndex) {
      currentIndex = currentIndex % playlist.length;
      loadTrack(currentIndex);
      audio.play();
    } else if (idx < currentIndex) {
      currentIndex--;
    }
  }
  renderPlaylist();
}

// Time Formatting
function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Event Listeners
audio.addEventListener("play", () => updatePlayUI(true));
audio.addEventListener("pause", () => updatePlayUI(false));

btnPlay.addEventListener("click", togglePlay);
islandBtnPlay.addEventListener("click", togglePlay);

btnPrev.addEventListener("click", prevTrack);
islandBtnPrev.addEventListener("click", prevTrack);

btnNext.addEventListener("click", nextTrack);
islandBtnNext.addEventListener("click", nextTrack);

btnMode.addEventListener("click", cyclePlayMode);
islandBtnMode.addEventListener("click", cyclePlayMode);

btnPlaylist.addEventListener("click", () => playlistDrawer.classList.remove("collapsed"));
btnClosePlaylist.addEventListener("click", () => playlistDrawer.classList.add("collapsed"));

// Audio Progress & Lyric Syncing
audio.addEventListener("timeupdate", () => {
  if (!audio.duration || isDraggingProgress) return;
  const curTime = audio.currentTime;
  progressBarFill.style.width = `${(curTime / audio.duration) * 100}%`;
  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  if (lyrics.length > 0) {
    const currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      lyricText.innerText = currentLine.text;
    }
  }
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextTrack();
  }
});

// Interactive Progress Bar Dragging
progressBarBg.addEventListener("mousedown", (e) => {
  isDraggingProgress = true;
  updateProgress(e);
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingProgress) updateProgress(e);
});

window.addEventListener("mouseup", (e) => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    updateProgress(e);
  }
});

function updateProgress(e) {
  const rect = progressBarBg.getBoundingClientRect();
  let pos = (e.clientX - rect.left) / rect.width;
  pos = Math.max(0, Math.min(1, pos));
  progressBarFill.style.width = `${pos * 100}%`;
  currentTimeEl.innerText = formatTime(pos * audio.duration);
  if (!isDraggingProgress) {
    audio.currentTime = pos * audio.duration;
  }
}

// Initialize System
initPlaylist();
syncVolume(0.8);