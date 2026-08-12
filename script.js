let PLAYLIST_ID = "18210633647";
let API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;
let debounceTimer = null;

let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

// DOM Elements
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
const islandArtist = document.getElementById("island-artist");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const btnIsland = document.getElementById("btn-island");

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

const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const btnCloseInfo = document.getElementById("btn-close-info");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

const btnSettings = document.getElementById("btn-settings");
const settingsDrawer = document.getElementById("settings-drawer");
const btnCloseSettings = document.getElementById("btn-close-settings");
const opacitySlider = document.getElementById("opacity-slider");

const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnLyrics = document.getElementById("btn-lyrics");
const btnList = document.getElementById("btn-list");
const btnMode = document.getElementById("btn-mode");
const modeLoop = document.getElementById("mode-loop");
const modeOne = document.getElementById("mode-one");
const modeShuffle = document.getElementById("mode-shuffle");

const btnVolume = document.getElementById("btn-volume");
const volLowIcon = document.getElementById("vol-low-icon");
const volHighIcon = document.getElementById("vol-high-icon");
const muteIcon = document.getElementById("mute-icon");
const volumeSlider = document.getElementById("volume-slider");

const playlistDrawer = document.getElementById("playlist-drawer");
const btnCloseDrawer = document.getElementById("btn-close-drawer");
const playlistUl = document.getElementById("playlist-ul");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const searchSubmitBtn = document.getElementById("search-submit-btn");
const searchResultsContainer = document.getElementById("search-results-container");
const searchResultsUl = document.getElementById("search-results-ul");

// Initialize Audio Context & Analyser for Visual Equalizer
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
    console.warn("Audio context init note:", e);
  }
}

function animateBars() {
  if (!analyser || audio.paused) return;
  analyser.getByteFrequencyData(dataArray);
  const low = dataArray[2] || 0;
  const mid = dataArray[8] || 0;
  const high = dataArray[15] || 0;
  const b1 = Math.max(3, (low / 255) * 12);
  const b2 = Math.max(3, (mid / 255) * 12);
  const b3 = Math.max(3, (high / 255) * 12);

  const eqSpans = document.querySelectorAll("#island-eq span");
  if (eqSpans.length >= 3) {
    eqSpans[0].style.height = `${b1}px`;
    eqSpans[1].style.height = `${b2}px`;
    eqSpans[2].style.height = `${b3}px`;
  }
  animationFrameId = requestAnimationFrame(animateBars);
}

// Fetch Playlist Data via active API endpoint using id=
async function fetchPlaylist(customApiUrl = API_BASE) {
  try {
    const res = await fetch(customApiUrl);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(0);
    }
  } catch (err) {
    console.error("Failed to load playlist:", err);
    title.innerText = "Failed to load playlist";
    artist.innerText = "Check network or ID";
  }
}

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, idx) => {
    const li = document.createElement("li");
    li.className = `track-item-row ${idx === currentIndex ? "active" : ""}`;
    li.innerHTML = `
      <div class="item-left">
        <img class="item-cover" src="${song.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg'}" alt="Cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      currentIndex = idx;
      loadTrack(currentIndex);
      playTrack();
      playlistDrawer.classList.add("collapsed");
    });
    playlistUl.appendChild(li);
  });
}

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

  if (metaAlbum) metaAlbum.innerText = track.album || "Single";
  if (metaYear) metaYear.innerText = track.year || "2026";

  fetchLyrics(track.lyric);
  renderPlaylist();
}

async function fetchLyrics(lyricUrl) {
  lyrics = [];
  if (!lyricUrl) {
    setLyricText("No lyrics available");
    return;
  }
  try {
    const res = await fetch(lyricUrl);
    const text = await res.text();
    parseLRC(text);
  } catch (e) {
    setLyricText("Lyrics unavailable");
  }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, "0"), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, "").trim();
      if (text) lyrics.push({ time, text });
    }
  });
  lyrics.sort((a, b) => a.time - b.time);
}

function setLyricText(txt) {
  lyricText.innerText = txt;
  if (islandLyricText) islandLyricText.innerText = txt;
}

function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audio.play().then(() => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    islandPlayIcon.classList.add("hidden");
    islandPauseIcon.classList.remove("hidden");
    coverWrapper.classList.add("playing");
    animateBars();
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

function handleNextTrack() {
  if (playlist.length === 0) return;
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

function handlePrevTrack() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
}

// Event Listeners
btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

islandBtnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnNext.addEventListener("click", handleNextTrack);
islandBtnNext.addEventListener("click", handleNextTrack);

btnPrev.addEventListener("click", handlePrevTrack);
islandBtnPrev.addEventListener("click", handlePrevTrack);

// Toggle Vinyl / Normal album cover mode
coverWrapper.addEventListener("click", () => {
  coverWrapper.classList.toggle("vinyl-mode");
});

// Play Mode Toggle (Loop -> Repeat One -> Shuffle)
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

// Volume and Mute Toggle Fixes
function updateVolume(val) {
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

volumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  if (val > 0) previousVolume = val;
  updateVolume(val);
});

islandVolumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  if (val > 0) previousVolume = val;
  updateVolume(val);
});

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    updateVolume(0);
  } else {
    updateVolume(previousVolume || 0.8);
  }
});

islandBtnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    updateVolume(0);
  } else {
    updateVolume(previousVolume || 0.8);
  }
});

// Progress Bar dragging & updates
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
      setLyricText(currentLine.text);
    }
  }
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
  } else {
    handleNextTrack();
  }
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Drawers toggling
btnList.addEventListener("click", () => playlistDrawer.classList.toggle("collapsed"));
btnCloseDrawer.addEventListener("click", () => playlistDrawer.classList.add("collapsed"));

btnInfo.addEventListener("click", () => infoDrawer.classList.toggle("collapsed"));
btnCloseInfo.addEventListener("click", () => infoDrawer.classList.add("collapsed"));

btnSettings.addEventListener("click", () => settingsDrawer.classList.toggle("collapsed"));
btnCloseSettings.addEventListener("click", () => settingsDrawer.classList.add("collapsed"));

opacitySlider.addEventListener("input", (e) => {
  const val = e.target.value;
  playerCard.style.setProperty("--glass-tint-opacity", val);
});

// Dynamic Island Toggle
btnIsland.addEventListener("click", () => {
  dynamicIsland.classList.remove("hidden");
  playerCard.style.display = "none";
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest(".island-action-buttons") || e.target.closest(".island-volume-group")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.style.display = "flex";
});

// Search & Predictive Autocomplete using active id= parameter / meting API
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  }
});

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(debounceTimer);

  if (!query) {
    searchResultsContainer.classList.add("hidden");
    return;
  }

  debounceTimer = setTimeout(async () => {
    // Check if query is a playlist ID
    if (/^\d+$/.test(query)) {
      searchResultsContainer.classList.remove("hidden");
      searchResultsUl.innerHTML = `
        <li style="justify-content:center; opacity:0.8; cursor:default;">
          <span>Load Playlist ID: ${query}</span>
        </li>
      `;
      searchResultsUl.querySelector("li").addEventListener("click", () => {
        PLAYLIST_ID = query;
        API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;
        fetchPlaylist();
        searchSection.classList.add("collapsed");
        btnToggleSearch.classList.remove("active");
        searchResultsContainer.classList.add("hidden");
      });
      return;
    }

    // Predictive search query against Meting API search endpoint
    try {
      const searchUrl = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl);
      const results = await res.json();
      renderSearchResults(results);
    } catch (err) {
      console.warn("Search prediction error:", err);
    }
  }, 300);
});

function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!Array.isArray(results) || results.length === 0) {
    searchResultsContainer.classList.add("hidden");
    return;
  }

  searchResultsContainer.classList.remove("hidden");
  results.slice(0, 8).forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-left">
        <img class="item-cover" src="${song.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg'}" alt="Cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
      <span style="font-size:0.7rem; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:6px;">+ Add</span>
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

searchSubmitBtn.addEventListener("click", () => {
  const val = searchInput.value.trim();
  if (/^\d+$/.test(val)) {
    PLAYLIST_ID = val;
    API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;
    fetchPlaylist();
    searchSection.classList.add("collapsed");
    btnToggleSearch.classList.remove("active");
    searchResultsContainer.classList.add("hidden");
  }
});

// Initialize on load
fetchPlaylist();
updateVolume(0.8);