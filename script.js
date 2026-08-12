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

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");
const btnLyrics = document.getElementById("btn-lyrics");

const islandPlay = document.getElementById("island-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPrev = document.getElementById("island-prev");
const islandNext = document.getElementById("island-next");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");

const volumeSlider = document.getElementById("volume-slider");
const islandVolumeSlider = document.getElementById("island-volume-slider");
const btnVolume = document.getElementById("btn-volume");
const volHighIcon = document.getElementById("vol-high-icon");
const volLowIcon = document.getElementById("vol-low-icon");
const muteIcon = document.getElementById("mute-icon");

const opacitySlider = document.getElementById("opacity-slider");
const btnGlass = document.getElementById("btn-glass");
const glassIcon = document.getElementById("glass-icon");
const glassOffIcon = document.getElementById("glass-off-icon");

const lyricText = document.getElementById("lyric-text");
const lyricsContainer = document.getElementById("lyrics-container");

const btnList = document.getElementById("btn-list");
const playlistDrawer = document.getElementById("playlist-drawer");
const btnClosePlaylist = document.getElementById("btn-close-playlist");
const playlistUl = document.getElementById("playlist-ul");

const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const btnCloseInfo = document.getElementById("btn-close-info");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

const btnIsland = document.getElementById("btn-island");

const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchPredictions = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");
const searchResultsContainer = document.getElementById("search-results");
const searchResultsUl = document.getElementById("search-results-ul");

const eqBarsList = document.querySelectorAll(".eq-bars");

// Web Audio API Visualizer Setup
function initAudioContext() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    updateEQAnimation();
  } catch (e) {
    console.warn("Web Audio API setup failed or blocked:", e);
  }
}

function updateEQAnimation() {
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const scale = Math.max(0.2, avg / 128);

    eqBarsList.forEach((eqGroup) => {
      const bars = eqGroup.querySelectorAll("span");
      bars.forEach((bar, index) => {
        const val = dataArray[index * 2] || avg;
        const h = Math.min(100, Math.max(15, (val / 255) * 100));
        bar.style.height = `${h}%`;
      });
    });
  }
  animationFrameId = requestAnimationFrame(updateEQAnimation);
}

// Fetch Playlist API with Fallback
async function initPlayer() {
  if (audio) {
    audio.volume = 0.8;
    updateVolumeIcons(0.8);
  }

  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Network response failed");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      playlist = data;
    } else {
      throw new Error("Invalid playlist array");
    }
  } catch (err) {
    console.warn("API failed to load, falling back to sample song:", err);
    playlist = [
      {
        title: "Probably Up",
        author: "Lawrence",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        pic: "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg",
        lrc: "[00:00.00] Sample Track Loaded Successfully!"
      }
    ];
  }

  renderPlaylist();
  if (playlist.length > 0) {
    loadTrack(0);
  }
}

// Load Track Data
function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[index];

  audio.src = song.url;
  title.textContent = song.title || "Unknown Title";
  artist.textContent = song.author || "Unknown Artist";

  const coverUrl = song.pic || "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg";
  cover.src = coverUrl;
  backdropImg.src = coverUrl;

  islandCover.src = coverUrl;
  islandTitle.textContent = song.title;
  islandArtist.textContent = song.author;
  islandHoverCover.src = coverUrl;
  islandHoverTitle.textContent = song.title;
  islandHoverArtist.textContent = song.author;

  document.getElementById("standby-title").textContent = song.title;
  document.getElementById("standby-artist").textContent = song.author;

  extractDominantColor(coverUrl);
  parseLyrics(song.lrc || "");
  updatePlaylistHighlight();
  updateMetadataView(song);

  currentTimeEl.textContent = "0:00";
  durationTimeEl.textContent = "0:00";
  progressBarFill.style.width = "0%";
}

function parseLyrics(lrcStr) {
  lyrics = [];
  if (!lrcStr) {
    lyricText.textContent = "Instrumental / No Lyrics";
    if (islandLyricText) islandLyricText.textContent = "No Lyrics Available";
    return;
  }
  const lines = lrcStr.split("\n");
  const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach((line) => {
    const match = timeReg.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeReg, "").trim();
      if (text) lyrics.push({ time, text });
    }
  });

  lyrics.sort((a, b) => a.time - b.time);
  if (lyrics.length === 0) {
    lyricText.textContent = "Lyrics Unavailable";
    if (islandLyricText) islandLyricText.textContent = "Lyrics Unavailable";
  }
}

function updateLyrics(time) {
  if (lyrics.length === 0) return;
  let currentLine = lyrics[0].text;
  for (let i = 0; i < lyrics.length; i++) {
    if (time >= lyrics[i].time) {
      currentLine = lyrics[i].text;
    } else {
      break;
    }
  }
  if (lyricText.textContent !== currentLine) {
    lyricText.textContent = currentLine;
    if (islandLyricText) islandLyricText.textContent = currentLine;
  }
}

// Play / Pause Logic
function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audio.play().then(() => {
    setPlayStateUI(true);
  }).catch((e) => {
    console.warn("Autoplay blocked or playback error:", e);
    setPlayStateUI(false);
  });
}

function pauseTrack() {
  audio.pause();
  setPlayStateUI(false);
}

function setPlayStateUI(isPlaying) {
  if (isPlaying) {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    islandPlayIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    eqBarsList.forEach((eq) => eq.classList.add("playing"));
  } else {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    islandPlayIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    eqBarsList.forEach((eq) => eq.classList.remove("playing"));
  }
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

islandPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

// Next / Prev Controls
function nextTrack() {
  if (playMode === 2) {
    let rand = Math.floor(Math.random() * playlist.length);
    loadTrack(rand);
  } else {
    let next = (currentIndex + 1) % playlist.length;
    loadTrack(next);
  }
  playTrack();
}

function prevTrack() {
  let prev = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  playTrack();
}

btnNext.addEventListener("click", nextTrack);
islandNext.addEventListener("click", nextTrack);
btnPrev.addEventListener("click", prevTrack);
islandPrev.addEventListener("click", prevTrack);

// Play Modes: 0 - Loop, 1 - Repeat One, 2 - Shuffle
btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  if (playMode === 0) {
    btnMode.title = "Loop Playlist";
    btnMode.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`;
  } else if (playMode === 1) {
    btnMode.title = "Repeat Track";
    btnMode.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-3V9h-1l-2 1v1h1.5v4H13z"/></svg>`;
  } else {
    btnMode.title = "Shuffle";
    btnMode.innerHTML = `<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`;
  }
});

// Audio Events
audio.addEventListener("timeupdate", () => {
  if (!isDraggingProgress && audio.duration) {
    const cur = audio.currentTime;
    const dur = audio.duration;
    progressBarFill.style.width = `${(cur / dur) * 100}%`;
    currentTimeEl.textContent = formatTime(cur);
    durationTimeEl.textContent = formatTime(dur);
    updateLyrics(cur);
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

// Progress Bar Scrubbing
progressBarBg.addEventListener("click", (e) => {
  const rect = progressBarBg.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  if (audio.duration) {
    audio.currentTime = pos * audio.duration;
  }
});

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Volume Slider
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
    volHighIcon.classList.add("hidden");
    volLowIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
  } else if (val < 0.5) {
    volHighIcon.classList.add("hidden");
    volLowIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
  } else {
    volHighIcon.classList.remove("hidden");
    volLowIcon.classList.add("hidden");
    muteIcon.classList.add("hidden");
  }
}

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    islandVolumeSlider.value = 0;
    updateVolumeIcons(0);
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    islandVolumeSlider.value = audio.volume;
    updateVolumeIcons(audio.volume);
  }
});

// Glass Opacity Slider
opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  playerCard.style.backgroundColor = `rgba(20, 20, 20, ${val})`;
});

btnGlass.addEventListener("click", () => {
  if (opacitySlider.value > 0) {
    previousOpacity = opacitySlider.value;
    opacitySlider.value = 0;
    playerCard.style.backgroundColor = `rgba(20, 20, 20, 0)`;
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    opacitySlider.value = previousOpacity || 0.5;
    playerCard.style.backgroundColor = `rgba(20, 20, 20, ${opacitySlider.value})`;
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
});

// Toggle Drawers & Modes
btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("hidden");
  btnLyrics.classList.toggle("active");
});

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

// Dynamic Island Switch
btnIsland.addEventListener("click", () => {
  playerCard.classList.add("hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (!e.target.closest(".island-controls-group") && !e.target.closest(".island-volume-group")) {
    dynamicIsland.classList.add("hidden");
    playerCard.classList.remove("hidden");
  }
});

// Render Playlist Drawer Items
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; border-radius:8px; margin-bottom:4px;";
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
        <img src="${song.pic || ''}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;">
        <div style="overflow:hidden;">
          <div style="font-size:0.85rem; font-weight:500; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.title}</div>
          <div style="font-size:0.7rem; opacity:0.6; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.author}</div>
        </div>
      </div>
    `;
    li.addEventListener("click", () => {
      loadTrack(i);
      playTrack();
      playlistDrawer.classList.add("collapsed");
    });
    playlistUl.appendChild(li);
  });
  updatePlaylistHighlight();
}

function updatePlaylistHighlight() {
  const items = playlistUl.querySelectorAll("li");
  items.forEach((item, idx) => {
    if (idx === currentIndex) {
      item.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
    } else {
      item.style.backgroundColor = "transparent";
    }
  });
}

function updateMetadataView(song) {
  metaAlbum.textContent = song.album || "Single / Standalone";
  metaBpm.textContent = "~120 BPM";
  metaYear.textContent = "2026";
  metaGenre.textContent = "Pop / Electronic";
  metaStory.textContent = `Now playing "${song.title}" performed by ${song.author}. Enjoy the high-definition audio playback inside your glassmorphism player setup!`;
}

// Search Feature
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  }
});

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();
  if (query.length === 0) {
    searchPredictions.classList.add("hidden");
    return;
  }
  debounceTimer = setTimeout(() => {
    fetchSearchSuggestions(query);
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

async function fetchSearchSuggestions(query) {
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    predictionsUl.innerHTML = "";

    if (Array.isArray(data) && data.length > 0) {
      data.slice(0, 5).forEach((item) => {
        const li = document.createElement("li");
        li.style.cssText = "padding:8px 12px; cursor:pointer; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.05);";
        li.textContent = `${item.title} - ${item.author}`;
        li.addEventListener("click", () => {
          searchInput.value = `${item.title} ${item.author}`;
          searchPredictions.classList.add("hidden");
          performSearch(searchInput.value);
        });
        predictionsUl.appendChild(li);
      });
      searchPredictions.classList.remove("hidden");
    }
  } catch (e) {
    console.warn("Search suggestion failed:", e);
  }
}

async function performSearch(query) {
  searchPredictions.classList.add("hidden");
  searchResultsUl.innerHTML = "<li style='padding:12px; font-size:0.8rem; opacity:0.7;'>Searching...</li>";
  searchResultsContainer.classList.remove("hidden");

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const data = await res.json();
    searchResultsUl.innerHTML = "";

    if (Array.isArray(data) && data.length > 0) {
      data.slice(0, 10).forEach((song) => {
        const li = document.createElement("li");
        li.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px 12px; cursor:pointer; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.05);";
        li.innerHTML = `
          <div>
            <div style="font-weight:500;">${song.title}</div>
            <div style="font-size:0.7rem; opacity:0.6;">${song.author}</div>
          </div>
          <button style="background:none; border:none; fill:#fff; cursor:pointer; opacity:0.8;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
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
    } else {
      searchResultsUl.innerHTML = "<li style='padding:12px; font-size:0.8rem; opacity:0.7;'>No results found.</li>";
    }
  } catch (e) {
    searchResultsUl.innerHTML = "<li style='padding:12px; font-size:0.8rem; opacity:0.7;'>Search failed. Check network connection.</li>";
  }
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

// Initialize player on page load
document.addEventListener("DOMContentLoaded", () => {
  initPlayer();
});