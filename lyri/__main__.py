"""Entry-point to start Lyri web server."""

import webbrowser
from argparse import ArgumentParser

from sanic import Sanic
from sanic.worker.loader import AppLoader


def get_parser() -> ArgumentParser:
    """Get command-line argument parser."""
    parser = ArgumentParser(
        prog="Lyri",
        description="Start Lyri web server",
        epilog="Copyright (C) 2025 Zack Didcott",
    )
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--dev", action="store_true", help="Enable development mode")
    parser.add_argument("--browser", "-b", action="store_true", help="Open web browser")
    return parser


def main() -> None:
    """Start Sanic server application."""
    parser = get_parser()
    args = parser.parse_args()
    loader = AppLoader(module_input="lyri.server.app")
    app = loader.load()
    app.prepare(host=args.host, port=args.port, dev=args.dev)
    if args.browser:
        webbrowser.open_new(f"http://{args.host}:{args.port}")
    Sanic.serve(primary=app, app_loader=loader)


if __name__ == "__main__":
    main()
