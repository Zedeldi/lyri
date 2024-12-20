const serverUrl = "127.0.0.1:8000";
const socket = new WebSocket(`ws://${serverUrl}/player`);
let player = {};
let lastVolume = 0;

const titleElement = document.getElementById("title");
const albumElement = document.getElementById("album");
const artistElement = document.getElementById("artist");
const albumArt = document.getElementById("album-art");
const bgImage = document.getElementById("bg-image");
const trackUrl = document.getElementById("track-url");
const playbackIcon = document.getElementById("playback-icon");
const muteIcon = document.getElementById("mute-icon");
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

function formatRemaining(position, length) {
  return `-${formatDuration(length - position)}`;
}

function getClickValue(event) {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const unit = event.target.max / rect.width;
  return x * unit;
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

function updateTrackInfo() {
  const title = player["title"];
  const album = player["album"];
  const artist = player["artist"];
  titleElement.textContent = title;
  albumElement.textContent = album;
  artistElement.textContent = artist;
  trackUrl.href = player["url"];
  playbackIcon.className = player["playing"] ? "bi-pause-fill" : "bi-play-fill";
  document.title = `${title} | ${artist}`;
  console.log(`[now playing] ${title} - ${album} by ${artist}`);
}

function updateInfo() {
  updateTrackInfo();
  updateArtwork();
  updateDuration();
  updateVolume();
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

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.debug(`[message] Data received from server: ${data}`);
  if (JSON.stringify(data) != JSON.stringify(player)) {
    player = data;
    updateInfo();
  }
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
