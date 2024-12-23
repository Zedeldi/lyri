"""Module to provide methods for obtaining lyrics."""

import syncedlyrics


def get_lyrics(track: str, artist: str, *args, **kwargs) -> str:
    """Return lyrics for specified song metadata."""
    return syncedlyrics.search(f"{track} {artist}", *args, **kwargs)
