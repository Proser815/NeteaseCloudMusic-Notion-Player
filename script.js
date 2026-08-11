const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0;
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;
let debounceTimer = null;

// Web Audio API Real-Time Analyzer State
let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const coverWrapper = document.getElementById("cover-wrapper");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

// Tools Dropdown Controls
const btnToolsMenu = document.getElementById("btn-tools-menu");
const toolsDropdown = document.getElementById("tools-dropdown");
const btnDropdownSearch = document.getElementById("btn-dropdown-search");
const toolsOpacitySlider = document.getElementById("tools-opacity-slider");
const btnLyrics = document.getElementById("btn-lyrics");
const btnInfo = document.getElementById("btn-info");
const btnIsland = document.getElementById("btn-island");

// Dynamic Island Elements
const dynamicIsland = document.getElementById("dynamic-island");
const islandCollapsedContent = document.getElementById("island-collapsed-content");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");

// Dynamic Island Controls
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
const islandVolIcon = document.getElementById("island-vol-icon");
const islandMuteIcon = document.getElementById("island-mute-icon");
const islandVolumeSlider = document.getElementById("island-volume-slider");

// Metadata Drawer
const infoDrawer = document.getElementById("info-drawer");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

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
const btnList = document.getElementById("btn-list");
const btnMode = document.getElementById("btn-mode");

const btnVolume = document.getElementById("btn-volume");
const volIcon = document.getElementById("vol-icon");
const muteIcon = document.getElementById("mute-icon");
const volumeSlider = document.getElementById("volume-slider");

const btnGlass = document.getElementById("btn-glass");
const glassIcon = document.getElementById("glass-icon");
const glassOffIcon = document.getElementById("glass-off-icon");
const opacitySlider = document.getElementById("opacity-slider");

const playlistDrawer = document.getElementById("playlist-drawer");
const playlistUl = document.getElementById("playlist-ul");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchResultsContainer = document.getElementById("search-results");
const searchResultsUl = document.getElementById("search-results-ul");

const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");

// Lightbulb Quick Action Dropdown Menu Toggle
btnToolsMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  toolsDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".tools-wrapper")) {
    toolsDropdown.classList.add("hidden");
  }
});

// Sync both opacity sliders (Quick tools slider & Main controls bar slider)
function updateTransparency(val) {
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  opacitySlider.value = val;
  toolsOpacitySlider.value = val;

  if (val > 0) {
    previousOpacity = val;
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  } else {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  }
}

toolsOpacitySlider.addEventListener("input", (e) => {
  updateTransparency(parseFloat(e.target.value));
});

opacitySlider.addEventListener("input", (e) => {
  updateTransparency(parseFloat(e.target.value));
});

btnGlass.addEventListener("click", () => {
  const currentVal = parseFloat(opacitySlider.value);
  if (currentVal > 0) {
    previousOpacity = currentVal;
    updateTransparency(0);
  } else {
    updateTransparency(previousOpacity || 0.5);
  }
});

// Open Search Interface Function
function openSearchInterface() {
  playlistDrawer.classList.remove("collapsed");
  searchSection.classList.remove("collapsed");
  btnToggleSearch.classList.add("active");
  btnList.classList.add("active");
  setTimeout(() => {
    searchInput.focus();
  }, 100);
}

btnDropdownSearch.addEventListener("click", () => {
  toolsDropdown.classList.add("hidden");
  openSearchInterface();
});

btnToggleSearch.addEventListener("click", () => {
  if (searchSection.classList.contains("collapsed")) {
    openSearchInterface();
  } else {
    searchSection.classList.add("collapsed");
    btnToggleSearch.classList.remove("active");
    hidePredictions();
  }
});

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
  btnList.classList.toggle("active");
});

// Tools Menu Action Controls
btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
  toolsDropdown.classList.add("hidden");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
  btnInfo.classList.toggle("active");
  toolsDropdown.classList.add("hidden");
});

btnIsland.addEventListener("click", () => {
  playerCard.classList.add("morphed-hidden");
  dynamicIsland.classList.remove("hidden");
  toolsDropdown.classList.add("hidden");
});

// Fixed Volume and Mute Icon Toggling Logic
function setVolumeState(val) {
  audio.volume = val;
  volumeSlider.value = val;
  islandVolumeSlider.value = val;

  if (val > 0) {
    previousVolume = val;
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
    islandVolIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
  } else {
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
    islandVolIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
  }
}

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    setVolumeState(0);
  } else {
    setVolumeState(previousVolume || 0.8);
  }
});

volumeSlider.addEventListener("input", (e) => {
  setVolumeState(parseFloat(e.target.value));
});

islandBtnVolume.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    setVolumeState(0);
  } else {
    setVolumeState(previousVolume || 0.8);
  }
});

islandVolumeSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  setVolumeState(parseFloat(e.target.value));
});

// Audio Real-time Analyzer Context
function initAudioContext() {
  if (audioCtx) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;

  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function animateBars() {
  if (!analyser || audio.paused) return;

  analyser.getByteFrequencyData(dataArray);

  const low = dataArray[2] || 0;
  const mid = dataArray[8] || 0;
  const high = dataArray[15] || 0;

  const bar1Height = Math.max(3, (low / 255) * 14);
  const bar2Height = Math.max(3, (mid / 255) * 14);
  const bar3Height = Math.max(3, (high / 255) * 14);

  const allBars = document.querySelectorAll(".eq-bars span");
  allBars.forEach((_, idx) => {
    const mod = idx % 3;
    let h = 3;
    if (mod === 0) h = bar1Height;
    if (mod === 1) h = bar2Height;
    if (mod === 2) h = bar3Height;
    allBars[idx].style.height = `${h}px`;
  });

  animationFrameId = requestAnimationFrame(animateBars);
}

async function initPlayer() {
  setVolumeState(0.8);
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    title.innerText = "Error Loading Playlist";
  }
}

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest('.island-ctrl-btn') || e.target.closest('#island-volume-slider')) {
    return;
  }
  playerCard.classList.remove("morphed-hidden");
  dynamicIsland.classList.add("hidden");
});

islandBtnPlay.addEventListener("click", (e) => {
  e.stopPropagation();
  btnPlay.click();
});

islandBtnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  btnPrev.click();
});

islandBtnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  btnNext.click();
});

islandBtnMode.addEventListener("click", (e) => {
  e.stopPropagation();
  btnMode.click();
  syncPlayModeUI();
});

function syncPlayModeUI() {
  const modeLoop = document.getElementById("mode-loop");
  const modeOne = document.getElementById("mode-one");
  const modeShuffle = document.getElementById("mode-shuffle");

  if (modeLoop) modeLoop.classList.toggle("hidden", playMode !== 0);
  if (modeOne) modeOne.classList.toggle("hidden", playMode !== 1);
  if (modeShuffle) modeShuffle.classList.toggle("hidden", playMode !== 2);

  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  syncPlayModeUI();
});

coverWrapper.addEventListener("click", () => {
  playerCard.classList.toggle("standby-mode");
});

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    const isActive = index === currentIndex;
    if (isActive) li.classList.add("active");
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden; max-width:80%;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${index + 1}. ${song.title} <small style="opacity:0.75;">- ${song.artist || song.author || ''}</small>
        </span>
        ${isActive ? `
          <div class="eq-bars" style="height:10px;">
            <span></span><span></span><span></span>
          </div>
        ` : ''}
      </div>
      <button class="btn-delete-song spring-btn" title="Delete Song">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    `;
    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-song")) return;
      loadTrack(index);
      playTrack();
    });
    const btnDelete = li.querySelector(".btn-delete-song");
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.splice(index, 1);
      if (playlist.length === 0) {
        title.innerText = "No Songs";
        artist.innerText = "";
        audio.pause();
      } else if (index === currentIndex) {
        loadTrack(currentIndex % playlist.length);
        playTrack();
      } else if (index < currentIndex) {
        currentIndex--;
      }
      renderPlaylist();
    });
    playlistUl.appendChild(li);
  });
}

function loadTrack(index) {
  currentIndex = index;
  const track = playlist[index];
  if (!track) return;

  title.innerText = track.title || "Unknown Title";
  artist.innerText = track.artist || track.author || "Unknown Artist";
  cover.src = track.pic || track.cover || "";
  backdropImg.src = track.pic || track.cover || "";
  islandCover.src = track.pic || track.cover || "";
  islandHoverCover.src = track.pic || track.cover || "";
  islandTitle.innerText = track.title || "";
  islandHoverTitle.innerText = track.title || "";
  islandHoverArtist.innerText = track.artist || track.author || "";

  audio.src = track.url;
  renderPlaylist();
}

function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  audio.play();
  playIcon.classList.add("hidden");
  pauseIcon.classList.remove("hidden");
  islandPlayIcon.classList.add("hidden");
  islandPauseIcon.classList.remove("hidden");
  animateBars();
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnPrev.addEventListener("click", () => {
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlist.length - 1;
  loadTrack(prevIndex);
  playTrack();
});

btnNext.addEventListener("click", () => {
  let nextIndex = currentIndex + 1;
  if (nextIndex >= playlist.length) nextIndex = 0;
  loadTrack(nextIndex);
  playTrack();
});

// Progress Bar Updates & Dragging
function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateProgressFromEvent(e) {
  if (!audio.duration) return;
  const rect = progressBarBg.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  clickX = Math.max(0, Math.min(clickX, rect.width));
  const percent = clickX / rect.width;
  progressBarFill.style.width = `${percent * 100}%`;
  currentTimeEl.innerText = formatTime(percent * audio.duration);
  return percent;
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
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    playTrack();
  } else if (playMode === 2) {
    const randomIndex = Math.floor(Math.random() * playlist.length);
    loadTrack(randomIndex);
    playTrack();
  } else {
    btnNext.click();
  }
});

function hidePredictions() {
  searchPredictionsContainer.classList.add("hidden");
}

searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim().length > 0) {
    searchPredictionsContainer.classList.remove("hidden");
  }
});

initPlayer();