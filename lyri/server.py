import asyncio
from json import dumps as json_dumps

import uvloop
from sanic import empty, json, text, Request, Sanic, Websocket
from sanic.response import HTTPResponse, JSONResponse

from lyri import config
from lyri.player import Player

app = Sanic(__name__.replace(".", "-"))
app.static("/", config.public, index="index.html")


@app.before_server_start
async def setup_ctx(app: Sanic, loop: uvloop.Loop):
    app.ctx.player = Player()
    app.ctx.player.start()


@app.websocket("/player")
async def player(request: Request, ws: Websocket) -> None:
    """Handle websocket player requests."""
    while True:
        data = json_dumps(app.ctx.player.get_info())
        await ws.send(data)
        await asyncio.sleep(config.interval)


# Information
@app.route("/get/status", methods=["GET"])
async def get_status(request: Request) -> JSONResponse:
    """Return status for player."""
    return json(app.ctx.player.props.status)


@app.route("/get/shuffle", methods=["GET"])
async def get_shuffle(request: Request) -> JSONResponse:
    """Return shuffle status for player."""
    return json(app.ctx.player.props.shuffle)


@app.route("/get/volume", methods=["GET"])
async def get_volume(request: Request) -> JSONResponse:
    """Return volume for player."""
    return json(app.ctx.player.props.volume)


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


@app.route("/set/volume", methods=["GET"])
async def set_volume(request: Request) -> HTTPResponse:
    """Set volume of the player."""
    if level := request.args.get("level"):
        level = float(level)
        app.ctx.player.set_volume(level)
    else:
        return text("Volume level not provided.")
    return empty()
