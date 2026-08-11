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

// Track Metadata Elements
const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const metaAlbum = document.getElementById("meta-album");
const metaBpm = document.getElementById("meta-bpm");
const metaYear = document.getElementById("meta-year");
const metaGenre = document.getElementById("meta-genre");
const metaStory = document.getElementById("meta-story");

const lyricsContainer = document.getElementById("lyrics-container");
const lyricText = document.getElementById("lyric-text");
const marqueeWrapper = document.querySelector(".marquee-wrapper");
const islandMarqueeWrapper = document.querySelector(".island-marquee-wrapper");

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

// Search Predictions Elements
const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");

// Web Audio API Context Init
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

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
  btnInfo.classList.toggle("active");
});

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
  if (val > 0) {
    previousVolume = val;
    islandVolIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
  } else {
    islandVolIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
    volIcon.classList.add("hidden");
    muteIcon.classList.add("hidden");
  }
});

islandBtnVolume.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    islandVolumeSlider.value = 0;
    islandVolIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    islandVolumeSlider.value = audio.volume;
    islandVolIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
    volIcon.classList.remove("hidden");
    muteIcon.classList.remove("hidden");
  }
});

function syncPlayModeUI() {
  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

coverWrapper.addEventListener("click", () => {
  playerCard.classList.toggle("standby-mode");
});

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
  btnLyrics.classList.toggle("active");
});

// Transparency Slider Adjustments
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

// Search Toggle - Automatically Expands Menu & Displays Pop-Up Interface Immediately
btnToggleSearch.addEventListener("click", () => {
  searchSection.classList.toggle("collapsed");
  btnToggleSearch.classList.toggle("active");
  
  if (!searchSection.classList.contains("collapsed")) {
    searchInput.focus();
    showPredictions(searchInput.value);
  } else {
    hidePredictions();
  }
});

searchInput.addEventListener("focus", () => {
  showPredictions(searchInput.value);
});

searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    showPredictions(e.target.value);
  }, 150);
});

function showPredictions(query) {
  const q = query.trim().toLowerCase();
  let matches = [];

  if (!q) {
    matches = playlist.slice(0, 6);
  } else {
    matches = playlist.filter(
      song => song.title.toLowerCase().includes(q) || song.author.toLowerCase().includes(q)
    );
  }

  if (matches.length === 0) {
    hidePredictions();
    return;
  }

  predictionsUl.innerHTML = "";
  matches.forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>
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
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 55%;">
        ${song.title} <small style="opacity:0.75;">- ${song.author}</small>
      </span>
      <div class="search-action-group">
        <button class="btn-play-next" title="Play Next in Sequence">+ Next</button>
        <button class="btn-add-morph" title="Add to End of Queue">+</button>
      </div>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".search-action-group")) return;
      
      const idx = playlist.findIndex(s => s.url === song.url);
      if (idx !== -1) {
        loadTrack(idx);
      } else {
        playlist.unshift(song);
        renderPlaylist();
        loadTrack(0);
      }
      playTrack();
    });

    const btnPlayNext = li.querySelector(".btn-play-next");
    btnPlayNext.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.splice(currentIndex + 1, 0, song);
      renderPlaylist();

      btnPlayNext.classList.add("added");
      btnPlayNext.innerText = "✓ Next";
      setTimeout(() => {
        btnPlayNext.classList.remove("added");
        btnPlayNext.innerText = "+ Next";
      }, 1200);
    });

    const btnAddMorph = li.querySelector(".btn-add-morph");
    btnAddMorph.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.push(song);
      renderPlaylist();

      btnAddMorph.classList.add("added");
      btnAddMorph.innerText = "✓";
      setTimeout(() => {
        btnAddMorph.classList.remove("added");
        btnAddMorph.innerText = "+";
      }, 1200);
    });

    searchResultsUl.appendChild(li);
  });
}

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    const isActive = index === currentIndex;
    if (isActive) li.classList.add("active");

    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden; max-width:80%;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${index + 1}. ${song.title} <small style="opacity:0.75;">- ${song.author}</small>
        </span>
        ${isActive ? `
          <div class="eq-bars" style="height:10px;">
            <span></span><span></span><span></span>
          </div>` : ''}
      </div>
      <button class="btn-add-morph btn-remove-item" title="Remove Track" style="font-size:0.75rem; width:22px; height:22px; min-width:22px; min-height:22px;">✕</button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove-item")) return;
      loadTrack(index);
      playTrack();
    });

    const btnRemove = li.querySelector(".btn-remove-item");
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.splice(index, 1);
      if (playlist.length === 0) {
        audio.pause();
        title.innerText = "No Songs in Queue";
        artist.innerText = "";
        cover.src = "";
        backdropImg.src = "";
      } else {
        if (index === currentIndex) {
          currentIndex = currentIndex % playlist.length;
          loadTrack(currentIndex);
          playTrack();
        } else if (index < currentIndex) {
          currentIndex--;
        }
      }
      renderPlaylist();
    });

    playlistUl.appendChild(li);
  });
}

async function loadTrack(index) {
  currentIndex = index;
  const song = playlist[currentIndex];

  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic;

  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  fetchTrackStory(song);
  updateMediaSession(song);

  audio.src = song.url;
  renderPlaylist();

  lyrics = [];
  setLyricText("Loading lyrics...");
  if (song.lrc) {
    try {
      const res = await fetch(song.lrc);
      const lrcText = await res.text();
      lyrics = parseLRC(lrcText);
      if (lyrics.length === 0) setLyricText("No synced lyrics available.");
    } catch (e) {
      setLyricText("Lyrics unavailable.");
    }
  } else {
    setLyricText("Instrumental / No Lyrics");
  }
}

function fetchTrackStory(song) {
  metaAlbum.innerText = song.album || "Notion Studio Collection";
  metaBpm.innerText = `${Math.floor(Math.random() * (135 - 90 + 1)) + 90} BPM`;
  metaYear.innerText = song.year || "2024";
  metaGenre.innerText = song.genre || "Pop / Acoustic";

  metaStory.innerText = `"${song.title}" by ${song.author} is loaded directly from streaming servers. This track features high-fidelity CDN audio syncing directly with the player equalizer.`;
}

function updateMediaSession(song) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.author,
      album: 'Notion Player',
      artwork: [
        { src: song.pic, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => playTrack());
    navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => btnPrev.click());
    navigator.mediaSession.setActionHandler('nexttrack', () => btnNext.click());
  }
}

volumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  audio.volume = val;
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
});

btnVolume.addEventListener("click", () => {
  if (audio.volume > 0) {
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    islandVolumeSlider.value = 0;
    volIcon.classList.add("hidden");
    muteIcon.classList.remove("hidden");
    islandVolIcon.classList.add("hidden");
    islandMuteIcon.classList.remove("hidden");
  } else {
    audio.volume = previousVolume || 0.8;
    volumeSlider.value = audio.volume;
    islandVolumeSlider.value = audio.volume;
    volIcon.classList.remove("hidden");
    muteIcon.classList.add("hidden");
    islandVolIcon.classList.remove("hidden");
    islandMuteIcon.classList.add("hidden");
  }
});

function parseLRC(lrc) {
  const lines = lrc.split("\n");
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach((line) => {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeExp, "").trim();
      if (text) result.push({ time, text });
    }
  });
  return result;
}

function setLyricText(text) {
  lyricText.innerText = text;
  islandLyricText.innerText = text;

  if (text.length > 25) {
    marqueeWrapper.classList.add("marquee-active");
    islandMarqueeWrapper.classList.add("marquee-active");
  } else {
    marqueeWrapper.classList.remove("marquee-active");
    islandMarqueeWrapper.classList.remove("marquee-active");
  }
}

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
  btnList.classList.toggle("active");
});

btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  document.getElementById("mode-loop").classList.toggle("hidden", playMode !== 0);
  document.getElementById("mode-one").classList.toggle("hidden", playMode !== 1);
  document.getElementById("mode-shuffle").classList.toggle("hidden", playMode !== 2);
  syncPlayModeUI();
});

function playTrack() {
  initAudioContext();
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audio.play();
  playIcon.classList.add("hidden");
  pauseIcon.classList.remove("hidden");
  islandPlayIcon.classList.add("hidden");
  islandPauseIcon.classList.remove("hidden");
  cancelAnimationFrame(animationFrameId);
  animateBars();
  renderPlaylist();
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  cancelAnimationFrame(animationFrameId);
  const bars = document.querySelectorAll(".eq-bars span");
  bars.forEach(bar => (bar.style.height = "3px"));
  renderPlaylist();
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnNext.addEventListener("click", () => {
  if (playlist.length === 0) return;
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
});

btnPrev.addEventListener("click", () => {
  if (playlist.length === 0) return;
  if (playMode === 2) {
    currentIndex = Math.floor(Math.random() * playlist.length);
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }
  loadTrack(currentIndex);
  playTrack();
});

function formatTime(secs) {
  if (isNaN(secs)) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
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
    audio.currentTime = 0;
    playTrack();
  } else {
    btnNext.click();
  }
});

initPlayer();