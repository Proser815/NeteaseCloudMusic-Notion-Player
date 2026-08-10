// 歌单列表
const playlist = [
  {
    name: "Probably Up",
    artist: "Lawrence",
    id: "1313107297",
    cover: "https://p2.music.126.net/L3d8xO_09zW94sP7XhP23g==/109951163584824558.jpg"
  },
  {
    name: "love in summer",
    artist: "George / Cosmic Boy",
    id: "1862788540",
    cover: "https://p1.music.126.net/4nKkWg0C3zL-m7-Jk9x99A==/109951166185888123.jpg"
  },
  {
    name: "Until I Found You (Piano Version)",
    artist: "Stephen Sanchez",
    id: "1982736192",
    cover: "https://p2.music.126.net/1v2fXvGvGvGvGvGvGvGvGv==/109951167812839123.jpg"
  },
  {
    name: "Notion",
    artist: "The Rare Occasions",
    id: "1883584812",
    cover: "https://p1.music.126.net/zO8v4vXGvGvGvGvGvGvGvG==/109951166612984123.jpg"
  }
];

let currentIndex = 0;

const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const albumCover = document.getElementById("albumCover");
const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");
const progressFill = document.getElementById("progressFill");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const volumeBar = document.getElementById("volumeBar");
const volumeFill = document.getElementById("volumeFill");

const colorThief = new ColorThief();

function loadSong(index) {
  currentIndex = index;
  const song = playlist[currentIndex];

  songTitle.textContent = song.name;
  artistName.textContent = song.artist;
  
  // 图片代理
  albumCover.src = `https://images.weserv.nl/?url=${encodeURIComponent(song.cover)}&w=300&h=300`;

  // 音频代理
  audio.src = `https://api.i-meto.com/meting/api?server=netease&type=url&id=${song.id}`;
}

// 提取颜色
albumCover.addEventListener("load", () => {
  try {
    const palette = colorThief.getPalette(albumCover, 3);
    if (palette && palette.length >= 3) {
      document.getElementById("blob1").style.backgroundColor = `rgb(${palette[0].join(",")})`;
      document.getElementById("blob2").style.backgroundColor = `rgb(${palette[1].join(",")})`;
      document.getElementById("blob3").style.backgroundColor = `rgb(${palette[2].join(",")})`;
    }
  } catch (e) {
    document.getElementById("blob1").style.backgroundColor = "#ff2d55";
    document.getElementById("blob2").style.backgroundColor = "#5856d6";
    document.getElementById("blob3").style.backgroundColor = "#ff9500";
  }
});

playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play().then(() => {
      playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }).catch(err => console.error("Play error:", err));
  } else {
    audio.pause();
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
});

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadSong(currentIndex);
  playAudioWhenReady();
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadSong(currentIndex);
  playAudioWhenReady();
});

function playAudioWhenReady() {
  audio.oncanplay = () => {
    audio.play();
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    audio.oncanplay = null;
  };
}

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  totalTimeEl.textContent = formatTime(audio.duration);
});

progressBar.addEventListener("click", (e) => {
  if (!audio.duration) return;
  audio.currentTime = (e.offsetX / progressBar.clientWidth) * audio.duration;
});

volumeBar.addEventListener("click", (e) => {
  const volume = e.offsetX / volumeBar.clientWidth;
  audio.volume = Math.max(0, Math.min(1, volume));
  volumeFill.style.width = `${audio.volume * 100}%`;
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

audio.addEventListener("ended", () => nextBtn.click());

// 默认直接初始化加载
loadSong(0);