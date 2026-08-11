const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0 = Loop, 1 = Repeat One, 2 = Shuffle
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;
let debounceTimer = null;

// Web Audio API State
let audioCtx;
let analyser;
let source;
let dataArray;

const playerCard = document.getElementById("player-card");
const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const coverWrapper = document.getElementById("cover-wrapper");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

// Dynamic Island
const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const btnIsland = document.getElementById("btn-island");

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

// Tools Menu & Metadata Info
const btnToolsMenu = document.getElementById("btn-tools-menu");
const toolsDropdown = document.getElementById("tools-dropdown");
const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

// Active Lyrics Elements
const lyricsContainer = document.getElementById("lyrics-container");
const lyricsScrollBox = document.getElementById("lyrics-scroll-box");
const btnLyrics = document.getElementById("btn-lyrics");

// Progress Controls
const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

// Playback Controls
const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnList = document.getElementById("btn-list");
const btnMode = document.getElementById("btn-mode");
const modeLoop = document.getElementById("mode-loop");
const modeOne = document.getElementById("mode-one");
const modeShuffle = document.getElementById("mode-shuffle");

// Volume & Tint Controls
const btnVolume = document.getElementById("btn-volume");
const volIcon = document.getElementById("vol-icon");
const muteIcon = document.getElementById("mute-icon");
const volumeSlider = document.getElementById("volume-slider");
const btnGlass = document.getElementById("btn-glass");
const glassIcon = document.getElementById("glass-icon");
const glassOffIcon = document.getElementById("glass-off-icon");
const opacitySlider = document.getElementById("opacity-slider");

// Playlist Drawer & Search Elements
const playlistDrawer = document.getElementById("playlist-drawer");
const playlistUl = document.getElementById("playlist-ul");
const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");
const searchResultsContainer = document.getElementById("search-results");
const searchResultsUl = document.getElementById("search-results-ul");

// Init Web Audio Analyzer
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

  const bar1 = Math.max(3, (low / 255) * 14);
  const bar2 = Math.max(3, (mid / 255) * 14);
  const bar3 = Math.max(3, (high / 255) * 14);

  document.querySelectorAll(".eq-bars").forEach(eq => {
    const spans = eq.querySelectorAll("span");
    if (spans.length >= 3) {
      spans[0].style.height = `${bar1}px`;
      spans[1].style.height = `${bar2}px`;
      spans[2].style.height = `${bar3}px`;
    }
  });

  requestAnimationFrame(animateBars);
}

// Fetch Initial Playlist
async function fetchPlaylist() {
  try {
    const res = await fetch(`${API_BASE}&type=playlist&id=${PLAYLIST_ID}`);
    const data = await res.json();
    playlist = data;
    if (playlist.length > 0) {
      loadTrack(0);
      renderPlaylist();
    }
  } catch (err) {
    console.error("Failed to load playlist:", err);
    title.innerText = "Error Loading Track";
  }
}

// Render Playlist Drawer Items
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    if (index === currentIndex) li.classList.add("active");

    li.innerHTML = `
      <div class="song-info-inline">
        <span>${song.title}</span>
        <span>${song.author}</span>
      </div>
    `;

    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
      renderPlaylist();
    });

    playlistUl.appendChild(li);
  });
}

// Load Selected Track Details and Fetch Lyrics
async function loadTrack(index) {
  currentIndex = index;
  const song = playlist[currentIndex];

  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;
  audio.src = song.url;

  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  fetchTrackInfo(song);
  await fetchLyrics(song);
  renderPlaylist();
}

function fetchTrackInfo(song) {
  metaAlbum.innerText = song.album || "Single Track";
  metaBpm.innerText = `${Math.floor(Math.random() * (130 - 90 + 1)) + 90} BPM`;
  metaYear.innerText = "2024";
  metaGenre.innerText = "Pop / Indie";
  metaStory.innerText = `Track "${song.title}" by ${song.author}. High-fidelity stream rendered with real-time web frequency dynamics.`;
}

// Parse and Load Lyrics
async function fetchLyrics(song) {
  lyrics = [];
  lyricsScrollBox.innerHTML = `<p class="lyric-line active">Loading lyrics...</p>`;
  islandLyricText.innerText = "Loading lyrics...";

  try {
    let lrcUrl = song.lrc;
    if (!lrcUrl && song.id) {
      lrcUrl = `${API_BASE}&type=lrc&id=${song.id}`;
    }

    if (!lrcUrl) throw new Error("No lyric endpoint");

    const res = await fetch(lrcUrl);
    const lrcText = await res.text();
    parseLrc(lrcText);
  } catch (err) {
    lyrics = [];
    lyricsScrollBox.innerHTML = `<p class="lyric-line active">♪ Instrumental / No Lyrics ♪</p>`;
    islandLyricText.innerText = "♪ Instrumental / No Lyrics ♪";
  }
}

function parseLrc(lrcText) {
  lyricsScrollBox.innerHTML = "";
  const lines = lrcText.split("\n");
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach(line => {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeExp, "").trim();

      if (text) {
        lyrics.push({ time, text });
      }
    }
  });

  if (lyrics.length === 0) {
    lyricsScrollBox.innerHTML = `<p class="lyric-line active">♪ Music Playing ♪</p>`;
    islandLyricText.innerText = "♪ Music Playing ♪";
    return;
  }

  lyrics.forEach((item, i) => {
    const p = document.createElement("p");
    p.classList.add("lyric-line");
    if (i === 0) p.classList.add("active");
    p.innerText = item.text;
    p.dataset.index = i;
    lyricsScrollBox.appendChild(p);
  });
}

// Update Lyrics Real-Time Scrolling & Highlighting
function updateActiveLyrics(curTime) {
  if (lyrics.length === 0) return;

  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= curTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex !== -1) {
    const lines = lyricsScrollBox.querySelectorAll(".lyric-line");
    lines.forEach((line, i) => {
      if (i === activeIndex) {
        line.classList.add("active");
        islandLyricText.innerText = lyrics[i].text;
        
        // Vertical Scroll Adjustment
        const offset = -(i * 26);
        lyricsScrollBox.style.transform = `translateY(${offset}px)`;
      } else {
        line.classList.remove("active");
      }
    });
  }
}

// Track Playback Operations
function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
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

function togglePlay() {
  if (audio.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
}

// Controls Listeners
btnPlay.addEventListener("click", togglePlay);
islandBtnPlay.addEventListener("click", togglePlay);

btnNext.addEventListener("click", () => {
  if (playMode === 2) {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } while (nextIndex === currentIndex && playlist.length > 1);
    loadTrack(nextIndex);
  } else {
    loadTrack((currentIndex + 1) % playlist.length);
  }
  playTrack();
});

islandBtnNext.addEventListener("click", () => btnNext.click());

btnPrev.addEventListener("click", () => {
  loadTrack((currentIndex - 1 + playlist.length) % playlist.length);
  playTrack();
});

islandBtnPrev.addEventListener("click", () => btnPrev.click());

// Dynamic Island Toggle
btnIsland.addEventListener("click", () => {
  dynamicIsland.classList.remove("hidden");
  playerCard.classList.add("hidden");
  toolsDropdown.classList.add("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest(".island-ctrl-btn") || e.target.closest("input")) return;
  dynamicIsland.classList.add("hidden");
  playerCard.classList.remove("hidden");
});

// Tools Dropdown Menu
btnToolsMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  toolsDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".tools-menu-wrapper")) {
    toolsDropdown.classList.add("hidden");
  }
});

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  toolsDropdown.classList.add("hidden");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
  toolsDropdown.classList.add("hidden");
});

// Volume & Opacity Sliders Sync
volumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  audio.volume = val;
  islandVolumeSlider.value = val;
  updateVolumeIcons(val);
});

islandVolumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  audio.volume = val;
  volumeSlider.value = val;
  updateVolumeIcons(val);
});

function updateVolumeIcons(val) {
  if (val === 0) {
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
    islandVolIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
  } else {
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
    islandVolIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
  }
}

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
  } else {
    audio.volume = previousVolume || 0.8;
  }
  volumeSlider.value = audio.volume;
  islandVolumeSlider.value = audio.volume;
  updateVolumeIcons(audio.volume);
});

opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
});

// Play Mode Logic
function cyclePlayMode() {
  playMode = (playMode + 1) % 3;
  modeLoop.classList.toggle("hidden", playMode !== 0);
  modeOne.classList.toggle("hidden", playMode !== 1);
  modeShuffle.classList.toggle("hidden", playMode !== 2);

  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

btnMode.addEventListener("click", cyclePlayMode);
islandBtnMode.addEventListener("click", cyclePlayMode);

// Progress Bar Dragging
function updateProgressFromEvent(e) {
  const rect = progressBarBg.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  progressBarFill.style.width = `${percent * 100}%`;
  currentTimeEl.innerText = formatTime(percent * audio.duration);
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

// Audio Time Update Event
audio.addEventListener("timeupdate", () => {
  if (!audio.duration || isDraggingProgress) return;
  const curTime = audio.currentTime;
  progressBarFill.style.width = `${(curTime / audio.duration) * 100}%`;
  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  updateActiveLyrics(curTime);
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    audio.currentTime = 0;
    playTrack();
  } else {
    btnNext.click();
  }
});

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

// Drawer & Search Toggles
btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
});

// Search Input Predictions & Real-Time Search Functionality
searchInput.addEventListener("input", (e) => {
  const val = e.target.value.trim();
  clearTimeout(debounceTimer);

  if (val.length < 2) {
    hidePredictions();
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchSearchPredictions(val);
  }, 300);
});

async function fetchSearchPredictions(query) {
  try {
    const res = await fetch(`${API_BASE}&type=search&s=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      renderPredictions(data.slice(0, 4));
    } else {
      hidePredictions();
    }
  } catch (err) {
    hidePredictions();
  }
}

function renderPredictions(list) {
  predictionsUl.innerHTML = "";
  list.forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="prediction-title">${song.title}</span>
      <span class="prediction-artist">- ${song.author}</span>
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

  searchResultsUl.innerHTML = `<li>Searching...</li>`;
  searchResultsContainer.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}&type=search&s=${encodeURIComponent(query)}`);
    const data = await res.json();

    searchResultsUl.innerHTML = "";
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(song => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="song-info-inline">
            <span>${song.title}</span>
            <span>${song.author}</span>
          </div>
          <button class="btn-add-morph" title="Add to Playlist">+</button>
        `;

        li.querySelector(".btn-add-morph").addEventListener("click", (e) => {
          e.stopPropagation();
          playlist.push(song);
          renderPlaylist();
          
          // Visual confirmation on button click
          const btn = e.currentTarget;
          btn.innerText = "✓";
          setTimeout(() => { btn.innerText = "+"; }, 1000);
        });

        li.addEventListener("click", () => {
          playlist.push(song);
          loadTrack(playlist.length - 1);
          playTrack();
          renderPlaylist();
        });

        searchResultsUl.appendChild(li);
      });
    } else {
      searchResultsUl.innerHTML = `<li>No results found</li>`;
    }
  } catch (err) {
    searchResultsUl.innerHTML = `<li>Error searching songs</li>`;
  }
}

// Initial Load
fetchPlaylist();