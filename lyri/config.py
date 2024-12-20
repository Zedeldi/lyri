from pathlib import Path

from sanic.config import Config


class LyriConfig(Config):
    PUBLIC_PATH = Path(__file__).absolute().parent / "public"
    INTERVAL = 1
    PLAYER_NAME = None
