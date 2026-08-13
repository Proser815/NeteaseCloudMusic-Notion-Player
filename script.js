const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0: Loop, 1: Repeat One, 2: Shuffle
let islandDebounce = null;

let audioCtx;
let analyser;
let source;
let dataArray;
let animationFrameId;

const TRASH_BIN_SVG = `<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

// DOM Elements
const audio = document.getElementById("audio-player");
const dynamicIsland = document.getElementById("dynamic-island");

const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandArtist = document.getElementById("island-artist");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const islandMarqueeContainer = document.getElementById("island-marquee-container");

const islandBtnMode = document.getElementById("island-btn-mode");
const islandModeLoop = document.getElementById("island-mode-loop");
const islandModeOne = document.getElementById("island-mode-one");
const islandModeShuffle = document.getElementById("island-mode-shuffle");
const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnNext = document.getElementById("island-btn-next");

// Island Drawer Elements
const islandBtnSearch = document.getElementById("island-btn-search");
const islandSearchDrawer = document.getElementById("island-search-drawer");
const islandCloseSearch = document.getElementById("island-close-search");
const islandSearchInput = document.getElementById("island-search-input");
const islandSearchResultsUl = document.getElementById("island-search-results-ul");
const islandSearchResults = document.getElementById("island-search-results");

const islandBtnPlaylist = document.getElementById("island-btn-playlist");
const islandPlaylistDrawer = document.getElementById("island-playlist-drawer");
const islandClosePlaylist = document.getElementById("island-close-playlist");
const islandPlaylistUl = document.getElementById("island-playlist-ul");

// Top-Right Popover Elements
const islandBtnVol = document.getElementById("island-btn-vol");
const islandVolPopover = document.getElementById("island-vol-popover");
const islandSettingsVol = document.getElementById("island-settings-vol");
const islandVolVal = document.getElementById("island-vol-val");
const islandVolIconSvg = document.getElementById("island-vol-icon-svg");
const volCrossStrike = document.getElementById("vol-cross-strike");

const islandBtnOpacity = document.getElementById("island-btn-opacity");
const islandOpacityPopover = document.getElementById("island-opacity-popover");
const islandSettingsOpacity = document.getElementById("island-settings-opacity");
const islandOpacityVal = document.getElementById("island-opacity-val");

const islandBtnLyricsToggle = document.getElementById("island-btn-lyrics");
const islandCurrentTimeEl = document.getElementById("island-current-time");
const islandDurationTimeEl = document.getElementById("island-duration-time");
const islandProgressBarBg = document.getElementById("island-progress-bar-bg");
const islandProgressBarFill = document.getElementById("island-progress-bar-fill");

function isAnyDrawerOrPopoverOpen() {
  return !islandSearchDrawer.classList.contains("collapsed") ||
         !islandPlaylistDrawer.classList.contains("collapsed") ||
         !islandVolPopover.classList.contains("collapsed") ||
         !islandOpacityPopover.classList.contains("collapsed");
}

function closeAllIslandPopoversAndDrawers() {
  [islandSearchDrawer, islandPlaylistDrawer, islandVolPopover, islandOpacityPopover].forEach(el => {
    if (el) el.classList.add("collapsed");
  });
  [islandBtnSearch, islandBtnPlaylist, islandBtnVol, islandBtnOpacity].forEach(b => {
    if (b) b.classList.remove("active");
  });
  dynamicIsland.classList.remove("search-active", "playlist-active");
}

function togglePopover(popover, button) {
  const isCollapsed = popover.classList.contains("collapsed");
  closeAllIslandPopoversAndDrawers();
  if (isCollapsed) {
    popover.classList.remove("collapsed");
    button.classList.add("active");
  }
}

function toggleDrawer(drawer, button, activeClass) {
  const isCollapsed = drawer.classList.contains("collapsed");
  closeAllIslandPopoversAndDrawers();
  if (isCollapsed) {
    drawer.classList.remove("collapsed");
    button.classList.add("active");
    dynamicIsland.classList.add(activeClass);
    if (drawer === islandSearchDrawer) islandSearchInput.focus();
  }
}

dynamicIsland.addEventListener("mouseleave", () => {
  if (isAnyDrawerOrPopoverOpen()) {
    dynamicIsland.style.width = "275px";
    dynamicIsland.style.height = dynamicIsland.classList.contains("search-active") || dynamicIsland.classList.contains("playlist-active") ? "135px" : "86px";
  }
});

dynamicIsland.addEventListener("mouseenter", () => {
  dynamicIsland.style.width = "";
  dynamicIsland.style.height = "";
});

islandBtnLyricsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isActive = islandBtnLyricsToggle.classList.toggle("active");
  islandMarqueeContainer.classList.toggle("collapsed-lyric", !isActive);
});

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
  } catch (e) {}
}

function animateBars() {
  if (!analyser || audio.paused) return;
  analyser.getByteFrequencyData(dataArray);

  const low = dataArray[2] || 0;
  const mid = dataArray[8] || 0;
  const high = dataArray[15] || 0;

  const allBars = document.querySelectorAll(".eq-bars span");
  if (allBars[0]) allBars[0].style.height = `${Math.max(2, (low / 255) * 7)}px`;
  if (allBars[1]) allBars[1].style.height = `${Math.max(2, (mid / 255) * 7)}px`;
  if (allBars[2]) allBars[2].style.height = `${Math.max(2, (high / 255) * 7)}px`;

  animationFrameId = requestAnimationFrame(animateBars);
}

async function initPlayer() {
  dynamicIsland.classList.remove("hidden");
  handleVolumeChange(0.8, false);
  handleOpacityChange(0.85, false);
  syncPlayModeUI();

  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderIslandPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    islandTitle.innerText = "Error Loading";
  }
}

islandBtnSearch.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(islandSearchDrawer, islandBtnSearch, "search-active"); });
islandCloseSearch.addEventListener("click", (e) => { e.stopPropagation(); closeAllIslandPopoversAndDrawers(); });

islandBtnPlaylist.addEventListener("click", (e) => { 
  e.stopPropagation(); 
  renderIslandPlaylist();
  toggleDrawer(islandPlaylistDrawer, islandBtnPlaylist, "playlist-active"); 
});
islandClosePlaylist.addEventListener("click", (e) => { e.stopPropagation(); closeAllIslandPopoversAndDrawers(); });

islandBtnVol.addEventListener("click", (e) => { e.stopPropagation(); togglePopover(islandVolPopover, islandBtnVol); });
islandBtnOpacity.addEventListener("click", (e) => { e.stopPropagation(); togglePopover(islandOpacityPopover, islandBtnOpacity); });

function updateDynamicTheme(rgbString) {
  const parts = rgbString.split(',').map(num => parseInt(num.trim(), 10));
  if (parts.length !== 3) return;
  
  const [r, g, b] = parts;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const root = document.documentElement;

  if (luminance < 0.5) {
    root.style.setProperty('--text-color', '#ffffff');
    root.style.setProperty('--text-rgb', '255, 255, 255');
  } else {
    root.style.setProperty('--text-color', '#1d1d1f');
    root.style.setProperty('--text-rgb', '29, 29, 31');
  }
}

function extractDominantColor(imgElement, callback) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imgElement.src;
  
  img.onload = () => {
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    try {
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i+1];
        b += data[i+2];
        count++;
      }
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      callback(`${r}, ${g}, ${b}`);
    } catch (e) {
      callback("245, 245, 247");
    }
  };
  img.onerror = () => {
    callback("245, 245, 247");
  };
}

function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[currentIndex];

  audio.src = song.url;
  const picUrl = song.pic || song.cover || "";
  islandCover.src = picUrl;
  islandHoverCover.src = picUrl;

  const title = song.title || song.name || "Unknown Title";
  const artist = song.author || song.artist || "Unknown Artist";

  islandTitle.innerText = title;
  islandHoverTitle.innerText = title;
  islandArtist.innerText = artist;
  islandHoverArtist.innerText = artist;

  extractDominantColor(islandHoverCover, (rgbString) => {
    document.documentElement.style.setProperty("--accent-rgb", rgbString);
    updateDynamicTheme(rgbString);
  });

  fetchLyrics(song.lrc);
  renderIslandPlaylist();
}

function playTrack() {
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  audio.play();
  islandPlayIcon.classList.add("hidden");
  islandPauseIcon.classList.remove("hidden");
  animateBars();
}

function pauseTrack() {
  audio.pause();
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

islandBtnPlay.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.paused) playTrack(); else pauseTrack();
});

islandBtnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlist.length - 1;
  loadTrack(prevIndex);
  playTrack();
});

islandBtnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  let nextIndex = currentIndex + 1;
  if (nextIndex >= playlist.length) nextIndex = 0;
  loadTrack(nextIndex);
  playTrack();
});

islandBtnMode.addEventListener("click", (e) => {
  e.stopPropagation();
  playMode = (playMode + 1) % 3;
  syncPlayModeUI();
});

function syncPlayModeUI() {
  islandModeLoop.classList.toggle("hidden", playMode !== 0);
  islandModeOne.classList.toggle("hidden", playMode !== 1);
  islandModeShuffle.classList.toggle("hidden", playMode !== 2);
}

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  islandProgressBarFill.style.width = `${pct}%`;

  islandCurrentTimeEl.innerText = formatTime(audio.currentTime);
  islandDurationTimeEl.innerText = formatTime(audio.duration);

  updateCurrentLyric(audio.currentTime);
});

audio.addEventListener("ended", () => {
  if (playMode === 1) {
    playTrack();
  } else if (playMode === 2) {
    let rand = Math.floor(Math.random() * playlist.length);
    loadTrack(rand);
    playTrack();
  } else {
    islandBtnNext.click();
  }
});

islandProgressBarBg.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = islandProgressBarBg.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (audio.duration) audio.currentTime = ratio * audio.duration;
});

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

async function fetchLyrics(lrcUrl) {
  lyrics = [];
  updateIslandLyric("No lyrics found");
  if (!lrcUrl) return;

  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLrc(text);
  } catch (err) {
    updateIslandLyric("Lyrics unavailable");
  }
}

function parseLrc(lrcText) {
  const lines = lrcText.split("\n");
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyrics = [];

  for (let line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = min * 60 + sec + (ms > 99 ? ms / 1000 : ms / 100);
      const content = line.replace(timeExp, "").trim();
      if (content) lyrics.push({ time, text: content });
    }
  }
  lyrics.sort((a, b) => a.time - b.time);
}

function updateCurrentLyric(currentTime) {
  if (!lyrics.length) return;
  let activeLyric = "";
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) activeLyric = lyrics[i].text;
    else break;
  }
  if (activeLyric) updateIslandLyric(activeLyric);
}

function updateIslandLyric(text) {
  if (islandLyricText) islandLyricText.innerText = text;
}

function handleVolumeChange(val, updateDisplay = true) {
  audio.volume = parseFloat(val);
  if (updateDisplay) {
    islandVolVal.innerText = `${Math.round(val * 100)}%`;
  }
  
  if (val == 0) {
    islandVolIconSvg.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3z"/>`;
    volCrossStrike.classList.remove("hidden");
  } else if (val < 0.5) {
    islandVolIconSvg.innerHTML = `<path d="M7 9v6h4l5 5V4L7 9zm10 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`;
    volCrossStrike.classList.add("hidden");
  } else {
    islandVolIconSvg.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02Z14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
    volCrossStrike.classList.add("hidden");
  }
}

islandSettingsVol.addEventListener("input", (e) => {
  e.stopPropagation();
  handleVolumeChange(e.target.value);
});

function handleOpacityChange(val, updateDisplay = true) {
  document.documentElement.style.setProperty("--glass-tint-opacity", val);
  if (updateDisplay) {
    islandOpacityVal.innerText = `${Math.round(val * 100)}%`;
  }
}

islandSettingsOpacity.addEventListener("input", (e) => {
  e.stopPropagation();
  handleOpacityChange(e.target.value);
});

function renderIslandPlaylist() {
  if (!islandPlaylistUl) return;
  islandPlaylistUl.innerHTML = "";
  playlist.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = `playlist-item-ios ${i === currentIndex ? "active" : ""}`;
    const songName = song.title || song.name || "Unknown";
    const songArtist = song.author || song.artist || "Unknown";

    li.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; padding-right: 5px;">${songName} - ${songArtist}</span>
      <button class="btn-remove" title="Remove" style="background:none;border:none;color:#ff3b30;cursor:pointer; display:flex;">${TRASH_BIN_SVG}</button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove")) {
        e.stopPropagation();
        playlist.splice(i, 1);
        if (playlist.length === 0) pauseTrack();
        else {
          if (i === currentIndex) loadTrack(currentIndex % playlist.length);
          else if (i < currentIndex) currentIndex--;
          renderIslandPlaylist();
        }
        return;
      }
      loadTrack(i);
      playTrack();
      renderIslandPlaylist();
    });

    islandPlaylistUl.appendChild(li);
  });
}

islandSearchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(islandDebounce);

  if (!q) {
    islandSearchResults.classList.add("hidden");
    return;
  }

  islandDebounce = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(q)}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        islandSearchResultsUl.innerHTML = "";
        data.slice(0, 15).forEach((song) => {
          const li = document.createElement("li");
          li.className = "playlist-item-ios";
          const title = song.title || song.name || "Unknown";
          const artist = song.author || song.artist || "Unknown";

          li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; flex: 1;">
              <img src="${song.pic || song.cover || ''}" style="width: 14px; height: 14px; border-radius: 2px; object-fit: cover;" alt="">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span>${title} - ${artist}</span>
              </div>
            </div>
            <button class="btn-add-track" title="Add to Playlist" style="background:none;border:none;color:currentColor;cursor:pointer; display:flex; padding: 2px;">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          `;

          const addBtn = li.querySelector(".btn-add-track");
          addBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            if (addBtn.classList.contains("added")) return;

            playlist.push(song);
            
            // Switch plus icon to an iOS-style checkmark with animation
            addBtn.classList.add("added");
            addBtn.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#34c759" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            
            renderIslandPlaylist();
          });

          li.addEventListener("click", () => {
            playlist.push(song);
            loadTrack(playlist.length - 1);
            playTrack();
          });

          islandSearchResultsUl.appendChild(li);
        });
        islandSearchResults.classList.remove("hidden");
      }
    } catch (err) {}
  }, 200);
});

window.addEventListener("DOMContentLoaded", initPlayer);