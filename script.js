const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: One, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;

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

const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");
const btnLyrics = document.getElementById("btn-lyrics");

const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");
const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");

const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");
const islandVolumeSlider = document.getElementById("island-volume-slider");

const btnVolume = document.getElementById("btn-volume");
const volumeSlider = document.getElementById("volume-slider");
const volLowIcon = document.getElementById("vol-low-icon");
const volHighIcon = document.getElementById("vol-high-icon");
const muteIcon = document.getElementById("mute-icon");

const islandBtnVolume = document.getElementById("island-btn-volume");
const islandVolLowIcon = document.getElementById("island-vol-low-icon");
const islandVolHighIcon = document.getElementById("island-vol-high-icon");
const islandMuteIcon = document.getElementById("island-mute-icon");

const opacitySlider = document.getElementById("opacity-slider");
const btnList = document.getElementById("btn-list");
const playlistDrawer = document.getElementById("playlist-drawer");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnClearSearch = document.getElementById("btn-clear-search");
const searchPredictions = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");
const searchResults = document.getElementById("search-results");
const searchResultsUl = document.getElementById("search-results-ul");

const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const btnCloseInfo = document.getElementById("btn-close-info");
const metaAlbum = document.getElementById("meta-album");

// Load Playlist Data
fetch(API_BASE)
  .then(res => res.json())
  .then(data => {
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(0);
    }
  })
  .catch(() => {
    title.innerText = "Failed to load playlist";
  });

function loadTrack(index) {
  currentIndex = index;
  const track = playlist[currentIndex];

  audio.src = track.url;
  title.innerText = track.title;
  artist.innerText = track.author;
  cover.src = track.pic;
  backdropImg.src = track.pic;

  islandCover.src = track.pic;
  islandTitle.innerText = track.title;
  islandArtist.innerText = track.author;
  islandHoverCover.src = track.pic;
  islandHoverTitle.innerText = track.title;
  islandHoverArtist.innerText = track.author;
  metaAlbum.innerText = track.album || "Single";

  fetchLyrics(track.lrc);
  updateActivePlaylistRow();
}

function fetchLyrics(lrcUrl) {
  if (!lrcUrl) {
    lyricText.innerText = "No lyrics available";
    return;
  }
  fetch(lrcUrl)
    .then(res => res.text())
    .then(data => {
      lyrics = parseLRC(data);
      if (lyrics.length === 0) lyricText.innerText = "Instrumental / No lyrics";
    })
    .catch(() => {
      lyrics = [];
      lyricText.innerText = "Lyrics unavailable";
    });
}

function parseLRC(lrcString) {
  const lines = lrcString.split("\n");
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (let line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const milli = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = min * 60 + sec + milli / 1000;
      const text = line.replace(timeExp, "").trim();
      if (text) result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function togglePlay() {
  if (audio.paused) playTrack();
  else pauseTrack();
}

function playTrack() {
  audio.play().then(() => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    islandPlayIcon.classList.add("hidden");
    islandPauseIcon.classList.remove("hidden");
  }).catch(() => {});
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
}

btnPlay.addEventListener("click", togglePlay);
islandBtnPlay.addEventListener("click", togglePlay);
btnPrev.addEventListener("click", () => handlePrevTrack());
islandBtnPrev.addEventListener("click", () => handlePrevTrack());
btnNext.addEventListener("click", () => handleNextTrack());
islandBtnNext.addEventListener("click", () => handleNextTrack());

function handlePrevTrack() {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
}

function handleNextTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
  } else {
    handleNextTrack();
  }
});

// Lyrics Toggle
btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("hidden");
  btnLyrics.classList.toggle("active");
});

// Time & Progress Updates
audio.addEventListener("timeupdate", () => {
  if (!audio.duration || isDraggingProgress) return;
  const curTime = audio.currentTime;
  progressBarFill.style.width = `${(curTime / audio.duration) * 100}%`;
  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine) lyricText.innerText = currentLine.text;
  }
});

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Progress Bar Dragging
function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  progressBarFill.style.width = `${pos * 100}%`;
  currentTimeEl.innerText = formatTime(pos * audio.duration);
  return pos;
}

progressBarBg.addEventListener("mousedown", (e) => {
  isDraggingProgress = true;
  const percent = updateProgressFromEvent(e);
  audio.currentTime = percent * audio.duration;
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingProgress) updateProgressFromEvent(e);
});

window.addEventListener("mouseup", (e) => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    const percent = updateProgressFromEvent(e);
    audio.currentTime = percent * audio.duration;
  }
});

// Volume & Opacity Handling
function applyVolume(val) {
  audio.volume = val;
  volumeSlider.value = val;
  islandVolumeSlider.value = val;
  
  volLowIcon.classList.add("hidden");
  volHighIcon.classList.add("hidden");
  muteIcon.classList.add("hidden");
  islandVolLowIcon.classList.add("hidden");
  islandVolHighIcon.classList.add("hidden");
  islandMuteIcon.classList.add("hidden");

  if (val == 0) {
    muteIcon.classList.remove("hidden");
    islandMuteIcon.classList.remove("hidden");
  } else if (val < 0.5) {
    volLowIcon.classList.remove("hidden");
    islandVolLowIcon.classList.remove("hidden");
  } else {
    volHighIcon.classList.remove("hidden");
    islandVolHighIcon.classList.remove("hidden");
  }
}

volumeSlider.addEventListener("input", (e) => applyVolume(e.target.value));
islandVolumeSlider.addEventListener("input", (e) => applyVolume(e.target.value));

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    applyVolume(0);
  } else {
    applyVolume(previousVolume || 0.8);
  }
});

islandBtnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    applyVolume(0);
  } else {
    applyVolume(previousVolume || 0.8);
  }
});

opacitySlider.addEventListener("input", (e) => {
  document.documentElement.style.setProperty("--glass-tint-opacity", e.target.value);
});

// Dynamic Island Modes
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest(".island-action-buttons")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.classList.remove("hidden");
});

// Loop Modes
const modeIcons = [
  '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM12 10v4h1v-4h-1z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>'
];
let modeIndex = 0;
btnMode.addEventListener("click", () => {
  modeIndex = (modeIndex + 1) % 3;
  playMode = modeIndex;
  btnMode.innerHTML = modeIcons[modeIndex];
});

// Drawers
btnList.addEventListener("click", () => playlistDrawer.classList.toggle("collapsed"));
btnClosePlaylist.addEventListener("click", () => playlistDrawer.classList.add("collapsed"));
btnInfo.addEventListener("click", () => infoDrawer.classList.toggle("collapsed"));
btnCloseInfo.addEventListener("click", () => infoDrawer.classList.add("collapsed"));

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, idx) => {
    const li = document.createElement("li");
    li.className = `track-item-row ${idx === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <div class="item-left">
        <img class="item-cover" src="${song.pic}" alt="Cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      loadTrack(idx);
      playTrack();
      playlistDrawer.classList.add("collapsed");
    });
    playlistUl.appendChild(li);
  });
}

function updateActivePlaylistRow() {
  const rows = playlistUl.querySelectorAll(".track-item-row");
  rows.forEach((row, idx) => {
    if (idx === currentIndex) row.classList.add("active");
    else row.classList.remove("active");
  });
}

// Search, Predictions & iOS Delete Button
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  } else {
    searchPredictions.classList.add("hidden");
    searchResults.classList.add("hidden");
  }
});

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  predictionsUl.innerHTML = "";

  if (query.length > 0) {
    btnClearSearch.classList.remove("hidden");
  } else {
    btnClearSearch.classList.add("hidden");
    searchPredictions.classList.add("hidden");
    searchResults.classList.add("hidden");
    return;
  }

  const filtered = playlist.filter(s => s.title.toLowerCase().includes(query) || s.author.toLowerCase().includes(query));

  if (filtered.length > 0) {
    searchPredictions.classList.remove("hidden");
    filtered.slice(0, 5).forEach(song => {
      const realIdx = playlist.indexOf(song);
      const li = document.createElement("li");
      li.className = "prediction-item";
      li.innerText = `${song.title} — ${song.author}`;
      li.addEventListener("click", () => {
        loadTrack(realIdx);
        playTrack();
        searchPredictions.classList.add("hidden");
        searchResults.classList.add("hidden");
        searchSection.classList.add("collapsed");
        btnToggleSearch.classList.remove("active");
        searchInput.value = "";
        btnClearSearch.classList.add("hidden");
      });
      predictionsUl.appendChild(li);
    });
  } else {
    searchPredictions.classList.add("hidden");
  }
});

btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  btnClearSearch.classList.add("hidden");
  searchPredictions.classList.add("hidden");
  searchResults.classList.add("hidden");
  searchInput.focus();
});

document.getElementById("btn-search").addEventListener("click", () => {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) return;
  searchResultsUl.innerHTML = "";
  const filtered = playlist.filter(s => s.title.toLowerCase().includes(query) || s.author.toLowerCase().includes(query));
  
  if (filtered.length > 0) {
    searchResults.classList.remove("hidden");
    searchPredictions.classList.add("hidden");
    filtered.forEach(song => {
      const realIdx = playlist.indexOf(song);
      const li = document.createElement("li");
      li.className = "track-item-row";
      li.innerHTML = `
        <div class="item-left">
          <img class="item-cover" src="${song.pic}" alt="Cover">
          <div class="item-meta">
            <span class="item-title">${song.title}</span>
            <span class="item-artist">${song.author}</span>
          </div>
        </div>
      `;
      li.addEventListener("click", () => {
        loadTrack(realIdx);
        playTrack();
        searchResults.classList.add("hidden");
        searchSection.classList.add("collapsed");
        btnToggleSearch.classList.remove("active");
        searchInput.value = "";
        btnClearSearch.classList.add("hidden");
      });
      searchResultsUl.appendChild(li);
    });
  }
});