// 使用极速且带有跨域标头 (CORS) 的公共网易云 API 节点
const API_BASE = "https://neteasecloudmusicapi-docs.vercel.app";

// 你的歌单 ID (放松)
const PLAYLIST_ID = "18210633647"; 

let playlist = [];
let currentIndex = 0;

// 获取 DOM 元素
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

// 初始化 ColorThief
const colorThief = new ColorThief();

// 1. 请求歌单
async function fetchPlaylist() {
  try {
    songTitle.textContent = "正在加载歌单...";
    artistName.textContent = "请稍候";

    // 备用 API 列表，若主 API 挂掉自动切换
    const apis = [
      `https://neteasecloudmusicapi-docs.vercel.app/playlist/track/all?id=${PLAYLIST_ID}&limit=30`,
      `https://music.api.635201.xyz/playlist/track/all?id=${PLAYLIST_ID}&limit=30`
    ];

    let data = null;
    for (let url of apis) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          if (data && data.songs && data.songs.length > 0) break;
        }
      } catch (e) {
        console.warn("尝试节点失败，切换备用节点...", url);
      }
    }

    if (data && data.songs && data.songs.length > 0) {
      playlist = data.songs;
      loadSong(0);
    } else {
      throw new Error("未能读取到歌单内容");
    }

  } catch (err) {
    songTitle.textContent = "数据加载失败";
    artistName.textContent = "请尝试用 Live Server 或部署后打开";
    console.error("Fetch Playlist Error:", err);
  }
}

// 2. 加载歌曲
async function loadSong(index) {
  currentIndex = index;
  const song = playlist[currentIndex];

  songTitle.textContent = song.name;
  artistName.textContent = song.ar.map(a => a.name).join(" / ");

  // 使用 HTTPS 图片
  let picUrl = song.al.picUrl.replace("http://", "https://");
  albumCover.src = `${picUrl}?param=300y300`;

  // 直接构造标准音频流（绕过复杂的 URL 接口）
  audio.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
}

// 3. 提取颜色
albumCover.addEventListener("load", () => {
  try {
    const palette = colorThief.getPalette(albumCover, 3);
    if (palette && palette.length >= 3) {
      document.getElementById("blob1").style.backgroundColor = `rgb(${palette[0].join(",")})`;
      document.getElementById("blob2").style.backgroundColor = `rgb(${palette[1].join(",")})`;
      document.getElementById("blob3").style.backgroundColor = `rgb(${palette[2].join(",")})`;
    }
  } catch (e) {
    console.warn("提取专辑颜色遇到 CORS 拦截", e);
  }
});

// 4. 播放控制
playBtn.addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play().then(() => {
      playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }).catch(err => console.error(err));
  } else {
    audio.pause();
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
});

prevBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadSong(currentIndex);
  playAudioWhenReady();
});

nextBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
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

// 5. 进度与音量
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

volumeBar.addEventListener("click", (e) => {
  const width = volumeBar.clientWidth;
  const clickX = e.offsetX;
  audio.volume = Math.max(0, Math.min(1, clickX / width));
  volumeFill.style.width = `${audio.volume * 100}%`;
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

audio.addEventListener("ended", () => nextBtn.click());

// 初始化
fetchPlaylist();