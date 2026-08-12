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

// Fetch Playlist
async function fetchPlaylist() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(currentIndex);
    }
  } catch (e) {
    console.error("Failed to load playlist:", e);
    // Fallback default track if API fails
    playlist = [{
      title: "Probably Up",
      author: "Lawrence",
      url: "",
      pic: "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg",
      lrc: ""
    }];
    renderPlaylist();
    loadTrack(0);
  }
}

function loadTrack(index) {
  if (playlist.length === 0) return;
  currentIndex = (index + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  audio.src = track.url || "";
  title.innerText = track.title || "Unknown Title";
  artist.innerText = track.author || "Unknown Artist";
  islandTitle.innerText = track.title || "Unknown Title";
  if (islandArtist) islandArtist.innerText = track.author || "Unknown Artist";
  islandHoverTitle.innerText = track.title || "Unknown Title";
  islandHoverArtist.innerText = track.author || "Unknown Artist";

  const coverUrl = track.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg';
  cover.src = coverUrl;
  backdropImg.src = coverUrl;
  islandCover.src = coverUrl;
  islandHoverCover.src = coverUrl;

  metaAlbum.innerText = track.album || "Single";
  metaYear.innerText = track.year || "2026";

  if (track.lrc) {
    fetchLyrics(track.lrc);
  } else {
    lyrics = [];
    setLyricText("Lyrics unavailable");
  }

  updatePlaylistActiveState();
}

function setLyricText(txt) {
  lyricText.innerText = txt;
  if (islandLyricText) islandLyricText.innerText = txt;
}

async function fetchLyrics(lrcUrl) {
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLRC(text);
  } catch (e) {
    lyrics = [];
    setLyricText("Lyrics unavailable");
  }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + ms / (match[3].length === 2 ? 100 : 1000);
      const text = line.replace(timeRegex, "").trim();
      if (text) parsed.push({ time, text });
    }
  });
  parsed.sort((a, b) => a.time - b.time);
  lyrics = parsed;
  if (lyrics.length === 0) setLyricText("Instrumental");
}

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, idx) => {
    const li = document.createElement("li");
    li.className = `track-item-row ${idx === currentIndex ? "active" : ""}`;
    li.innerHTML = `
      <div class="item-left">
        <img src="${song.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg'}" class="item-cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      loadTrack(idx);
      playTrack();
    });
    playlistUl.appendChild(li);
  });
}

function updatePlaylistActiveState() {
  const rows = playlistUl.querySelectorAll(".track-item-row");
  rows.forEach((row, idx) => {
    if (idx === currentIndex) row.classList.add("active");
    else row.classList.remove("active");
  });
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
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animateBars();
  }).catch(err => {
    console.warn("Playback prevented:", err);
  });
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  coverWrapper.classList.remove("playing");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function togglePlay() {
  if (audio.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
}

btnPlay.addEventListener("click", togglePlay);
if (islandBtnPlay) islandBtnPlay.addEventListener("click", togglePlay);

function handleNextTrack() {
  if (playMode === 2) {
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * playlist.length);
    } while (nextIdx === currentIndex && playlist.length > 1);
    loadTrack(nextIdx);
  } else {
    loadTrack(currentIndex + 1);
  }
  playTrack();
}

function handlePrevTrack() {
  loadTrack(currentIndex - 1);
  playTrack();
}

btnNext.addEventListener("click", handleNextTrack);
btnPrev.addEventListener("click", handlePrevTrack);
if (islandBtnNext) islandBtnNext.addEventListener("click", handleNextTrack);
if (islandBtnPrev) islandBtnPrev.addEventListener("click", handlePrevTrack);

// Play Mode Switcher (0: Loop, 1: Repeat One, 2: Shuffle)
function togglePlayMode() {
  playMode = (playMode + 1) % 3;
  const loopSvg = document.getElementById("mode-loop");
  const oneSvg = document.getElementById("mode-one");
  const shuffleSvg = document.getElementById("mode-shuffle");
  const iLoop = document.getElementById("island-mode-loop");
  const iOne = document.getElementById("island-mode-one");
  const iShuffle = document.getElementById("island-mode-shuffle");

  [loopSvg, oneSvg, shuffleSvg, iLoop, iOne, iShuffle].forEach(el => {
    if (el) el.classList.add("hidden");
  });

  if (playMode === 0) {
    if (loopSvg) loopSvg.classList.remove("hidden");
    if (iLoop) iLoop.classList.remove("hidden");
  } else if (playMode === 1) {
    if (oneSvg) oneSvg.classList.remove("hidden");
    if (iOne) iOne.classList.remove("hidden");
  } else {
    if (shuffleSvg) shuffleSvg.classList.remove("hidden");
    if (iShuffle) iShuffle.classList.remove("hidden");
  }
}

btnMode.addEventListener("click", togglePlayMode);
if (islandBtnMode) islandBtnMode.addEventListener("click", togglePlayMode);

// Volume controls
function setVolume(val) {
  audio.volume = val;
  volumeSlider.value = val;
  if (islandVolumeSlider) islandVolumeSlider.value = val;

  volLowIcon.classList.add("hidden");
  volHighIcon.classList.add("hidden");
  muteIcon.classList.add("hidden");
  if (islandVolLowIcon) islandVolLowIcon.classList.add("hidden");
  if (islandVolHighIcon) islandVolHighIcon.classList.add("hidden");
  if (islandMuteIcon) islandMuteIcon.classList.add("hidden");

  if (val === 0) {
    muteIcon.classList.remove("hidden");
    if (islandMuteIcon) islandMuteIcon.classList.remove("hidden");
  } else if (val < 0.5) {
    volLowIcon.classList.remove("hidden");
    if (islandVolLowIcon) islandVolLowIcon.classList.remove("hidden");
  } else {
    volHighIcon.classList.remove("hidden");
    if (islandVolHighIcon) islandVolHighIcon.classList.remove("hidden");
  }
}

volumeSlider.addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));
if (islandVolumeSlider) {
  islandVolumeSlider.addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));
}

function toggleMute() {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    setVolume(0);
  } else {
    setVolume(previousVolume || 0.8);
  }
}

btnVolume.addEventListener("click", toggleMute);
if (islandBtnVolume) islandBtnVolume.addEventListener("click", toggleMute);

// Progress Bar
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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
    const currentLine = lyrics.filter(l => l.time <= curTime).pop();
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

// Glass Opacity Slider
opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  previousOpacity = val;
  playerCard.style.setProperty("--glass-tint-opacity", val);
  if (val <= 0.1) {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
});

btnGlass.addEventListener("click", () => {
  const currentVal = parseFloat(opacitySlider.value);
  if (currentVal > 0.1) {
    previousOpacity = currentVal;
    playerCard.style.setProperty("--glass-tint-opacity", "0.1");
    opacitySlider.value = 0.1;
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    playerCard.style.setProperty("--glass-tint-opacity", previousOpacity || "0.5");
    opacitySlider.value = previousOpacity || 0.5;
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
});

// Search & Predictions
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  } else {
    searchResultsContainer.classList.add("hidden");
    searchPredictionsContainer.classList.add("hidden");
  }
});

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(debounceTimer);
  if (!query) {
    searchPredictionsContainer.classList.add("hidden");
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&name=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        predictionsUl.innerHTML = "";
        data.slice(0, 5).forEach(song => {
          const li = document.createElement("li");
          li.innerText = `${song.title} - ${song.author}`;
          li.addEventListener("click", () => {
            playlist.push(song);
            renderPlaylist();
            loadTrack(playlist.length - 1);
            playTrack();
            searchSection.classList.add("collapsed");
            searchPredictionsContainer.classList.add("hidden");
            searchResultsContainer.classList.add("hidden");
          });
          predictionsUl.appendChild(li);
        });
        searchPredictionsContainer.classList.remove("hidden");
      }
    } catch (err) {
      console.warn("Prediction error:", err);
    }
  }, 300);
});

btnSearch.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&name=${encodeURIComponent(query)}`);
    const data = await res.json();
    searchResultsUl.innerHTML = "";
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(song => {
        const li = document.createElement("li");
        li.className = "track-item-row";
        li.innerHTML = `
          <div class="item-left">
            <img src="${song.pic || 'https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg'}" class="item-cover">
            <div class="item-meta">
              <span class="item-title">${song.title}</span>
              <span class="item-artist">${song.author}</span>
            </div>
          </div>
          <span class="add-btn" style="font-size:0.75rem; color:#fff; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:6px;">+ Add</span>
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
      searchPredictionsContainer.classList.add("hidden");
    }
  } catch (err) {
    console.error("Search error:", err);
  }
});

// Drawers & Dynamic Island Toggles
btnList.addEventListener("click", () => playlistDrawer.classList.remove("collapsed"));
btnClosePlaylist.addEventListener("click", () => playlistDrawer.classList.add("collapsed"));

btnInfo.addEventListener("click", () => infoDrawer.classList.remove("collapsed"));
btnCloseInfo.addEventListener("click", () => infoDrawer.classList.add("collapsed"));

btnIsland.addEventListener("click", () => {
  playerCard.style.display = "none";
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest(".island-action-buttons") || e.target.closest(".island-volume-container")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.style.display = "flex";
});

// Initialize on load
fetchPlaylist();