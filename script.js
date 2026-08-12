const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;

const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const btnIsland = document.getElementById("btn-island");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");
const modeIcon = document.getElementById("mode-icon");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration");
const lyricText = document.getElementById("lyric-text");

const volumeSlider = document.getElementById("volume-slider");
const btnMute = document.getElementById("btn-mute");
const opacitySlider = document.getElementById("opacity-slider");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResultsContainer = document.getElementById("search-results-container");
const searchResultsUl = document.getElementById("search-results-ul");

const btnPlaylist = document.getElementById("btn-playlist");
const playlistDrawer = document.getElementById("playlist-drawer");
const btnExitPlaylist = document.getElementById("btn-exit-playlist");
const playlistUl = document.getElementById("playlist-ul");

const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnNext = document.getElementById("island-btn-next");

// Fetch initial playlist
fetch(API_BASE)
  .then(res => res.json())
  .then(data => {
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(currentIndex);
    }
  })
  .catch(err => console.error("Failed to load playlist:", err));

function loadTrack(index) {
  if (playlist.length === 0) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  audio.src = song.url;
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;

  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  extractDominantColor(song.pic);
  fetchLyrics(song.lrc);
  renderPlaylist();
}

function playTrack() {
  audio.play().then(() => {
    playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    islandPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    dynamicIsland.classList.remove("hidden");
  }).catch(e => console.log("Playback prevented:", e));
}

function pauseTrack() {
  audio.pause();
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  islandPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

islandBtnPlay.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnPrev.addEventListener("click", prevTrack);
islandBtnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  prevTrack();
});

btnNext.addEventListener("click", nextTrack);
islandBtnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  nextTrack();
});

function prevTrack() {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
}

function nextTrack() {
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

// Play Mode
btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  if (playMode === 0) {
    modeIcon.innerHTML = '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>';
    btnMode.title = "Loop Mode";
  } else if (playMode === 1) {
    modeIcon.innerHTML = '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><text x="10" y="15" font-size="8" fill="currentColor">1</text>';
    btnMode.title = "Repeat One";
  } else {
    modeIcon.innerHTML = '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>';
    btnMode.title = "Shuffle";
  }
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
  } else {
    nextTrack();
  }
});

// Progress Bar
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

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
  if (percent !== undefined) audio.currentTime = percent * audio.duration;
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingProgress) updateProgressFromEvent(e);
});

window.addEventListener("mouseup", (e) => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    const percent = updateProgressFromEvent(e);
    if (percent !== undefined) audio.currentTime = percent * audio.duration;
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
    if (currentLine) {
      lyricText.innerText = currentLine.text;
      islandLyricText.innerText = currentLine.text;
    }
  }
});

// Lyrics Parser
function fetchLyrics(lrcUrl) {
  if (!lrcUrl) {
    lyrics = [];
    lyricText.innerText = "No lyrics available";
    islandLyricText.innerText = "No lyrics";
    return;
  }
  fetch(lrcUrl)
    .then(res => res.text())
    .then(text => parseLRC(text))
    .catch(() => {
      lyrics = [];
      lyricText.innerText = "Lyrics load failed";
    });
}

function parseLRC(lrc) {
  const lines = lrc.split("\n");
  const result = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
  lines.forEach(line => {
    const match = regex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      if (text) result.push({ time, text });
    }
  });
  lyrics = result;
}

// Volume & Opacity
volumeSlider.addEventListener("input", (e) => {
  audio.volume = e.target.value;
});
btnMute.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
  } else {
    audio.volume = previousVolume;
    volumeSlider.value = previousVolume;
  }
});

opacitySlider.addEventListener("input", (e) => {
  const val = e.target.value;
  playerCard.style.setProperty("--glass-tint-opacity", val);
});

// Search Drawers
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  }
});

searchBtn.addEventListener("click", executeSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") executeSearch();
});

function executeSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => renderSearchResults(data))
    .catch(err => console.error("Search failed:", err));
}

function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  searchResultsContainer.classList.remove("hidden");
  if (!Array.isArray(results) || results.length === 0) {
    searchResultsUl.innerHTML = `<li style="justify-content:center; color:rgba(255,255,255,0.5);">No results found</li>`;
    return;
  }
  results.forEach(song => {
    const li = document.createElement("li");
    // Point 5: Make sure the '+ Add' button when searching for songs is just a simple '+'
    li.innerHTML = `
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width: 80%;">
        ${song.title} - ${song.author}
      </span>
      <span class="add-btn" style="font-size:0.9rem; font-weight:bold; color:#fff; background:rgba(255,255,255,0.2); width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">+</span>
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
}

// Playlist Drawer
btnPlaylist.addEventListener("click", () => {
  playlistDrawer.classList.remove("collapsed");
});
btnExitPlaylist.addEventListener("click", () => {
  playlistDrawer.classList.add("collapsed");
});

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "playlist-item-wrapper";

    const deleteBg = document.createElement("div");
    deleteBg.className = "playlist-item-delete-bg";
    deleteBg.innerText = "Delete";
    deleteBg.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.splice(index, 1);
      if (playlist.length === 0) {
        audio.pause();
        audio.src = "";
        title.innerText = "No Songs";
        artist.innerText = "";
        cover.src = "";
        backdropImg.src = "";
      } else if (currentIndex >= index) {
        currentIndex = Math.max(0, currentIndex - 1);
        loadTrack(currentIndex);
        playTrack();
      }
      renderPlaylist();
    });

    const item = document.createElement("div");
    item.className = `playlist-item ${index === currentIndex ? "active" : ""}`;
    item.innerHTML = `
      <div class="playlist-item-info">
        <span class="playlist-item-title">${song.title}</span>
        <span class="playlist-item-artist">${song.author}</span>
      </div>
    `;

    // Point 2: iOS swipe-to-delete interaction
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    item.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    item.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX < 0 && currentX > -80) {
        item.style.transform = `translateX(${currentX}px)`;
      }
    });

    item.addEventListener("touchend", () => {
      isDragging = false;
      if (currentX < -40) {
        item.style.transform = `translateX(-80px)`;
      } else {
        item.style.transform = `translateX(0px)`;
      }
      currentX = 0;
    });

    item.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
      playlistDrawer.classList.add("collapsed");
    });

    wrapper.appendChild(deleteBg);
    wrapper.appendChild(item);
    playlistUl.appendChild(wrapper);
  });
}

// Dominant Color Extraction
function extractDominantColor(imageUrl) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const imageData = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < imageData.length; i += 16) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
      count++;
    }
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    playerCard.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  };
}

// Point 1: Dynamic Island Expansion Logic
btnIsland.addEventListener("click", () => {
  dynamicIsland.classList.toggle("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest('.island-buttons') || e.target.closest('#island-btn-play')) return;
  dynamicIsland.classList.toggle("expanded");
});

window.addEventListener("click", (e) => {
  if (dynamicIsland.classList.contains("expanded") && 
      !dynamicIsland.contains(e.target) && 
      e.target !== btnIsland) {
    dynamicIsland.classList.remove("expanded");
  }
});