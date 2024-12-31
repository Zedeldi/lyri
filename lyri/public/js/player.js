const Utils = (function () {
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

  function usFromDuration(duration) {
    let [m, s, hs] = duration
      .replace(".", ":")
      .split(":")
      .map((line) => Number.parseInt(line));
    return ((m * 60 + s) * 100 + hs) * 10000;
  }

  function getClickValue(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const unit = event.target.max / rect.width;
    return x * unit;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return true;
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      return false;
    }
  }

  return {
    formatDuration: formatDuration,
    formatRemaining: formatRemaining,
    usFromDuration: usFromDuration,
    getClickValue: getClickValue,
    toggleFullscreen: toggleFullscreen,
  };
})();

const Lyri = (function () {
  const serverUrl = window.location.host;
  const serverProto = window.location.protocol;

  function parseUrl(url, name) {
    return url.startsWith("file://")
      ? `${serverProto}//${serverUrl}/proxy/${name}`
      : url;
  }

  async function getLyrics() {
    const data =
      (await fetch(`${serverProto}//${serverUrl}/get/lyrics`).then((response) =>
        response.json(),
      )) || "No lyrics available for this song.";
    return data.charAt(0) == "["
      ? data.split("\n").map((line) => [
          Utils.usFromDuration(
            line
              .slice(0, 11)
              .trim()
              .replace(/[\[\]']+/g, ""),
          ),
          line.slice(11).trim(),
        ])
      : data.split("\n").map((line) => line.trim());
  }

  async function togglePlayback() {
    await fetch(`${serverProto}//${serverUrl}/toggle`);
  }

  async function previous() {
    await fetch(`${serverProto}//${serverUrl}/previous`);
  }

  async function next() {
    await fetch(`${serverProto}//${serverUrl}/next`);
  }

  async function setLoopStatus(status) {
    await fetch(
      `${serverProto}//${serverUrl}/set/loop-status?status=${status}`,
    );
  }

  async function setShuffle(status) {
    await fetch(`${serverProto}//${serverUrl}/set/shuffle?status=${status}`);
  }

  async function setPosition(position) {
    await fetch(
      `${serverProto}//${serverUrl}/set/position?position=${position}`,
    );
  }

  async function setVolume(level) {
    await fetch(`${serverProto}//${serverUrl}/set/volume?level=${level}`);
  }

  function startWebsocket(callback) {
    let wsProto;
    if (serverProto === "https:") {
      wsProto = "wss:";
    } else {
      wsProto = "ws:";
    }
    const socket = new WebSocket(`${wsProto}//${serverUrl}/player`);

    socket.addEventListener("open", (event) => {
      console.info("[open] Connection established");
    });

    socket.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);
      console.debug(`[message] Data received from server: ${data}`);
      if (callback) {
        await callback(data);
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
      console.error("[reconnect] Reconnecting in one second");
      setTimeout(startWebsocket, 1000, callback);
    });

    socket.addEventListener("error", (error) => {
      console.error(`[error]`);
      socket.close();
    });
  }

  return {
    togglePlayback: togglePlayback,
    previous: previous,
    next: next,
    setLoopStatus: setLoopStatus,
    setShuffle: setShuffle,
    setPosition: setPosition,
    setVolume: setVolume,
    getLyrics: getLyrics,
    parseUrl: parseUrl,
    startWebsocket: startWebsocket,
  };
})();

const PlayerUI = (function () {
  let player = {};
  let lyrics = [];

  function updateArtwork(url) {
    url = Lyri.parseUrl(url || player.artwork, "artwork");
    document.getElementById("album-art").src = url;
    document.getElementById("bg-image").style.backgroundImage = `url(${url})`;
  }

  function updateDuration(position, length) {
    position = position || player.position;
    length = length || player.length;
    const positionBar = document.getElementById("position-bar");
    const positionLabel = document.getElementById("position-label");
    const lengthLabel = document.getElementById("length-label");
    positionBar.value = position;
    positionBar.max = length;
    positionLabel.textContent = Utils.formatDuration(position);
    if (lengthLabel.hasAttribute("data-remaining")) {
      lengthLabel.textContent = Utils.formatRemaining(position, length);
    } else {
      lengthLabel.textContent = Utils.formatDuration(length);
    }
  }

  function updateLoopStatusEnabled() {
    const loopStatus = document.getElementById("loop-status-btn");
    const loopStatusIcon = document.getElementById("loop-status-icon");
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

  function updatePlaybackState(playing, shuffle) {
    playing = playing || player.playing;
    shuffle = shuffle || player.shuffle;
    const loopStatus = document.getElementById("loop-status-btn");
    const shuffleBtn = document.getElementById("shuffle-btn");
    document.getElementById("playback-icon").className = playing
      ? "bi-pause-fill"
      : "bi-play-fill";
    loopStatus.setAttribute("data-value", player["loop-status"]);
    updateLoopStatusEnabled();
    if (shuffle) {
      shuffleBtn.setAttribute("data-enabled", "");
    } else {
      shuffleBtn.removeAttribute("data-enabled");
    }
  }

  function updateVolume(level) {
    level = level || player.volume;
    const muteIcon = document.getElementById("mute-icon");
    const volumeBar = document.getElementById("volume-bar");
    volumeBar.value = level;
    if (level > 0) {
      volumeBar.setAttribute("data-volume", level);
      muteIcon.className = "bi-volume-up";
    } else {
      muteIcon.className = "bi-volume-mute";
    }
  }

  function updateLyrics() {
    const lines = window.innerHeight < 768 ? 2 : 4;
    if (lyrics.length == 0) {
      return;
    }
    const data =
      lyrics[0].length == 2
        ? lyrics
            .filter(
              (line, idx, arr) =>
                idx + 1 == arr.length || arr[idx + 1][0] >= player.position,
            )
            .map((line) => line[1])
        : lyrics;
    document.getElementById("lyrics").textContent = data
      .slice(0, lines)
      .join("\r\n");
  }

  async function updateTrackInfo(data) {
    data = data || player;
    document.getElementById("title").textContent = data.title;
    document.getElementById("album").textContent = data.album;
    document.getElementById("artist").textContent = data.artist;
    document.getElementById("track-url").href = Lyri.parseUrl(data.url, "stream");
    updateArtwork(data.artwork);
    document.title = data.artist ? `${data.title} | ${data.artist}` : data.title;
    console.log(
      `[now playing] ${data.title} - ${data.album} by ${data.artist}`,
    );
    lyrics = await Lyri.getLyrics();
  }

  function updateInfo(data) {
    data = data || player;
    updateDuration(data.position, data.length);
    updateVolume(data.volume);
    updatePlaybackState(data.playing, data.shuffle);
    updateLyrics();
  }

  function getTrackInfo(data) {
    data = data || player;
    return {
      title: data.title,
      album: data.album,
      artist: data.artist,
      url: data.url,
      artwork: data.artwork,
    };
  }

  async function callback(data) {
    const trackIsChanged =
      JSON.stringify(getTrackInfo(data)) !=
      JSON.stringify(getTrackInfo(player));
    player = data;
    if (trackIsChanged) {
      await updateTrackInfo();
    }
    updateInfo();
  }

  return {
    callback: callback,
    updateArtwork: updateArtwork,
    updateDuration: updateDuration,
    updateInfo: updateInfo,
    updateLoopStatusEnabled: updateLoopStatusEnabled,
    updateLyrics: updateLyrics,
    updatePlaybackState: updatePlaybackState,
    updateTrackInfo: updateTrackInfo,
    updateVolume: updateVolume,
  };
})();

document
  .getElementById("playback-btn")
  .addEventListener("click", (event) => Lyri.togglePlayback());
document
  .getElementById("previous-btn")
  .addEventListener("click", (event) => Lyri.previous());
document
  .getElementById("next-btn")
  .addEventListener("click", (event) => Lyri.next());

document
  .getElementById("loop-status-btn")
  .addEventListener("click", (event) => {
    loopStatus = document.getElementById("loop-status-btn");
    // (x + 2) % 3 is the expected behaviour of (x - 1) % 3, handling negatives
    const status = (loopStatus.getAttribute("data-value") + 2) % 3;
    loopStatus.setAttribute("data-value", status);
    PlayerUI.updateLoopStatusEnabled();
    Lyri.setLoopStatus(status);
  });

document.getElementById("loop-status-btn").setAttribute("data-value", 0);

document.getElementById("shuffle-btn").addEventListener("click", (event) => {
  const shuffle = document.getElementById("shuffle-btn");
  shuffle.toggleAttribute("data-enabled");
  const status = shuffle.hasAttribute("data-enabled");
  Lyri.setShuffle(status);
});

document.getElementById("fullscreen-btn").addEventListener("click", (event) => {
  const fullscreenIcon = document.getElementById("fullscreen-icon");
  if (Utils.toggleFullscreen()) {
    fullscreenIcon.className = "bi-fullscreen-exit";
  } else {
    fullscreenIcon.className = "bi-fullscreen";
  }
});

document.getElementById("length-label").addEventListener("click", (event) => {
  document.getElementById("length-label").toggleAttribute("data-remaining");
  PlayerUI.updateDuration();
});

document
  .getElementById("position-bar")
  .addEventListener("click", async (event) => {
    const value = Utils.getClickValue(event);
    PlayerUI.updateDuration(value);
    await Lyri.setPosition(Math.round(value));
  });

document.getElementById("mute-btn").addEventListener("click", async (event) => {
  const volumeBar = document.getElementById("volume-bar");
  let level = 0;
  if (volumeBar.value == 0) {
    level = volumeBar.getAttribute("data-volume");
  }
  await Lyri.setVolume(level);
});

document
  .getElementById("volume-bar")
  .addEventListener("click", async (event) => {
    const value = Utils.getClickValue(event);
    PlayerUI.updateVolume(value);
    await Lyri.setVolume(value);
  });

document.getElementById("volume-bar").setAttribute("data-volume", 0);

document.getElementById("lyrics-btn").addEventListener("click", (event) => {
  ["track-info", "media-controls", "lyrics-panel"].forEach((id) =>
    document.getElementById(id).classList.toggle("hidden"),
  );
});

Lyri.startWebsocket(PlayerUI.callback);
