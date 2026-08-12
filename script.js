const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let debounceTimer = null;

// DOM Elements
const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandArtist = document.getElementById("island-artist");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const btnIsland = document.getElementById("btn-island");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");

const lyricText = document.getElementById("lyric-text");
const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

const playlistDrawer = document.getElementById("playlist-drawer");
const btnTogglePlaylist = document.getElementById("btn-toggle-playlist");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const infoDrawer = document.getElementById("info-drawer");
const btnToggleInfo = document.getElementById("btn-toggle-info");
const btnCloseInfo = document.getElementById("btn-close-info");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const searchResultsContainer = document.getElementById("search-results-container");
const searchResultsUl = document.getElementById("search-results-ul");

const btnMode = document.getElementById("btn-mode");
const btnVolume = document.getElementById("btn-volume");
const volumePopover = document.getElementById("volume-popover");
const volumeSlider = document.getElementById("volume-slider");

// Initial Setup
async function init() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    if (data && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(0);
    }
  } catch (err) {
    console.error("Error loading playlist:", err);
    lyricText.innerText = "Failed to load playlist";
  }
}

// Render Playlist with iOS Delete Button
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "track-item-row" + (index === currentIndex ? " active" : "");
    
    // Inject track info AND white iOS delete button
    li.innerHTML = `
      <div class="item-left">
        <img src="${song.pic}" alt="Cover" class="item-cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
      <button class="delete-btn-ios" title="Remove track">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // 1. Play song when clicking item row
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });

    // 2. Delete song when clicking delete button
    const deleteBtn = li.querySelector('.delete-btn-ios');
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevents song playback when hitting delete
      
      // Remove from playlist array
      playlist.splice(index, 1);
      
      // Keep player state accurate
      if (currentIndex === index) {
        if (playlist.length === 0) {
          audio.pause();
          title.innerText = "No Track";
          artist.innerText = "Playlist Empty";
          cover.src = "";
          backdropImg.src = "";
          updatePlayIcons(false);
        } else {
          if (currentIndex >= playlist.length) currentIndex = 0;
          loadTrack(currentIndex);
          playTrack();
        }
      } else if (currentIndex > index) {
        currentIndex--; // Adjust index offset
      }
      
      renderPlaylist(); // Re-render updated playlist
    });

    playlistUl.appendChild(li);
  });
}

// Load Track Details
function loadTrack(index) {
  if (playlist.length === 0) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;

  // Update Dynamic Island
  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  if (islandArtist) islandArtist.innerText = song.author;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  audio.src = song.url;
  
  fetchLyrics(song.lrc);
  renderPlaylist();
}

// Play & Pause Controls
function playTrack() {
  audio.play().then(() => {
    updatePlayIcons(true);
  }).catch(e => console.log("Playback error:", e));
}

function pauseTrack() {
  audio.pause();
  updatePlayIcons(false);
}

function togglePlay() {
  if (audio.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
}

function updatePlayIcons(isPlaying) {
  const playSvg = '<path d="M8 5v14l11-7z"/>';
  const pauseSvg = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  
  playIcon.innerHTML = isPlaying ? pauseSvg : playSvg;
  if (islandPlayIcon) islandPlayIcon.innerHTML = isPlaying ? pauseSvg : playSvg;
}

// Track Navigation
function handleNextTrack() {
  if (playlist.length === 0) return;
  if (playMode === 2) { // Shuffle
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else if (playMode === 1) { // Repeat One
    audio.currentTime = 0;
    playTrack();
    return;
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

function handlePrevTrack() {
  if (playlist.length === 0) return;
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

// Lyrics Fetching & Parsing
async function fetchLyrics(lrcUrl) {
  lyricText.innerText = "Loading lyrics...";
  lyrics = [];
  if (!lrcUrl) {
    lyricText.innerText = "Instrumental or No Lyrics";
    return;
  }
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    lyrics = parseLRC(text);
    if (lyrics.length === 0) {
      lyricText.innerText = "No timed lyrics available";
    }
  } catch (err) {
    lyricText.innerText = "Lyrics unavailable";
  }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach(line => {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      const time = minutes * 60 + seconds + (milliseconds > 99 ? milliseconds / 1000 : milliseconds / 100);
      const text = line.replace(timeExp, "").trim();
      if (text) result.push({ time, text });
    }
  });
  return result;
}

// Audio Progress & Updates
audio.addEventListener("timeupdate", () => {
  if (!audio.duration || isDraggingProgress) return;
  const curTime = audio.currentTime;
  progressBarFill.style.width = `${(curTime / audio.duration) * 100}%`;
  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      lyricText.innerText = currentLine.text;
    }
  }
});

audio.addEventListener("ended", handleNextTrack);

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Click Progress Bar
progressBarBg.addEventListener("click", (e) => {
  const rect = progressBarBg.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

// Controls Event Listeners
btnPlay.addEventListener("click", togglePlay);
btnPrev.addEventListener("click", handlePrevTrack);
btnNext.addEventListener("click", handleNextTrack);

if (islandBtnPlay) islandBtnPlay.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });
if (islandBtnPrev) islandBtnPrev.addEventListener("click", (e) => { e.stopPropagation(); handlePrevTrack(); });
if (islandBtnNext) islandBtnNext.addEventListener("click", (e) => { e.stopPropagation(); handleNextTrack(); });

// Drawer Event Listeners
btnTogglePlaylist.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});
btnClosePlaylist.addEventListener("click", () => {
  playlistDrawer.classList.add("collapsed");
});

btnToggleInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
});
btnCloseInfo.addEventListener("click", () => {
  infoDrawer.classList.add("collapsed");
});

// Mode Toggle Button
btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  const modeSvg = [
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>', // Loop
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="10" y="15" font-size="8" fill="currentColor">1</text>', // Repeat One
    '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>' // Shuffle
  ];
  document.getElementById("mode-icon").innerHTML = modeSvg[playMode];
});

// Mode View Switches
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest(".island-btn")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.classList.remove("hidden");
});

// Search
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  }
});

searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value.trim();
  if (!query) {
    searchResultsContainer.classList.add("hidden");
    return;
  }
  debounceTimer = setTimeout(() => {
    performSearch(query);
  }, 400);
});

async function performSearch(query) {
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderSearchResults(results);
  } catch (err) {
    console.error("Search error:", err);
  }
}

function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!results || results.length === 0) {
    searchResultsContainer.classList.add("hidden");
    return;
  }
  results.slice(0, 5).forEach(song => {
    const li = document.createElement("li");
    li.style.cssText = "padding: 8px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;";
    li.innerHTML = `
      <span style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80%;">
        ${song.title} - ${song.author}
      </span>
      <span style="font-size:0.75rem; color:#fff; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">+ Add</span>
    `;
    li.addEventListener("click", () => {
      playlist.push(song);
      renderPlaylist();
      loadTrack(playlist.length - 1);
      playTrack();
      searchResultsContainer.classList.add("hidden");
      searchSection.classList.add("collapsed");
      btnToggleSearch.classList.remove("active");
    });
    searchResultsUl.appendChild(li);
  });
  searchResultsContainer.classList.remove("hidden");
}

// Volume Controls
btnVolume.addEventListener("click", () => {
  volumePopover.classList.toggle("hidden");
});

volumeSlider.addEventListener("input", (e) => {
  audio.volume = e.target.value;
});

// Init Player
init();