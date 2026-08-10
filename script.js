const PLAYLIST_ID = "18210633647";
const API_BASE = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`;

let playlist = [];
let currentIndex = 0;
let lyrics = [];
let playMode = 0; // 0 = Sequential, 1 = Single Loop, 2 = Shuffle

const audio = document.getElementById("audio-player");
const cover = document.getElementById("cover");
const backdropImg = document.getElementById("backdrop-img");
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
const addSongInput = document.getElementById("add-song-input");
const btnAddSong = document.getElementById("btn-add-song");

// Initialize Player & Fetch Default Playlist
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

// Add Song Feature
btnAddSong.addEventListener("click", async () => {
  const songId = addSongInput.value.trim();
  if (!songId) return;

  try {
    const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=song&id=${songId}`);
    const data = await res.json();
    if (data && data.length > 0) {
      playlist.push(data[0]);
      renderPlaylist();
      addSongInput.value = "";
      loadTrack(playlist.length - 1);
      playTrack();
    } else {
      alert("Song not found. Please check the NetEase Song ID.");
    }
  } catch (e) {
    alert("Failed to fetch song info.");
  }
});

async function loadTrack(index) {
  currentIndex = index;
  const song = playlist[index];
  
  title.innerText = song.title;
  artist.innerText = song.author;
  cover.src = song.pic;
  backdropImg.src = song.pic; // Apply blurred album artwork backdrop
  audio.src = song.url;
  
  setLyricText("");

  Array.from(playlistUl.children).forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  // Extract Dominant Color for iOS-Style Dynamic Backdrop Glow
  extractDominantColor(song.pic);

  fetchLyrics(song.lrc);
}

// Extract Dominant Color using Offscreen Canvas
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

    // Update dynamic root variables
    document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.75)`);
  };
}

function setLyricText(text) {
  lyricText.innerText = text;
  marqueeWrapper.classList.remove("marquee-active");
  if (lyricText.offsetWidth > 200) {
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
  let next = playMode === 2 ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
  loadTrack(next);
  playTrack();
});

btnPrev.addEventListener("click", () => {
  let prev = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  playTrack();
});

// Mode Toggle
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

btnList.addEventListener("click", () => {
  playlistDrawer.classList.toggle("collapsed");
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
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

progressBarBg.addEventListener("click", (e) => {
  const rect = progressBarBg.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

initPlayer();