from threading import Thread
from typing import Any

import gi

gi.require_version("Playerctl", "2.0")

from gi.repository import Playerctl, GLib

from lyri.lyrics import get_lyrics


class Player(Playerctl.Player):
    """Class to handle player information and actions."""

    def __init__(self, player_name: str | None = None) -> None:
        """Initialise player instance."""
        super().__init__(player_name=player_name)

    def get_info(self) -> dict[str, Any]:
        """Return dictionary of all player information."""
        return {
            "status": self.props.status,
            "playing": self.is_playing,
            "shuffle": self.props.shuffle,
            "volume": self.props.volume,
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

    @staticmethod
    def start() -> None:
        """Start the main loop for GLib in a new thread."""
        main = GLib.MainLoop()
        Thread(target=main.run).start()
