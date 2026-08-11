const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0;
let isDraggingProgress = false;
let previousVolume = 0.8;
let previousOpacity = 0.5;

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

const dynamicIsland = document.getElementById("dynamic-island");
const islandCover = document.getElementById("island-cover");
const islandTitle = document.getElementById("island-title");
const islandHoverCover = document.getElementById("island-hover-cover");
const islandHoverTitle = document.getElementById("island-hover-title");
const islandHoverArtist = document.getElementById("island-hover-artist");
const islandLyricText = document.getElementById("island-lyric-text");
const btnIsland = document.getElementById("btn-island");

const islandBtnPrev = document.getElementById("island-btn-prev");
const islandBtnPlay = document.getElementById("island-btn-play");
const islandPlayIcon = document.getElementById("island-play-icon");
const islandPauseIcon = document.getElementById("island-pause-icon");
const islandBtnNext = document.getElementById("island-btn-next");

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
const btnInfo = document.getElementById("btn-info");
const infoDrawer = document.getElementById("info-drawer");
const playlistDrawer = document.getElementById("playlist-drawer");
const playlistUl = document.getElementById("playlist-ul");

const volumeSlider = document.getElementById("volume-slider");
const opacitySlider = document.getElementById("opacity-slider");

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

function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach(line => {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + (milliseconds > 99 ? milliseconds / 1000 : milliseconds / 100);
      const text = line.replace(timeExp, "").trim();
      if (text) result.push({ time, text });
    }
  });
  return result.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(songId) {
  lyrics = [];
  setLyricText("Loading lyrics...");
  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=lrc&id=${songId}`);
    const data = await res.text();
    lyrics = parseLRC(data);
    if (lyrics.length === 0) {
      setLyricText("Instrumental / No Lyrics Available");
    } else {
      setLyricText(lyrics[0].text);
    }
  } catch (err) {
    setLyricText("Lyrics Unavailable");
  }
}

function setLyricText(text) {
  if (lyricText) lyricText.innerText = text;
  if (islandLyricText) islandLyricText.innerText = text;
}

function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[index];

  audio.src = song.url;
  cover.src = song.pic;
  backdropImg.src = song.pic;
  title.innerText = song.title;
  artist.innerText = song.author;

  islandCover.src = song.pic;
  islandTitle.innerText = song.title;
  islandHoverCover.src = song.pic;
  islandHoverTitle.innerText = song.title;
  islandHoverArtist.innerText = song.author;

  fetchLyrics(song.id || song.url_id);
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
  cancelAnimationFrame(animationFrameId);
  animateBars();
}

function pauseTrack() {
  audio.pause();
  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");
  islandPlayIcon.classList.remove("hidden");
  islandPauseIcon.classList.add("hidden");
  cancelAnimationFrame(animationFrameId);
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) playTrack();
  else pauseTrack();
});

btnPrev.addEventListener("click", () => {
  let prevIdx = currentIndex - 1;
  if (prevIdx < 0) prevIdx = playlist.length - 1;
  loadTrack(prevIdx);
  playTrack();
});

btnNext.addEventListener("click", () => {
  let nextIdx = currentIndex + 1;
  if (nextIdx >= playlist.length) nextIdx = 0;
  loadTrack(nextIdx);
  playTrack();
});

btnLyrics.addEventListener("click", () => {
  lyricsContainer.classList.toggle("collapsed");
});

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

btnInfo.addEventListener("click", () => {
  infoDrawer.classList.toggle("collapsed");
});

btnIsland.addEventListener("click", () => {
  playerCard.classList.add("morphed-hidden");
  dynamicIsland.classList.remove("hidden");
});

dynamicIsland.addEventListener("click", (e) => {
  if (e.target.closest('.island-ctrl-btn')) return;
  playerCard.classList.remove("morphed-hidden");
  dynamicIsland.classList.add("hidden");
});

islandBtnPlay.addEventListener("click", (e) => { e.stopPropagation(); btnPlay.click(); });
islandBtnPrev.addEventListener("click", (e) => { e.stopPropagation(); btnPrev.click(); });
islandBtnNext.addEventListener("click", (e) => { e.stopPropagation(); btnNext.click(); });

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
  btnNext.click();
});

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

progressBarBg.addEventListener("click", (e) => {
  const rect = progressBarBg.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

volumeSlider.addEventListener("input", (e) => {
  audio.volume = parseFloat(e.target.value);
});

opacitySlider.addEventListener("input", (e) => {
  document.documentElement.style.setProperty("--glass-tint-opacity", parseFloat(e.target.value));
});

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    if (index === currentIndex) li.classList.add("active");
    li.innerHTML = `<span>${index + 1}. ${song.title} - <small>${song.author}</small></span>`;
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });
    playlistUl.appendChild(li);
  });
}

initPlayer();