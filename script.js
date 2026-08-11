// Sample Songs Database
const songDatabase = [
  {
    title: "her",
    author: "JVKE",
    album: "her - Single",
    year: "2024",
    story: "'her' is an intimate, emotive pop ballad exploring deep vulnerability, unconditional devotion, and cinematic romance.",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    lyrics: "It's always been her, standing in the light, carrying my heart through the longest night..."
  },
  {
    title: "her (feat. Annika Wells)",
    author: "JVKE / Annika Wells",
    album: "her (Remixes)",
    year: "2024",
    story: "A stunning duet variation bringing Annika Wells' ethereal vocal harmonies into JVKE's original landscape.",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    lyrics: "You and I, woven together in the dark, lighting up the silence with a single spark..."
  },
  {
    title: "her (feat. Annika Wells & Kaden Hawke)",
    author: "JVKE / Annika Wells / Kaden Hawke",
    album: "her (Expanded Edition)",
    year: "2024",
    story: "An acoustic trio reimagining featuring lush acoustic guitar layers and three-part harmonies.",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    lyrics: "Softly spoken promises, drifting in the air, everywhere I look I find you there..."
  },
  {
    title: "her (feat. Macario & Leon Leiden)",
    author: "JVKE / Macario / Leon Leiden",
    album: "her (Global Remixes)",
    year: "2024",
    story: "A Latin-infused global pop collaboration blending rich rhythmic percussion with melodic hooks.",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    lyrics: "Bailando bajo las estrellas, feeling like a dream, the sweetest love that I have ever seen..."
  },
  {
    title: "We Choose / Good Night (Live)",
    author: "Her",
    album: "Live in Paris",
    year: "2018",
    story: "A soul-charged live performance recording highlighting raw energy, horn sections, and passionate vocals.",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80",
    lyrics: "We choose the fire, we choose the night, standing together in the golden light..."
  }
];

// Queue state
let playlist = [...songDatabase];
let currentSongIndex = 0;
let isPlaying = false;
let eqAnimInterval = null;

// DOM Elements
const audioPlayer = document.getElementById("audio-player");
const playerCard = document.getElementById("player-card");
const dynamicIsland = document.getElementById("dynamic-island");
const pillArt = document.getElementById("pill-art");
const pillTitle = document.getElementById("pill-title");

const albumArt = document.getElementById("album-art");
const backdropImg = document.getElementById("backdrop-img");
const backdropOverlay = document.querySelector(".backdrop-overlay");
const coverWrapper = document.getElementById("cover-wrapper");

const songTitle = document.getElementById("song-title");
const artistName = document.getElementById("artist-name");
const eqBars = document.getElementById("eq-bars");

const lyricsContainer = document.getElementById("lyrics-container");
const marqueeWrapper = document.getElementById("marquee-wrapper");
const lyricText = document.getElementById("lyric-text");

const progressBarBg = document.getElementById("progress-bar-bg");
const progressBarFill = document.getElementById("progress-bar-fill");
const currentTimeEl = document.getElementById("current-time");
const totalTimeEl = document.getElementById("total-time");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnLyrics = document.getElementById("btn-lyrics");
const btnInfo = document.getElementById("btn-info");
const btnPlaylist = document.getElementById("btn-playlist");

const volumeSlider = document.getElementById("volume-slider");
const opacitySlider = document.getElementById("opacity-slider");

const infoDrawer = document.getElementById("info-drawer");
const infoAlbum = document.getElementById("info-album");
const infoYear = document.getElementById("info-year");
const infoStory = document.getElementById("info-story");

const playlistDrawer = document.getElementById("playlist-drawer");
const queueUl = document.getElementById("queue-ul");
const btnToggleSearch = document.getElementById("btn-toggle-search");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const btnSearchTrigger = document.getElementById("btn-search-trigger");

const searchPredictionsContainer = document.getElementById("search-predictions");
const predictionsUl = document.getElementById("predictions-ul");
const searchResultsContainer = document.getElementById("search-results");
const resultsUl = document.getElementById("results-ul");

// Initial Setup
function init() {
  loadSong(currentSongIndex);
  renderQueue();
  setupEventListeners();
}

// Load Song Details
function loadSong(index) {
  if (index < 0 || index >= playlist.length) return;
  currentSongIndex = index;
  const song = playlist[index];

  audioPlayer.src = song.src;
  songTitle.innerText = song.title;
  artistName.innerText = song.author;
  albumArt.src = song.cover;
  backdropImg.src = song.cover;
  pillArt.src = song.cover;
  pillTitle.innerText = song.title;

  lyricText.innerText = song.lyrics || "No lyrics available";
  infoAlbum.innerText = song.album || "Single";
  infoYear.innerText = song.year || "2024";
  infoStory.innerText = song.story || "No background information available.";

  // Dynamic Color Theme Extraction
  extractThemeColor(song.cover);

  renderQueue();
  if (isPlaying) {
    audioPlayer.play();
  }
}

// Extract Color Tint & Glow
function extractThemeColor(imageSrc) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageSrc;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

    document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty("--glow-color", `rgba(${r}, ${g}, ${b}, 0.75)`);
  };
}

// Toggle Playback
function togglePlay() {
  if (isPlaying) {
    audioPlayer.pause();
  } else {
    audioPlayer.play();
  }
}

function updatePlayState(playing) {
  isPlaying = playing;
  if (isPlaying) {
    playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    eqBars.classList.remove("hidden");
    startEqAnimation();
    marqueeWrapper.classList.add("marquee-active");
  } else {
    playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    eqBars.classList.add("hidden");
    stopEqAnimation();
    marqueeWrapper.classList.remove("marquee-active");
  }
}

// Equalizer Animation
function startEqAnimation() {
  stopEqAnimation();
  const spans = eqBars.querySelectorAll("span");
  eqAnimInterval = setInterval(() => {
    spans.forEach(span => {
      const height = Math.floor(Math.random() * 11) + 3;
      span.style.height = `${height}px`;
    });
  }, 120);
}

function stopEqAnimation() {
  if (eqAnimInterval) clearInterval(eqAnimInterval);
}

// Event Listeners Registration
function setupEventListeners() {
  btnPlay.addEventListener("click", togglePlay);
  audioPlayer.addEventListener("play", () => updatePlayState(true));
  audioPlayer.addEventListener("pause", () => updatePlayState(false));

  btnNext.addEventListener("click", () => {
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(currentSongIndex);
  });

  btnPrev.addEventListener("click", () => {
    currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    loadSong(currentSongIndex);
  });

  audioPlayer.addEventListener("timeupdate", updateProgress);
  audioPlayer.addEventListener("ended", () => {
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(currentSongIndex);
  });

  progressBarBg.addEventListener("click", seek);

  // Volume & Glass Sliders
  volumeSlider.addEventListener("input", (e) => {
    audioPlayer.volume = e.target.value;
  });

  opacitySlider.addEventListener("input", (e) => {
    const val = e.target.value;
    backdropOverlay.style.background = `rgba(0, 0, 0, ${val})`;
  });

  // Dynamic Island Morphing
  coverWrapper.addEventListener("click", minimizeToIsland);
  dynamicIsland.addEventListener("click", restoreFromIsland);

  // Drawers Toggles
  btnLyrics.addEventListener("click", () => {
    lyricsContainer.classList.toggle("collapsed");
    btnLyrics.classList.toggle("active");
  });

  btnInfo.addEventListener("click", () => {
    infoDrawer.classList.toggle("collapsed");
    btnInfo.classList.toggle("active");
  });

  btnPlaylist.addEventListener("click", () => {
    playlistDrawer.classList.toggle("collapsed");
  });

  btnToggleSearch.addEventListener("click", () => {
    searchSection.classList.toggle("collapsed");
    if (!searchSection.classList.contains("collapsed")) {
      searchInput.focus();
    }
  });

  // Predictive Live Search Listeners
  searchInput.addEventListener("input", handleSearchInput);
  btnSearchTrigger.addEventListener("click", performSearch);

  document.addEventListener("click", (e) => {
    if (!searchSection.contains(e.target)) {
      hidePredictions();
    }
  });
}

// Progress & Seek
function updateProgress() {
  const { duration, currentTime } = audioPlayer;
  if (isNaN(duration)) return;

  const percent = (currentTime / duration) * 100;
  progressBarFill.style.width = `${percent}%`;

  currentTimeEl.innerText = formatTime(currentTime);
  totalTimeEl.innerText = formatTime(duration);
}

function seek(e) {
  const rect = progressBarBg.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const duration = audioPlayer.duration;

  if (!isNaN(duration)) {
    audioPlayer.currentTime = (clickX / width) * duration;
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Dynamic Island Morph Animation Controls
function minimizeToIsland() {
  playerCard.classList.add("morphed-hidden");
  setTimeout(() => {
    dynamicIsland.classList.remove("hidden");
  }, 250);
}

function restoreFromIsland() {
  dynamicIsland.classList.add("hidden");
  setTimeout(() => {
    playerCard.classList.remove("morphed-hidden");
  }, 100);
}

// Render Playlist Queue
function renderQueue() {
  queueUl.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    if (index === currentSongIndex) li.classList.add("active");

    li.innerHTML = `
      <span>${song.title} - <small style="opacity:0.75;">${song.author}</small></span>
      <button class="btn-delete-song" title="Remove Song">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-song")) return;
      loadSong(index);
      audioPlayer.play();
    });

    const btnDelete = li.querySelector(".btn-delete-song");
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSongFromQueue(index, li);
    });

    queueUl.appendChild(li);
  });
}

function removeSongFromQueue(index, element) {
  element.classList.add("removing");
  setTimeout(() => {
    playlist.splice(index, 1);
    if (currentSongIndex >= playlist.length) {
      currentSongIndex = Math.max(0, playlist.length - 1);
    }
    if (playlist.length > 0) {
      loadSong(currentSongIndex);
    } else {
      songTitle.innerText = "No Songs in Queue";
      artistName.innerText = "-";
      audioPlayer.pause();
    }
    renderQueue();
  }, 300);
}

// Live Predictive Search Logic
function handleSearchInput() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    hidePredictions();
    searchResultsContainer.classList.add("hidden");
    return;
  }

  const matches = songDatabase.filter(s =>
    s.title.toLowerCase().includes(query) ||
    s.author.toLowerCase().includes(query)
  );

  renderPredictions(matches);
}

function renderPredictions(results) {
  predictionsUl.innerHTML = "";
  if (!results || results.length === 0) {
    hidePredictions();
    return;
  }

  // Display top 5 predictions live, left-aligned
  const suggestions = results.slice(0, 5);
  suggestions.forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        <span class="prediction-title">${song.title}</span> 
        <small class="prediction-artist">- ${song.author}</small>
      </span>
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

function performSearch() {
  hidePredictions();
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;

  const results = songDatabase.filter(s =>
    s.title.toLowerCase().includes(query) ||
    s.author.toLowerCase().includes(query)
  );

  renderSearchResults(results);
}

function renderSearchResults(results) {
  resultsUl.innerHTML = "";
  if (results.length === 0) {
    resultsUl.innerHTML = `<li style="opacity:0.7;">No matching tracks found</li>`;
  } else {
    results.forEach(song => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 170px;">
          <strong>${song.title}</strong> - <small style="opacity:0.75;">${song.author}</small>
        </span>
        <div class="search-action-group">
          <button class="btn-play-next spring-btn" title="Add Next to Queue">+ Next</button>
          <button class="btn-add-morph spring-btn" title="Add to Queue">+</button>
        </div>
      `;

      const btnNextAction = li.querySelector(".btn-play-next");
      btnNextAction.addEventListener("click", (e) => {
        e.stopPropagation();
        playlist.splice(currentSongIndex + 1, 0, { ...song });
        renderQueue();
        btnNextAction.innerText = "✓ Next";
        btnNextAction.classList.add("added");
      });

      const btnAddAction = li.querySelector(".btn-add-morph");
      btnAddAction.addEventListener("click", (e) => {
        e.stopPropagation();
        playlist.push({ ...song });
        renderQueue();
        btnAddAction.innerText = "✓";
        btnAddAction.classList.add("added");
      });

      resultsUl.appendChild(li);
    });
  }

  searchResultsContainer.classList.remove("hidden");
}

// Launch Player Application
window.addEventListener("DOMContentLoaded", init);