"""Module to provide handlers for playerctl."""

from threading import Thread
from typing import Any

import gi

gi.require_version("Playerctl", "2.0")

from gi.repository import GLib, Playerctl

from lyri.lyrics import get_lyrics


class Player(Playerctl.Player):
    """Class to handle player information and actions."""

    def __init__(self, player_name: str | None = None) -> None:
        """Initialise player instance."""
        super().__init__(player_name=player_name)
        self._loop = None

    def start(self) -> None:
        """Start the main loop for GLib in a new thread."""
        self._loop = GLib.MainLoop()
        self._thread = Thread(target=self._loop.run)
        self._thread.start()

    def stop(self) -> None:
        """Stop the main loop for GLib and join thread."""
        self._loop.quit()
        self._thread.join()

    @property
    def is_running(self) -> bool:
        """Return whether main loop for GLib is running."""
        return self._loop.is_running()

    @staticmethod
    def list_players() -> list[Playerctl.PlayerName]:
        """Return list of player names."""
        return Playerctl.list_players()

    @property
    def name(self) -> str:
        """Return player name."""
        return self.props.player_name

    def get_info(self) -> dict[str, Any]:
        """Return dictionary of all player information."""
        return {
            "status": self.get_status(),
            "playing": self.is_playing,
            "loop-status": self.get_loop_status(),
            "shuffle": self.get_shuffle(),
            "volume": self.get_volume(),
            "title": self.get_title(),
            "album": self.get_album(),
            "artwork": self.get_artwork(),
            "artist": self.get_artist(),
            "url": self.get_url(),
            "length": self.get_length(),
            "position": self.get_position(),
            "metadata": self.get_metadata(),
        }

    @property
    def is_playing(self) -> bool:
        """Return whether player is currently playing."""
        return self.props.playback_status == Playerctl.PlaybackStatus.PLAYING

    def get_status(self) -> str:
        """Return playback status of player."""
        return self.props.status

    def get_loop_status(self) -> Playerctl.LoopStatus:
        """Return current loop status of player."""
        return self.props.loop_status

    def get_shuffle(self) -> bool:
        """Return whether shuffle is currently enabled."""
        return self.props.shuffle

    def get_volume(self) -> float:
        """Get current volume level."""
        return self.props.volume

    def get_artwork(self) -> str | None:
        """Return album art URL or None."""
        return self.get_metadata().get("mpris:artUrl")

    def get_url(self) -> str | None:
        """Return track URL or None."""
        return self.get_metadata().get("xesam:url")

    def get_length(self) -> int | None:
        """Return length of current song."""
        return self.get_metadata().get("mpris:length")

    def get_metadata(self) -> dict[str, Any]:
        """Return dictionary of metadata."""
        return dict(self.props.metadata)

    def get_lyrics(self) -> str:
        """Return lyrics for currently playing song."""
        return get_lyrics(self.get_title(), self.get_artist())
