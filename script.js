// 你的歌单静态列表
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

// 获取页面 DOM 元素
const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
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

// 加载指定歌曲
function loadSong(index) {
  currentIndex = index;
  const song = playlist[currentIndex];

  songTitle.textContent = song.name;
  artistName.textContent = song.artist;
  
  // 补全 HTTPS 并加上网易云防盗链处理
  albumCover.src = `${song.cover}?param=300y300`;

  // 使用官方直连 MP3 节点
  audio.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
}

// 切换播放/暂停 图标
function setPlayState(isPlaying) {
  if (isPlaying) {
    // 暂停 SVG
    playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  } else {
    // 播放 SVG
    playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  }
}

// 封面加载完毕后提取颜色
albumCover.addEventListener("load", () => {
  try {
    const palette = colorThief.getPalette(albumCover, 3);
    if (palette && palette.length >= 3) {
      document.getElementById("blob1").style.backgroundColor = `rgb(${palette[0].join(",")})`;
      document.getElementById("blob2").style.backgroundColor = `rgb(${palette[1].join(",")})`;
      document.getElementById("blob3").style.backgroundColor = `rgb(${palette[2].join(",")})`;
    }
  } catch (e) {
    // 降级柔和渐变色
    document.getElementById("blob1").style.backgroundColor = "#ff2d55";
    document.getElementById("blob2").style.backgroundColor = "#5856d6";
    document.getElementById("blob3").style.backgroundColor = "#ff9500";
  }
});

// 播放按钮事件
playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play().then(() => {
      setPlayState(true);
    }).catch(err => {
      console.warn("Autoplay interaction restriction:", err);
    });
  } else {
    audio.pause();
    setPlayState(false);
  }
});

// 上一首 / 下一首
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
    setPlayState(true);
    audio.oncanplay = null;
  };
}

// 进度条控制
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const progressPercent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${progressPercent}%`;

  currentTimeEl.textContent = formatTime(audio.currentTime);
  totalTimeEl.textContent = formatTime(audio.duration);
});

progressBar.addEventListener("click", (e) => {
  if (!audio.duration) return;
  const width = progressBar.clientWidth;
  const clickX = e.offsetX;
  audio.currentTime = (clickX / width) * audio.duration;
});

// 音量控制
volumeBar.addEventListener("click", (e) => {
  const width = volumeBar.clientWidth;
  const clickX = e.offsetX;
  const volume = clickX / width;
  audio.volume = Math.max(0, Math.min(1, volume));
  volumeFill.style.width = `${audio.volume * 100}%`;
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 自动播下一首
audio.addEventListener("ended", () => nextBtn.click());

// 初始化加载
loadSong(0);