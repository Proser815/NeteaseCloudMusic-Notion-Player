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
  btnMode.click();
  syncPlayModeUI();
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

function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const track = playlist[currentIndex];

  title.innerText = track.title;
  artist.innerText = track.author;

  islandTitle.innerText = track.title;
  if (islandArtist) islandArtist.innerText = track.author;
  islandHoverTitle.innerText = track.title;
  islandHoverArtist.innerText = track.author;

  cover.src = track.pic;
  backdropImg.src = track.pic;
  islandCover.src = track.pic;
  islandHoverCover.src = track.pic;

  audio.src = track.url;
  extractDominantColor(track.pic);

  // Set Metadata info drawer values
  if (metaAlbum) metaAlbum.innerText = track.album || "Single";
  if (metaBpm) metaBpm.innerText = `~${Math.floor(Math.random() * 40) + 100} BPM`;
  if (metaYear) metaYear.innerText = track.year || new Date().getFullYear();
  if (metaGenre) metaGenre.innerText = track.genre || "Pop / Acoustic";
  if (metaStory) metaStory.innerText = track.story || `Enjoying "${track.title}" by ${track.author}. Default track information automatically synchronized.`;

  fetchLyrics(track.lrc);
  renderPlaylist();
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
    coverWrapper.classList.remove("paused");
    animateBars();
  }).catch(e => console.warn("Auto-play prevented:", e));
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  coverWrapper.classList.add("paused");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
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
  handleNextTrack();
});

function handleNextTrack() {
  if (playMode === 1) {
    loadTrack(currentIndex);
  } else if (playMode === 2) {
    let randomIndex = Math.floor(Math.random() * playlist.length);
    loadTrack(randomIndex);
  } else {
    let nextIndex = (currentIndex + 1) % playlist.length;
    loadTrack(nextIndex);
  }
  playTrack();
}

btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  syncPlayModeUI();
});

function syncPlayModeUI() {
  const modeLoop = document.getElementById("mode-loop");
  const modeOne = document.getElementById("mode-one");
  const modeShuffle = document.getElementById("mode-shuffle");

  modeLoop.classList.add("hidden");
  modeOne.classList.add("hidden");
  modeShuffle.classList.add("hidden");

  islandModeLoop.classList.add("hidden");
  islandModeOne.classList.add("hidden");
  islandModeShuffle.classList.add("hidden");

  if (playMode === 0) {
    modeLoop.classList.remove("hidden");
    islandModeLoop.classList.remove("hidden");
  } else if (playMode === 1) {
    modeOne.classList.remove("hidden");
    islandModeOne.classList.remove("hidden");
  } else if (playMode === 2) {
    modeShuffle.classList.remove("hidden");
    islandModeShuffle.classList.remove("hidden");
  }
}

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
});

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

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

btnGlass.addEventListener("click", () => {
  const currentOpacity = parseFloat(getComputedStyle(playerCard).getPropertyValue("--glass-tint-opacity"));
  if (currentOpacity > 0.15) {
    previousOpacity = currentOpacity;
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

opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  playerCard.style.setProperty("--glass-tint-opacity", val);
  if (val <= 0.15) {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
});

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

  if (query.length < 2) {
    searchPredictionsContainer.classList.add("hidden");
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
      const results = await res.json();

      if (results && results.length > 0) {
        predictionsUl.innerHTML = "";
        results.slice(0, 5).forEach(song => {
          const li = document.createElement("li");
          li.innerText = `${song.title} - ${song.author}`;
          li.addEventListener("click", () => {
            searchInput.value = `${song.title} - ${song.author}`;
            searchPredictionsContainer.classList.add("hidden");
            performSearch(query);
          });
          predictionsUl.appendChild(li);
        });
        searchPredictionsContainer.classList.remove("hidden");
      } else {
        searchPredictionsContainer.classList.add("hidden");
      }
    } catch (err) {
      console.warn("Prediction fetch error:", err);
    }
  }, 300);
});

btnSearch.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) performSearch(query);
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (query) performSearch(query);
  }
});

async function performSearch(query) {
  searchPredictionsContainer.classList.add("hidden");
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderSearchResults(results);
  } catch (err) {
    searchResultsUl.innerHTML = `<li style="justify-content:center;">Search failed. Try again.</li>`;
    searchResultsContainer.classList.remove("hidden");
  }
}

function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!results || results.length === 0) {
    searchResultsUl.innerHTML = `<li style="justify-content:center;">No results found.</li>`;
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

function fetchLyrics(lrcUrl) {
  setLyricText("Loading lyrics...");
  if (!lrcUrl) {
    lyrics = [];
    setLyricText("Instrumental / No Lyrics");
    return;
  }

  fetch(lrcUrl)
    .then(res => res.text())
    .then(text => {
      lyrics = parseLRC(text);
      if (lyrics.length === 0) setLyricText("No Lyrics Available");
      else setLyricText(lyrics[0].text);
    })
    .catch(() => {
      lyrics = [];
      setLyricText("Lyrics unavailable");
    });
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

  return parsed.sort((a, b) => a.time - b.time);
}

function setLyricText(str) {
  lyricText.innerText = str;
  if (islandLyricText) islandLyricText.innerText = str;
}

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((track, index) => {
    const li = document.createElement("li");
    if (index === currentIndex) li.classList.add("active");
    li.innerHTML = `
      <span>${index + 1}. ${track.title}</span>
      <span style="opacity:0.6; font-size:0.75rem;">${track.author}</span>
    `;
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });
    playlistUl.appendChild(li);
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  let offsetX = e.clientX - rect.left;
  if (offsetX < 0) offsetX = 0;
  if (offsetX > rect.width) offsetX = rect.width;
  const percent = offsetX / rect.width;
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

audio.addEventListener("ended", () => {
  handleNextTrack();
});

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
    playerCard.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.5)`);
  };
}

window.addEventListener("DOMContentLoaded", initPlayer);