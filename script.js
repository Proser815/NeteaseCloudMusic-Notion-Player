const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;

// DOM Elements
const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const coverWrapper = document.getElementById("cover-wrapper");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const lyricText = document.getElementById("lyric-text");

const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandArtist = document.getElementById("island-artist");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");

const btnMode = document.getElementById("btn-mode");
const modeLoop = document.getElementById("mode-loop");
const modeOne = document.getElementById("mode-one");
const modeShuffle = document.getElementById("mode-shuffle");

const islandBtnMode = document.getElementById("island-btn-mode");
const islandModeLoop = document.getElementById("island-mode-loop");
const islandModeOne = document.getElementById("island-mode-one");
const islandModeShuffle = document.getElementById("island-mode-shuffle");

const btnVolume = document.getElementById("btn-volume");
const volumeIcon = document.getElementById("volume-icon");
const muteIcon = document.getElementById("mute-icon");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

const btnIsland = document.getElementById("btn-island");
const btnList = document.getElementById("btn-list");
const btnInfo = document.getElementById("btn-info");
const playlistDrawer = document.getElementById("playlist-drawer");
const infoDrawer = document.getElementById("info-drawer");
const btnExitPlaylist = document.getElementById("btn-exit-playlist");
const btnExitInfo = document.getElementById("btn-exit-info");
const playlistUl = document.getElementById("playlist-ul");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const searchSubmitBtn = document.getElementById("search-submit-btn");
const searchResultsContainer = document.getElementById("search-results-container");
const searchResultsUl = document.getElementById("search-results-ul");

const opacitySlider = document.getElementById("opacity-slider");
const btnToggleGlass = document.getElementById("btn-toggle-glass");

// Fetch Playlist Initialization
fetch(API_BASE)
  .then(res => res.json())
  .then(data => {
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(0);
    }
  })
  .catch(err => console.error("Failed to load playlist:", err));

function loadTrack(index) {
  if (playlist.length === 0) return;
  currentIndex = index;
  const track = playlist[currentIndex];

  audio.src = track.url;
  title.innerText = track.title;
  artist.innerText = track.author;
  islandTitle.innerText = track.title;
  if (islandArtist) islandArtist.innerText = track.author;
  islandHoverTitle.innerText = track.title;
  islandHoverArtist.innerText = track.author;

  const picUrl = track.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg';
  cover.src = picUrl;
  islandCover.src = picUrl;
  islandHoverCover.src = picUrl;
  backdropImg.src = picUrl;

  updateActivePlaylistRow();
  fetchLyrics(track.lyric);
}

function playTrack() {
  audio.play().then(() => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    islandPlayIcon.classList.add("hidden");
    islandPauseIcon.classList.remove("hidden");
    coverWrapper.classList.add("playing");
  }).catch(err => console.log("Playback prevented:", err));
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  coverWrapper.classList.remove("playing");
}

function togglePlay() {
  if (audio.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
}

btnPlay.addEventListener("click", togglePlay);
islandBtnPlay.addEventListener("click", togglePlay);

btnPrev.addEventListener("click", handlePrevTrack);
islandBtnPrev.addEventListener("click", handlePrevTrack);
btnNext.addEventListener("click", handleNextTrack);
islandBtnNext.addEventListener("click", handleNextTrack);

function handlePrevTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

function handleNextTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
    return;
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

audio.addEventListener("ended", () => {
  handleNextTrack();
});

// Play Mode Toggles
function togglePlayMode() {
  playMode = (playMode + 1) % 3;
  modeLoop.classList.toggle("hidden", playMode !== 0);
  modeOne.classList.toggle("hidden", playMode !== 1);
  modeShuffle.classList.toggle("hidden", playMode !== 2);

  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

btnMode.addEventListener("click", togglePlayMode);
islandBtnMode.addEventListener("click", togglePlayMode);

// Volume / Mute
btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
  } else {
    audio.volume = previousVolume || 0.8;
    volumeIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
  }
});

// Progress Bar
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  const percent = Math.max(0, Math.min(1, pos));
  progressBarFill.style.width = `${percent * 100}%`;
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
      lyricText.innerText = currentLine.text;
      islandLyricText.innerText = currentLine.text;
    }
  }
});

// Lyrics Parser
function fetchLyrics(url) {
  if (!url) {
    lyrics = [];
    lyricText.innerText = "No lyrics available";
    islandLyricText.innerText = "No lyrics";
    return;
  }
  fetch(url)
    .then(res => res.text())
    .then(data => parseLRC(data))
    .catch(() => {
      lyrics = [];
      lyricText.innerText = "Lyrics unavailable";
      islandLyricText.innerText = "Enjoy music";
    });
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, "").trim();
      if (text) parsed.push({ time, text });
    }
  });
  lyrics = parsed;
}

// Playlist Renderer
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = `track-item-row ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <div class="item-left">
        <img class="item-cover" src="${song.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg'}" alt="cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });
    playlistUl.appendChild(li);
  });
}

function updateActivePlaylistRow() {
  const rows = playlistUl.querySelectorAll(".track-item-row");
  rows.forEach((row, idx) => {
    row.classList.toggle("active", idx === currentIndex);
  });
}

// Drawers & Dynamic Island toggles
btnIsland.addEventListener("click", () => {
  playerCard.style.opacity = "0";
  playerCard.style.transform = "scale(0.8)";
  setTimeout(() => {
    playerCard.classList.add("hidden");
    dynamicIsland.classList.remove("hidden");
  }, 300);
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest('.island-center-controls')) return;
  dynamicIsland.classList.add("hidden");
  playerCard.classList.remove("hidden");
  setTimeout(() => {
    playerCard.style.opacity = "1";
    playerCard.style.transform = "scale(1)";
  }, 50);
});

btnList.addEventListener("click", () => playlistDrawer.classList.remove("collapsed"));
btnExitPlaylist.addEventListener("click", () => playlistDrawer.classList.add("collapsed"));

btnInfo.addEventListener("click", () => infoDrawer.classList.remove("collapsed"));
btnExitInfo.addEventListener("click", () => infoDrawer.classList.add("collapsed"));

// Search Drawer Logic
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
});

searchSubmitBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});

function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      searchResultsUl.innerHTML = "";
      if (Array.isArray(data) && data.length > 0) {
        searchResultsContainer.classList.remove("hidden");
        data.forEach(song => {
          const li = document.createElement("li");
          li.className = "search-result-item";
          li.innerHTML = `
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 80%;">
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
          });
          searchResultsUl.appendChild(li);
        });
      }
    })
    .catch(err => console.error("Search failed:", err));
}

// Settings & Glass Controls
opacitySlider.addEventListener("input", (e) => {
  const val = e.target.value;
  previousOpacity = val;
  playerCard.style.setProperty("--glass-tint-opacity", val);
});

btnToggleGlass.addEventListener("click", () => {
  const currentOpacity = getComputedStyle(playerCard).getPropertyValue("--glass-tint-opacity").trim();
  if (currentOpacity !== "0.1") {
    playerCard.style.setProperty("--glass-tint-opacity", "0.1");
    opacitySlider.value = 0.1;
  } else {
    playerCard.style.setProperty("--glass-tint-opacity", previousOpacity || "0.5");
    opacitySlider.value = previousOpacity || 0.5;
  }
});