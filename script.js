const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

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

// SVGs for play mode icons
const MODE_ICONS = {
  loop: `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
  repeatOne: `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM12 10v4h1v-4h-1z"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`
};

const MODE_TITLES = ["Loop Playlist", "Repeat One", "Shuffle"];

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

const btnVolume = document.getElementById("btn-volume");
const volLowIcon = document.getElementById("vol-low-icon");
const volHighIcon = document.getElementById("vol-high-icon");
const muteIcon = document.getElementById("mute-icon");
const volumeSlider = document.getElementById("volume-slider");

const btnGlass = document.getElementById("btn-glass");
const glassIcon = document.getElementById("glass-icon");
const glassOffIcon = document.getElementById("glass-off-icon");
const opacitySlider = document.getElementById("opacity-slider");

const playlistDrawer = document.getElementById("playlist-drawer");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchResultsContainer = document.getElementById("search-results");
const searchResultsUl = document.getElementById("search-results-ul");

const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");

// Web Audio API Frequency Equalizer Setup
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
    console.warn("Web Audio API hook note:", e);
  }
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
  audio.volume = 0.8;
  updateVolumeIcons(0.8);
  updatePlayModeUI();
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    title.innerText = "Error Loading Playlist";
  }
}

// Drawer Closures & Navigation
btnCloseInfo.addEventListener("click", () => {
  infoDrawer.classList.add("collapsed");
  btnInfo.classList.remove("active");
});

btnClosePlaylist.addEventListener("click", () => {
  playlistDrawer.classList.add("collapsed");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
  btnInfo.classList.toggle("active");
});

// Dynamic Island Morphing
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("morphed-hidden");
  dynamicIsland.classList.remove("hidden");
});

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
  cyclePlayMode();
});

islandVolumeSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  const val = parseFloat(e.target.value);
  audio.volume = val;
  volumeSlider.value = val;
  updateVolumeIcons(val);
});

islandBtnVolume.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    islandVolumeSlider.value = 0;
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    islandVolumeSlider.value = audio.volume;
  }
  updateVolumeIcons(audio.volume);
});

function updateVolumeIcons(val) {
  if (val === 0) {
    volLowIcon.classList.add("hidden");
    volHighIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
    islandVolLowIcon.classList.add("hidden");
    islandVolHighIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
  } else if (val <= 0.5) {
    volLowIcon.classList.remove("hidden");
    volHighIcon.classList.add("hidden");
    muteIcon.classList.add("hidden");
    islandVolLowIcon.classList.remove("hidden");
    islandVolHighIcon.classList.add("hidden");
    islandMuteIcon.classList.add("hidden");
  } else {
    volLowIcon.classList.add("hidden");
    volHighIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
    islandVolLowIcon.classList.add("hidden");
    islandVolHighIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
  }
}

function updatePlayModeUI() {
  if (btnMode) {
    if (playMode === 0) btnMode.innerHTML = MODE_ICONS.loop;
    else if (playMode === 1) btnMode.innerHTML = MODE_ICONS.repeatOne;
    else if (playMode === 2) btnMode.innerHTML = MODE_ICONS.shuffle;
    btnMode.title = MODE_TITLES[playMode];
  }
  syncPlayModeUI();
}

function syncPlayModeUI() {
  if (islandModeLoop) islandModeLoop.classList.toggle("hidden", playMode !== 0);
  if (islandModeOne) islandModeOne.classList.toggle("hidden", playMode !== 1);
  if (islandModeShuffle) islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

function cyclePlayMode() {
  playMode = (playMode + 1) % 3;
  updatePlayModeUI();
}

// Standby Display Toggle
coverWrapper.addEventListener("click", () => {
  playerCard.classList.toggle("standby-mode");
});

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
});

// Glass Tint Opacity Controller
opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  updateTransparencyIcons(val);
});

btnGlass.addEventListener("click", () => {
  const currentVal = parseFloat(opacitySlider.value);
  if (currentVal >= 0.15) {
    previousOpacity = currentVal;
    opacitySlider.value = 0;
    document.documentElement.style.setProperty("--glass-tint-opacity", 0);
  } else {
    opacitySlider.value = previousOpacity || 0.5;
    document.documentElement.style.setProperty("--glass-tint-opacity", opacitySlider.value);
  }
  updateTransparencyIcons(parseFloat(opacitySlider.value));
});

function updateTransparencyIcons(val) {
  if (val < 0.15) {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
}

// Search Toggle
btnToggleSearch.addEventListener("click", () => {
  const isCollapsed = searchSection.classList.contains("collapsed");
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active", isCollapsed);
  if (isCollapsed) {
    searchInput.focus();
  } else {
    hidePredictions();
  }
});

// Render iOS Styled Playlist Drawer
function renderPlaylist() {
  playlistUl.className = "playlist-items-container";
  playlistUl.innerHTML = "";

  if (playlist.length === 0) {
    playlistUl.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: rgba(255,255,255,0.5); font-size: 0.85rem;">
        Playlist is empty
      </div>`;
    return;
  }

  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = `playlist-item-ios ${i === currentIndex ? "active-track" : ""}`;
    
    const albumName = song.album || "Single";
    const authorName = song.author || "Unknown Artist";
    const coverPic = song.pic || "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg";

    li.innerHTML = `
      <div class="playlist-item-left">
        <img class="playlist-item-cover" src="${coverPic}" alt="Cover">
        <div class="playlist-item-meta">
          <div class="playlist-item-title">${song.title || "Untitled"}</div>
          <div class="playlist-item-sub">${authorName} • ${albumName}</div>
        </div>
      </div>
      <button class="btn-delete-track" title="Remove track">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Click track row to play
    li.addEventListener("click", () => {
      loadTrack(i);
      playTrack();
      playlistDrawer.classList.add("collapsed");
    });

    // Delete track event
    const deleteBtn = li.querySelector(".btn-delete-track");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevents song from playing when clicking delete
      removeTrackFromPlaylist(i);
    });

    playlistUl.appendChild(li);
  });
}

// Remove Song from Playlist Logic
function removeTrackFromPlaylist(index) {
  if (index < 0 || index >= playlist.length) return;

  playlist.splice(index, 1);

  if (playlist.length === 0) {
    audio.pause();
    audio.src = "";
    title.textContent = "No Tracks";
    artist.textContent = "Add songs via search";
    cover.src = "";
    backdropImg.src = "";
    setPlayStateUI(false);
  } else if (index === currentIndex) {
    currentIndex = currentIndex % playlist.length;
    loadTrack(currentIndex);
    playTrack();
  } else if (index < currentIndex) {
    currentIndex--;
  }

  renderPlaylist();
}

function updatePlaylistHighlight() {
  renderPlaylist();
}

function setPlayStateUI(isPlaying) {
  if (isPlaying) {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    islandPlayIcon.classList.add("hidden");
    islandPauseIcon.classList.remove("hidden");
  } else {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    islandPlayIcon.classList.remove("hidden");
    islandPauseIcon.classList.add("hidden");
  }
}

function loadTrack(index) {
  if (!playlist[index]) return;
  currentIndex = index;
  const track = playlist[currentIndex];

  audio.src = track.url;
  cover.src = track.pic;
  backdropImg.src = track.pic;
  title.innerText = track.title;
  artist.innerText = track.author;

  // Sync Collapsed Island
  islandCover.src = track.pic;
  islandTitle.innerText = track.title;
  if (islandArtist) islandArtist.innerText = track.author;

  // Sync Expanded Island
  islandHoverCover.src = track.pic;
  islandHoverTitle.innerText = track.title;
  islandHoverArtist.innerText = track.author;

  const standbyTitle = document.getElementById("standby-title");
  const standbyArtist = document.getElementById("standby-artist");
  if (standbyTitle) standbyTitle.innerText = track.title;
  if (standbyArtist) standbyArtist.innerText = track.author;

  metaAlbum.innerText = track.album || track.title;
  metaBpm.innerText = track.bpm || "~120 BPM";
  metaYear.innerText = track.year || "2026";
  metaGenre.innerText = track.genre || "Pop / Acoustic";
  metaStory.innerText = track.story || `Enjoying "${track.title}" by ${track.author}. Streamed directly with custom dynamic glass styling.`;

  extractDominantColor(track.pic);
  fetchLyrics(track.lrc);
  renderPlaylist();
}

function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  audio.play().then(() => {
    setPlayStateUI(true);
    animateBars();
  }).catch(e => console.log("Playback error:", e));
}

function pauseTrack() {
  audio.pause();
  setPlayStateUI(false);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
});

btnNext.addEventListener("click", () => {
  if (playlist.length === 0) return;
  let next = playMode === 2 ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
  loadTrack(next);
  playTrack();
});

btnPrev.addEventListener("click", () => {
  if (playlist.length === 0) return;
  let prev = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  playTrack();
});

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

if (btnMode) {
  btnMode.addEventListener("click", () => {
    cyclePlayMode();
  });
}

volumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  audio.volume = val;
  islandVolumeSlider.value = val;
  updateVolumeIcons(val);
});

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    islandVolumeSlider.value = 0;
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    islandVolumeSlider.value = audio.volume;
  }
  updateVolumeIcons(audio.volume);
});

async function fetchLyrics(lrcUrl) {
  lyrics = [];
  setLyricText("Loading lyrics...");
  if (!lrcUrl) {
    setLyricText("No Lyrics Available");
    return;
  }
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLrc(text);
  } catch (err) {
    setLyricText("Lyrics unavailable");
  }
}

function parseLrc(lrcText) {
  const lines = lrcText.split("\n");
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyrics = [];

  for (let line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeExp, "").trim();
      if (text) lyrics.push({ time, text });
    }
  }

  if (lyrics.length === 0) {
    setLyricText("Instrumental or No Sync Lyrics");
  } else {
    setLyricText(lyrics[0].text);
  }
}

function setLyricText(text) {
  if (!lyricText) return;

  lyricText.classList.remove("animate-lyric");
  lyricText.style.transform = "translateX(0)";
  lyricText.innerText = text;

  if (islandLyricText) {
    islandLyricText.innerText = text;
  }

  requestAnimationFrame(() => {
    const containerWidth = lyricsContainer.clientWidth;
    const textWidth = lyricText.scrollWidth;

    if (textWidth > containerWidth) {
      const overflowDistance = textWidth - containerWidth + 24;
      const duration = Math.max(3.5, overflowDistance / 45);

      lyricText.style.setProperty("--scroll-distance", `-${overflowDistance}px`);
      lyricText.style.setProperty("--scroll-duration", `${duration}s`);
      
      void lyricText.offsetWidth;
      lyricText.classList.add("animate-lyric");
    }
  });
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
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

  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      setLyricText(currentLine.text);
    }
  }
});

// Handle Auto-Advance when Track Ends according to playMode
audio.addEventListener("ended", () => {
  if (playMode === 1) {
    // Repeat One
    loadTrack(currentIndex);
    playTrack();
  } else if (playMode === 2) {
    // Shuffle
    let randomIndex = Math.floor(Math.random() * playlist.length);
    if (playlist.length > 1 && randomIndex === currentIndex) {
      randomIndex = (currentIndex + 1) % playlist.length;
    }
    loadTrack(randomIndex);
    playTrack();
  } else {
    // Loop (Next Track)
    btnNext.click();
  }
});

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();
  if (query.length < 2) {
    hidePredictions();
    return;
  }
  debounceTimer = setTimeout(() => {
    fetchSearchPredictions(query);
  }, 250);
});

async function fetchSearchPredictions(query) {
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderPredictions(results.slice(0, 5));
  } catch (err) {
    hidePredictions();
  }
}

function renderPredictions(predictions) {
  predictionsUl.innerHTML = "";
  if (!predictions || predictions.length === 0) {
    hidePredictions();
    return;
  }
  predictions.forEach(song => {
    const li = document.createElement("li");
    li.className = "prediction-item-ios";
    li.innerHTML = `
      <span class="prediction-text">${song.title} - ${song.author}</span>
      <span class="prediction-tag">Suggest</span>
    `;
    li.addEventListener("click", () => {
      searchInput.value = `${song.title} - ${song.author}`;
      hidePredictions();
      performSearch();
    });
    predictionsUl.appendChild(li);
  });
  searchPredictionsContainer.classList.remove("hidden");
}

function hidePredictions() {
  searchPredictionsContainer.classList.add("hidden");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-bar-wrapper")) {
    hidePredictions();
  }
});

btnSearch.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    hidePredictions();
    performSearch();
  }
});

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  hidePredictions();
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderSearchResults(results);
  } catch (err) {
    alert("Search failed.");
  }
}

// iOS Styled Search Results
function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!results || results.length === 0) {
    searchResultsContainer.classList.add("hidden");
    return;
  }
  searchResultsContainer.classList.remove("hidden");
  
  results.forEach(song => {
    const li = document.createElement("li");
    li.className = "playlist-item-ios search-item-ios";
    
    const albumName = song.album || "Result";
    const authorName = song.author || "Unknown Artist";
    const coverPic = song.pic || "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg";

    li.innerHTML = `
      <div class="playlist-item-left">
        <img class="playlist-item-cover" src="${coverPic}" alt="Cover">
        <div class="playlist-item-meta">
          <div class="playlist-item-title">${song.title || "Untitled"}</div>
          <div class="playlist-item-sub">${authorName} • ${albumName}</div>
        </div>
      </div>
      <button class="btn-add-track" title="Add track">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;

    // Click row or button to add & play song
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

    document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.5)`);
  };
}

initPlayer();