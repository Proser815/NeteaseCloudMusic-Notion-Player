const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0;
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;

const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const backdropImg = document.getElementById("backdrop-img");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");
const marqueeWrapper = document.querySelector(".marquee-wrapper");

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

// Init Player
async function initPlayer() {
  audio.volume = 0.8;
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    title.innerText = "Error Loading Playlist";
  }
}

// Foldable Lyrics Toggle
btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
});

// Glass Opacity Slider Event (Smooth continuous hover/slide)
opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  if (val > 0) {
    previousOpacity = val;
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  } else {
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  }
});

// Click Glass Icon to Mute/Unmute Tint
btnGlass.addEventListener("click", () => {
  const currentVal = parseFloat(opacitySlider.value);
  if (currentVal > 0) {
    previousOpacity = currentVal;
    opacitySlider.value = 0;
    document.documentElement.style.setProperty("--glass-tint-opacity", 0);
    glassIcon.classList.add("hidden");
    glassOffIcon.classList.remove("hidden");
  } else {
    opacitySlider.value = previousOpacity || 0.5;
    document.documentElement.style.setProperty("--glass-tint-opacity", opacitySlider.value);
    glassIcon.classList.remove("hidden");
    glassOffIcon.classList.add("hidden");
  }
});

// Foldable Search Bar Toggle
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
  }
});

// Render Main Playlist
function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    if (index === currentIndex) li.classList.add("active");

    li.innerHTML = `
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80%;">
        ${index + 1}. ${song.title} <small style="opacity:0.75;">- ${song.author}</small>
      </span>
      <button class="btn-delete-song" title="Delete Song">
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
      li.classList.add("removing");
      
      setTimeout(() => {
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
      }, 300);
    });

    playlistUl.appendChild(li);
  });
}

// Live Search
btnSearch.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderSearchResults(results);
  } catch (err) {
    alert("Search failed.");
  }
}

// Render Search Results with Instant Row Preview
function renderSearchResults(results) {
  searchResultsUl.innerHTML = "";
  if (!results || results.length === 0) {
    searchResultsContainer.classList.add("hidden");
    return;
  }

  searchResultsContainer.classList.remove("hidden");
  results.forEach(song => {
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    li.innerHTML = `
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80%;">
        ${song.title} <small style="opacity:0.75;">- ${song.author}</small>
      </span>
      <button class="btn-add-morph" title="Add Song">+</button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-add-morph")) return;
      loadPreviewTrack(song);
      playTrack();
    });

    const btnAdd = li.querySelector(".btn-add-morph");
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btnAdd.classList.contains("added")) return;

      btnAdd.classList.add("added");
      btnAdd.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      playlist.push(song);
      renderPlaylist();
    });

    searchResultsUl.appendChild(li);
  });
}

// Preview track directly
function loadPreviewTrack(song) {
  currentIndex = -1;
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;
  audio.src = song.url;
  
  setLyricText("");

  Array.from(playlistUl.children).forEach(li => li.classList.remove("active"));

  extractDominantColor(song.pic);
  fetchLyrics(song.lrc);
}

async function loadTrack(index) {
  currentIndex = index;
  const song = playlist[index];
  
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;
  audio.src = song.url;
  
  setLyricText("");

  Array.from(playlistUl.children).forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  extractDominantColor(song.pic);
  fetchLyrics(song.lrc);
}

// Volume Controls
volumeSlider.addEventListener("input", (e) => {
  audio.volume = parseFloat(e.target.value);
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
  } else {
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
  }
});

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
  }
});

function extractDominantColor(imageUrl) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 50; canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);

    const imageData = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < imageData.length; i += 16) {
      r += imageData[i]; g += imageData[i + 1]; b += imageData[i + 2];
      count++;
    }

    r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
    document.documentElement.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.75)`);
  };
}

function setLyricText(text) {
  lyricText.innerText = text;
  marqueeWrapper.classList.remove("marquee-active");
  if (lyricText.offsetWidth > 200) marqueeWrapper.classList.add("marquee-active");
}

async function fetchLyrics(lrcUrl) {
  lyrics = [];
  if (!lrcUrl) return;
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLRC(text);
  } catch (e) { lyrics = []; }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyrics = [];

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      lyrics.push({ time: minutes * 60 + seconds, text: line.replace(timeRegex, "").trim() });
    }
  });
}

function playTrack() {
  audio.play();
  playIcon.classList.add("hidden");
  pauseIcon.classList.remove("hidden");
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
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

btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  document.getElementById("mode-loop").classList.toggle("hidden", playMode !== 0);
  document.getElementById("mode-one").classList.toggle("hidden", playMode !== 1);
  document.getElementById("mode-shuffle").classList.toggle("hidden", playMode !== 2);
});

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

// Timeline Dragging
function updateProgressFromEvent(e) {
  if (!audio.duration) return;
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
  if (percent !== undefined) audio.currentTime = percent * audio.duration;
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingProgress) {
    updateProgressFromEvent(e);
  }
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
  if (playMode === 1) { audio.currentTime = 0; playTrack(); }
  else { btnNext.click(); }
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

initPlayer();