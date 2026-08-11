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

// Settings Foldable Menu Elements
const btnSettingsToggle = document.getElementById("btn-settings-toggle");
const settingsMenu = document.getElementById("settings-menu");
const opacitySlider = document.getElementById("opacity-slider");

// Metadata Drawer
const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

// Lyrics Elements
const btnLyrics = document.getElementById("btn-lyrics");
const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");

// Dynamic Island Toggle
const btnIsland = document.getElementById("btn-island");

// Player Controls
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

// Playlist & Search Drawers
const playlistDrawer = document.getElementById("playlist-drawer");
const playlistUl = document.getElementById("playlist-ul");

const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");

// Settings Foldable Toggle
btnSettingsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsMenu.classList.toggle("collapsed");
  btnSettingsToggle.classList.toggle("active");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#settings-menu") && !e.target.closest("#btn-settings-toggle")) {
    settingsMenu.classList.add("collapsed");
    btnSettingsToggle.classList.remove("active");
  }
});

// Single Foldable Place Controls Handler
opacitySlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
});

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
  btnInfo.classList.toggle("active");
});

btnIsland.addEventListener("click", () => {
  playerCard.classList.add("morphed-hidden");
  dynamicIsland.classList.remove("hidden");
  settingsMenu.classList.add("collapsed");
});

// Volume Handler
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

// Realtime Spectrum
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

  const bar1Height = Math.max(3, (low / 255) * 12);
  const bar2Height = Math.max(3, (mid / 255) * 12);
  const bar3Height = Math.max(3, (high / 255) * 12);

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

// Fetch Lyrics
async function fetchTrackLyricsAndInfo(songId) {
  lyrics = [];
  setLyricText("Instrumental or loading lyrics...");
  metaStory.innerText = "Loading track notes...";

  if (!songId) {
    metaAlbum.innerText = "Single";
    metaBpm.innerText = "120 BPM";
    metaYear.innerText = "2024";
    metaGenre.innerText = "Pop";
    metaStory.innerText = "Enjoy this track from your Notion library.";
    return;
  }

  try {
    const lrcRes = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=lrc&id=${songId}`);
    const lrcData = await lrcRes.json();
    if (lrcData && lrcData.lyric) {
      parseLRC(lrcData.lyric);
    }
  } catch (e) {
    setLyricText("Enjoy the music ~");
  }

  metaAlbum.innerText = playlist[currentIndex]?.album || "Studio Version";
  metaBpm.innerText = `${Math.floor(110 + Math.random() * 30)} BPM`;
  metaYear.innerText = "2023";
  metaGenre.innerText = "Indie / Pop";
  metaStory.innerText = `Track #${currentIndex + 1} from your playlist queue.`;
}

function parseLRC(lrcString) {
  lyrics = [];
  const lines = lrcString.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeRegex, "").trim();
      if (text) lyrics.push({ time, text });
    }
  });

  lyrics.sort((a, b) => a.time - b.time);
}

function setLyricText(str) {
  lyricText.innerText = str;
  islandLyricText.innerText = str;
}

// Player Core
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
  if (e.target.closest('.island-ctrl-btn') || e.target.closest('#island-volume-slider')) return;
  playerCard.classList.remove("morphed-hidden");
  dynamicIsland.classList.add("hidden");
});

islandBtnPlay.addEventListener("click", (e) => { e.stopPropagation(); btnPlay.click(); });
islandBtnPrev.addEventListener("click", (e) => { e.stopPropagation(); btnPrev.click(); });
islandBtnNext.addEventListener("click", (e) => { e.stopPropagation(); btnNext.click(); });
islandBtnMode.addEventListener("click", (e) => { e.stopPropagation(); btnMode.click(); syncPlayModeUI(); });

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

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
  btnList.classList.toggle("active");
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

// Live Search via API
async function performSearch(query) {
  if (!query.trim()) {
    searchPredictionsContainer.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&keyword=${encodeURIComponent(query)}`);
    const results = await res.json();
    
    predictionsUl.innerHTML = "";
    if (results && results.length > 0) {
      results.slice(0, 8).forEach((song) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">
            <strong>${song.title}</strong> - <small style="opacity:0.8;">${song.artist || song.author}</small>
          </div>
          <button class="btn-add-morph spring-btn" title="Add to Queue">+</button>
        `;

        li.addEventListener("click", () => {
          playlist.push(song);
          renderPlaylist();
          loadTrack(playlist.length - 1);
          playTrack();
          searchPredictionsContainer.classList.add("hidden");
          searchInput.value = "";
        });

        predictionsUl.appendChild(li);
      });
      searchPredictionsContainer.classList.remove("hidden");
    } else {
      predictionsUl.innerHTML = "<li style='opacity:0.75;'>No matches found</li>";
      searchPredictionsContainer.classList.remove("hidden");
    }
  } catch (err) {
    predictionsUl.innerHTML = "<li style='opacity:0.75;'>Search unavailable</li>";
    searchPredictionsContainer.classList.remove("hidden");
  }
}

searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});

btnSearch.addEventListener("click", () => {
  performSearch(searchInput.value);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-bar-wrapper")) {
    searchPredictionsContainer.classList.add("hidden");
  }
});

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
  fetchTrackLyricsAndInfo(track.id || track.song_id);
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

  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      setLyricText(currentLine.text);
    }
  }
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

initPlayer();