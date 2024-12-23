"""Sanic web application configuration module."""

from pathlib import Path

from sanic.config import Config


class LyriConfig(Config):
    """Class providing configuration methods and attributes for Sanic application."""

    PUBLIC_PATH = Path(__file__).absolute().parent / "public"
    INTERVAL = 1
    PLAYER_NAME = None
