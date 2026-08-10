const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0 = Sequential, 1 = Single Loop, 2 = Shuffle

const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const title = document.getElementById("title");
const artist = document.getElementById("artist");

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
const btnList = document.getElementById("btn-list");
const btnMode = document.getElementById("btn-mode");

const modeLoop = document.getElementById("mode-loop");
const modeOne = document.getElementById("mode-one");
const modeShuffle = document.getElementById("mode-shuffle");

const playlistDrawer = document.getElementById("playlist-drawer");
const playlistUl = document.getElementById("playlist-ul");

// Fetch playlist data
async function initPlayer() {
  try {
    const res = await fetch(API_BASE);
    playlist = await res.json();
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
  } catch (err) {
    title.innerText = "Error Loading Playlist";
  }
}

function renderPlaylist() {
  playlistUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${song.title}</span><span style="opacity:0.6; margin-left:10px;">${song.author}</span>`;
    li.addEventListener("click", () => {
      loadTrack(index);
      playTrack();
    });
    playlistUl.appendChild(li);
  });
}

async function loadTrack(index) {
  currentIndex = index;
  const song = playlist[index];
  
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  audio.src = song.url;
  
  setLyricText("");

  Array.from(playlistUl.children).forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  fetchLyrics(song.lrc);
}

function setLyricText(text) {
  lyricText.innerText = text;
  
  // Check if text exceeds container width to apply Apple left-to-right rolling animation
  marqueeWrapper.classList.remove("marquee-active");
  if (lyricText.offsetWidth > 240) {
    marqueeWrapper.classList.add("marquee-active");
  }
}

async function fetchLyrics(lrcUrl) {
  lyrics = [];
  if (!lrcUrl) return;
  try {
    const res = await fetch(lrcUrl);
    const text = await res.text();
    parseLRC(text);
  } catch (e) {
    lyrics = [];
  }
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
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, "").trim();
      if (text) lyrics.push({ time, text });
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
  let next;
  if (playMode === 2) { // Shuffle
    next = Math.floor(Math.random() * playlist.length);
  } else {
    next = (currentIndex + 1) % playlist.length;
  }
  loadTrack(next);
  playTrack();
});

btnPrev.addEventListener("click", () => {
  let prev = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  playTrack();
});

// Mode Toggle (Loop All -> Loop One -> Shuffle)
btnMode.addEventListener("click", () => {
  playMode = (playMode + 1) % 3;
  
  modeLoop.classList.add("hidden");
  modeOne.classList.add("hidden");
  modeShuffle.classList.add("hidden");

  if (playMode === 0) {
    modeLoop.classList.remove("hidden");
    btnMode.title = "Play Mode: Sequential";
  } else if (playMode === 1) {
    modeOne.classList.remove("hidden");
    btnMode.title = "Play Mode: Single Loop";
  } else if (playMode === 2) {
    modeShuffle.classList.remove("hidden");
    btnMode.title = "Play Mode: Shuffle";
  }
});

// Smooth Folder Drawer Toggle
btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

// Time & Lyrics Update Loop
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  
  const curTime = audio.currentTime;
  const progressPercent = (curTime / audio.duration) * 100;
  progressBarFill.style.width = `${progressPercent}%`;

  currentTimeEl.innerText = formatTime(curTime);
  durationTimeEl.innerText = formatTime(audio.duration);

  // Sync lyrics line
  if (lyrics.length > 0) {
    let currentLine = lyrics.filter(l => l.time <= curTime).pop();
    if (currentLine && lyricText.innerText !== currentLine.text) {
      setLyricText(currentLine.text);
    }
  }
});

// Song End Logic depending on active playMode
audio.addEventListener("ended", () => {
  if (playMode === 1) { // Single Loop
    audio.currentTime = 0;
    playTrack();
  } else {
    btnNext.click();
  }
});

// Seek Audio
progressBarBg.addEventListener("click", (e) => {
  const rect = progressBarBg.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  audio.currentTime = (clickX / rect.width) * audio.duration;
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

initPlayer();