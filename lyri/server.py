"""Module providing Sanic web server application."""

import asyncio
import tempfile
from json import dumps as json_dumps
from json import loads as json_loads
from pathlib import Path

import requests
import uvloop
from sanic import Request, Sanic, Websocket, empty, json, file, text
from sanic.response import HTTPResponse, JSONResponse, file_stream

from lyri.config import LyriConfig
from lyri.player import Player

app = Sanic(__name__.replace(".", "-"), config=LyriConfig())
app.static("/", app.config.PUBLIC_PATH, index="index.html")


@app.before_server_start
async def setup_ctx(app: Sanic, loop: uvloop.Loop):
    """Set up app context with player instance."""
    app.ctx.player = Player(app.config.PLAYER_NAME)
    app.ctx.player.start()


@app.before_server_stop
async def stop_server(app: Sanic, loop: uvloop.Loop):
    """Stop player GLib main loop before stopping server."""
    app.ctx.player.stop()


@app.websocket("/player")
async def player(request: Request, ws: Websocket) -> None:
    """Handle websocket player requests."""
    while True:
        data = json_dumps(app.ctx.player.get_info())
        await ws.send(data)
        await asyncio.sleep(app.config.INTERVAL)


# Information
@app.route("/get/status", methods=["GET"])
async def get_status(request: Request) -> JSONResponse:
    """Return status for player."""
    return json(app.ctx.player.get_status())


@app.route("/get/shuffle", methods=["GET"])
async def get_shuffle(request: Request) -> JSONResponse:
    """Return shuffle status for player."""
    return json(app.ctx.player.get_shuffle())


@app.route("/get/volume", methods=["GET"])
async def get_volume(request: Request) -> JSONResponse:
    """Return volume for player."""
    return json(app.ctx.player.get_volume())


@app.route("/get/title", methods=["GET"])
async def get_title(request: Request) -> JSONResponse:
    """Return title for currently playing song."""
    return json(app.ctx.player.get_title())


@app.route("/get/album", methods=["GET"])
async def get_album(request: Request) -> JSONResponse:
    """Return album for currently playing song."""
    return json(app.ctx.player.get_album())


@app.route("/get/artwork", methods=["GET"])
async def get_artwork(request: Request) -> JSONResponse:
    """Return album art URL for currently playing song."""
    return json(app.ctx.player.get_artwork())


@app.route("/get/artist", methods=["GET"])
async def get_artist(request: Request) -> JSONResponse:
    """Return artist for currently playing song."""
    return json(app.ctx.player.get_artist())


@app.route("/get/position", methods=["GET"])
async def get_position(request: Request) -> JSONResponse:
    """Return position for currently playing song."""
    return json(app.ctx.player.get_position())


@app.route("/get/metadata", methods=["GET"])
async def get_metadata(request: Request) -> JSONResponse:
    """Return metadata for currently playing song."""
    return json(app.ctx.player.get_metadata())


@app.route("/get/lyrics", methods=["GET"])
async def get_lyrics(request: Request) -> JSONResponse:
    """Return lyrics for currently playing song."""
    return json(app.ctx.player.get_lyrics())


# Actions
@app.route("/next", methods=["GET"])
async def next(request: Request) -> HTTPResponse:
    """Play the next song."""
    app.ctx.player.next()
    return empty()


@app.route("/previous", methods=["GET"])
async def previous(request: Request) -> HTTPResponse:
    """Play the previous song."""
    app.ctx.player.previous()
    return empty()


@app.route("/play", methods=["GET"])
async def play(request: Request) -> HTTPResponse:
    """Play the current song."""
    app.ctx.player.play()
    return empty()


@app.route("/pause", methods=["GET"])
async def pause(request: Request) -> HTTPResponse:
    """Pause the current song."""
    app.ctx.player.pause()
    return empty()


@app.route("/toggle", methods=["GET"])
async def toggle(request: Request) -> HTTPResponse:
    """Toggle playback of the current song."""
    app.ctx.player.play_pause()
    return empty()


@app.route("/seek", methods=["GET"])
async def seek(request: Request) -> HTTPResponse:
    """Seek to position of the current song."""
    if offset := request.args.get("offset"):
        offset = int(offset)
        app.ctx.player.seek(offset)
    else:
        return text("Offset not provided.")
    return empty()


@app.route("/set/position", methods=["GET"])
async def set_position(request: Request) -> HTTPResponse:
    """Set position of the current song."""
    if position := request.args.get("position"):
        position = int(position)
        app.ctx.player.set_position(position)
    else:
        return text("Position not provided.")
    return empty()


@app.route("/set/loop-status", methods=["GET"])
async def set_loop_status(request: Request) -> HTTPResponse:
    """Set loop status of the player."""
    if status := request.args.get("status"):
        status = int(status)
        app.ctx.player.set_loop_status(status)
    else:
        return text("Loop status not provided.")
    return empty()


@app.route("/set/shuffle", methods=["GET"])
async def set_shuffle(request: Request) -> HTTPResponse:
    """Set shuffle status of the player."""
    if status := request.args.get("status"):
        status = json_loads(status)
        app.ctx.player.set_shuffle(status)
    else:
        return text("Shuffle status not provided.")
    return empty()


@app.route("/set/volume", methods=["GET"])
async def set_volume(request: Request) -> HTTPResponse:
    """Set volume of the player."""
    if level := request.args.get("level"):
        level = float(level)
        app.ctx.player.set_volume(level)
    else:
        return text("Volume level not provided.")
    return empty()


# Proxy
@app.route("/proxy/artwork", methods=["GET"])
async def proxy_artwork(request: Request) -> HTTPResponse:
    """Return album art content for currently playing song."""
    if (url := app.ctx.player.get_artwork()).startswith("file://"):
        return await file(Path.from_uri(url))
    with requests.get(app.ctx.player.get_artwork()) as request:
        with tempfile.NamedTemporaryFile() as fd:
            fd.write(request.content)
            return await file(fd.name)


@app.route("/proxy/stream", methods=["GET"])
async def proxy_stream(request: Request) -> HTTPResponse:
    """Stream file URL of current song."""
    if not (url := app.ctx.player.get_url()).startswith("file://"):
        raise ValueError("Only file-protocol URLs are supported")
    path = Path.from_uri(url)
    return await file_stream(
        path,
        headers={"Content-Disposition": f'Attachment; filename="{path.name}"'},
    )
