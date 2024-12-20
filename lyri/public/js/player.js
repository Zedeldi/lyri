const serverUrl = "127.0.0.1:8000";
const socket = new WebSocket(`ws://${serverUrl}/player`);
let player = {};
let lyrics = [];
let lastVolume = 0;

const trackInfo = document.getElementById("track-info");
const mediaControls = document.getElementById("media-controls");
const lyricsPanel = document.getElementById("lyrics-panel");
const lyricsText = document.getElementById("lyrics");
const titleElement = document.getElementById("title");
const albumElement = document.getElementById("album");
const artistElement = document.getElementById("artist");
const albumArt = document.getElementById("album-art");
const bgImage = document.getElementById("bg-image");
const trackUrl = document.getElementById("track-url");
const playbackIcon = document.getElementById("playback-icon");
const muteIcon = document.getElementById("mute-icon");
const loopStatus = document.getElementById("loop-status");
loopStatus.setAttribute("data-value", 0);
const loopStatusIcon = document.getElementById("loop-status-icon");
const shuffle = document.getElementById("shuffle");
const fullscreenIcon = document.getElementById("fullscreen-icon");
const positionLabel = document.getElementById("position-label");
const position = document.getElementById("position");
const lengthLabel = document.getElementById("length-label");
const volume = document.getElementById("volume");

// https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullscreenIcon.className = "bi-fullscreen-exit";
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
    fullscreenIcon.className = "bi-fullscreen";
  }
}

// https://stackoverflow.com/a/3733257
function formatDuration(us) {
  let duration = us / 1000 ** 2;
  const hours = Math.floor(duration / 60 ** 2);
  duration = duration - hours * 60 ** 2;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration - minutes * 60);

  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  const s = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${h}:${m}:${s}`;
  }
  return `${m}:${s}`;
}

function usFromDuration(duration) {
  let [m, s, ms] = duration
    .replace(".", ":")
    .split(":")
    .map((line) => Number.parseInt(line));
  return ((m * 60 + s) * 100 + ms) * 10000;
}

function formatRemaining(position, length) {
  return `-${formatDuration(length - position)}`;
}

function getClickValue(event) {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const unit = event.target.max / rect.width;
  return x * unit;
}

function getTrackInfo(data) {
  return {
    title: data["title"],
    album: data["album"],
    artist: data["artist"],
    url: data["url"],
    artwork: data["artwork"],
  };
}

async function getLyrics() {
  const data =
    (await fetch(`http://${serverUrl}/get/lyrics`).then((response) =>
      response.json(),
    )) || "No lyrics available for this song.";
  return data.charAt(0) == "["
    ? data.split("\n").map((line) => [
        usFromDuration(
          line
            .slice(0, 11)
            .trim()
            .replace(/[\[\]']+/g, ""),
        ),
        line.slice(11).trim(),
      ])
    : data.split("\n").map((line) => line.trim());
}

function updateDuration() {
  const currentPosition = player["position"];
  const length = player["length"];
  position.value = currentPosition;
  position.max = length;
  positionLabel.textContent = formatDuration(currentPosition);
  if (lengthLabel.hasAttribute("data-remaining")) {
    lengthLabel.textContent = formatRemaining(currentPosition, length);
  } else {
    lengthLabel.textContent = formatDuration(length);
  }
}

function updateArtwork() {
  albumArt.src = player["artwork"];
  bgImage.style.backgroundImage = `url(${player["artwork"]})`;
}

function updateVolume() {
  const volumeLevel = player["volume"];
  volume.value = volumeLevel;
  if (volumeLevel > 0) {
    lastVolume = volumeLevel;
    muteIcon.className = "bi-volume-up";
  } else {
    muteIcon.className = "bi-volume-mute";
  }
}

function updateLoopStatusEnabled() {
  if (loopStatus.getAttribute("data-value") == 1) {
    loopStatusIcon.className = "bi-repeat-1";
  } else {
    loopStatusIcon.className = "bi-repeat";
  }
  if (loopStatus.getAttribute("data-value") > 0) {
    loopStatus.setAttribute("data-enabled", "");
  } else {
    loopStatus.removeAttribute("data-enabled");
  }
}

function updatePlaybackState() {
  playbackIcon.className = player["playing"] ? "bi-pause-fill" : "bi-play-fill";
  loopStatus.setAttribute("data-value", player["loop-status"]);
  updateLoopStatusEnabled();
  if (player["shuffle"]) {
    shuffle.setAttribute("data-enabled", "");
  } else {
    shuffle.removeAttribute("data-enabled");
  }
}

function updateLyrics() {
  const data =
    lyrics[0].length == 2
      ? lyrics
          .filter(
            (line, idx, arr) =>
              idx + 1 == arr.length || arr[idx + 1][0] >= player["position"],
          )
          .map((line) => line[1])
      : lyrics;
  lyricsText.textContent = data.slice(0, 4).join("\r\n");
}

async function updateTrackInfo() {
  const title = player["title"];
  const album = player["album"];
  const artist = player["artist"];
  titleElement.textContent = title;
  albumElement.textContent = album;
  artistElement.textContent = artist;
  trackUrl.href = player["url"];
  updateArtwork();
  document.title = `${title} | ${artist}`;
  console.log(`[now playing] ${title} - ${album} by ${artist}`);
  lyrics = await getLyrics();
}

function updateInfo() {
  updateDuration();
  updateVolume();
  updatePlaybackState();
  updateLyrics();
}

async function togglePlayback() {
  await fetch(`http://${serverUrl}/toggle`);
}

async function previous() {
  await fetch(`http://${serverUrl}/previous`);
}

async function next() {
  await fetch(`http://${serverUrl}/next`);
}

async function toggleLoopStatus() {
  const status = (loopStatus.getAttribute("data-value") + 1) % 3;
  loopStatus.setAttribute("data-value", status);
  updateLoopStatusEnabled();
  await fetch(`http://${serverUrl}/set/loop-status?status=${status}`);
}

async function toggleShuffle() {
  shuffle.toggleAttribute("data-enabled");
  const status = shuffle.hasAttribute("data-enabled");
  await fetch(`http://${serverUrl}/set/shuffle?status=${status}`);
}

function toggleLyrics() {
  trackInfo.classList.toggle("hidden");
  mediaControls.classList.toggle("hidden");
  lyricsPanel.classList.toggle("hidden");
}

async function toggleMute() {
  let level = 0;
  if (volume.value == 0) {
    level = lastVolume;
  }
  await fetch(`http://${serverUrl}/set/volume?level=${level}`);
}

async function setPosition(position) {
  await fetch(`http://${serverUrl}/set/position?position=${position}`);
}

async function setVolume(level) {
  await fetch(`http://${serverUrl}/set/volume?level=${level}`);
}

lengthLabel.addEventListener("click", (event) => {
  lengthLabel.toggleAttribute("data-remaining");
  updateDuration();
});

position.addEventListener("click", async (event) => {
  const value = getClickValue(event);
  await setPosition(Math.round(value));
});

volume.addEventListener("click", async (event) => {
  const value = getClickValue(event);
  await setVolume(value);
});

socket.addEventListener("open", (event) => {
  console.info("[open] Connection established");
});

socket.addEventListener("message", async (event) => {
  const data = JSON.parse(event.data);
  console.debug(`[message] Data received from server: ${data}`);
  const trackIsChanged =
    JSON.stringify(getTrackInfo(data)) != JSON.stringify(getTrackInfo(player));
  player = data;
  if (trackIsChanged) {
    await updateTrackInfo();
  }
  updateInfo();
});

socket.addEventListener("close", (event) => {
  if (event.wasClean) {
    console.info(
      `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`,
    );
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.error("[close] Connection died");
  }
});

socket.addEventListener("error", (error) => {
  console.error(`[error]`);
});
