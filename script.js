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
const volLowIcon = document.getElementById("vol-low-icon");
const volHighIcon = document.getElementById("vol-high-icon");
const muteIcon = document.getElementById("mute-icon");
const volumeSlider = document.getElementById("volume-slider");

const btnGlass = document.getElementById("btn-glass");
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
    console.warn("Web Audio API not supported or blocked", e);
  }
}

// Fetch Initial Playlist
async function fetchPlaylist() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
      renderPlaylist();
      loadTrack(0);
    }
  } catch (err) {
    console.error("Failed to fetch playlist", err);
  }
}

// Render Playlist with white iOS Delete Button
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "track-item-row" + (index === currentIndex ? " active" : "");
    li.innerHTML = `
      <div class="item-left">
        <img src="${song.pic}" alt="Cover" class="item-cover">
        <div class="item-meta">
          <span class="item-title">${song.title}</span>
          <span class="item-artist">${song.author}</span>
        </div>
      </div>
      <button class="delete-btn-ios" title="Remove track">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Click to play song
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });

    // Handle delete button click without triggering song playback
    const deleteBtn = li.querySelector(".delete-btn-ios");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTrack(index);
    });

    playlistUl.appendChild(li);
  });
}

function deleteTrack(index) {
  playlist.splice(index, 1);
  if (playlist.length === 0) {
    audio.pause();
    audio.src = "";
    title.innerText = "No Tracks";
    artist.innerText = "";
    islandTitle.innerText = "No Tracks";
    islandArtist.innerText = "";
    islandHoverTitle.innerText = "No Tracks";
    islandHoverArtist.innerText = "";
  } else if (currentIndex === index) {
    if (currentIndex >= playlist.length) currentIndex = 0;
    loadTrack(currentIndex);
    playTrack();
  } else if (currentIndex > index) {
    currentIndex--;
  }
  renderPlaylist();
}

// Load Track Details
function loadTrack(index) {
  if (!playlist[index]) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  audio.src = song.url;
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;

  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  islandArtist.innerText = song.author;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  metaAlbum.innerText = song.album || "Single";
  metaBpm.innerText = song.bpm ? `~${song.bpm} BPM` : "~120 BPM";
  metaYear.innerText = song.year || "2026";
  metaGenre.innerText = song.genre || "Pop / Acoustic";
  metaStory.innerText = song.story || `A track by ${song.author} from the album "${song.album || 'Single'}".`;

  parseAndLoadLrc(song.lrc);
  extractDominantColor(song.pic);
  renderPlaylist();
}

// LRC Lyrics Parser
function parseAndLoadLrc(lrcUrl) {
  lyrics = [];
  setLyricText("Loading lyrics...");
  if (!lrcUrl) {
    setLyricText("No lyrics available");
    return;
  }

  fetch(lrcUrl)
    .then(res => res.text())
    .then(text => {
      const lines = text.split("\n");
      const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
      lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
          const min = parseInt(match[1]);
          const sec = parseInt(match[2]);
          const time = min * 60 + sec;
          const lyric = line.replace(timeRegex, "").trim();
          if (lyric) lyrics.push({ time, text: lyric });
        }
      });
      if (lyrics.length === 0) setLyricText("No lyrics available");
      else setLyricText(lyrics[0].text);
    })
    .catch(() => setLyricText("No lyrics available"));
}

function setLyricText(txt) {
  lyricText.innerText = txt;
  islandLyricText.innerText = txt;
}

// Audio Playback Controls
function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audio.play().then(() => {
    updatePlayPauseIcons(true);
  }).catch(err => console.warn("Playback error", err));
}

function pauseTrack() {
  audio.pause();
  updatePlayPauseIcons(false);
}

function updatePlayPauseIcons(isPlaying) {
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

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

islandBtnPlay.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnPrev.addEventListener("click", handlePrevTrack);
islandBtnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  handlePrevTrack();
});

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

btnNext.addEventListener("click", handleNextTrack);
islandBtnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  handleNextTrack();
});

function handleNextTrack() {
  if (playlist.length === 0) return;
  if (playMode === 1) {
    // Repeat one track
  } else if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
}

// Play Modes
function togglePlayMode() {
  playMode = (playMode + 1) % 3;
  const loopEls = [document.getElementById("mode-loop"), islandModeLoop];
  const oneEls = [document.getElementById("mode-one"), islandModeOne];
  const shuffleEls = [document.getElementById("mode-shuffle"), islandModeShuffle];

  loopEls.forEach(el => el && el.classList.add("hidden"));
  oneEls.forEach(el => el && el.classList.add("hidden"));
  shuffleEls.forEach(el => el && el.classList.add("hidden"));

  if (playMode === 0) {
    loopEls.forEach(el => el && el.classList.remove("hidden"));
  } else if (playMode === 1) {
    oneEls.forEach(el => el && el.classList.remove("hidden"));
  } else if (playMode === 2) {
    shuffleEls.forEach(el => el && el.classList.remove("hidden"));
  }
}

btnMode.addEventListener("click", togglePlayMode);
islandBtnMode.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlayMode();
});

// Dynamic Island Switch
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest("button") || e.target.closest("input")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.classList.remove("hidden");
});

// Drawers Toggle
btnList.addEventListener("click", () => {
  playlistDrawer.classList.remove("collapsed");
});

btnClosePlaylist.addEventListener("click", () => {
  playlistDrawer.classList.add("collapsed");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.remove("collapsed");
});

btnCloseInfo.addEventListener("click", () => {
  infoDrawer.classList.add("collapsed");
});

// Volume Controls
function setVolume(val) {
  audio.volume = val;
  volumeSlider.value = val;
  islandVolumeSlider.value = val;

  const lowIcons = [volLowIcon, islandVolLowIcon];
  const highIcons = [volHighIcon, islandVolHighIcon];
  const muteIcons = [muteIcon, islandMuteIcon];

  lowIcons.forEach(el => el && el.classList.add("hidden"));
  highIcons.forEach(el => el && el.classList.add("hidden"));
  muteIcons.forEach(el => el && el.classList.add("hidden"));

  if (val == 0) {
    muteIcons.forEach(el => el && el.classList.remove("hidden"));
  } else if (val > 0.5) {
    highIcons.forEach(el => el && el.classList.remove("hidden"));
  } else {
    lowIcons.forEach(el => el && el.classList.remove("hidden"));
  }
}

volumeSlider.addEventListener("input", (e) => setVolume(e.target.value));
islandVolumeSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  setVolume(e.target.value);
});

function toggleMute() {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    setVolume(0);
  } else {
    setVolume(previousVolume || 0.8);
  }
}

btnVolume.addEventListener("click", toggleMute);
islandBtnVolume.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMute();
});

// Glass Opacity Control
opacitySlider.addEventListener("input", (e) => {
  const opacity = e.target.value;
  document.documentElement.style.setProperty("--glass-tint-opacity", opacity);
});

btnGlass.addEventListener("click", () => {
  if (opacitySlider.value > 0) {
    previousOpacity = opacitySlider.value;
    opacitySlider.value = 0;
  } else {
    opacitySlider.value = previousOpacity || 0.5;
  }
  document.documentElement.style.setProperty("--glass-tint-opacity", opacitySlider.value);
});

// Search Section Toggle
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
});

// Search API
async function performSearch(query) {
  if (!query.trim()) return;
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSearchResults(data);
  } catch (err) {
    console.error("Search failed", err);
  }
}

btnSearch.addEventListener("click", () => performSearch(searchInput.value));
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch(searchInput.value);
});

function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!Array.isArray(results) || results.length === 0) {
    searchResultsUl.innerHTML = "<li style='padding:8px; opacity:0.7;'>No songs found</li>";
    searchResultsContainer.classList.remove("hidden");
    return;
  }

  results.forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 80%;">
        ${song.title} - ${song.author}
      </span>
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
  };
}

// Progress Bar Seeking
function formatTime(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  clickX = Math.max(0, Math.min(clickX, rect.width));
  const percent = clickX / rect.width;
  progressBarFill.style.width = `${percent * 100}%`;
  if (audio.duration) currentTimeEl.innerText = formatTime(percent * audio.duration);
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

audio.addEventListener("ended", () => {
  handleNextTrack();
});

// Initialization
fetchPlaylist();